"use server";

import * as sdk from "node-appwrite";
import { DATABASE_ID, COLLECTION_PROFILES, COLLECTION_INVITATION_TOKENS, COLLECTION_BOOKINGS } from "@/lib/appwrite";
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

        // 3. Delete all student Bookings
        try {
            const bookingsList = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_BOOKINGS,
                [sdk.Query.equal("student_id", userId), sdk.Query.limit(500)]
            );
            if (bookingsList.total > 0) {
                await Promise.all(bookingsList.documents.map(b =>
                    databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, b.$id)
                ));
                console.log(`[ACL] Cleaned up ${bookingsList.total} bookings.`);
            }
        } catch (bookingCleanupError) {
            console.warn("[ACL] Booking cleanup warning:", bookingCleanupError);
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
