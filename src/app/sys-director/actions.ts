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
