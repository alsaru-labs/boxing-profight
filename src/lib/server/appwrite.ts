import { Client, Account, Databases, Users } from "node-appwrite";
import { cookies } from "next/headers";

/**
 * Los valores públicos (Project ID y Endpoint) los hardcodeamos aquí al igual que 
 * en src/lib/appwrite.ts para reducir la dependencia de variables de entorno 
 * que puedan fallar en Netlify.
 */
const PUBLIC_PROJECT_ID = "69af4c53003151ed5830";
const PUBLIC_ENDPOINT = "https://fra.cloud.appwrite.io/v1";

export async function createSessionClient() {
  const client = new Client()
    .setEndpoint(PUBLIC_ENDPOINT)
    .setProject(PUBLIC_PROJECT_ID);

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
  // 🥊 Diagnóstico de visibilidad de variables en el Servidor
  const envKeys = Object.keys(process.env).filter(k => 
    k.includes("AWR") || k.includes("APPWRITE") || k.includes("BOXING") || k.includes("NEXT_")
  );
  console.log(`[ACL-DEBUG] Servidor detecta estas variables: ${envKeys.join(", ")}`);

  const apiKey = process.env.NEXT_BOXING_AWR_KEY || process.env.BOXING_AWR_KEY || process.env.APPWRITE_API_KEY;

  if (!apiKey) {
    throw new Error(`Configuración incompleta: No se han encontrado claves SECRETAS en el servidor. Variables detectadas: ${envKeys.join(", ")}`);
  }

  const client = new Client()
    .setEndpoint(PUBLIC_ENDPOINT)
    .setProject(PUBLIC_PROJECT_ID)
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
    hasProjectId: !!PUBLIC_PROJECT_ID,
    hasApiKey: !!keyUsed,
    apiKeyLength: keyUsed?.length || 0,
    apiKeyPrefixName: !!process.env.NEXT_BOXING_AWR_KEY ? "NEXT_BOXING" : !!process.env.BOXING_AWR_KEY ? "BOXING" : "APPWRITE",
    endpoint: PUBLIC_ENDPOINT,
    allRelevantKeys: Object.keys(process.env).filter(k => 
      k.includes("AWR") || k.includes("APPWRITE") || k.includes("BOXING") || k.includes("NEXT_")
    )
  };
}
