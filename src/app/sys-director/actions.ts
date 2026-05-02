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

/**
 * 🔄 SYNC AGRESIVA: Forza limpieza de caché completa para el Dashboard
 * Asegura que tras cualquier mutación, un F5 muestre datos frescos.
 */
function revalidateAdminDashboard() {
    revalidateTag(CACHE_TAGS.PROFILE, "max");
    revalidateTag(CACHE_TAGS.PAYMENTS, "max");
    revalidateTag(CACHE_TAGS.REVENUE, "max");
    revalidatePath("/sys-director", "layout");
}

export async function revalidateAllDataAction() {
    revalidateAdminDashboard();
}

// ==========================================
// 🚀 SECCIÓN 2: HIDRATACIÓN DE DATOS (MEGA-ACTIONS)
// ==========================================

export async function getAdminDashboardData(month?: string) {
    try {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
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

        const filteredClasses = availableClasses.filter((c: any) => c.date >= sevenDaysAgo.substring(0, 10) && c.date <= thirtyDaysAhead.substring(0, 10));

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

        // 🛡️ VENTANA TEMPORAL: Solo bookings futuros (máx 50) para la vista principal
        // El historial de clases pasadas se carga bajo demanda via getStudentPastBookingsAction
        const nowISO = now.toISOString();
        const omniPromises: Promise<any>[] = [
            databases.getDocument(DATABASE_ID, COLLECTION_PROFILES, userId).catch(() => null),
            getAvailableClassesCached(),
            databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [
                sdk.Query.equal("student_id", userId),
                sdk.Query.limit(50),      // Incrementado para asegurar traer reservas actuales y futuras
                sdk.Query.orderDesc("$createdAt"),
                sdk.Query.select(["$id", "class_id"])
            ]),
            databases.listDocuments(DATABASE_ID, COLLECTION_PAYMENTS, [
                sdk.Query.equal("student_id", userId),
                sdk.Query.equal("month", currentMonthStr),
                sdk.Query.limit(1),
                sdk.Query.select(["$id", "amount", "method", "month"])
            ]),
            getAnnouncementsCached(),
            databases.listDocuments(DATABASE_ID, COLLECTION_NOTIFICATIONS_READ, [
                sdk.Query.equal("user_id", userId),
                sdk.Query.limit(20),      // 🛡️ Reducido de 100 a 20 (máxima optimización)
                sdk.Query.select(["notifications_id"])
            ]).catch(() => ({ documents: [] }))
        ];

        const firstBatch = await Promise.allSettled(omniPromises);

        const profile = firstBatch[0].status === "fulfilled" ? firstBatch[0].value : null;
        if (!profile) return { success: false, error: "Perfil no encontrado." };

        const isAdmin = profile.role === "admin";

        const classes = firstBatch[1].status === "fulfilled" ? firstBatch[1].value : [];
        const bookings = firstBatch[2].status === "fulfilled" ? (firstBatch[2].value as any).documents : [];
        const selfPayments = (firstBatch[3].status === "fulfilled" ? firstBatch[3].value : { total: 0 }) as any;
        const announcements = firstBatch[4].status === "fulfilled" ? firstBatch[4].value : [];
        const notificationsRes = (firstBatch[5].status === "fulfilled" ? firstBatch[5].value : { documents: [] }) as any;
        const readNotifications = notificationsRes.documents.map((r: any) => r.notifications_id);

        let adminData = null;

        // Si es Admin, lanzamos el segundo lote de hidratación pesada
        if (isAdmin) {
            const adminPromises = [
                getActiveProfilesCached(),
                getMonthlyPaymentsCached(currentMonthStr),
                getMonthlyRevenueCached(currentMonthStr),
                databases.listDocuments(DATABASE_ID, COLLECTION_REVENUE, [
                    sdk.Query.limit(25), sdk.Query.orderDesc("month")
                ]).catch(() => ({ documents: [] }))
            ];

            const secondBatch = await Promise.allSettled(adminPromises);

            const allProfiles = (secondBatch[0].status === "fulfilled" ? secondBatch[0].value : []) as any[];
            const currentMonthPayments = (secondBatch[1].status === "fulfilled" ? secondBatch[1].value : []) as any[];
            const monthlyRevenueDoc = (secondBatch[2].status === "fulfilled" ? secondBatch[2].value : null) as any;
            const fullRevenueHistory = (secondBatch[3].status === "fulfilled" ? secondBatch[3].value : { documents: [] }) as any;

            // 🗺️ Diccionario de pagos del mes para hidratación O(1)
            const paymentsMap = new Map();
            if (currentMonthPayments) {
                currentMonthPayments.forEach((p: any) => paymentsMap.set(p.student_id, p));
            }

            const hydratedProfiles = (allProfiles || []).map((p: any) => {
                const payment = paymentsMap.get(p.$id);
                return {
                    ...p,
                    is_paid: !!payment,
                    payment_method: payment ? payment.method : null,
                    payment_amount: payment ? payment.amount : null,
                    payment_id: payment ? payment.$id : null
                };
            });

            adminData = {
                studentsList: hydratedProfiles,
                classes,
                announcements,
                dashboard: {
                    totalStudents: (allProfiles || []).length,
                    unpaidCount: Math.max(0, (allProfiles || []).length - hydratedProfiles.filter((p: any) => p.is_paid).length),
                    totalRevenue: monthlyRevenueDoc ? (monthlyRevenueDoc.amount || 0) : 0,
                    paidStudentIds: Array.from(paymentsMap.keys())
                },
                revenueHistory: fullRevenueHistory.documents || []
            };
        }

        return {
            success: true,
            data: JSON.parse(JSON.stringify({
                profile: { ...profile, is_paid: (selfPayments.total || 0) > 0 },
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
            sdk.Query.limit(50),      // Incrementado para cubrir la capacidad máxima de la clase (30)
            sdk.Query.select(["$id", "student_id"])
        ]);

        if (bookings.total === 0) return { success: true, documents: [] };

        // 🛡️ LEY 1: BATCH FETCH (Eliminar N+1)
        const studentIds = Array.from(new Set(bookings.documents.map((b: any) => b.student_id)));
        const profilesRes = await databases.listDocuments(DATABASE_ID, COLLECTION_PROFILES, [
            sdk.Query.equal("$id", studentIds),
            sdk.Query.limit(25)
        ]);

        const profilesMap = new Map(profilesRes.documents.map((p: any) => [p.$id, p]));

        // Enriquecer con datos del perfil (incluso si están de baja)
        const enrichedAttendees = bookings.documents.map((booking: any) => {
            const profile = profilesMap.get(booking.student_id);
            if (profile) {
                return {
                    ...JSON.parse(JSON.stringify(profile)),
                    bookingId: booking.$id
                };
            }
            return {
                $id: booking.student_id,
                name: "Alumno Desconectado",
                is_active: false,
                status: "Baja",
                bookingId: booking.$id
            };
        });

        return { success: true, documents: enrichedAttendees };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// 👥 SECCIÓN 3: GESTIÓN DE ALUMNOS (CRUD)
// ==========================================

export async function handleCreateOrReactivateStudent(form: any) {
    if (!form.email || !form.name) return { success: false, error: "Nombre y Email son requeridos." };
    const { databases, users } = await createAdminClient();

    try {
        const nameClean = form.name.trim();
        const lastNameClean = (form.lastName || "").trim();
        const phoneClean = (form.phone || "").trim().replace(/\s/g, "");
        const emailLower = form.email.toLowerCase().trim();

        // 🛡️ REGLAS DE NEGOCIO (SERVER-SIDE)
        if (/[0-9]/.test(nameClean)) return { success: false, error: "El nombre no puede contener números." };
        if (nameClean.length > 15) return { success: false, error: "El nombre es demasiado largo (máx 15)." };
        if (/[0-9]/.test(lastNameClean)) return { success: false, error: "Los apellidos no pueden contener números." };
        if (lastNameClean.length > 50) return { success: false, error: "Los apellidos son demasiado largos (máx 50)." };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) return { success: false, error: "Formato de email no válido." };
        if (phoneClean && (phoneClean.length > 12 || !/^(\+?[0-9]{1,12})$/.test(phoneClean))) {
            return { success: false, error: "Formato de teléfono no válido (máx 12 dígitos)." };
        }

        const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_PROFILES, [
            sdk.Query.equal("email", emailLower),
            sdk.Query.limit(1)
        ]);

        if (existing.total > 0) {
            const profile = existing.documents[0];
            if (profile.is_active !== false && profile.status !== "Baja") {
                return { success: false, error: "Este email ya está en uso por otro alumno activo." };
            }
            const updated = await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_PROFILES,
                profile.$id,
                {
                    is_active: true,
                    status: "Activo",
                    role: "alumno", // Garantizar el rol para el contador
                    name: form.name,
                    last_name: form.lastName,
                    phone: form.phone || profile.phone,
                    level: form.level || profile.level
                }
            );
            try { await users.updateStatus(profile.user_id, true); } catch (e) { }
            // 🚨 ENRICH: Antes de devolver, comprobamos si tiene pago este mes
            const now = new Date();
            const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const payment = await databases.listDocuments(DATABASE_ID, COLLECTION_PAYMENTS, [
                sdk.Query.equal("student_id", updated.$id),
                sdk.Query.equal("month", currentMonthStr),
                sdk.Query.limit(1)
            ]).catch(() => ({ total: 0, documents: [] }));

            const enriched = {
                ...updated,
                is_paid: payment.total > 0,
                payment_method: payment.total > 0 ? (payment.documents[0] as any).method : null,
                payment_amount: payment.total > 0 ? (payment.documents[0] as any).amount : null
            };

            revalidatePath("/sys-director", "layout");
            revalidateTag(CACHE_TAGS.PROFILE, "max" as any);

            return { success: true, profile: JSON.parse(JSON.stringify(enriched)), reactivated: true };
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
                status: "Activo"
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

        revalidateAdminDashboard();
        return { success: true, profile: JSON.parse(JSON.stringify(newProfile)), reactivated: false, token: inviteToken };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateStudentProfileAction(profileId: string, data: any) {
    if (!profileId) return { success: false, error: "ID de perfil requerido." };
    const { databases, users } = await createAdminClient();
    let finalToken = null;
    try {
        const payload: any = {};

        // 🔍 OBTENCIÓN DE DATOS ACTUALES (Para user_id y comparación)
        const currentProfile = await databases.getDocument(DATABASE_ID, COLLECTION_PROFILES, profileId);
        if (!currentProfile) return { success: false, error: "Perfil no encontrado." };

        // 🛠️ SOPORTE PARA ACTUALIZACIONES PARCIALES (Post-Bug Fix)
        // Solo procesamos y validamos los campos que el cliente ha enviado explícitamente

        // 1. Nombre
        if (data.name !== undefined) {
            const nameClean = data.name.trim();
            if (/[0-9]/.test(nameClean)) return { success: false, error: "El nombre no puede contener números." };
            if (nameClean.length > 15) return { success: false, error: "El nombre es demasiado largo (máx 15)." };
            payload.name = nameClean;
        }

        // 2. Apellidos
        if (data.last_name !== undefined) {
            const lastNameClean = data.last_name.trim();
            if (/[0-9]/.test(lastNameClean)) return { success: false, error: "Los apellidos no puede contener números." };
            if (lastNameClean.length > 50) return { success: false, error: "Los apellidos son demasiado largos (máx 50)." };
            payload.last_name = lastNameClean;
        }

        // 3. Email (Lógica Crítica de Sincronización Auth-Perfil)
        if (data.email !== undefined) {
            const emailLower = data.email.toLowerCase().trim();
            const currentEmailLower = (currentProfile.email || "").toLowerCase().trim();

            if (emailLower !== currentEmailLower || data.forceResend) {
                if (emailLower !== currentEmailLower) {
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) return { success: false, error: "Formato de email no válido." };

                    // 🛡️ UNICIDAD (DB): Comprobar si el email está siendo usado por OTRO alumno
                    const collisionCheck = await databases.listDocuments(DATABASE_ID, COLLECTION_PROFILES, [
                        sdk.Query.equal("email", emailLower),
                        sdk.Query.notEqual("$id", profileId),
                        sdk.Query.limit(1)
                    ]);
                    if (collisionCheck.total > 0) {
                        return { success: false, error: "Este email ya pertenece a otro perfil (aunque esté de baja)." };
                    }
                }

                // 🔐 SINCRONIZACIÓN AUTH (Appwrite Users):
                // Si el email es diferente o forzamos el reenvío, intentamos actualizar la cuenta de Auth primero
                try {
                    const authUserId = currentProfile.user_id || profileId;
                    let isUnverified = false;

                    try {
                        const authUser = await users.get(authUserId);
                        console.log(`[updateStudentProfileAction] User ${authUserId} emailVerification:`, authUser.emailVerification);
                        isUnverified = !authUser.emailVerification;
                        if (emailLower !== currentEmailLower) {
                            await users.updateEmail(authUserId, emailLower);
                        }
                    } catch (e: any) {
                        if (e.code === 404) {
                            // El usuario aún no se ha registrado en Auth (solo existe el perfil)
                            isUnverified = true;
                        } else {
                            throw e;
                        }
                    }

                    // 📨 RE-ENVÍO DE INVITACIÓN SI NO ESTABA VERIFICADO
                    let newInviteToken = null;
                    if (isUnverified || data.forceResend) {
                        console.log(`[updateStudentProfileAction] Usuario no verificado o sin Auth. Regenerando tokens para: ${emailLower}`);
                        // Limpiar tokens antiguos
                        try {
                            const oldTokens = await databases.listDocuments(DATABASE_ID, COLLECTION_INVITATION_TOKENS, [
                                sdk.Query.equal("user_id", authUserId),
                                sdk.Query.limit(10)
                            ]);
                            for (const oldDoc of oldTokens.documents) {
                                await databases.deleteDocument(DATABASE_ID, COLLECTION_INVITATION_TOKENS, oldDoc.$id);
                            }
                        } catch (e) { /* silent */ }

                        // 🛡️ Generar NUEVO Token de Invitación (Validez 48h)
                        const inviteToken = sdk.ID.unique();
                        const tokenId = sdk.ID.unique();
                        await databases.createDocument(
                            DATABASE_ID,
                            COLLECTION_INVITATION_TOKENS,
                            tokenId,
                            {
                                user_id: authUserId,
                                token: inviteToken,
                                expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
                            }
                        );
                        newInviteToken = inviteToken;

                        // DISPARAR LA FUNCIÓN APPWRITE DIRECTAMENTE (Opcional, pero recomendado para el email)
                        try {
                            const { functions } = await createAdminClient();
                            const inviteFunctionId = process.env.INVITE_FUNCTION_ID;

                            if (!inviteFunctionId) {
                                console.error("[updateStudentProfileAction] CRÍTICO: No se encontró INVITE_FUNCTION_ID en .env");
                            } else {
                                const functionPayload = {
                                    type: "welcome",
                                    email: emailLower,
                                    name: data.name || currentProfile.name,
                                    user_id: authUserId,
                                    role: "alumno"
                                };

                                console.log(`[updateStudentProfileAction] Ejecutando Invite Function para ${emailLower}...`);
                                await functions.createExecution(
                                    inviteFunctionId,
                                    JSON.stringify(functionPayload),
                                    false // isAsync (false = background)
                                );
                            }
                        } catch (fnErr) {
                            console.error(`[updateStudentProfileAction] Error disparando la Invite Function:`, fnErr);
                        }
                    }

                    if (newInviteToken) {
                        finalToken = newInviteToken;
                    }

                } catch (authError: any) {
                    console.error("[Auth Sync Error]", authError);
                    if (authError.code === 409) {
                        return { success: false, error: "Este email ya está en uso en el sistema de autenticación." };
                    }
                    return { success: false, error: "No se ha podido sincronizar el email con tu cuenta de acceso." };
                }

                if (emailLower !== currentEmailLower) {
                    payload.email = emailLower;
                }
            }
        }

        // 4. Teléfono
        if (data.phone !== undefined) {
            const phoneClean = data.phone.trim().replace(/\s/g, "");
            if (phoneClean && (phoneClean.length > 12 || !/^(\+?[0-9]{1,12})$/.test(phoneClean))) {
                return { success: false, error: "Formato de teléfono no válido (máx 12 dígitos)." };
            }
            payload.phone = phoneClean;
        }

        // 5. Otros datos
        if (data.level !== undefined) payload.level = data.level;
        if (data.is_active !== undefined) payload.is_active = data.is_active;
        if (data.status !== undefined) payload.status = data.status;

        // Si no hay nada que actualizar, retornamos éxito silencioso
        if (Object.keys(payload).length === 0) return { success: true };

        const updated = await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_PROFILES,
            profileId,
            payload
        );

        revalidateAdminDashboard();
        revalidatePath("/perfil", "page");
        return { success: true, data: JSON.parse(JSON.stringify(updated)), token: finalToken };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * 🔴 ACCIÓN A — DAR DE BAJA (Soft Delete con Retención Contable)
 * Regla Zero-Waste:
 *   - is_active: false, status: "Baja"
 *   - Elimina SOLO reservas FUTURAS en PARALELO (batch)
 *   - Conserva reservas pasadas (historial de asistencia)
 *   - Conserva total_asistencias y pagos intactos
 */
export async function deleteStudentAccount(profileId: string, userId: string) {
    if (!profileId || !userId) return { success: false, error: "Faltan ID críticos." };
    const { databases, users } = await createAdminClient();

    try {
        // 1. Deshabilitar cuenta de Auth
        try { await users.updateStatus(userId, false); } catch (e) { }

        // 2. VENTANA TEMPORAL: Obtener todos los bookings del alumno + batch fetch de clases
        //    para filtrar solo los futuros en memoria (no hay campo fecha desnormalizado en bookings)
        const bookingsList = await databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [
            sdk.Query.equal("student_id", profileId),
            sdk.Query.limit(1000),     // 🛡️ Límite de INTEGRIDAD: Borrado completo de historial
            sdk.Query.select(["$id", "class_id"])
        ]);

        if (bookingsList.total > 0) {
            const now = new Date();

            // 🛡️ LEY 1: BATCH FETCH de Clases (una sola lectura para todas)
            const classIds = Array.from(new Set(bookingsList.documents.map((b: any) => b.class_id)));
            const classesRes = await databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [
                sdk.Query.equal("$id", classIds),
                sdk.Query.limit(classIds.length),
                sdk.Query.select(["$id", "date", "time"])
            ]);
            const classesMap = new Map(classesRes.documents.map((c: any) => [c.$id, c]));

            // 🗑️ FILTRAR SOLO FUTURAS y borrar en PARALELO
            const futureBookingIds: string[] = [];
            const futureClassIds: string[] = [];

            for (const booking of bookingsList.documents) {
                const classDoc = classesMap.get(booking.class_id);
                if (!classDoc) continue;

                const [year, month, day] = classDoc.date.substring(0, 10).split("-").map(Number);
                const [hours, minutes] = classDoc.time.split('-')[0].split(":").map(Number);
                const classDateTime = new Date(year, month - 1, day, hours, minutes);

                if (classDateTime > now) {
                    futureBookingIds.push(booking.$id);
                    futureClassIds.push(booking.class_id);
                }
                // Clases pasadas se conservan → historial de asistencia preservado
            }

            if (futureBookingIds.length > 0) {
                await Promise.allSettled(
                    futureBookingIds.map(id => databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, id))
                );
                await Promise.allSettled(
                    [...new Set(futureClassIds)].map(classId => syncClassRegisteredCount(classId))
                );
            }
        }

        // 3. ✅ CORRECCIÓN CRÍTICA: is_active DEBE SER FALSE al dar de baja
        //    (Antes era `true` — bug corregido.)
        await databases.updateDocument(DATABASE_ID, COLLECTION_PROFILES, profileId, {
            is_active: false,
            status: "Baja"
        });

        // 4. Invalidar cachés
        revalidateAdminDashboard();
        revalidateTag(CACHE_TAGS.CLASSES, "max");

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * 💣 ACCIÓN B — ELIMINAR USUARIO (Hard Delete con Retención Contable)
 * Regla Zero-Waste:
 *   - Borra cuenta de Auth de Appwrite
 *   - Borra documento de profiles
 *   - Borra TODAS las reservas (pasadas y futuras)
 *   - Borra registros de notifications_read
 *   - ⚠️ EXCEPCIÓN CRÍTICA DE AUDITORÍA: Los documentos de COLLECTION_PAYMENTS
 *     NO SE BORRAN bajo ningún concepto. Quedan como registros huérfanos
 *     para el histórico contable de ingresos.
 */
export async function permanentDeleteStudentAction(profileId: string, userId: string) {
    if (!profileId || !userId) return { success: false, error: "Faltan IDs críticos para el borrado." };
    const { databases, users } = await createAdminClient();

    try {
        // 1. Obtener TODAS las reservas del usuario (pasadas y futuras) para eliminarlas
        const bookingsRes = await databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [
            sdk.Query.equal("student_id", profileId),
            sdk.Query.limit(1000),     // 🛡️ Límite de INTEGRIDAD: Borrado completo de historial
            sdk.Query.select(["$id", "class_id"])
        ]);

        const affectedClassIds = new Set<string>();
        const deleteBookingPromises = bookingsRes.documents.map(booking => {
            affectedClassIds.add(booking.class_id);
            return databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, booking.$id).catch(() => null);
        });

        // Borrar todos los bookings en paralelo
        await Promise.allSettled(deleteBookingPromises);

        // 2. Limpiar: Notificaciones leídas + Tokens de invitación
        //    ✅ CORRECCIÓN CRÍTICA: COLLECTION_PAYMENTS se excluye deliberadamente
        //    para preservar el histórico contable (registros quedan como huérfanos intencionales)
        const [readNotifsRes, tokensRes] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTION_NOTIFICATIONS_READ, [
                sdk.Query.equal("user_id", userId),
                sdk.Query.limit(1000),     // 🛡️ Límite de INTEGRIDAD: Limpieza profunda
                sdk.Query.select(["$id"])
            ]),
            databases.listDocuments(DATABASE_ID, COLLECTION_INVITATION_TOKENS, [
                sdk.Query.equal("user_id", profileId),
                sdk.Query.limit(10),
                sdk.Query.select(["$id"])
            ])
        ]);

        const cleanUpPromises: Promise<any>[] = [];

        // Borrar notifications_read
        readNotifsRes.documents.forEach(n =>
            cleanUpPromises.push(databases.deleteDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS_READ, n.$id).catch(() => null))
        );
        // Borrar invitation_tokens
        tokensRes.documents.forEach(t =>
            cleanUpPromises.push(databases.deleteDocument(DATABASE_ID, COLLECTION_INVITATION_TOKENS, t.$id).catch(() => null))
        );
        // Sincronizar contadores de clases afectadas (solo futuras ya liberadas)
        affectedClassIds.forEach(classId => {
            cleanUpPromises.push(syncClassRegisteredCount(classId).catch(() => null));
        });

        // Ejecutar limpieza en paralelo
        await Promise.allSettled(cleanUpPromises);

        // 3. Borrar Auth (tolerante a 404 si ya no existe)
        try {
            await users.delete(userId);
        } catch (e: any) {
            if (e.code !== 404) throw e;
        }

        // 4. Borrar documento de perfil
        await databases.deleteDocument(DATABASE_ID, COLLECTION_PROFILES, profileId);

        // 5. Invalidación total de cachés
        revalidateAdminDashboard();
        revalidateTag(CACHE_TAGS.PROFILE, "max");
        revalidateTag(CACHE_TAGS.CLASSES, "max");

        return { success: true };
    } catch (error: any) {
        console.error("[PERMANENT DELETE ERROR]", error);
        return { success: false, error: `Fallo durante el borrado físico: ${error.message || "Fallo técnico en Appwrite"}` };
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
            await databases.updateDocument({
                databaseId: DATABASE_ID, collectionId: COLLECTION_REVENUE, documentId: currentMonthStr, data: {
                    amount: (revDoc.amount || 0) + amount
                }
            });
        } catch (e: any) {
            if (e.code === 404) {
                await databases.createDocument({
                    databaseId: DATABASE_ID, collectionId: COLLECTION_REVENUE, documentId: currentMonthStr, data: {
                        month: currentMonthStr, amount
                    }
                });
            }
        }
        revalidateAdminDashboard();
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
            await databases.updateDocument({
                databaseId: DATABASE_ID, collectionId: COLLECTION_REVENUE, documentId: currentMonthStr, data: {
                    amount: Math.max(0, (revDoc.amount || 0) - paymentDoc.amount)
                }
            });
        } catch (e) { }

        revalidateAdminDashboard();
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

