"use server";

import * as sdk from "node-appwrite";
import { DATABASE_ID, COLLECTION_PROFILES, COLLECTION_INVITATION_TOKENS, COLLECTION_BOOKINGS, COLLECTION_CLASSES, COLLECTION_NOTIFICATIONS } from "@/lib/appwrite";
import { createAdminClient } from "@/lib/server/appwrite";

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
        // 1. Delete from Auth (Primary Action)
        // This prevents the user from logging in ever again.
        try {
            await users.delete(userId);
            console.log(`[SYS-DIRECTOR] User blocked from Auth: ${userId}`);
        } catch (authError: any) {
            console.warn(`[SYS-DIRECTOR] Auth removal skipped: ${authError.message}`);
        }

        // 2. Cleanup FUTURE Bookings and LIBERATE spots
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
                        const classDateTime = new Date(year, month - 1, day, hours, minutes);

                        if (classDateTime > now) {
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
            status: "Baja",
            is_paid: false // They stop paying from now on
        });
        console.log(`[SYS-DIRECTOR] Profile marked as 'Baja': ${profileId}`);

        // 4. Cleanup Invitation Tokens (No longer needed)
        try {
            const tokensList = await databases.listDocuments(DATABASE_ID, COLLECTION_INVITATION_TOKENS, [sdk.Query.equal("user_id", userId)]);
            await Promise.all(tokensList.documents.map(t => databases.deleteDocument(DATABASE_ID, COLLECTION_INVITATION_TOKENS, t.$id)));
        } catch (e) {}

        return { success: true };

    } catch (error: any) {
        console.error("[SYS-DIRECTOR] Failed to process student baja:", error);
        return { success: false, error: "Error al tramitar la baja del alumno." };
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

