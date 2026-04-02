"use server";

import * as sdk from "node-appwrite";
import { DATABASE_ID, COLLECTION_PROFILES, COLLECTION_INVITATION_TOKENS, COLLECTION_BOOKINGS, COLLECTION_CLASSES, COLLECTION_NOTIFICATIONS, COLLECTION_REVENUE, COLLECTION_PAYMENTS } from "@/lib/appwrite";
import { createAdminClient, checkPaymentStatus } from "@/lib/server/appwrite";

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
 * Delete announcement (Server Side)
 */
export async function deleteAnnouncement(id: string) {
    const { databases } = await createAdminClient();
    try {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, id);
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
        const d = new Date();
        const currentMonthStr = month || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        // 1. Fetch all primary data
        const [profilesData, classesData, announcementsData, currentMonthPayments, bookingsData] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTION_PROFILES, [sdk.Query.limit(500), sdk.Query.equal("is_active", true)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [sdk.Query.limit(500), sdk.Query.orderAsc("date")]),
            databases.listDocuments(DATABASE_ID, COLLECTION_NOTIFICATIONS, [sdk.Query.orderDesc("$createdAt"), sdk.Query.limit(20)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_PAYMENTS, [sdk.Query.equal("month", currentMonthStr), sdk.Query.limit(500)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [sdk.Query.limit(5000)]) // Carga masiva para total zero-fetch
        ]);

        // 2. Sum real payments for revenue
        const totalRevenue = currentMonthPayments.documents.reduce((acc, p: any) => acc + (p.amount || 0), 0);
        const paidStudentsSet = new Set(currentMonthPayments.documents.map((p: any) => p.student_id));
        const paymentMethodsMap = new Map(currentMonthPayments.documents.map((p: any) => [p.student_id, p.method]));
        
        const students = profilesData.documents
            .filter((p: any) => p.role !== "admin")
            .map((p: any) => ({
                ...p,
                is_paid: paidStudentsSet.has(p.$id),
                payment_method: paymentMethodsMap.get(p.$id) || null
            }));

        return {
            success: true,
            students: JSON.parse(JSON.stringify(students)),
            classes: JSON.parse(JSON.stringify(classesData.documents)),
            announcements: JSON.parse(JSON.stringify(announcementsData.documents)),
            bookings: JSON.parse(JSON.stringify(bookingsData.documents)),
            totalRevenue,
            currentMonth: currentMonthStr
        };

    } catch (error: any) {
        console.error("[getAdminDashboardData] Error detectado:", error.message);
        return { success: false, error: `Error en el servidor: ${error.message}` };
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
        try {
            const revData = await databases.listDocuments(DATABASE_ID, COLLECTION_REVENUE, [
                sdk.Query.equal("month", currentMonthStr),
                sdk.Query.limit(1)
            ]);

            if (revData.total > 0) {
                const doc = revData.documents[0];
                await databases.updateDocument(DATABASE_ID, COLLECTION_REVENUE, doc.$id, {
                    amount: (doc.amount || 0) + amount
                });
            } else {
                await databases.createDocument(DATABASE_ID, COLLECTION_REVENUE, sdk.ID.unique(), {
                    month: currentMonthStr,
                    amount: amount
                });
            }
        } catch (revError) {
            console.error("[recordPaymentAction] Revenue update failed:", revError);
            // We don't throw here to avoid full rollback if accounting fails but payment is recorded?
            // Actually, the user asked for handling errors to avoid desynchronization.
            throw new Error("Error al actualizar la contabilidad de ingresos.");
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
            const revData = await databases.listDocuments(DATABASE_ID, COLLECTION_REVENUE, [
                sdk.Query.equal("month", currentMonthStr),
                sdk.Query.limit(1)
            ]);

            if (revData.total > 0) {
                const doc = revData.documents[0];
                await databases.updateDocument(DATABASE_ID, COLLECTION_REVENUE, doc.$id, {
                    amount: Math.max(0, (doc.amount || 0) - amountToDeduct)
                });
            }
        } catch (revError) {
            console.error("[deletePaymentAction] Revenue update failed:", revError);
            throw new Error("Error al descontar el importe de la contabilidad.");
        }

        return { success: true };
    } catch (error: any) {
        console.error("[deletePaymentAction] Error:", error);
        return { success: false, error: error.message };
    }
}