export async function publishAnnouncementAction(data: { title: string; content: string; type: string }) {
    if (!data.title || !data.content) return { success: false, error: "Título y contenido requeridos." };
    const { databases } = await createAdminClient();
    try {
        const res = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_NOTIFICATIONS,
            sdk.ID.unique(),
            {
                title: data.title,
                content: data.content,
                type: data.type,
                createdAt: new Date().toISOString()
            }
        );

        // 🔄 ZERO-WASTE CACHE: Purga selectiva inmediata por TAG
        revalidateTag(CACHE_TAGS.ANNOUNCEMENTS, "max");
        revalidatePath("/", "layout" as any);

        return { success: true, data: JSON.parse(JSON.stringify(res)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}



export async function deleteAnnouncement(id: string) {
    const { databases } = await createAdminClient();
    try {
        // 1. 🧹 LIMPIEZA PROACTIVA: Buscar y borrar todos los registros de lectura asociados
        // Optimizamos cargando solo IDs para la purga masiva.
        const linkedReads = await databases.listDocuments(DATABASE_ID, COLLECTION_NOTIFICATIONS_READ, [
            sdk.Query.equal("notifications_id", id),
            sdk.Query.limit(500),
            sdk.Query.select(["$id"])
        ]);

        if (linkedReads.total > 0) {
            console.log(`[Announcements] Purging ${linkedReads.total} residual read records for notification: ${id}`);
            const deletePromises = linkedReads.documents.map(doc =>
                databases.deleteDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS_READ, doc.$id)
            );
            await Promise.all(deletePromises);
        }

        // 2. 💣 Borrado Principal
        await databases.deleteDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, id);

        // 🔄 REVALIDACIÓN GRANULAR: Evitamos revalidateAdminDashboard para no tocar perfiles/pagos
        revalidateTag(CACHE_TAGS.ANNOUNCEMENTS, "max");
        revalidatePath("/", "layout" as any);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function markNotificationAsReadAction(userId: string, notificationId: string) {
    const { databases } = await createAdminClient();
    try {
        await databases.createDocument(
            DATABASE_ID,
            COLLECTION_NOTIFICATIONS_READ,
            sdk.ID.unique(),
            {
                user_id: userId,
                notifications_id: notificationId,
                read_at: new Date().toISOString()
            }
        );

        // 🔄 REVALIDACIÓN: Asegurar que el estado "Leído" se refleje tras un refresh
        revalidateTag(CACHE_TAGS.ANNOUNCEMENTS, "max");
        revalidatePath("/", "layout" as any);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function markAllNotificationsAsReadAction(userId: string, notificationIds: string[]) {
    const { databases } = await createAdminClient();
    try {
        const promises = notificationIds.map(id =>
            databases.createDocument(
                DATABASE_ID,
                COLLECTION_NOTIFICATIONS_READ,
                sdk.ID.unique(),
                {
                    user_id: userId,
                    notifications_id: id,
                    read_at: new Date().toISOString()
                }
            )
        );
        await Promise.all(promises);

        // 🔄 REVALIDACIÓN: Asegurar que el estado "Leído" se refleje tras un refresh
        revalidateTag(CACHE_TAGS.ANNOUNCEMENTS, "max");
        revalidatePath("/", "layout" as any);

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
        // 🛡️ PREVENCIÓN DE DUPLICADOS: Comprobar si ya existe una clase en este horario
        // Regla: Solo una clase por franja horaria para evitar solapamientos accidentales.
        const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [
            sdk.Query.equal("date", newClass.date),
            sdk.Query.equal("time", newClass.time),
            sdk.Query.limit(1)
        ]);

        if (existing.total > 0) {
            return {
                success: false,
                error: `Ya existe una clase programada para el día ${newClass.date} a las ${newClass.time}.`
            };
        }

        const created = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_CLASSES,
            sdk.ID.unique(),
            {
                name: newClass.name,
                date: newClass.date,
                time: newClass.time,
                coach: newClass.coach,
                capacity: Number(newClass.capacity),
                registeredCount: 0,
                status: "Activa"
            }
        );
        revalidateAdminDashboard();
        revalidateTag(CACHE_TAGS.CLASSES, "max");
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
        revalidateAdminDashboard();
        revalidatePath("/sys-director", "layout");
        revalidateTag(CACHE_TAGS.CLASSES, "max");
        revalidateTag(CACHE_TAGS.PROFILE, "max");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * 🔄 SYNC: Recalculate total registeredCount based on actual BOOKINGS.
 * "Zero Waste" self-healing logic.
 */
export async function syncClassRegisteredCount(classId: string) {
    const { databases } = await createAdminClient();
    try {
        const bookings = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_BOOKINGS,
            [
                sdk.Query.equal("class_id", classId),
                sdk.Query.limit(1) // Solo para disparar el "total"
            ]
        );

        await databases.updateDocument(DATABASE_ID, COLLECTION_CLASSES, classId, {
            registeredCount: bookings.total
        });

        return { success: true, count: bookings.total };
    } catch (e: any) {
        console.error(`[SYNC ERROR] Class ${classId}:`, e.message);
        return { success: false, error: e.message };
    }
}

// ==========================================
// 🗂️ SECCIÓN 6B: HISTORIAL PAGINADO Y CONTADOR DE ASISTENCIAS
// ==========================================

/**
 * 📜 HISTORIAL LAZY: Clases pasadas del alumno (paginadas, Regla 2 Zero-Waste)
 * Devuelve las últimas 10 clases a las que el alumno asistió.
 * Se llama BAJO DEMANDA cuando el usuario abre la tab "Historial", no en el login.
 */
export async function getStudentPastBookingsAction(userId: string) {
    if (!userId) return { success: false, error: "ID de usuario requerido.", classes: [] };
    const { databases } = await createAdminClient();

    try {
        // 1. Obtener los últimos 10 bookings del alumno (Regla Q3: Sin paginación)
        const bookingsRes = await databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [
            sdk.Query.equal("student_id", userId),
            sdk.Query.limit(10),
            sdk.Query.orderDesc("$createdAt"), // Asegurar que son las más recientes
            sdk.Query.select(["$id", "class_id", "$createdAt"])
        ]);

        if (bookingsRes.total === 0 || bookingsRes.documents.length === 0) {
            return { success: true, classes: [], total: 0 };
        }

        // 2. Batch fetch de las clases correspondientes (LEY 1: No N+1)
        const classIds = bookingsRes.documents.map((b: any) => b.class_id);
        const classesRes = await databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [
            sdk.Query.equal("$id", classIds),
            sdk.Query.limit(classIds.length),
            sdk.Query.select(["$id", "name", "date", "time", "coach"])
        ]);

        const now = new Date();
        const classesMap = new Map(classesRes.documents.map((c: any) => [c.$id, c]));

        // 3. Filtrar solo clases que ya ocurrieron (pasadas) y enriquecer
        const pastClasses = bookingsRes.documents
            .map((b: any) => {
                const cls = classesMap.get(b.class_id);
                if (!cls) return null;
                try {
                    const [year, month, day] = cls.date.substring(0, 10).split("-").map(Number);
                    const [hours, minutes] = cls.time.split('-')[0].split(":").map(Number);
                    const classDateTime = new Date(year, month - 1, day, hours, minutes);
                    if (classDateTime >= now) return null; // Excluir futuras
                    return { ...cls, bookingId: b.$id };
                } catch { return null; }
            })
            .filter(Boolean)
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            success: true,
            classes: JSON.parse(JSON.stringify(pastClasses))
        };
    } catch (error: any) {
        console.error("[getStudentPastBookingsAction] Error:", error.message);
        return { success: false, error: error.message, classes: [] };
    }
}


