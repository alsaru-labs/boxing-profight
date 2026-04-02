"use server";

import * as sdk from "node-appwrite";
import { DATABASE_ID, COLLECTION_PROFILES, COLLECTION_INVITATION_TOKENS, COLLECTION_BOOKINGS, COLLECTION_CLASSES, COLLECTION_NOTIFICATIONS, COLLECTION_REVENUE, COLLECTION_PAYMENTS, COLLECTION_NOTIFICATIONS_READ } from "@/lib/appwrite";
import { createAdminClient, checkPaymentStatus } from "@/lib/server/appwrite";
import { unstable_cache, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

// ==========================================
// 🛠️ SECCIÓN 1: INFRAESTRUCTURA Y BOOTSTRAP
// ==========================================

/**
 * Administrative: Bootstrap Initial Admin (Security Utility)
 * Crea el primer administrador en producción validando un secreto de entorno.
 */
export async function bootstrapAdminAction(data: { name: string, lastName: string, email: string, pass: string, secret: string }) {
    const { name, lastName, email, pass, secret } = data;
    const envSecret = process.env.ADMIN_BOOTSTRAP_SECRET || "";
    const systemSecret = envSecret.replace(/['"\s]/g, "");
    const cleanSecret = (secret || "").trim();

    if (!envSecret) {
        console.error("[Bootstrap] ERROR: ADMIN_BOOTSTRAP_SECRET no definida en el entorno del servidor.");
        return { success: false, error: "Error de Servidor: La variable ADMIN_BOOTSTRAP_SECRET no está configurada en esta plataforma (Netlify/Local)." };
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
                const profileRes = await databases.listDocuments(DATABASE_ID, COLLECTION_PROFILES, [
                    sdk.Query.equal("email", email.toLowerCase()),
                    sdk.Query.limit(1),
                    sdk.Query.select(["$id"])
                ]);

                if (profileRes.total > 0) {
                    await databases.updateDocument(DATABASE_ID, COLLECTION_PROFILES, profileRes.documents[0].$id, {
                        name: name,
                        last_name: lastName,
                        role: "admin",
                        is_active: true,
                        status: "Activa"
                    });
                    return { success: true, message: "Usuario existente promovido a Administrador y contraseña restablecida." };
                } else {
                    await databases.createDocument(DATABASE_ID, COLLECTION_PROFILES, authUser.$id, {
                        user_id: authUser.$id,
                        name: name,
                        last_name: lastName,
                        email: email.toLowerCase(),
                        role: "admin",
                        is_active: true,
                        status: "Activa"
                    });
                    return { success: true, message: "Perfil administrativo creado para usuario Auth (Contraseña actualizada)." };
                }
            } catch (e: any) {
                return { success: false, error: "El usuario existe en Auth pero hubo un error con su perfil: " + e.message };
            }
        }

        const userId = sdk.ID.unique();
        await users.create(userId, email, undefined, pass, name);

        await databases.createDocument(DATABASE_ID, COLLECTION_PROFILES, userId, {
            user_id: userId,
            name: name,
            last_name: lastName,
            email: email.toLowerCase(),
            role: "admin",
            is_active: true,
            status: "Activa"
        });

        return { success: true };
    } catch (error: any) {
        console.error("[Bootstrap] Error crítico:", error.message);
        return { success: false, error: error.message };
    }
}

// ==========================================
// 🚀 SECCIÓN 2: HIDRATACIÓN DE DATOS (MEGA-ACTIONS)
// ==========================================

/**
 * Consolidates Admin Dashboard data into a single request.
 * Zero-Waste: Minimal fields and dynamic calculations.
 */
export async function getAdminDashboardData(month?: string) {
    const { databases } = await createAdminClient();
    
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const currentMonthStr = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const [profilesCountData, classesData, announcementsData, currentMonthPayments] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTION_PROFILES, [
                sdk.Query.limit(1), 
                sdk.Query.equal("is_active", true), 
                sdk.Query.equal("role", "alumno"),
                sdk.Query.select(["$id"])
            ]),
            databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [
                sdk.Query.greaterThanEqual("date", thirtyDaysAgo),
                sdk.Query.lessThanEqual("date", thirtyDaysAhead),
                sdk.Query.limit(500),
                sdk.Query.orderAsc("date"),
                sdk.Query.select(["$id", "date", "time", "name", "coach", "capacity", "registeredCount"])
            ]),
            getAnnouncementsCached(),
            databases.listDocuments(DATABASE_ID, COLLECTION_PAYMENTS, [
                sdk.Query.equal("month", currentMonthStr), 
                sdk.Query.limit(500),
                sdk.Query.select(["$id", "student_id", "amount"])
            ])
        ]);

        const totalRevenue = currentMonthPayments.documents.reduce((acc, p: any) => acc + (p.amount || 0), 0);
        const totalStudents = profilesCountData.total;
        const paidStudentIds = Array.from(new Set(currentMonthPayments.documents.map((p: any) => p.student_id)));
        const unpaidCount = Math.max(0, totalStudents - paidStudentIds.length);

        return {
            success: true,
            totalStudents,
            unpaidCount,
            totalRevenue,
            paidStudentIds,
            classes: JSON.parse(JSON.stringify(classesData.documents)),
            announcements: JSON.parse(JSON.stringify(announcementsData)),
            currentMonth: currentMonthStr
        };

    } catch (error: any) {
        console.error("[getAdminDashboardData] Error:", error.message);
        return { success: false, error: `Error en el servidor: ${error.message}` };
    }
}

