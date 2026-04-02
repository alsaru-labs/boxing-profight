"use server";

import { Client, Databases, Users } from "node-appwrite";
import { PROJECT_ID, ENDPOINT, DATABASE_ID, COLLECTION_PROFILES } from "@/lib/appwrite";

/**
 * Administrative: Bootstrap Initial Admin (Security Utility)
 * Separado a acciones de configuración para evitar problemas de ID en Netlify/Next.js
 */
export async function bootstrapAdminAction(data: { name: string, lastName: string, email: string, pass: string, secret: string }) {
    const { name, lastName, email, pass, secret } = data;
    const envSecret = process.env.ADMIN_BOOTSTRAP_SECRET || "";
    // Saneamiento del secreto del sistema (eliminar comillas accidentales de .env)
    const systemSecret = envSecret.replace(/['"\s]/g, "");
    const cleanSecret = (secret || "").trim();

    if (!envSecret) {
        console.error("[Bootstrap] ERROR: ADMIN_BOOTSTRAP_SECRET no definida en el entorno del servidor.");
        return { success: false, error: "Error de Servidor: La variable ADMIN_BOOTSTRAP_SECRET no está configurada en esta plataforma (Netlify/Local)." };
    }

    if (!cleanSecret || cleanSecret !== systemSecret) {
        return { success: false, error: "Autorización fallida: El secreto universal proporcionado es incorrecto." };
    }

    // Configuración directa de cliente administrativo para el bootstrap
    const apiKey = process.env.NEXT_BOXING_AWR_KEY || process.env.APPWRITE_API_KEY;
    if (!apiKey) {
        return { success: false, error: "Error de Servidor: No hay API Key de Appwrite configurada." };
    }

    const client = new Client()
        .setEndpoint(ENDPOINT)
        .setProject(PROJECT_ID)
        .setKey(apiKey);

    const databases = new Databases(client);
    const users = new Users(client);

    try {
        // 1. Verificar si el email ya existe en Auth
        const existing = await users.list([Query.equal("email", email)]);
        const QueryLib = (await import("node-appwrite")).Query;
        
        if (existing.total > 0) {
            const authUser = existing.users[0];
            await users.updatePassword(authUser.$id, pass);

            const profileRes = await databases.listDocuments(DATABASE_ID, COLLECTION_PROFILES, [
                QueryLib.equal("email", email.toLowerCase()),
                QueryLib.limit(1)
            ]);

            if (profileRes.total > 0) {
                await databases.updateDocument(DATABASE_ID, COLLECTION_PROFILES, profileRes.documents[0].$id, {
                    name: name,
                    last_name: lastName,
                    role: "admin",
                    is_active: true,
                    status: "Activa"
                });
                return { success: true, message: "Usuario existente promovido a Administrador y contraseña restablecida." };
            } else {
                await databases.createDocument(DATABASE_ID, COLLECTION_PROFILES, authUser.$id, {
                    user_id: authUser.$id,
                    name: name,
                    last_name: lastName,
                    email: email.toLowerCase(),
                    role: "admin",
                    is_active: true,
                    status: "Activa"
                });
                return { success: true, message: "Perfil administrativo creado para usuario Auth (Contraseña actualizada)." };
            }
        }

        // 2. Crear nueva cuenta completa (Auth + Profil)
        const userId = "admin_" + Date.now();
        await users.create(userId, email, undefined, pass, name);

        await databases.createDocument(DATABASE_ID, COLLECTION_PROFILES, userId, {
            user_id: userId,
            name: name,
            last_name: lastName,
            email: email.toLowerCase(),
            role: "admin",
            is_active: true,
            status: "Activa"
        });

        return { success: true };
    } catch (error: any) {
        console.error("[Bootstrap] Error crítico:", error.message);
        return { success: false, error: error.message };
    }
}

// Emular Query de Appwrite localmente para evitar problemas de importación circular rápida
const Query = {
    equal: (key: string, val: any) => `equal("${key}", ["${val}"])`
} as any;