export async function bookClassAction(classId: string, userId: string) {
    const { databases } = await createAdminClient();
    try {
        // 1. FRESH LOAD: Clase actual (para saber la capacidad máxima)
        const freshClass = await databases.getDocument(DATABASE_ID, COLLECTION_CLASSES, classId);

        // 🛡️ RECUENTO REAL ATÓMICO: No confiamos en el contador 'registeredCount' de la clase
        // Realizamos un recuento directo de documentos en COLLECTION_BOOKINGS para esta clase.
        const actualBookings = await databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [
            sdk.Query.equal("class_id", classId),
            sdk.Query.limit(1) // Suficiente para obtener el 'total' de Appwrite
        ]);

        if (actualBookings.total >= freshClass.capacity) {
            // Auto-healing: Si detectamos discrepancia, arreglamos el contador visual
            if (freshClass.registeredCount !== actualBookings.total) { await syncClassRegisteredCount(classId); }
            return { success: false, error: "Clase Llena", code: "FULL" };
        }

        // 🛡️ BLINDAJE DUPLICADOS: Comprobar si este usuario ya tiene reserva
        const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [
            sdk.Query.equal("class_id", classId),
            sdk.Query.equal("student_id", userId),
            sdk.Query.limit(1)
        ]);

        if (existing.total > 0) {
            console.warn(`[BOOKING] User ${userId} already has a spot in class ${classId}`);
            if (freshClass.registeredCount < actualBookings.total) { await syncClassRegisteredCount(classId); }
            return { success: true, message: "Ya tenías una reserva confirmada." };
        }

        // 2. CREAR RESERVA (Momento crítico)
        const booking = await databases.createDocument(DATABASE_ID, COLLECTION_BOOKINGS, sdk.ID.unique(), {
            student_id: userId,
            class_id: classId
        });

        // 3. SINCRONIZACIÓN INMEDIATA: Forzar recuento real en el documento de la clase
        await syncClassRegisteredCount(classId);

        // 🔄 PURGA TOTAL DE CACHÉ (Zero-Waste Absolute)
        // revalidateTag limpia la caché de datos. revalidatePath("/") limpia la caché de página/layout.
        revalidateTag(CACHE_TAGS.CLASSES, "max" as any);
        revalidatePath("/", "layout");

        return { success: true, booking: JSON.parse(JSON.stringify(booking)) };
    } catch (error: any) {
        console.error("[bookClassAction ERROR]", error);
        return { success: false, error: error.message };
    }
}

