"use server";

import * as sdk from "node-appwrite";
import crypto from "crypto";
import { DATABASE_ID, COLLECTION_INVITATION_TOKENS, COLLECTION_PROFILES } from "@/lib/appwrite";
import { createAdminClient } from "@/lib/server/appwrite";
import { cookies } from "next/headers";

/**
 * timingSafeEqual for strings using Buffer to prevent Timing Attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}


export async function setPasswordWithToken(token: string, password: string, confirm: string) {
  // 1. Basic Sanitization & Validation
  if (!token || !password || !confirm) {
    return { success: false, error: "Todos los campos son obligatorios." };
  }

  if (password !== confirm) {
    return { success: false, error: "Las contraseñas no coinciden." };
  }

  if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<> ]/.test(password)) {
    return { 
      success: false, 
      error: "La contraseña es demasiado débil. Debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial." 
    };
  }

  // 1. Initialize Server SDK
  const { databases, users } = await createAdminClient();


  try {
    // 3. Retrieve Token from Database
    const tokensList = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_INVITATION_TOKENS,
      [sdk.Query.equal("token", token)]
    );

    if (tokensList.total === 0) {
      return { success: false, error: "Token inválido o ya utilizado." };
    }

    const tokenDoc = tokensList.documents[0];

    // 4. Security Checks (Timing Attack Prevention & Expiry)
    if (!timingSafeEqual(tokenDoc.token, token)) {
      return { success: false, error: "Token inválido." };
    }

    const now = new Date();
    const expiry = new Date(tokenDoc.expires_at);
    if (now > expiry) {
      return { success: false, error: "Este enlace de invitación ha caducado (48h)." };
    }

    // 5. Update Auth User Password (or CREATE if it's the first time)
    try {
        // Try to update existing user
        await users.updatePassword(tokenDoc.user_id, password);
    } catch (e: any) {
        // If user doesn't exist (404), we create it now
        if (e.code === 404) {
            const profile = await databases.getDocument(DATABASE_ID, COLLECTION_PROFILES, tokenDoc.user_id);
            await users.create(tokenDoc.user_id, profile.email, undefined, password, profile.name);
        } else {
            throw e;
        }
    }

    // 6. Delete Token (Prevent Replay Attacks)
    await databases.deleteDocument(DATABASE_ID, COLLECTION_INVITATION_TOKENS, tokenDoc.$id);

    return { success: true };

  } catch (error: any) {
    console.error("Set Password Error:", error);
    return { success: false, error: "Ha ocurrido un error de seguridad al procesar tu solicitud." };
  }
}

/**
 * Clears the session cookie to logout any existing user.
 */
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
