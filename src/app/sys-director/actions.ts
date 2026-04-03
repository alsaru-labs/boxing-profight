"use server";

import * as sdk from "node-appwrite";
import { PROJECT_ID, DATABASE_ID, COLLECTION_PROFILES, COLLECTION_INVITATION_TOKENS, COLLECTION_BOOKINGS, COLLECTION_CLASSES, COLLECTION_NOTIFICATIONS, COLLECTION_REVENUE, COLLECTION_PAYMENTS, COLLECTION_NOTIFICATIONS_READ } from "@/lib/appwrite";
import { createAdminClient, checkPaymentStatus } from "@/lib/server/appwrite";
import { unstable_cache, revalidateTag, revalidatePath } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

// ==========================================
// 🛠️ SECCIÓN 1: INFRAESTRUCTURA Y BOOTSTRAP
// ==========================================

/**
 * Administrative: Bootstrap Initial Admin (Security Utility)
 */
export async function bootstrapAdminAction(data: { name: string, lastName: string, email: string, pass: string, secret: string }) {
    const { name, lastName, email, pass, secret } = data;
    const envSecret = process.env.ADMIN_BOOTSTRAP_SECRET || "";
    const systemSecret = envSecret.replace(/['"\s]/g, "");
    const cleanSecret = (secret || "").trim();

    if (!envSecret) {
        console.error("[Bootstrap] ERROR: ADMIN_BOOTSTRAP_SECRET no definida en el entorno del servidor.");
        return { success: false, error: "Error de Servidor: La variable ADMIN_BOOTSTRAP_SECRET no está configurada." };
    }

    if (!cleanSecret || cleanSecret !== systemSecret) {
        return { success: false, error: "Autorización fallida: El secreto universal proporcionado es incorrecto." };
    }

    const { databases, users } = await createAdminClient();

    try {
        const existing = await users.list([sdk.Query.equal("email", email)]);
        
        if (existing.total > 0) {
            const authUser = existing.users[0];
            await users.updatePassword(authUser.$id, pass);

            try {
                const profileRes = await databases.listDocuments(
                    DATABASE_ID, 
                    COLLECTION_PROFILES, 
                    [
                        sdk.Query.equal("email", email.toLowerCase()),
                        sdk.Query.limit(1),
                        sdk.Query.select(["$id"])
                    ] 
                );

                if (profileRes.total > 0) {
                    await databases.updateDocument(
                        DATABASE_ID, 
                        COLLECTION_PROFILES, 
                        profileRes.documents[0].$id, 
                        {
                            name: name,
                            last_name: lastName,
                            role: "admin",
                            is_active: true,
                            status: "Activa"
                        } 
                    );
                    return { success: true, message: "Usuario existente promovido a Administrador." };
                } else {
                    await databases.createDocument(
                        DATABASE_ID, 
                        COLLECTION_PROFILES, 
                        authUser.$id, 
                        {
                            user_id: authUser.$id,
                            name: name,
                            last_name: lastName,
                            email: email.toLowerCase(),
                            role: "admin",
                            is_active: true,
                            status: "Activa"
                        } 
                    );
                    return { success: true, message: "Perfil administrativo creado." };
                }
            } catch (e: any) {
                return { success: false, error: "Error con su perfil: " + e.message };
            }
        }

        const userId = sdk.ID.unique();
        await users.create(userId, email, undefined, pass, name);

        await databases.createDocument(
            DATABASE_ID, 
            COLLECTION_PROFILES, 
            userId, 
            {
                user_id: userId,
                name: name,
                last_name: lastName,
                email: email.toLowerCase(),
                role: "admin",
                is_active: true,
                status: "Activa"
            } 
        );

        return { success: true };
    } catch (error: any) {
        console.error("[Bootstrap] Error crítico:", error.message);
        return { success: false, error: error.message };
    }
}

// ==========================================
// 🚀 SECCIÓN 2: HIDRATACIÓN DE DATOS (MEGA-ACTIONS)
// ==========================================

export async function getAdminDashboardData(month?: string) {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const currentMonthStr = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const [allProfiles, availableClasses, announcementsData, currentMonthPayments, monthlyRevenueDoc] = await Promise.all([
            getActiveProfilesCached(),
            getAvailableClassesCached(),
            getAnnouncementsCached(),
            getMonthlyPaymentsCached(currentMonthStr),
            getMonthlyRevenueCached(currentMonthStr)
        ]);

        const totalRevenue = monthlyRevenueDoc ? (monthlyRevenueDoc.amount || 0) : 0;
        const totalStudents = allProfiles.length;
        const paidStudentIds = Array.from(new Set(currentMonthPayments.map((p: any) => p.student_id)));
        const unpaidCount = Math.max(0, totalStudents - paidStudentIds.length);

        const filteredClasses = availableClasses.filter((c: any) => c.date >= thirtyDaysAgo.substring(0,10) && c.date <= thirtyDaysAhead.substring(0,10));

        return {
            success: true,
            totalStudents,
            unpaidCount,
            totalRevenue,
            paidStudentIds,
            classes: JSON.parse(JSON.stringify(filteredClasses)),
            announcements: JSON.parse(JSON.stringify(announcementsData)),
            currentMonth: currentMonthStr
        };

    } catch (error: any) {
        console.error("[getAdminDashboardData] Error:", error.message);
        return { success: false, error: `Error en el servidor: ${error.message}` };
    }
}

export async function getAdminStudentsList(month?: string) {
    const d = new Date();
    const currentMonthStr = month || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    try {
        const [allProfiles, monthlyPayments] = await Promise.all([
            getActiveProfilesCached(),
            getMonthlyPaymentsCached(currentMonthStr)
        ]);

        const paidStudentsSet = new Set(monthlyPayments.map((p: any) => p.student_id));
        const paymentMethodsMap = new Map(monthlyPayments.map((p: any) => [p.student_id, p.method]));

        const students = allProfiles
            .filter((p: any) => p.role !== "admin")
            .map((p: any) => ({
                ...p,
                is_paid: paidStudentsSet.has(p.$id),
                payment_method: paymentMethodsMap.get(p.$id) || null
            }));

        return { success: true, students: JSON.parse(JSON.stringify(students)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getPlatformOmniData(userId: string, monthOverride?: string) {
    if (!userId) return { success: false, error: "ID de usuario requerido." };

    try {
        const { databases } = await createAdminClient();
        const now = new Date();
        const currentMonthStr = monthOverride || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // First, get the profile to know if it's admin
        const profile = await databases.getDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_PROFILES, documentId: userId }).catch(() => null);

        if (!profile) return { success: false, error: "Perfil no encontrado (Inconsistencia de datos)." };
        const isAdmin = profile.role === "admin";

        // Build the parallel omni-fetch array
        const promises: Promise<any>[] = [
            getAvailableClassesCached(),
            databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [
                sdk.Query.equal("student_id", userId),
                sdk.Query.limit(200),
                sdk.Query.select(["$id", "class_id"])
            ]),
            databases.listDocuments(DATABASE_ID, COLLECTION_PAYMENTS, [
                sdk.Query.equal("student_id", userId),
                sdk.Query.equal("month", currentMonthStr),
                sdk.Query.limit(1),
                sdk.Query.select(["$id", "amount", "method", "month"])
            ]),
            getAnnouncementsCached(),
            databases.listDocuments({ databaseId: DATABASE_ID, collectionId: COLLECTION_NOTIFICATIONS_READ, queries: [
                sdk.Query.equal("user_id", userId),
                sdk.Query.limit(200),
                sdk.Query.select(["notification_id"])
            ]}).catch(() => ({ documents: [] }))
        ];

        // If admin, attach the heavy analytics and history to the promise array
        if (isAdmin) {
            promises.push(getActiveProfilesCached());
            promises.push(getMonthlyPaymentsCached(currentMonthStr));
            promises.push(getMonthlyRevenueCached(currentMonthStr));
            promises.push(databases.listDocuments(DATABASE_ID, COLLECTION_REVENUE, [
                sdk.Query.limit(100), sdk.Query.orderDesc("month")
            ]).catch(() => ({ documents: [] })));
        }

        const results = await Promise.allSettled(promises);

        const classes = results[0].status === "fulfilled" ? results[0].value : [];
        const bookings = results[1].status === "fulfilled" ? (results[1].value as any).documents : [];
        const selfPayments = results[2].status === "fulfilled" ? results[2].value : { total: 0 };
        const announcements = results[3].status === "fulfilled" ? results[3].value : [];
        const readNotifications = results[4].status === "fulfilled" ? (results[4].value as any).documents.map((r: any) => r.notification_id) : [];

        let adminData = null;

        if (isAdmin) {
            const allProfiles = results[5].status === "fulfilled" ? results[5].value : [];
            const currentMonthPayments = results[6].status === "fulfilled" ? results[6].value : [];
            const monthlyRevenueDoc = results[7].status === "fulfilled" ? results[7].value : null;
            const fullRevenueHistory = results[8].status === "fulfilled" ? (results[8].value as any).documents : [];

            const totalRevenue = monthlyRevenueDoc ? (monthlyRevenueDoc.amount || 0) : 0;
            const paidStudentIds = new Set(currentMonthPayments.map((p: any) => p.student_id));
            const hydratedProfiles = allProfiles.map((p: any) => ({
                ...p,
                is_paid: paidStudentIds.has(p.$id)
            }));
            const totalStudents = allProfiles.length;
            const activePaidCount = hydratedProfiles.filter((p: any) => p.is_paid).length;
            const unpaidCount = Math.max(0, totalStudents - activePaidCount);
            const paidStudentIdsArray = Array.from(paidStudentIds);

            adminData = {
                studentsList: hydratedProfiles,
                dashboard: {
                    totalStudents,
                    unpaidCount,
                    totalRevenue,
                    paidStudentIds: paidStudentIdsArray
                },
                revenueHistory: fullRevenueHistory
            };
        }

        return {
            success: true,
            data: JSON.parse(JSON.stringify({
                profile: { ...profile, is_paid: selfPayments.total > 0 },
                isAdmin,
                classes,
                userBookings: bookings,
                announcements,
                readNotifications,
                adminData
            }))
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getClassAttendees(classId: string) {
    if (!classId) return { success: false, error: "ID de clase requerido." };
    const { databases } = await createAdminClient();
    try {
        const bookings = await databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [
                    sdk.Query.equal("class_id", classId),
                    sdk.Query.limit(100),
                    sdk.Query.select(["$id", "student_id"])
                ]);
        return { success: true, documents: JSON.parse(JSON.stringify(bookings.documents)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// 👥 SECCIÓN 3: GESTIÓN DE ALUMNOS (CRUD)
// ==========================================

export async function handleCreateOrReactivateStudent(form: any) {
    if (!form.email) return { success: false, error: "Email requerido." };
    const { databases, users } = await createAdminClient();

    try {
        const emailLower = form.email.toLowerCase();
        const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_PROFILES, [
                    sdk.Query.equal("email", emailLower), 
                    sdk.Query.limit(1)
                ]);

        if (existing.total > 0) {
            const profile = existing.documents[0];
            if (profile.is_active !== false && profile.status !== "Baja") {
                return { success: false, error: "Ya existe un alumno activo." };
            }
            const updated = await databases.updateDocument(
                DATABASE_ID, 
                COLLECTION_PROFILES, 
                profile.$id, 
                {
                    is_active: true,
                    status: "Activa",
                    name: form.name,
                    last_name: form.lastName,
                    phone: form.phone || profile.phone,
                    level: form.level || profile.level
                } 
            );
            try { await users.updateStatus(profile.user_id, true); } catch (e) { }
            return { success: true, profile: JSON.parse(JSON.stringify(updated)), reactivated: true };
        }

        const uniqueRef = sdk.ID.unique();
        const newProfile = await databases.createDocument(
            DATABASE_ID, 
            COLLECTION_PROFILES, 
            uniqueRef, 
            {
                user_id: uniqueRef,
                name: form.name,
                last_name: form.lastName,
                email: emailLower,
                phone: form.phone || null,
                role: "alumno",
                is_active: true,
                level: form.level,
                status: "Activa"
            } 
        );

        // 🛡️ LIMPIEZA PREVENTIVA: Borrar cualquier token anterior para este user_id
        try {
            const oldTokens = await databases.listDocuments(DATABASE_ID, COLLECTION_INVITATION_TOKENS, [
                sdk.Query.equal("user_id", uniqueRef),
                sdk.Query.limit(10)
            ]);
            for (const oldDoc of oldTokens.documents) {
                await databases.deleteDocument(DATABASE_ID, COLLECTION_INVITATION_TOKENS, oldDoc.$id);
            }
        } catch (e) { /* silent */ }

        // 🛡️ Generar Token de Invitación (Validez 48h)
        const inviteToken = sdk.ID.unique();
        const tokenId = sdk.ID.unique();
        
        console.log(`[handleCreate] Creating invitation token: ${inviteToken} for user: ${uniqueRef}`);
        
        await databases.createDocument(
            DATABASE_ID, 
            COLLECTION_INVITATION_TOKENS, 
            tokenId, 
            {
                user_id: uniqueRef,
                token: inviteToken,
                expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
            } 
        );

        revalidatePath("/sys-director");
        revalidateTag(CACHE_TAGS.PROFILE, "max" as any);
        return { success: true, profile: JSON.parse(JSON.stringify(newProfile)), reactivated: false, token: inviteToken };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateStudentProfileAction(profileId: string, data: any) {
    if (!profileId) return { success: false, error: "ID de perfil requerido." };
    const { databases } = await createAdminClient();
    try {
        const updated = await databases.updateDocument(
            DATABASE_ID, 
            COLLECTION_PROFILES, 
            profileId, 
            {
                last_name: data.last_name,
                email: data.email?.toLowerCase(),
                phone: data.phone,
                level: data.level
            } 
        );
        revalidatePath("/sys-director");
        revalidatePath("/perfil");
        revalidateTag(CACHE_TAGS.PROFILE, "max" as any);
        return { success: true, data: JSON.parse(JSON.stringify(updated)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteStudentAccount(profileId: string, userId: string) {
    if (!profileId || !userId) return { success: false, error: "Faltan IDs." };
    const { databases, users } = await createAdminClient();

    try {
        try { await users.updateStatus(userId, false); } catch (e) { }

        const bookingsList = await databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [
                    sdk.Query.equal("student_id", userId), sdk.Query.limit(500)
                ]);

        if (bookingsList.total > 0) {
            const now = new Date();
            const classIdsArray = bookingsList.documents.map((b: any) => b.class_id);
            const cachedClasses = await getAvailableClassesCached();
            const classDocs = cachedClasses.filter((c: any) => classIdsArray.includes(c.$id));
            
            for (const booking of bookingsList.documents) {
                try {
                    const classDoc = classDocs.find((c: any) => c.$id === booking.class_id);
                    if (!classDoc) continue;
                    const [year, month, day] = classDoc.date.split("-").map(Number);
                    const [hours, minutes] = classDoc.time.split('-')[0].split(":").map(Number);
                    const classDateTime = new Date(year, month - 1, day, hours, minutes);

                    if (classDateTime > now) {
                        await databases.updateDocument(DATABASE_ID, COLLECTION_CLASSES, booking.class_id, {
                                                    registeredCount: Math.max(0, (classDoc.registeredCount || 1) - 1)
                                                });
                        await databases.deleteDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_BOOKINGS, documentId: booking.$id });
                    }
                } catch (e) { }
            }
        }

        await databases.updateDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_PROFILES, documentId: profileId, data: {
                    is_active: true,
                    status: "Baja"
                } });

        revalidateTag(CACHE_TAGS.PROFILE, "max" as any);



        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * 💣 PERMANENT DELETE: Total destruction of student trace (Auth + DB + Bookings)
 * Optimized to minimize database roundtrips.
 */
export async function permanentDeleteStudentAction(profileId: string, userId: string) {
    if (!profileId || !userId) return { success: false, error: "Faltan IDs críticos para el borrado." };
    const { databases, users } = await createAdminClient();

    try {
        // 1. Fetch all dependencies in parallel for analysis
        const [bookingsRes, paymentsRes, readNotifsRes, tokensRes] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [sdk.Query.equal("student_id", profileId), sdk.Query.limit(100)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_PAYMENTS, [sdk.Query.equal("student_id", profileId), sdk.Query.limit(100)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_NOTIFICATIONS_READ, [sdk.Query.equal("user_id", userId), sdk.Query.limit(100)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_INVITATION_TOKENS, [sdk.Query.equal("user_id", profileId), sdk.Query.limit(10)])
        ]);

        console.log(`[DELETION DIAGNOSTIC] Found for Profile ${profileId}: ${bookingsRes.total} bookings, ${paymentsRes.total} payments, ${readNotifsRes.total} read-notifs, ${tokensRes.total} tokens.`);

        const cleanUpPromises: Promise<any>[] = [];

        // Cleanup Tokens
        for (const tokenDoc of tokensRes.documents) {
            cleanUpPromises.push(databases.deleteDocument(DATABASE_ID, COLLECTION_INVITATION_TOKENS, tokenDoc.$id));
        }

        // Cleanup Bookings and Classes
        if (bookingsRes.total > 0) {
            const now = new Date();
            const currentClasses = await getAvailableClassesCached();
            
            for (const booking of bookingsRes.documents) {
                const classDoc = currentClasses.find((c: any) => c.$id === booking.class_id);
                if (classDoc) {
                    const [year, month, day] = classDoc.date.split("-").map(Number);
                    const [hours, minutes] = classDoc.time.split('-')[0].split(":").map(Number);
                    const classDateTime = new Date(year, month - 1, day, hours, minutes);

                    if (classDateTime > now) {
                        // Restore space if the class is in the future
                        cleanUpPromises.push(databases.updateDocument(DATABASE_ID, COLLECTION_CLASSES, booking.class_id, {
                            registeredCount: Math.max(0, (classDoc.registeredCount || 1) - 1)
                        }));
                        cleanUpPromises.push(databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, booking.$id));
                    } else {
                        // Just delete the booking history, don't change count
                        cleanUpPromises.push(databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, booking.$id));
                    }
                } else {
                    // Class not found, just delete booking
                    cleanUpPromises.push(databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, booking.$id));
                }
            }
        }

        // 3. Deletion of Payments and Notifications
        paymentsRes.documents.forEach(p => cleanUpPromises.push(databases.deleteDocument(DATABASE_ID, COLLECTION_PAYMENTS, p.$id)));
        readNotifsRes.documents.forEach(n => cleanUpPromises.push(databases.deleteDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS_READ, n.$id)));

        // ⚡️ Execute "Traces" cleanup
        console.log(`[DELETION DIAGNOSTIC] Launching ${cleanUpPromises.length} secondary cleanup promises.`);
        await Promise.allSettled(cleanUpPromises);

        // 4. Primary Targets (Auth + Profile) - MUST SUCCEED
        console.log(`[DELETION DIAGNOSTIC] Deleting Profile document: ${profileId} and Auth User: ${userId}`);
        
        try {
          await users.delete(userId);
        } catch (e: any) {
          if (e.code !== 404) {
            console.error("[DELETION DIAGNOSTIC] Error deleting Auth user:", e.message);
            throw e;
          }
        }
        
        await databases.deleteDocument(DATABASE_ID, COLLECTION_PROFILES, profileId);

        // 5. Global Invalidation
        console.log("[DELETION DIAGNOSTIC] Deletion completed successfully. Invalidating caches...");
        revalidateTag(CACHE_TAGS.PROFILE, "max" as any);

        revalidateTag(CACHE_TAGS.PAYMENTS, "max" as any);
        revalidateTag(CACHE_TAGS.CLASSES, "max" as any);

        return { success: true };
    } catch (error: any) {
        console.error("[DELETION ERROR CRITICAL]", error);
        return { success: false, error: `Error durante el borrado físico: ${error.message || "Fallo técnico en Appwrite"}` };
    }
}


// ==========================================
// 💰 SECCIÓN 4: FINANZAS Y PAGOS
// ==========================================

export async function recordPaymentAction(studentId: string, amount: number, method: string, month?: string) {
    const { databases } = await createAdminClient();
    try {
        const d = new Date();
        const currentMonthStr = month || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        await databases.createDocument(DATABASE_ID, COLLECTION_PAYMENTS, sdk.ID.unique(), {
                    student_id: studentId, amount, method, month: currentMonthStr
                });

        try {
            const revDoc = await databases.getDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_REVENUE, documentId: currentMonthStr });
            await databases.updateDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_REVENUE, documentId: currentMonthStr, data: {
                            amount: (revDoc.amount || 0) + amount
                        } });
        } catch (e: any) {
            if (e.code === 404) {
                await databases.createDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_REVENUE, documentId: currentMonthStr, data: {
                                    month: currentMonthStr, amount
                                } });
            }
        }
        revalidateTag(CACHE_TAGS.PAYMENTS, "max" as any);
        revalidateTag(CACHE_TAGS.REVENUE, "max" as any);
        revalidateTag(CACHE_TAGS.PROFILE, "max" as any);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deletePaymentAction(studentId: string, month?: string) {
    const { databases } = await createAdminClient();
    try {
        const d = new Date();
        const currentMonthStr = month || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        const payments = await databases.listDocuments(DATABASE_ID, COLLECTION_PAYMENTS, [
                    sdk.Query.equal("student_id", studentId),
                    sdk.Query.equal("month", currentMonthStr),
                    sdk.Query.limit(1)
                ]);

        if (payments.total === 0) return { success: false, error: "Pago no encontrado." };
        const paymentDoc = payments.documents[0];

        await databases.deleteDocument(DATABASE_ID, COLLECTION_PAYMENTS, paymentDoc.$id);

        try {
            const revDoc = await databases.getDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_REVENUE, documentId: currentMonthStr });
            await databases.updateDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_REVENUE, documentId: currentMonthStr, data: {
                            amount: Math.max(0, (revDoc.amount || 0) - paymentDoc.amount)
                        } });
        } catch (e) { }

        revalidateTag(CACHE_TAGS.PAYMENTS, "max" as any);
        revalidateTag(CACHE_TAGS.REVENUE, "max" as any);
        revalidateTag(CACHE_TAGS.PROFILE, "max" as any);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function ensureMonthlyRevenueRecord() {
    try {
        const { databases } = await createAdminClient();
        const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

        const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_REVENUE, [
                    sdk.Query.equal("month", monthKey), sdk.Query.limit(1)
                ]);

        if (existing.total === 0) {
            await databases.createDocument(DATABASE_ID, COLLECTION_REVENUE, monthKey, { month: monthKey, amount: 0 });
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getAllRevenueRecords() {
    const { databases } = await createAdminClient();
    try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_REVENUE, [
                    sdk.Query.limit(100), sdk.Query.orderDesc("month")
                ]);
        return { success: true, documents: JSON.parse(JSON.stringify(res.documents)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// 📣 SECCIÓN 5: COMUNICACIÓN Y ANUNCIOS
// ==========================================

export async function publishAnnouncementAction(data: { title: string, content: string, type: string }) {
    if (!data.title || !data.content) return { success: false, error: "Título y contenido requeridos." };
    const { databases } = await createAdminClient();
    try {
        const res = await databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, sdk.ID.unique(), {
                    title: data.title, content: data.content, type: data.type, createdAt: new Date().toISOString()
                });
        revalidateTag(CACHE_TAGS.ANNOUNCEMENTS, "max" as any);
        return { success: true, data: JSON.parse(JSON.stringify(res)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteAnnouncement(id: string) {
    const { databases } = await createAdminClient();
    try {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, id);
        revalidateTag(CACHE_TAGS.ANNOUNCEMENTS, "max" as any);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function markNotificationAsReadAction(userId: string, notificationId: string) {
    const { databases } = await createAdminClient();
    try {
        await databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS_READ, sdk.ID.unique(), {
                    user_id: userId, notification_id: notificationId, read_at: new Date().toISOString()
                });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function markAllNotificationsAsReadAction(userId: string, notificationIds: string[]) {
    const { databases } = await createAdminClient();
    try {
        const promises = notificationIds.map(id => 
            databases.createDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_NOTIFICATIONS_READ, documentId: sdk.ID.unique(), data: {
                            user_id: userId, notification_id: id, read_at: new Date().toISOString()
                        } })
        );
        await Promise.all(promises);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// 📅 SECCIÓN 6: GESTIÓN DE CLASES
// ==========================================

export async function createClassServer(newClass: any) {
    const { databases } = await createAdminClient();
    try {
        const created = await databases.createDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_CLASSES, documentId: sdk.ID.unique(), data: {
                    name: newClass.name, date: newClass.date, time: newClass.time, coach: newClass.coach,
                    capacity: Number(newClass.capacity), registeredCount: 0, status: "Activa"
                } });
        revalidateTag(CACHE_TAGS.CLASSES, "max" as any);
        return { success: true, class: JSON.parse(JSON.stringify(created)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteClassAction(classId: string) {
    const { databases } = await createAdminClient();
    try {
        const bookingsList = await databases.listDocuments({ databaseId: DATABASE_ID, collectionId: COLLECTION_BOOKINGS, queries: [
                    sdk.Query.equal("class_id", classId), sdk.Query.limit(500), sdk.Query.select(["$id"])
                ] });
        if (bookingsList.total > 0) {
            await Promise.all(bookingsList.documents.map(b => databases.deleteDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_BOOKINGS, documentId: b.$id })));
        }
        await databases.deleteDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_CLASSES, documentId: classId });
        revalidatePath("/sys-director");
        revalidateTag(CACHE_TAGS.CLASSES, "max" as any);
        revalidateTag(CACHE_TAGS.PROFILE, "max" as any);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function bookClassAction(classId: string, userId: string) {
    const { databases } = await createAdminClient();
    try {
        const freshClass = await databases.getDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_CLASSES, documentId: classId });
        if (freshClass.registeredCount >= freshClass.capacity) return { success: false, error: "Clase Llena" };

        await databases.updateDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_CLASSES, documentId: classId, data: {
                    registeredCount: (freshClass.registeredCount || 0) + 1
                } });

        const booking = await databases.createDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_BOOKINGS, documentId: sdk.ID.unique(), data: {
                    student_id: userId, class_id: classId
                } });
        revalidateTag(CACHE_TAGS.CLASSES, "max" as any);
        return { success: true, booking: JSON.parse(JSON.stringify(booking)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function cancelBookingAction(classId: string, bookingId: string) {
    const { databases } = await createAdminClient();
    try {
        const freshClass = await databases.getDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_CLASSES, documentId: classId });
        await databases.updateDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_CLASSES, documentId: classId, data: {
                    registeredCount: Math.max(0, (freshClass.registeredCount || 1) - 1)
                } });
        await databases.deleteDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_BOOKINGS, documentId: bookingId });
        revalidateTag(CACHE_TAGS.CLASSES, "max" as any);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function autoGenerateNextWeekClasses() {
    const { databases } = await createAdminClient();
    try {
        const today = new Date();
        const nextMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
        const nextFriday = new Date(nextMonday);
        nextFriday.setDate(nextFriday.getDate() + 5);
        
        const dStart = nextMonday.toISOString().split('T')[0];
        const dEnd = nextFriday.toISOString().split('T')[0];

        const existingClassesResponse = await databases.listDocuments({ 
            databaseId: DATABASE_ID, 
            collectionId: COLLECTION_CLASSES, 
            queries: [
                sdk.Query.greaterThanEqual("date", dStart),
                sdk.Query.lessThanEqual("date", dEnd),
                sdk.Query.limit(100)
            ] 
        });

        const generatedClasses = [];
        const slots = ["10:00 - 11:00", "18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00", "21:00 - 22:00"];

        for (let i = 0; i < 5; i++) {
            const date = new Date(nextMonday);
            date.setDate(nextMonday.getDate() + i);
            const dStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];

            for (const time of slots) {
                const alreadyExists = existingClassesResponse.documents.some((c: any) => c.date === dStr && c.time === time);
                
                if (!alreadyExists) {
                    const newClass = await databases.createDocument({ 
                        databaseId: DATABASE_ID, 
                        collectionId: COLLECTION_CLASSES, 
                        documentId: sdk.ID.unique(), 
                        data: {
                            name: date.getDay() === 3 ? "Sparring" : "Boxeo y K1",
                            date: dStr, 
                            time, 
                            coach: "Álex Pintor", 
                            capacity: 30, 
                            registeredCount: 0, 
                            status: "Activa"
                        } 
                    });
                    generatedClasses.push(newClass);
                }
            }
        }
        revalidateTag(CACHE_TAGS.CLASSES, "max" as any);
        return { success: true, count: generatedClasses.length, classes: JSON.parse(JSON.stringify(generatedClasses)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// 🧠 SECCIÓN 7: UTILIDADES Y CACHÉ
// ==========================================

export const getAvailableClassesCached = async () => {
    const { databases } = await createAdminClient();
    const thirtyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    const res = await databases.listDocuments(
        DATABASE_ID, 
        COLLECTION_CLASSES, 
        [
            sdk.Query.greaterThanEqual("date", thirtyDaysAgo),
            sdk.Query.limit(500), 
            sdk.Query.orderAsc("date")
        ] 
    );
    return res.documents;
};


export const getAnnouncementsCached = async () => {
    const { databases } = await createAdminClient();
    const res = await databases.listDocuments(
        DATABASE_ID, 
        COLLECTION_NOTIFICATIONS, 
        [
            sdk.Query.orderDesc("$createdAt"), 
            sdk.Query.limit(20)
        ] 
    );
    return res.documents;
};


export async function getUserProfile(userId: string) {
    if (!userId) return { success: false, error: "ID de usuario requerido." };
    const { databases } = await createAdminClient();
    try {
        const profile = await databases.getDocument({ databaseId: DATABASE_ID, collectionId: COLLECTION_PROFILES, documentId: userId });
        return { success: true, data: JSON.parse(JSON.stringify(profile)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export const getActiveProfilesCached = async () => {
    const { databases } = await createAdminClient();
    const res = await databases.listDocuments(
        DATABASE_ID, 
        COLLECTION_PROFILES, 
        [
            sdk.Query.limit(500), 
            sdk.Query.equal("is_active", true), 
            sdk.Query.equal("role", "alumno"),
            sdk.Query.notEqual("status", "Baja"),
            sdk.Query.select(["$id", "user_id", "name", "last_name", "email", "phone", "status", "role", "level"])
        ] 
    );

    return res.documents;
};


export const getMonthlyRevenueCached = async (monthStr: string) => {
    const { databases } = await createAdminClient();
    try {
        const res = await databases.listDocuments(
            DATABASE_ID, 
            COLLECTION_REVENUE, 
            [sdk.Query.equal("month", monthStr), sdk.Query.limit(1)]
        );
        return res.total > 0 ? res.documents[0] : null;
    } catch (e: any) {
        return null;
    }
};


export const getMonthlyPaymentsCached = async (monthStr: string) => {
    const { databases } = await createAdminClient();
    const res = await databases.listDocuments(
        DATABASE_ID, 
        COLLECTION_PAYMENTS, 
        [
            sdk.Query.equal("month", monthStr), 
            sdk.Query.limit(500),
            sdk.Query.select(["$id", "student_id", "amount", "method"])
        ] 
    );
    return res.documents;
};

