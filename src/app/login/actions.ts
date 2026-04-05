"use server";

import * as sdk from "node-appwrite";
import crypto from "crypto";
import { 
    DATABASE_ID, 
    COLLECTION_PROFILES,
    COLLECTION_INVITATION_TOKENS
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

            return { success: true, role: profile.role };

        } catch (profileError) {
            console.error("[validateLoginStatusAction] Profile not found for userId:", userId, profileError);
            return { success: false, error: "Error técnico: Perfil no encontrado." };
        }

    } catch (error: any) {
        console.error("[validateLoginStatusAction] Unexpected error:", error.message);
        return { success: false, error: "Error al validar el estado de la cuenta." };
    }
}

/**
 * 🔑 RESETEO DE CONTRASEÑA (SERVER-SIDE)
 * Genera un token de recuperación y dispara el email vía la Appwrite Function.
 * SEGURIDAD: Siempre devuelve éxito al frontend (prevención de enumeración).
 */
export async function requestPasswordResetAction(email: string) {
    const cleanEmail = (email || "").toLowerCase().trim();
    
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return { success: false, error: "Por favor, introduce un email válido." };
    }

    try {
        const { databases, functions } = await createAdminClient();

        // 1. Buscar el perfil por email
        const profilesResult = await databases.listDocuments(DATABASE_ID, COLLECTION_PROFILES, [
            sdk.Query.equal("email", cleanEmail),
            sdk.Query.limit(1)
        ]);

        // 👮 SEGURIDAD: No revelar si el email existe o no
        if (profilesResult.total === 0) {
            console.log(`[PasswordReset] Email not found (silent): ${cleanEmail}`);
            return { success: true }; // Respuesta genérica
        }

        const profile = profilesResult.documents[0];

        // No permitir reset a cuentas de baja (silente)
        if (profile.status === "Baja") {
            console.log(`[PasswordReset] Account is Baja (silent): ${cleanEmail}`);
            return { success: true }; // Respuesta genérica
        }

        // 2. Generar token seguro (1h de validez — más corto que invitación)
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1h (seguridad más estricta)

        await databases.createDocument(DATABASE_ID, COLLECTION_INVITATION_TOKENS, sdk.ID.unique(), {
            token,
            user_id: profile.$id,
            expires_at: expiresAt.toISOString()
        });

        // 3. Construir URL del enlace mágico
        const publicDomain = (process.env.PUBLIC_DOMAIN || "http://localhost:3000").replace(/\/$/, "");
        const tokenUrl = `${publicDomain}/set-password?token=${token}`;

        // 4. Disparar la Function de Appwrite (Servicio Centralizado de Emails)
        const functionId = process.env.INVITE_FUNCTION_ID;
        if (!functionId) {
            console.error("[PasswordReset] INVITE_FUNCTION_ID is not configured.");
            return { success: true }; // No exponer errores de config al frontend
        }

        await functions.createExecution(
            functionId,
            JSON.stringify({
                type: "password_reset",
                email: cleanEmail,
                name: profile.name || "Alumno",
                tokenUrl
            }),
            false, // async = false: esperamos la confirmación
            "/",
            sdk.ExecutionMethod.POST
        );

        console.log(`[PasswordReset] Reset email dispatched for: ${cleanEmail}`);

    } catch (err: any) {
        // No exponer detalles técnicos al usuario
        console.error("[PasswordReset] Internal error:", err.message);
    }

    // SIEMPRE devolver éxito para prevenir enumeración
    return { success: true };
}
