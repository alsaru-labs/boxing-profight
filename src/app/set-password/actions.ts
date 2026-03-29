"use server";

import * as sdk from "node-appwrite";
import crypto from "crypto";
import { DATABASE_ID, COLLECTION_INVITATION_TOKENS } from "@/lib/appwrite";
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

  if (password.length < 8) {
    return { success: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APP_SECRET_APPWRITE_KEY; // Renamed for test
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";

  const envKeys = Object.keys(process.env).filter(k => k.includes("APPWRITE") || k.includes("SECRET"));
  console.log(`[DEBUG] setPassword -> Project: ${projectId?.slice(0, 6)}... | KeyLen: ${apiKey?.length || 0} | Start: ${apiKey?.slice(0, 10)}...`);
  console.log(`[DEBUG] Available Keys: ${envKeys.join(", ")}`);

  if (!projectId || !apiKey) {
    return { success: false, error: "Servidor desconfigurado: Faltan claves de acceso (SECRET)." };
  }

  // 1. Initialize Server SDK
  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new sdk.Databases(client);
  const users = new sdk.Users(client);

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

    // 5. Update Auth User Password
    await users.updatePassword(tokenDoc.user_id, password);

    // 6. Delete Token (Prevent Replay Attacks)
    await databases.deleteDocument(DATABASE_ID, COLLECTION_INVITATION_TOKENS, tokenDoc.$id);

    return { success: true };

  } catch (error: any) {
    console.error("Set Password Error:", error);
    return { success: false, error: "Ha ocurrido un error de seguridad al procesar tu solicitud." };
  }
}