/**
 * Fetch full list of students with dynamic payment resolution.
 */
export async function getAdminStudentsList(month?: string) {
    const { databases } = await createAdminClient();
    const d = new Date();
    const currentMonthStr = month || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    try {
        const [profilesData, currentMonthPayments] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTION_PROFILES, [
                sdk.Query.limit(500), 
                sdk.Query.equal("is_active", true), 
                sdk.Query.equal("role", "alumno"),
                sdk.Query.select(["$id", "name", "last_name", "email", "phone", "status", "role"])
            ]),
            databases.listDocuments(DATABASE_ID, COLLECTION_PAYMENTS, [
                sdk.Query.equal("month", currentMonthStr), 
                sdk.Query.limit(500),
                sdk.Query.select(["$id", "student_id", "method"])
            ]),
        ]);

        const paidStudentsSet = new Set(currentMonthPayments.documents.map((p: any) => p.student_id));
        const paymentMethodsMap = new Map(currentMonthPayments.documents.map((p: any) => [p.student_id, p.method]));

        const students = profilesData.documents
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

/**
 * MEGA-ACTION: Get Complete User Data (Consolidated Student Load)
 */
export async function getCompleteUserData(userId: string) {
    if (!userId) return { success: false, error: "ID de usuario requerido." };

    try {
        const { databases } = await createAdminClient();
        const now = new Date();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        let profile: any = null;
        let classes: any[] = [];
        let bookings: any = { documents: [] };
        let payments: any = { total: 0 };
        let announcements: any[] = [];

        try {
            const results = await Promise.allSettled([
                databases.getDocument(DATABASE_ID, COLLECTION_PROFILES, userId),
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
                    sdk.Query.select(["$id", "amount"])
                ]),
                getAnnouncementsCached()
            ]);

            if (results[0].status === "fulfilled") profile = results[0].value;
            if (results[1].status === "fulfilled") classes = results[1].value;
            if (results[2].status === "fulfilled") bookings = results[2].value;
            if (results[3].status === "fulfilled") payments = results[3].value;
            if (results[4].status === "fulfilled") announcements = results[4].value;

        } catch (globalError: any) {
            console.error("[getCompleteUserData] Promise.allSettled error:", globalError);
        }

        if (!profile) return { success: false, error: "Perfil no encontrado." };

        let readNotificationsIds: string[] = [];
        try {
            const readData = await databases.listDocuments(DATABASE_ID, COLLECTION_NOTIFICATIONS_READ, [
                sdk.Query.equal("user_id", userId),
                sdk.Query.limit(200),
                sdk.Query.select(["notification_id"])
            ]);
            readNotificationsIds = readData.documents.map((r: any) => r.notification_id);
        } catch (e) { }

        return {
            success: true,
            data: JSON.parse(JSON.stringify({
                profile: { ...profile, is_paid: payments.total > 0 },
                isAdmin: profile.role === "admin",
                classes: classes,
                userBookings: bookings.documents,
                announcements: announcements,
                readNotifications: readNotificationsIds
            }))
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Fetch attendees for a class on-demand.
 */
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

/**
 * Creates or reactivates a student profile.
 */
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
            const updated = await databases.updateDocument(DATABASE_ID, COLLECTION_PROFILES, profile.$id, {
                is_active: true,
                status: "Activa",
                name: form.name,
                last_name: form.lastName,
                phone: form.phone || profile.phone,
                level: form.level || profile.level
            });
            try { await users.updateStatus(profile.user_id, true); } catch (e) { }
            return { success: true, profile: JSON.parse(JSON.stringify(updated)), reactivated: true };
        }

        const uniqueRef = sdk.ID.unique();
        const newProfile = await databases.createDocument(DATABASE_ID, COLLECTION_PROFILES, uniqueRef, {
            user_id: uniqueRef,
            name: form.name,
            last_name: form.lastName,
            email: emailLower,
            phone: form.phone || null,
            role: "alumno",
            is_active: true,
            level: form.level,
            status: "Activa"
        });

        return { success: true, profile: JSON.parse(JSON.stringify(newProfile)), reactivated: false };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Update Student Profile
 */