export async function cancelBookingAction(classId: string, bookingId: string) {
    const { databases } = await createAdminClient();
    try {
        // 1. BORRAR RESERVA
        await databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, bookingId);

        // 2. RECUENTO REAL PARA EVITAR "STALE DATA" (Zero Waste Consistency)
        await syncClassRegisteredCount(classId);

        // 🔄 PURGA TOTAL DE CACHÉ
        revalidateTag(CACHE_TAGS.CLASSES, "max" as any);
        revalidatePath("/", "layout");

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
        nextFriday.setDate(nextFriday.getDate() + 4);

        const toYMD = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];

        const dStart = toYMD(nextMonday);
        const dEnd = toYMD(nextFriday);

        console.log(`[GENERATION DIAGNOSTIC] Running for period: ${dStart} to ${dEnd}`);

        const existingClassesResponse = await databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [
            sdk.Query.greaterThanEqual("date", dStart),
            sdk.Query.lessThanEqual("date", dEnd),
            sdk.Query.limit(50)
        ]);

        console.log(`[GENERATION DIAGNOSTIC] Found ${existingClassesResponse.total} existing classes in this range.`);

        const generatedClasses = [];
        const slots = ["10:00 - 11:00", "17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00", "21:00 - 22:00"];

        for (let i = 0; i < 5; i++) {
            const date = new Date(nextMonday);
            date.setDate(nextMonday.getDate() + i);
            const dStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];

            for (const time of slots) {
                // 🛡️ DOBLE COMPROBACIÓN: Validar contra el bloque inicial Y realizar consulta rápida si es necesario
                // para prevenir race conditions entre entornos (Local vs Develop).
                const alreadyExistsInMemory = existingClassesResponse.documents.some((c: any) =>
                    (c.date.substring(0, 10) === dStr) && (c.time === time)
                );

                if (alreadyExistsInMemory) {
                    console.log(`[GENERATION] Skipping ${dStr} ${time} (Found in initial scan)`);
                    continue;
                }

                // Verificación final atómica
                const finalCheck = await databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [
                    sdk.Query.equal("date", dStr),
                    sdk.Query.equal("time", time),
                    sdk.Query.limit(1)
                ]);

                if (finalCheck.total === 0) {
                    const newClass = await databases.createDocument(DATABASE_ID, COLLECTION_CLASSES, sdk.ID.unique(), {
                        name: date.getDay() === 3 ? "Sparring" : "Boxeo y K1",
                        date: dStr,
                        time,
                        coach: "Álex Pintor",
                        capacity: 30,
                        registeredCount: 0,
                        status: "Activa"
                    });
                    generatedClasses.push(newClass);
                    console.log(`[GENERATION] Created class: ${dStr} ${time}`);
                } else {
                    console.log(`[GENERATION] Skipping ${dStr} ${time} (Audit conflict detected)`);
                }
            }
        }

        revalidatePath("/sys-director", "layout");
        revalidateTag(CACHE_TAGS.CLASSES, "max");

        return {
            success: true,
            count: generatedClasses.length,
            period: `${dStart} al ${dEnd}`,
            classes: JSON.parse(JSON.stringify(generatedClasses))
        };
    } catch (error: any) {
        console.error("[GENERATION ERROR]", error);
        return { success: false, error: error.message };
    }
}

