"use server";

import * as sdk from "node-appwrite";
import { DATABASE_ID, COLLECTION_PROFILES, COLLECTION_INVITATION_TOKENS, COLLECTION_BOOKINGS, COLLECTION_CLASSES, COLLECTION_NOTIFICATIONS, COLLECTION_REVENUE, COLLECTION_PAYMENTS, COLLECTION_NOTIFICATIONS_READ } from "@/lib/appwrite";
import { createAdminClient, checkPaymentStatus } from "@/lib/server/appwrite";
import { unstable_cache, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

/**
 * Synchronized Student Deletion (Auth + Database + Tokens)
 * This action ensures that when a student is removed from the dashboard, 
 * all their platform-related data is wiped securely.
 */
export async function deleteStudentAccount(profileId: string, userId: string) {
    if (!profileId || !userId) {
        return { success: false, error: "Faltan identificadores para realizar la baja." };
    }

    const { databases, users } = await createAdminClient();

    try {
        // 1. Block from Auth (Primary Action)
        // This prevents the user from logging in but keeps their account.
        try {
            await users.updateStatus(userId, false);
            console.log(`[SYS-DIRECTOR] User blocked from Auth: ${userId}`);
        } catch (authError: any) {
            console.warn(`[SYS-DIRECTOR] Auth block failed: ${authError.message}`);
        }

        // 2. Cleanup FUTURE Bookings and LIBERATE spots
        // 2. Booking Cleanup (Audit Preserve)
        // We only want to remove them from future classes, keeping history.
        try {
            const bookingsList = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_BOOKINGS,
                [sdk.Query.equal("student_id", userId), sdk.Query.limit(500)]
            );

            if (bookingsList.total > 0) {
                const now = new Date();
                
                for (const booking of bookingsList.documents) {
                    try {
                        // Check if the class is in the future
                        const classDoc = await databases.getDocument(DATABASE_ID, COLLECTION_CLASSES, booking.class_id);
                        const [year, month, day] = classDoc.date.substring(0, 10).split("-").map(Number);
                        const startTime = classDoc.time.split('-')[0].trim();
                        const [hours, minutes] = startTime.split(":").map(Number);
                        
                        // IMPORTANT: Correct date object with class time
                        const classDateTime = new Date(year, month - 1, day, hours, minutes);

                        if (classDateTime > now) {
                            console.log(`[SYS-DIRECTOR] Cancelling future booking for student ${userId} in class ${booking.class_id}`);
                            // LIBERATE spot
                            await databases.updateDocument(DATABASE_ID, COLLECTION_CLASSES, booking.class_id, {
                                registeredCount: Math.max(0, (classDoc.registeredCount || 1) - 1)
                            });
                            // DELETE future booking
                            await databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, booking.$id);
                        }
                        // Past bookings are KEPT for history as requested.
                    } catch (itemError) {
                        console.warn(`[SYS-DIRECTOR] Cleanup skipped for booking ${booking.$id}:`, itemError);
                    }
                }
            }
        } catch (bookingCleanupError) {
            console.warn("[SYS-DIRECTOR] Booking cleanup limited warning:", bookingCleanupError);
        }

        // 3. Mark Profile as INACTIVE (Soft Delete)
        // We change 'is_active' and 'status' instead of deleting the document.
        // This keeps the Name and Email linked to past classes and payments.
        await databases.updateDocument(DATABASE_ID, COLLECTION_PROFILES, profileId, {
            is_active: false,
            status: "Baja"
        });
        console.log(`[SYS-DIRECTOR] Profile marked as 'Baja': ${profileId}`);

        // 4. Cleanup Invitation Tokens (No longer needed)
        try {
            const tokensList = await databases.listDocuments(DATABASE_ID, COLLECTION_INVITATION_TOKENS, [sdk.Query.equal("user_id", userId)]);
            await Promise.all(tokensList.documents.map(t => databases.deleteDocument(DATABASE_ID, COLLECTION_INVITATION_TOKENS, t.$id)));
        } catch (e) { }

        return { success: true };

    } catch (error: any) {
        console.error("[SYS-DIRECTOR] Failed to process student baja:", error);
        return { success: false, error: "Error al tramitar la baja del alumno." };
    }
}

/**
 * Creates a new student profile or reactivates an existing one if it was previously deactivated.
 */
