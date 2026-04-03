import "server-only";
import { Client, Account, Databases, Users, Query } from "node-appwrite";
import { cookies } from "next/headers";
import { PROJECT_ID, ENDPOINT, DATABASE_ID, COLLECTION_PAYMENTS } from "@/lib/appwrite";

/**
 * Ayudante para variables de SERVIDOR (no públicas).
 * Estas sí permiten acceso dinámico porque solo corren en Node.js.
 */
function getRequiredServerEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`CRÍTICO: Falta la variable de servidor '${key}'.`);
    }
    return value;
}

/**
 * Appwrite Configuration (Server & Admin) - Validadas estricto
 */
const PUBLIC_PROJECT_ID = PROJECT_ID;
const PUBLIC_ENDPOINT = ENDPOINT;

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
  // 🥊 Buscamos primero la clave que Netlify prefiere, luego la estándar
  const rawKey = process.env.NEXT_BOXING_AWR_KEY || process.env.APPWRITE_API_KEY;

  if (!rawKey) {
    throw new Error("CRÍTICO: No se han encontrado claves SECRETAS en el servidor (Falta NEXT_BOXING_AWR_KEY o APPWRITE_API_KEY). Revisa la configuración en Netlify.");
  }

  // 🛡️ LIMPIEZA DE CLAVE: Eliminar comillas accidentales, espacios alrededor y saltos de línea
  const apiKey = rawKey.trim().replace(/['"\s]/g, "");

  if (apiKey.length < 10) {
    console.warn("[Appwrite Admin] Advertencia: La llave de API es sospechosamente corta.");
  }

  const apiKeyNameUsed = !!process.env.NEXT_BOXING_AWR_KEY ? "NEXT_BOXING_AWR_KEY" : "APPWRITE_API_KEY";
  console.log(`[Appwrite Admin] Configuring Client: Project = ${PUBLIC_PROJECT_ID}, KeySource = ${apiKeyNameUsed}`);

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
  const apiKey = process.env.NEXT_BOXING_AWR_KEY || process.env.APPWRITE_API_KEY;
  return {
    hasProjectId: !!PUBLIC_PROJECT_ID,
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    apiKeyNameUsed: !!process.env.NEXT_BOXING_AWR_KEY ? "NEXT_BOXING_AWR_KEY" : "APPWRITE_API_KEY",
    endpoint: PUBLIC_ENDPOINT,
    allRelevantKeys: Object.keys(process.env).filter(k => 
      k.includes("AWR") || k.includes("APPWRITE") || k.includes("BOXING") || k.includes("NEXT_")
    )
  };
}

/**
 * PASO 1: Helper para comprobar estado de pago de un alumno en el mes actual.
 */
export async function checkPaymentStatus(userId: string, currentMonth: string): Promise<boolean> {
    const { databases } = await createAdminClient();
    
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_PAYMENTS,
            [
                Query.equal("student_id", userId),
                Query.equal("month", currentMonth),
                Query.limit(1)
            ]
        );
        return response.total > 0;
    } catch (error) {
        console.error(`[checkPaymentStatus] Error checking payment for ${userId}:`, error);
        return false;
    }
}
