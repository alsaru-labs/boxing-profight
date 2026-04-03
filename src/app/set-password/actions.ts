"use server";

import * as sdk from "node-appwrite";
import crypto from "crypto";
import { DATABASE_ID, COLLECTION_INVITATION_TOKENS, COLLECTION_PROFILES } from "@/lib/appwrite";
import { createAdminClient } from "@/lib/server/appwrite";
import { cookies } from "next/headers";

/**
 * Server Action para establecer la contraseña inicial
 */
export async function setPasswordWithToken(token: string, password: string) {
  try {
    if (!token || token.length < 5) {
      return { success: false, error: "Token de invitación no válido." };
    }

    if (!password || password.length < 8) {
      return { success: false, error: "La contraseña debe tener al menos 8 caracteres." };
    }

    const { databases, users } = await createAdminClient();

    // 1. Buscar el token en la base de datos
    const tokenResult = await databases.listDocuments({
      databaseId: DATABASE_ID,
      collectionId: COLLECTION_INVITATION_TOKENS,
      queries: [
        sdk.Query.equal("token", token),
        sdk.Query.limit(1)
      ]
    });

    if (tokenResult.total === 0) {
      return { success: false, error: "Este enlace de invitación ya no es válido o ya ha sido usado." };
    }

    const tokenDoc = tokenResult.documents[0];

    // 2. Verificar expiración (48h)
    const expiresAt = new Date(tokenDoc.expires_at).getTime();
    if (Date.now() > expiresAt) {
      // Opcional: Borrar token caducado
      await databases.deleteDocument(DATABASE_ID, COLLECTION_INVITATION_TOKENS, tokenDoc.$id);
      return { success: false, error: "Este enlace de invitación ha caducado (48h)." };
    }

    // 3. Obtener Email del Perfil (necesario si hay que crear el usuario en Auth)
    let userEmail = "";
    let userName = "";
    try {
        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_PROFILES, tokenDoc.user_id);
        userEmail = profile.email;
        userName = profile.name;
    } catch (e) {
        return { success: false, error: "No se pudo encontrar el perfil asociado a esta invitación." };
    }

    // 4. Update Auth User Password (or CREATE if it's the first time)
    try {
        // Try to update existing user
        await users.updatePassword(tokenDoc.user_id, password);
    } catch (e: any) {
        // If user doesn't exist (404), we create it now
        if (e.code === 404) {
            await users.create(tokenDoc.user_id, userEmail, undefined, password, userName);
        } else {
            throw e;
        }
    }

    // 🛡️ Auto-Verify Email Status
    try {
        await users.updateEmailVerification(tokenDoc.user_id, true);
    } catch (ve) {
        console.warn("[setPassword] Warning: Could not set email verification status:", ve);
    }

    // 5. Delete Token (Prevent Replay Attacks)
    await databases.deleteDocument(DATABASE_ID, COLLECTION_INVITATION_TOKENS, tokenDoc.$id);

    return { success: true };

  } catch (error: any) {
    console.error("[SET PASSWORD ERROR]", error);
    return { success: false, error: error.message || "Error al establecer la contraseña." };
  }
}

/**
 * Logout Seguro (Server-side)
 */
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  // Appwrite tokens localstorage/session se limpian en el cliente
  return { success: true };
}
