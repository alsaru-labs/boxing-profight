"use server";

import * as sdk from "node-appwrite";
import { DATABASE_ID, COLLECTION_PROFILES, COLLECTION_INVITATION_TOKENS } from "@/lib/appwrite";

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
    const client = new sdk.Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1")
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
        .setKey(process.env.APPWRITE_API_KEY!);

    const databases = new sdk.Databases(client);
    const users = new sdk.Users(client);

    try {
        // 2. Delete from Auth (Primary Action)
        // If the user doesn't exist in Auth (e.g., deleted manually), we proceed with profile deletion
        try {
            await users.delete(userId);
            console.log(`[ACL] User deleted from Auth: ${userId}`);
        } catch (authError: any) {
            console.warn(`[ACL] Auth removal skipped (User not found or already deleted): ${authError.message}`);
        }

        // 3. Delete from Database Profiles
        await databases.deleteDocument(DATABASE_ID, COLLECTION_PROFILES, profileId);
        console.log(`[ACL] Profile document deleted: ${profileId}`);

        // 4. Cleanup Invitation Tokens (Prevent orphans)
        try {
            const tokensList = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_INVITATION_TOKENS,
                [sdk.Query.equal("user_id", userId)]
            );
            
            if (tokensList.total > 0) {
                const cleanupPromises = tokensList.documents.map(t => 
                    databases.deleteDocument(DATABASE_ID, COLLECTION_INVITATION_TOKENS, t.$id)
                );
                await Promise.all(cleanupPromises);
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