/**
 * 🧹 HEALING ACTION: Sync registeredCount for all active classes.
 * Use this to fix inconsistencies after manual DB edits.
 */
export async function syncAllClassesAction() {
    const { databases } = await createAdminClient();
    try {
        // 1. Obtener las últimas 25 clases activas (🛡️ Reducido de 100 a 25 para evitar carga excesiva)
        const classesRes = await databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [
            sdk.Query.limit(25),
            sdk.Query.orderDesc("date")
        ]);

        // 2. Obtener TODAS las reservas de esas clases (Batch fetch - Ley 1)
        const classIds = classesRes.documents.map(c => c.$id);
        const allBookings = await databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [
            sdk.Query.equal("class_id", classIds),
            sdk.Query.limit(1000),     // 🛡️ Límite de INTEGRIDAD: Capturar todas las reservas de las 25 clases
            sdk.Query.select(["class_id"])
        ]);

        // 3. Contar en memoria (Zero-Waste)
        const countMap = new Map<string, number>();
        classIds.forEach(id => countMap.set(id, 0));
        allBookings.documents.forEach((b: any) => {
            countMap.set(b.class_id, (countMap.get(b.class_id) || 0) + 1);
        });

        // 4. Actualizar solo las clases que tengan discrepancia
        const updatePromises: Promise<any>[] = [];
        for (const cls of classesRes.documents) {
            const realCount = countMap.get(cls.$id) || 0;
            if (cls.registeredCount !== realCount) {
                updatePromises.push(databases.updateDocument(DATABASE_ID, COLLECTION_CLASSES, cls.$id, {
                    registeredCount: realCount
                }));
            }
        }

        if (updatePromises.length > 0) {
            await Promise.allSettled(updatePromises);
        }

        revalidateTag(CACHE_TAGS.CLASSES, "max");
        return { success: true, syncedCount: classesRes.total };
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
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        console.log(`[QUERY] Fetching classes >= ${sevenDaysAgo.substring(0, 10)}`);

        const res = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_CLASSES,
            [
                sdk.Query.greaterThanEqual("date", sevenDaysAgo.substring(0, 10)),
                sdk.Query.limit(150),      // Incrementado para incluir clases pasadas y futuras de la semana
                sdk.Query.orderAsc("date")
            ]
        );

        return res.documents;
    },
    ["available-classes"],
    { tags: [CACHE_TAGS.CLASSES] }
);