export async function updateStudentProfileAction(profileId: string, data: any) {
    if (!profileId) return { success: false, error: "ID de perfil requerido." };
    const { databases } = await createAdminClient();
    try {
        const updated = await databases.updateDocument(DATABASE_ID, COLLECTION_PROFILES, profileId, {
            last_name: data.last_name,
            email: data.email?.toLowerCase(),
            phone: data.phone,
            level: data.level
        });
        return { success: true, data: JSON.parse(JSON.stringify(updated)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Synchronized Student Deletion (Soft Delete)
 */
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
            for (const booking of bookingsList.documents) {
                try {
                    const classDoc = await databases.getDocument(DATABASE_ID, COLLECTION_CLASSES, booking.class_id);
                    const [year, month, day] = classDoc.date.split("-").map(Number);
                    const [hours, minutes] = classDoc.time.split('-')[0].split(":").map(Number);
                    const classDateTime = new Date(year, month - 1, day, hours, minutes);

                    if (classDateTime > now) {
                        await databases.updateDocument(DATABASE_ID, COLLECTION_CLASSES, booking.class_id, {
                            registeredCount: Math.max(0, (classDoc.registeredCount || 1) - 1)
                        });
                        await databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, booking.$id);
                    }
                } catch (e) { }
            }
        }

        await databases.updateDocument(DATABASE_ID, COLLECTION_PROFILES, profileId, {
            is_active: false,
            status: "Baja"
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// 💰 SECCIÓN 4: FINANZAS Y PAGOS
// ==========================================

/**
 * Record a new payment (Dynamic revenue update)
 */
export async function recordPaymentAction(studentId: string, amount: number, method: string, month?: string) {
    const { databases } = await createAdminClient();
    try {
        const d = new Date();
        const currentMonthStr = month || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        await databases.createDocument(DATABASE_ID, COLLECTION_PAYMENTS, sdk.ID.unique(), {
            student_id: studentId, amount, method, month: currentMonthStr
        });

        try {
            const revDoc = await databases.getDocument(DATABASE_ID, COLLECTION_REVENUE, currentMonthStr);
            await databases.updateDocument(DATABASE_ID, COLLECTION_REVENUE, currentMonthStr, {
                amount: (revDoc.amount || 0) + amount
            });
        } catch (e: any) {
            if (e.code === 404) {
                await databases.createDocument(DATABASE_ID, COLLECTION_REVENUE, currentMonthStr, {
                    month: currentMonthStr, amount
                });
            }
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Delete a payment
 */
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
            const revDoc = await databases.getDocument(DATABASE_ID, COLLECTION_REVENUE, currentMonthStr);
            await databases.updateDocument(DATABASE_ID, COLLECTION_REVENUE, currentMonthStr, {
                amount: Math.max(0, (revDoc.amount || 0) - paymentDoc.amount)
            });
        } catch (e) { }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Ensure revenue record exists
 */
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

/**
 * Fetch historical revenue
 */
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
        revalidateTag("anuncios", "max");
        return { success: true, data: JSON.parse(JSON.stringify(res)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteAnnouncement(id: string) {
    const { databases } = await createAdminClient();
    try {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, id);
        revalidateTag("anuncios", "max");
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
            databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS_READ, sdk.ID.unique(), {
                user_id: userId, notification_id: id, read_at: new Date().toISOString()
            })
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
        const created = await databases.createDocument(DATABASE_ID, COLLECTION_CLASSES, sdk.ID.unique(), {
            name: newClass.name, date: newClass.date, time: newClass.time, coach: newClass.coach,
            capacity: Number(newClass.capacity), registeredCount: 0, status: "Activa"
        });
        revalidateTag("clases", "max");
        return { success: true, class: JSON.parse(JSON.stringify(created)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteClassAction(classId: string) {
    const { databases } = await createAdminClient();
    try {
        const bookingsList = await databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [
            sdk.Query.equal("class_id", classId), sdk.Query.limit(500), sdk.Query.select(["$id"])
        ]);
        if (bookingsList.total > 0) {
            await Promise.all(bookingsList.documents.map(b => databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, b.$id)));
        }
        await databases.deleteDocument(DATABASE_ID, COLLECTION_CLASSES, classId);
        revalidateTag(CACHE_TAGS.CLASSES, "max");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function bookClassAction(classId: string, userId: string) {
    const { databases } = await createAdminClient();
    try {
        const freshClass = await databases.getDocument(DATABASE_ID, COLLECTION_CLASSES, classId);
        if (freshClass.registeredCount >= freshClass.capacity) return { success: false, error: "Clase Llena" };

        await databases.updateDocument(DATABASE_ID, COLLECTION_CLASSES, classId, {
            registeredCount: (freshClass.registeredCount || 0) + 1
        });

        const booking = await databases.createDocument(DATABASE_ID, COLLECTION_BOOKINGS, sdk.ID.unique(), {
            student_id: userId, class_id: classId
        });
        revalidateTag("clases", "max");
        return { success: true, booking: JSON.parse(JSON.stringify(booking)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function cancelBookingAction(classId: string, bookingId: string) {
    const { databases } = await createAdminClient();
    try {
        const freshClass = await databases.getDocument(DATABASE_ID, COLLECTION_CLASSES, classId);
        await databases.updateDocument(DATABASE_ID, COLLECTION_CLASSES, classId, {
            registeredCount: Math.max(0, (freshClass.registeredCount || 1) - 1)
        });
        await databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, bookingId);
        revalidateTag("clases", "max");
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
        const generatedClasses = [];
        const slots = ["10:00 - 11:00", "18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00", "21:00 - 22:00"];

        for (let i = 0; i < 5; i++) {
            const date = new Date(nextMonday);
            date.setDate(nextMonday.getDate() + i);
            const dStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];

            for (const time of slots) {
                const newClass = await databases.createDocument(DATABASE_ID, COLLECTION_CLASSES, sdk.ID.unique(), {
                    name: date.getDay() === 3 ? "Sparring" : "Boxeo y K1",
                    date: dStr, time, coach: "Álex Pintor", capacity: 30, registeredCount: 0, status: "Activa"
                });
                generatedClasses.push(newClass);
            }
        }
        revalidateTag(CACHE_TAGS.CLASSES, "max");
        return { success: true, count: generatedClasses.length };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// 🧠 SECCIÓN 7: UTILIDADES Y CACHÉ
// ==========================================

export const getAvailableClassesCached = unstable_cache(
    async () => {
        const { databases } = await createAdminClient();
        const thirtyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [
            sdk.Query.greaterThanEqual("date", thirtyDaysAgo),
            sdk.Query.limit(500), sdk.Query.orderAsc("date")
        ]);
        return res.documents;
    },
    ["clases-disponibles"],
    { revalidate: 600, tags: [CACHE_TAGS.CLASSES] }
);

export const getAnnouncementsCached = unstable_cache(
    async () => {
        const { databases } = await createAdminClient();
        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_NOTIFICATIONS, [
            sdk.Query.orderDesc("$createdAt"), sdk.Query.limit(20)
        ]);
        return res.documents;
    },
    ["anuncios-globales-v2"],
    { revalidate: 3600, tags: [CACHE_TAGS.ANNOUNCEMENTS] }
);

export async function getUserProfile(userId: string) {
    if (!userId) return { success: false, error: "ID de usuario requerido." };
    const { databases } = await createAdminClient();
    try {
        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_PROFILES, userId);
        return { success: true, data: JSON.parse(JSON.stringify(profile)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
