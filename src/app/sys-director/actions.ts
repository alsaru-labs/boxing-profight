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

    // 1. Initialize Server SDK
    const { databases, users } = await createAdminClient();


    try {
        // 2. Delete from Auth (Primary Action)
        // If the user doesn't exist in Auth (e.g., deleted manually), we proceed with profile deletion
        try {
            await users.delete(userId);
            console.log(`[ACL] User deleted from Auth: ${userId}`);
        } catch (authError: any) {
            console.warn(`[ACL] Auth removal skipped (User not found or already deleted): ${authError.message}`);
        }

        // 3. Delete all student Bookings and LIBERATE class spots
        try {
            const bookingsList = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_BOOKINGS,
                [sdk.Query.equal("student_id", userId), sdk.Query.limit(500)]
            );

            if (bookingsList.total > 0) {
                // We clean each booking and update the associated class count
                for (const booking of bookingsList.documents) {
                    try {
                        // 3.1 Decrement registeredCount in the Class document
                        if (booking.class_id) {
                            try {
                                const classDoc = await databases.getDocument(DATABASE_ID, COLLECTION_CLASSES, booking.class_id);
                                await databases.updateDocument(DATABASE_ID, COLLECTION_CLASSES, booking.class_id, {
                                    registeredCount: Math.max(0, (classDoc.registeredCount || 1) - 1)
                                });
                            } catch (classFetchError) {
                                console.warn(`[ACL] Class ${booking.class_id} not found, skipping capacity update.`);
                            }
                        }
                        
                        // 3.2 Delete the Booking document
                        await databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, booking.$id);
                    } catch (itemError) {
                        console.warn(`[ACL] Failed to cleanup single booking ${booking.$id}:`, itemError);
                    }
                }
                console.log(`[ACL] Cleaned up ${bookingsList.total} bookings and updated class capacities.`);
            }
        } catch (bookingCleanupError) {
            console.warn("[ACL] Booking cleanup general warning:", bookingCleanupError);
        }

        // 4. Delete from Database Profiles
        await databases.deleteDocument(DATABASE_ID, COLLECTION_PROFILES, profileId);
        console.log(`[ACL] Profile document deleted: ${profileId}`);

        // 5. Cleanup Invitation Tokens
        try {
            const tokensList = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_INVITATION_TOKENS,
                [sdk.Query.equal("user_id", userId)]
            );
            if (tokensList.total > 0) {
                await Promise.all(tokensList.documents.map(t => 
                    databases.deleteDocument(DATABASE_ID, COLLECTION_INVITATION_TOKENS, t.$id)
                ));
                console.log(`[ACL] Cleaned up ${tokensList.total} invitation tokens.`);
            }
        } catch (tokenCleanupError) {
            console.warn("[ACL] Invitation token cleanup failed, but main deletion succeeded.");
        }


        return { success: true };

    } catch (error: any) {
        console.error("[ACL] Failed to delete student account:", error);
        return { 
            success: false, 
            error: "Error técnico al procesar la baja. Asegúrate de tener permisos de administrador." 
        };
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
