import { Client, Account, Databases, Users } from "node-appwrite";
import { cookies } from "next/headers";

export async function createSessionClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1")
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session || !session.value) {
    throw new Error("No hay sesión activa");
  }

  client.setSession(session.value);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
  };
}

export async function createAdminClient() {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1";
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  
  // En Netlify, el prefijo NEXT_ es a veces el único que sobrevive el filtrado de secretos en runtime.
  // NO usamos NEXT_PUBLIC_ para evitar exponerlo en el cliente.
  const apiKey = process.env.NEXT_BOXING_AWR_KEY || process.env.BOXING_AWR_KEY || process.env.APPWRITE_API_KEY;

  if (!apiKey) {
    throw new Error("Configuración incompleta: No se han encontrado las claves de acceso (NEXT_BOXING_AWR_KEY / BOXING_AWR_KEY / APPWRITE_API_KEY).");
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
    get users() {
      return new Users(client);
    },
  };
}

/**
 * Diagnostic helper to safely check if the server is correctly configured.
 */
export async function getAppwriteConfigStatus() {
  const keyUsed = process.env.NEXT_BOXING_AWR_KEY || process.env.BOXING_AWR_KEY || process.env.APPWRITE_API_KEY;
  return {
    hasProjectId: !!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    hasApiKey: !!keyUsed,
    apiKeyLength: keyUsed?.length || 0,
    apiKeyPrefixName: !!process.env.NEXT_BOXING_AWR_KEY ? "NEXT_BOXING" : !!process.env.BOXING_AWR_KEY ? "BOXING" : "APPWRITE",
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1",
  };
}
