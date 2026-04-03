"use server";

import { Query, ID } from "node-appwrite";
import { PROJECT_ID, DATABASE_ID, COLLECTION_PROFILES } from "@/lib/appwrite";
import { createAdminClient } from "@/lib/server/appwrite";

/**
 * Administrative: Bootstrap Initial Admin (Security Utility)
 */
export async function bootstrapAdminAction(data: { name: string, lastName: string, email: string, pass: string, secret: string }) {
    const { name, lastName, email, pass, secret } = data;
    const envSecret = process.env.ADMIN_BOOTSTRAP_SECRET || "";
    // Saneamiento del secreto del sistema (eliminar comillas accidentales de .env)
    const systemSecret = envSecret.replace(/['"\s]/g, "");
    const cleanSecret = (secret || "").trim();

    if (!envSecret) {
        console.error("[Bootstrap] ERROR: ADMIN_BOOTSTRAP_SECRET no definida en el entorno del servidor.");
        return { success: false, error: "Error de Servidor: La variable ADMIN_BOOTSTRAP_SECRET no está configurada." };
    }

    if (!cleanSecret || cleanSecret !== systemSecret) {
        return { success: false, error: "Autorización fallida: El secreto universal proporcionado es incorrecto." };
    }

    try {
        const { databases, users } = await createAdminClient();

        // 1. Verificar si el email ya existe en Auth
        const existing = await users.list([Query.equal("email", [email])]);
        
        if (existing.total > 0) {
            const authUser = existing.users[0];
            await users.updatePassword(authUser.$id, pass);
            await users.updateEmailVerification(authUser.$id, true);

            const profileRes = await databases.listDocuments(
                DATABASE_ID, 
                COLLECTION_PROFILES, 
                [
                    Query.equal("email", [email.toLowerCase()]),
                    Query.limit(1)
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
                return { success: true, message: "Usuario existente promovido a Administrador y contraseña restablecida." };
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
                return { success: true, message: "Perfil administrativo creado para usuario Auth (Contraseña actualizada)." };
            }
        }

        // 2. Crear nueva cuenta completa (Auth + Profil)
        const userId = ID.unique();
        await users.create(userId, email, undefined, pass, name);
        await users.updateEmailVerification(userId, true);

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
        // Si el error dice "not authorized", damos una pista clara al usuario
        if (error.message.includes("not authorized") || error.code === 401) {
            return { 
                success: false, 
                error: "Error de autorización. Verifica tu clave de administración." 
            };
        }
        return { success: false, error: error.message };
    }
}