export const getAnnouncementsCached = unstable_cache(
    async () => {
        const { databases } = await createAdminClient();
        try {
            const res = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_NOTIFICATIONS,
                [
                    sdk.Query.orderDesc("$createdAt"),
                    sdk.Query.limit(20)
                ]
            );
            return res.documents;
        } catch (e: any) {
            console.error("[getAnnouncementsCached] Error:", e.message);
            return [];
        }
    },
    ["announcements"],
    { tags: [CACHE_TAGS.ANNOUNCEMENTS] }
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

export const getActiveProfilesCached = unstable_cache(
    async () => {
        const { databases } = await createAdminClient();
        const res = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_PROFILES,
            [
                sdk.Query.limit(250),     // 🛡️ Límite razonable para visibilidad del Directorio
                sdk.Query.equal("is_active", true),
                sdk.Query.equal("role", "alumno"),
                sdk.Query.notEqual("status", "Baja"),
                sdk.Query.select(["$id", "user_id", "name", "last_name", "email", "phone", "status", "role", "level"])
            ]
        );
        return res.documents;
    },
    ["active-profiles"],
    { tags: [CACHE_TAGS.PROFILE] }
);


export const getMonthlyRevenueCached = unstable_cache(
    async (monthStr: string) => {
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
    },
    ["monthly-revenue"],
    { tags: [CACHE_TAGS.REVENUE] }
);