export async function handleCreateOrReactivateStudent(form: any) {
    if (!form.email) return { success: false, error: "Email requerido para el alta." };

    const { databases, users } = await createAdminClient();

    try {
        const emailLower = form.email.toLowerCase();

        // 1. Check for existing profile (including inactive ones)
        const existingProfiles = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_PROFILES,
            [sdk.Query.equal("email", emailLower), sdk.Query.limit(1)]
        );

        if (existingProfiles.total > 0) {
            const profile = existingProfiles.documents[0];

            // If it's already active, we don't do anything
            if (profile.is_active !== false && profile.status !== "Baja") {
                return { success: false, error: "Ya existe un alumno activo con este correo electrónico." };
            }

            // REACTIVATION CASE
            console.log(`[SYS-DIRECTOR] Reactivating student: ${emailLower}`);

            // Automate payment status check
            const d = new Date();
            const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            
            const existingPayment = await databases.listDocuments(DATABASE_ID, COLLECTION_PAYMENTS, [
                sdk.Query.equal("student_id", profile.$id),
                sdk.Query.equal("month", currentMonthStr),
                sdk.Query.limit(1)
            ]);

            const hasPaid = existingPayment.total > 0;
            const originalMethod = hasPaid ? existingPayment.documents[0].method : null;

            const updatedProfile = await databases.updateDocument(DATABASE_ID, COLLECTION_PROFILES, profile.$id, {
                is_active: true,
                status: "Activa",
                name: form.name,
                last_name: form.lastName,
                phone: form.phone || profile.phone,
                level: form.level || profile.level
            });

            // Unlock Auth account
            try {
                await users.updateStatus(profile.user_id, true);
                console.log(`[SYS-DIRECTOR] Auth account unlocked: ${profile.user_id}`);
            } catch (authErr: any) {
                console.warn(`[SYS-DIRECTOR] Auth unlock skipped (might not have auth yet): ${authErr.message}`);
            }

            return { success: true, profile: JSON.parse(JSON.stringify(updatedProfile)), reactivated: true };
        }

        // 2. NEW CREATION CASE
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
        console.error("[SYS-DIRECTOR] Error in student creation/reactivation:", error);
        return { success: false, error: "Hubo un problema procesando el alta del alumno." };
    }
}


/**
 * NEW: Atomic Book Class (Server Side)
 * 1 Network Call vs 3 Client-side calls.
 */
export async function bookClassAction(classId: string, userId: string) {
    if (!classId || !userId) return { success: false, error: "Faltan datos de reserva." };

    const { databases } = await createAdminClient();

    try {
        // 1. Check capacity (1 read)
        const freshClass = await databases.getDocument(DATABASE_ID, COLLECTION_CLASSES, classId);
        if (freshClass.registeredCount >= freshClass.capacity) {
            return { success: false, error: "Clase Llena", code: "FULL" };
        }

        // 2. Increment count (1 write)
        await databases.updateDocument(DATABASE_ID, COLLECTION_CLASSES, classId, {
            registeredCount: (freshClass.registeredCount || 0) + 1
        });

        // 3. Create booking (1 write)
        const booking = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_BOOKINGS,
            sdk.ID.unique(),
            {
                student_id: userId,
                class_id: classId
            }
        );
        revalidateTag("clases");
        return { success: true, booking: JSON.parse(JSON.stringify(booking)) };

    } catch (error: any) {
        console.error("[bookClassAction] Error:", error.message);
        return { success: false, error: "No se pudo completar la reserva." };
    }
}

/**
 * NEW: Atomic Cancel Booking (Server Side)
 * 1 Network Call vs 3 Client-side calls.
 */
export async function cancelBookingAction(classId: string, bookingId: string) {
    if (!classId || !bookingId) return { success: false, error: "Faltan datos para anular." };

    const { databases } = await createAdminClient();

    try {
        // 1. Decrement count (1 write + 1 read internally by Appwrite usually)
        const freshClass = await databases.getDocument(DATABASE_ID, COLLECTION_CLASSES, classId);
        await databases.updateDocument(DATABASE_ID, COLLECTION_CLASSES, classId, {
            registeredCount: Math.max(0, (freshClass.registeredCount || 1) - 1)
        });

        // 2. Delete booking (1 write)
        await databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, bookingId);
        revalidateTag("clases");
        return { success: true };
    } catch (error: any) {
        console.error("[cancelBookingAction] Error:", error.message);
        return { success: false, error: "No se pudo anular la reserva." };
    }
}

