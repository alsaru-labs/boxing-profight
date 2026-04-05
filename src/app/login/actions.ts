"use server";

import * as sdk from "node-appwrite";
import { 
    DATABASE_ID, 
    COLLECTION_PROFILES 
} from "@/lib/appwrite";
import { createAdminClient } from "@/lib/server/appwrite";

/**
 * 🛡️ VALIDADOR DE ACCESO (SERVER-SIDE)
 * Verifica si un usuario ya autenticado tiene permiso para entrar basándose
 * en su estado en la base de datos (Colección Profiles).
 */
export async function validateLoginStatusAction(userId: string) {
    if (!userId) {
        return { success: false, error: "ID de usuario no proporcionado." };
    }

    try {
        // Usamos el cliente administrativo para consultar el perfil
        const { databases } = await createAdminClient();
        
        try {
            const profile = await databases.getDocument(DATABASE_ID, COLLECTION_PROFILES, userId);

            // 🚫 REGLA DE NEGOCIO: Bloqueo de usuarios de baja
            if (profile.status === "Baja" || profile.is_active === false) {
                return { 
                    success: false, 
                    error: "Tu cuenta ha sido dada de baja. Contacta con administración." 
                };
            }

            return { 
                success: true, 
                role: profile.role
            };

        } catch (profileError) {
            console.error("[validateLoginStatusAction] Profile not found for userId:", userId, profileError);
            return { success: false, error: "Error técnico: Perfil no encontrado." };
        }

    } catch (error: any) {
        console.error("[validateLoginStatusAction] Unexpected error:", error.message);
        return { success: false, error: "Error al validar el estado de la cuenta." };
    }
}