export const getMonthlyPaymentsCached = unstable_cache(
    async (monthStr: string) => {
        const { databases } = await createAdminClient();
        const res = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_PAYMENTS,
            [
                sdk.Query.equal("month", monthStr),
                sdk.Query.limit(500),      // 📊 Límite de MÉTRICAS: Capturar todo el volumen mensual
                sdk.Query.select(["$id", "student_id", "amount", "method"])
            ]
        );
        return res.documents;
    },
    ["monthly-payments"],
    { tags: [CACHE_TAGS.PAYMENTS] }
);

/**
 * ⚖️ ACCIÓN: ACEPTAR TÉRMINOS LEGALES (Auditoría RGPD)
 * Regla de Oro: Histórico inmutable. Una vez aceptado, legal_accepted_at
 * queda grabado para el cumplimiento normativo.
 */
export async function acceptLegalTermsAction(profileId: string) {
    if (!profileId) return { success: false, error: "ID de perfil requerido." };
    const { databases } = await createAdminClient();

    try {
        await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_PROFILES,
            profileId,
            {
                legal_accepted: true,
                legal_accepted_at: new Date().toISOString()
            }
        );

        revalidateTag(CACHE_TAGS.PROFILE, "max");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Verifica si el estudiante aún está pendiente de registro (no verificado).
 * Diseñado para Zero-Waste: Se llama solo bajo demanda al abrir el modal.
 */
export async function checkStudentVerifiedStatus(profileId: string, userId: string) {
    if (!profileId) return { success: false };
    try {
        const { users } = await createAdminClient();
        try {
            const authUser = await users.get(userId || profileId);
            return { success: true, isUnverified: !authUser.emailVerification };
        } catch (e: any) {
            if (e.code === 404) {
                // Usuario no existe en Auth todavía
                return { success: true, isUnverified: true };
            }
            return { success: false };
        }
    } catch (err) {
        return { success: false };
    }
}