/**
 * NEW: Update Student Profile (Server Side)
 * 1 Network Call vs Multiple Client-side calls.
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
        console.error("[updateStudentProfileAction] Error:", error.message);
        return { success: false, error: "No se pudo actualizar el perfil." };
    }
}

/**
 * NEW: Mark Notification as Read (Server Side)
 */
export async function markNotificationAsReadAction(userId: string, notificationId: string) {
    if (!userId || !notificationId) return { success: false, error: "Faltan datos." };
    const { databases } = await createAdminClient();
    try {
        await databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS_READ, sdk.ID.unique(), {
            user_id: userId,
            notification_id: notificationId,
            read_at: new Date().toISOString()
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * NEW: Mark All Notifications as Read (Server Side)
 */
export async function markAllNotificationsAsReadAction(userId: string, notificationIds: string[]) {
    if (!userId || !notificationIds.length) return { success: false, error: "Sin notificaciones." };
    const { databases } = await createAdminClient();
    try {
        const promises = notificationIds.map(id => 
            databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS_READ, sdk.ID.unique(), {
                user_id: userId,
                notification_id: id,
                read_at: new Date().toISOString()
            })
        );
        await Promise.all(promises);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * NEW: Publish Announcement (Server Side)
 */
export async function publishAnnouncementAction(data: { title: string, content: string, type: string }) {
    if (!data.title || !data.content) return { success: false, error: "Título y contenido requeridos." };
    const { databases } = await createAdminClient();
    try {
        const res = await databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, sdk.ID.unique(), {
            title: data.title,
            content: data.content,
            type: data.type,
            createdAt: new Date().toISOString()
        });
        revalidateTag("anuncios");
        return { success: true, data: JSON.parse(JSON.stringify(res)) };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Delete announcement (Server Side)
 */
export async function deleteAnnouncement(id: string) {
    const { databases } = await createAdminClient();
    try {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, id);
        revalidateTag("anuncios");
        return { success: true };

    } catch (error: any) {
        console.error("Error deleting announcement:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Create a new class (Server Side)
 */
export async function createClassServer(newClass: any) {
    const { databases } = await createAdminClient();
    try {
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
        revalidateTag("clases");
        return JSON.parse(JSON.stringify({ success: true, class: created }));

    } catch (error: any) {
        console.error("Error creating class server-side:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Auto-generate next week's classes (Mon-Fri)
 * This logic identifies the upcoming week and populates standard slots.
 * Includes a per-slot duplicate check to ensure idempotency.
 */
export async function autoGenerateNextWeekClasses() {
    const { databases } = await createAdminClient();

    try {
        const today = new Date();
        // Calculate Next Monday
        const nextMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));

        const generatedClasses = [];
        const slots = ["10:00 - 11:00", "18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00", "21:00 - 22:00"];

        console.log(`[AUTO-GEN] Will process week starting at: ${nextMonday.toDateString()}`);

        for (let i = 0; i < 5; i++) { // Mon to Fri
            const date = new Date(nextMonday);
            date.setDate(nextMonday.getDate() + i);

            // Adjust to local ISO date string correctly
            const tzOffset = date.getTimezoneOffset() * 60000;
            const dStr = new Date(date.getTime() - tzOffset).toISOString().split('T')[0];

            console.log(`[AUTO-GEN] Checking date: ${dStr}`);

            // Determine Discipline (Sparring on Wednesdays)
            const isWednesday = date.getDay() === 3;
            const name = isWednesday ? "Sparring" : "Boxeo y K1";

            for (const time of slots) {
                // 1. DUPLICATE CHECK: Does this slot already exist for this date?
                const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [
                    sdk.Query.equal("date", dStr),
                    sdk.Query.equal("time", time),
                    sdk.Query.limit(1)
                ]);

                if (existing.total === 0) {
                    console.log(`[AUTO-GEN] Creating slot: ${dStr} ${time}`);
                    // 2. CREATE: Slot is free
                    const newClass = await databases.createDocument(
                        DATABASE_ID,
                        COLLECTION_CLASSES,
                        sdk.ID.unique(),
                        {
                            name,
                            date: dStr,
                            time,
                            coach: "Álex Pintor",
                            capacity: 30,
                            registeredCount: 0,
                            status: "Activa"
                        }
                    );
                    generatedClasses.push(newClass);
                }
            }
        }
        revalidateTag(CACHE_TAGS.CLASSES);
        return {
            success: true,
            count: generatedClasses.length,
            classes: JSON.parse(JSON.stringify(generatedClasses))
        };

    } catch (error: any) {
        console.error("[AUTO-GEN] Critical failure during week generation:", error);
        return { success: false, error: "Error sistémico al generar la semana." };
    }
}

/**
 * Fetch all revenue records for historical view
 */
export async function getAllRevenueRecords() {
    const { databases } = await createAdminClient();
    try {
        const revenue = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_REVENUE,
            [sdk.Query.limit(5000), sdk.Query.orderDesc("month")]
        );
        return { success: true, documents: JSON.parse(JSON.stringify(revenue.documents)) };
    } catch (error: any) {
        console.error("Error fetching all revenue:", error);
        return { success: false, error: error.message };
    }
}


/**
 * Ensures a revenue record exists for the current month AND resets all pupil payment statuses.
 * 1. Creates document for "YYYY-MM" if missing.
 * 2. Sets is_paid: false for all non-admin profiles.
 */
export async function ensureMonthlyRevenueRecord() {
    try {
        const { databases } = await createAdminClient();
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const monthKey = `${year}-${month}`;

        let syncSummary = "";

        // --- SECTION 1: REVENUE RECORD ---
        const existing = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_REVENUE,
            [sdk.Query.equal("month", monthKey)]
        );

        if (existing.total === 0) {
            console.log(`[REVENUE-SYNC] Initializing ${monthKey}...`);
            await databases.createDocument(
                DATABASE_ID,
                COLLECTION_REVENUE,
                sdk.ID.unique(),
                { mes: monthKey, amount: 0 }
            );
            syncSummary += `Record created for ${monthKey}. `;
        } else {
            syncSummary += `Record already exists for ${monthKey}. `;
        }

        // --- SECTION 2: STUDENT PAYMENT RESET ---
        console.log(`[REVENUE-SYNC] Starting monthly payment reset for all students...`);
        let offset = 0;
        const limit = 100;
        let totalReset = 0;
        let hasMore = true;

        while (hasMore) {
            const batch = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_PROFILES,
                [sdk.Query.limit(limit), sdk.Query.offset(offset)]
            );

            const studentsToReset = batch.documents.filter(p => p.role !== "admin" && p.is_paid !== false);

            if (studentsToReset.length > 0) {
                await Promise.all(
                    studentsToReset.map(p =>
                        databases.updateDocument(DATABASE_ID, COLLECTION_PROFILES, p.$id, { is_paid: false })
                    )
                );
                totalReset += studentsToReset.length;
                console.log(`[REVENUE-SYNC] Reset ${totalReset} students so far...`);
            }

            if (batch.documents.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
            }
        }

        syncSummary += `Payment status reset for ${totalReset} students.`;
        return { success: true, message: syncSummary };

    } catch (error: any) {
        console.error("[REVENUE-SYNC] Global failure:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Bulk updates all non-admin profiles to set is_paid: true.
 * Useful for administrative resets or collective payment management.
 */
export async function markAllStudentsAsPaid() {
    try {
        const { databases } = await createAdminClient();

        console.log(`[BULK-PAID] Starting bulk payment update (Paid)...`);
        let offset = 0;
        const limit = 100;
        let totalUpdated = 0;
        let hasMore = true;

        while (hasMore) {
            const batch = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_PROFILES,
                [sdk.Query.limit(limit), sdk.Query.offset(offset)]
            );

            const toUpdate = batch.documents.filter(p => p.role !== "admin" && p.is_paid !== true);

            if (toUpdate.length > 0) {
                await Promise.all(
                    toUpdate.map(p =>
                        databases.updateDocument(DATABASE_ID, COLLECTION_PROFILES, p.$id, { is_paid: true })
                    )
                );
                totalUpdated += toUpdate.length;
                console.log(`[BULK-PAID] Marked ${totalUpdated} students as paid...`);
            }

            if (batch.documents.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
            }
        }

        return { success: true, message: `Se han marcado ${totalUpdated} alumnos como pagados.` };

    } catch (error: any) {
        console.error("[BULK-PAID] Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * PASO 2: Obtener datos del Dashboard sincronizados con pagos reales.
 */
export async function getAdminDashboardData(month?: string) {
    const { databases } = await createAdminClient();
    
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const currentMonthStr = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // 1. Fetch Summary Data (Lightweight)
        const [profilesCountData, classesData, announcementsData, currentMonthPayments] = await Promise.all([
            // Solo obtenemos el TOTAL, no los documentos (limit 1)
            databases.listDocuments(DATABASE_ID, COLLECTION_PROFILES, [sdk.Query.limit(1), sdk.Query.equal("is_active", true)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [
                sdk.Query.greaterThanEqual("date", thirtyDaysAgo),
                sdk.Query.lessThanEqual("date", thirtyDaysAhead),
                sdk.Query.limit(500),
                sdk.Query.orderAsc("date")
            ]),
            getAnnouncementsCached(),
            databases.listDocuments(DATABASE_ID, COLLECTION_PAYMENTS, [sdk.Query.equal("month", currentMonthStr), sdk.Query.limit(500)])
        ]);

        // 2. Sum real payments for revenue
        const totalRevenue = currentMonthPayments.documents.reduce((acc, p: any) => acc + (p.amount || 0), 0);
        const totalStudents = profilesCountData.total;
        
        // El conteo de impagos es aproximado: (Total Activos - Pagos Únicos realizados)
        // Esto ahorra 100+ lecturas de perfiles en cada login.
        const paidStudentsCount = new Set(currentMonthPayments.documents.map((p: any) => p.student_id)).size;
        const unpaidCount = Math.max(0, totalStudents - paidStudentsCount);

        return {
            success: true,
            totalStudents,
            unpaidCount,
            totalRevenue,
            classes: JSON.parse(JSON.stringify(classesData.documents)),
            announcements: JSON.parse(JSON.stringify(announcementsData)),
            currentMonth: currentMonthStr
        };

    } catch (error: any) {
        console.error("[getAdminDashboardData] Error detectado:", error.message);
        return { success: false, error: `Error en el servidor: ${error.message}` };
    }
}

/**
 * Fetch full list of students only when needed (Directory Tab)
 */
export async function getAdminStudentsList(month?: string) {
    const { databases } = await createAdminClient();
    const d = new Date();
    const currentMonthStr = month || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    try {
        const [profilesData, currentMonthPayments] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTION_PROFILES, [sdk.Query.limit(500), sdk.Query.equal("is_active", true)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_PAYMENTS, [sdk.Query.equal("month", currentMonthStr), sdk.Query.limit(500)]),
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
 * Fetch attendees for a specific class on-demand.
 * Reduces initial read count by hundreds of documents.
 */
export async function getClassAttendees(classId: string) {
    if (!classId) return { success: false, error: "ID de clase requerido." };
    const { databases } = await createAdminClient();
    try {
        const bookings = await databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [
            sdk.Query.equal("class_id", classId),
            sdk.Query.limit(100)
        ]);
        return { success: true, documents: JSON.parse(JSON.stringify(bookings.documents)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * PASO 5: Registrar un nuevo pago (Dual: payments + ingresos)
 */
export async function recordPaymentAction(studentId: string, amount: number, method: string, month?: string) {
    const { databases } = await createAdminClient();
    
    try {
        const d = new Date();
        const currentMonthStr = month || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        // 1. Create payment document
        await databases.createDocument(DATABASE_ID, COLLECTION_PAYMENTS, sdk.ID.unique(), {
            student_id: studentId,
            amount: amount,
            method: method,
            month: currentMonthStr
        });

        // 2. Update/Create Revenue
        // ⚡️ OPTIMIZACIÓN - Usamos el mes como ID determinista.
        try {
            const revDoc = await databases.getDocument(DATABASE_ID, COLLECTION_REVENUE, currentMonthStr);
            await databases.updateDocument(DATABASE_ID, COLLECTION_REVENUE, currentMonthStr, {
                amount: (revDoc.amount || 0) + amount
            });
        } catch (updateError: any) {
            if (updateError.code === 404) {
                 await databases.createDocument(DATABASE_ID, COLLECTION_REVENUE, currentMonthStr, {
                    month: currentMonthStr,
                    amount: amount
                });
            } else {
                throw updateError;
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error("[recordPaymentAction] Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * PASO 5: Eliminar un pago (Dual: payments + ingresos)
 */
export async function deletePaymentAction(studentId: string, month?: string) {
    const { databases } = await createAdminClient();
    
    try {
        const d = new Date();
        const currentMonthStr = month || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        // 1. Find the payment
        const payments = await databases.listDocuments(DATABASE_ID, COLLECTION_PAYMENTS, [
            sdk.Query.equal("student_id", studentId),
            sdk.Query.equal("month", currentMonthStr),
            sdk.Query.limit(1)
        ]);

        if (payments.total === 0) {
            return { success: false, error: "No se encontró ningún pago para este alumno en el mes actual." };
        }

        const paymentDoc = payments.documents[0];
        const amountToDeduct = paymentDoc.amount;

        // 2. Delete payment document
        await databases.deleteDocument(DATABASE_ID, COLLECTION_PAYMENTS, paymentDoc.$id);

        // 3. Update Revenue
        try {
            // ⚡️ OPTIMIZACIÓN - Usamos ID determinista.
            const revDoc = await databases.getDocument(DATABASE_ID, COLLECTION_REVENUE, currentMonthStr);
            await databases.updateDocument(DATABASE_ID, COLLECTION_REVENUE, currentMonthStr, {
                amount: Math.max(0, (revDoc.amount || 0) - amountToDeduct)
            });
        } catch (revError: any) {
            // Fallback silencioso si el documento de ingresos no existe
            console.warn("[deletePaymentAction] Revenue record not found for update:", currentMonthStr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("[deletePaymentAction] Error:", error);
        return { success: false, error: error.message };
    }
}

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

/**
 * 🚀 MEGA-ACTION: Get Complete User Data (Consolidated Load)
 * The ONLY call needed to boot the app for a student.
 */
export async function getCompleteUserData(userId: string) {
    if (!userId) return { success: false, error: "ID de usuario requerido." };

    try {
        const { databases } = await createAdminClient();
        const now = new Date();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Fetch everything in parallel with optimized selection
        const [profile, classes, bookings, payments, announcements, readData] = await Promise.all([
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
                sdk.Query.select(["$id"])
            ]),
            getAnnouncementsCached(),
            databases.listDocuments(DATABASE_ID, COLLECTION_NOTIFICATIONS_READ, [
                sdk.Query.equal("user_id", userId),
                sdk.Query.limit(200),
                sdk.Query.select(["notification_id"])
            ])
        ]);

        return {
            success: true,
            data: JSON.parse(JSON.stringify({
                profile: { ...profile, is_paid: payments.total > 0 },
                isAdmin: profile.role === "admin",
                classes: classes,
                userBookings: bookings.documents,
                announcements: announcements,
                readNotifications: readData.documents.map((r: any) => r.notification_id)
            }))
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * ⚡️ CACHED: Get Available Classes (Next.js Global Cache)
 */
const getAvailableClassesCached = unstable_cache(
    async () => {
        const { databases } = await createAdminClient();
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString();
        const sixtyDaysAhead = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [
            sdk.Query.greaterThanEqual("date", thirtyDaysAgo),
            sdk.Query.lessThanEqual("date", sixtyDaysAhead),
            sdk.Query.limit(500),
            sdk.Query.orderAsc("date")
        ]);
        return res.documents;
    },
    ["clases-disponibles"],
    { revalidate: 600, tags: [CACHE_TAGS.CLASSES] }
);

/**
 * ⚡️ CACHED: Get Announcements (Next.js Global Cache)
 */
const getAnnouncementsCached = unstable_cache(
    async () => {
        const { databases } = await createAdminClient();
        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_NOTIFICATIONS, [
            sdk.Query.orderDesc("$createdAt"),
            sdk.Query.limit(20)
        ]);
        return res.documents;
    },
    ["anuncios-globales"],
    { revalidate: 3600, tags: [CACHE_TAGS.ANNOUNCEMENTS] }
);

/**
 * Atomic Class Deletion (Class + Bookings)
 * Consolidates network calls to a single server operation.
 */
export async function deleteClassAction(classId: string) {
    if (!classId) return { success: false, error: "ID de clase requerido." };

    const { databases } = await createAdminClient();

    try {
        // 1. Find all related bookings
        const bookingsList = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_BOOKINGS,
            [sdk.Query.equal("class_id", classId), sdk.Query.limit(500)]
        );

        // 2. Delete bookings in parallel
        if (bookingsList.total > 0) {
            const deletePromises = bookingsList.documents.map(b => 
                databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, b.$id)
            );
            await Promise.all(deletePromises);
        }

        // 3. Delete the class itself
        await databases.deleteDocument(DATABASE_ID, COLLECTION_CLASSES, classId);
        revalidateTag(CACHE_TAGS.CLASSES);
        return { success: true };
    } catch (error: any) {
        console.error("[deleteClassAction] Error:", error.message);
        return { success: false, error: error.message };
    }
}
