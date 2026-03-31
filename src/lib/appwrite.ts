import { Client, Account, Databases } from "appwrite";

// 🌍 Appwrite Configuration (Public) - Blindado con Fail Fast Estático
// Nota: Next.js requiere acceso estático (process.env.NOMBRE) para variables NEXT_PUBLIC_ en el cliente.

if (!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) {
    throw new Error("CRÍTICO: Falta la variable de entorno 'NEXT_PUBLIC_APPWRITE_PROJECT_ID'.");
}
if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) {
    throw new Error("CRÍTICO: Falta la variable de entorno 'NEXT_PUBLIC_APPWRITE_ENDPOINT'.");
}

export const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);

// 📊 Database & Collection IDs - Validados estáticamente para compatibilidad con el Navegador
if (!process.env.NEXT_PUBLIC_DATABASE_ID) throw new Error("Falta NEXT_PUBLIC_DATABASE_ID");
export const DATABASE_ID = process.env.NEXT_PUBLIC_DATABASE_ID;

if (!process.env.NEXT_PUBLIC_COLLECTION_PROFILES_ID) throw new Error("Falta NEXT_PUBLIC_COLLECTION_PROFILES_ID");
export const COLLECTION_PROFILES = process.env.NEXT_PUBLIC_COLLECTION_PROFILES_ID;

if (!process.env.NEXT_PUBLIC_COLLECTION_CLASSES_ID) throw new Error("Falta NEXT_PUBLIC_COLLECTION_CLASSES_ID");
export const COLLECTION_CLASSES = process.env.NEXT_PUBLIC_COLLECTION_CLASSES_ID;

if (!process.env.NEXT_PUBLIC_COLLECTION_BOOKINGS_ID) throw new Error("Falta NEXT_PUBLIC_COLLECTION_BOOKINGS_ID");
export const COLLECTION_BOOKINGS = process.env.NEXT_PUBLIC_COLLECTION_BOOKINGS_ID;

if (!process.env.NEXT_PUBLIC_COLLECTION_REVENUE_ID) throw new Error("Falta NEXT_PUBLIC_COLLECTION_REVENUE_ID");
export const COLLECTION_REVENUE = process.env.NEXT_PUBLIC_COLLECTION_REVENUE_ID;

if (!process.env.NEXT_PUBLIC_COLLECTION_PAYMENTS_ID) throw new Error("Falta NEXT_PUBLIC_COLLECTION_PAYMENTS_ID");
export const COLLECTION_PAYMENTS = process.env.NEXT_PUBLIC_COLLECTION_PAYMENTS_ID;

if (!process.env.NEXT_PUBLIC_COLLECTION_NOTIFICATIONS_ID) throw new Error("Falta NEXT_PUBLIC_COLLECTION_NOTIFICATIONS_ID");
export const COLLECTION_NOTIFICATIONS = process.env.NEXT_PUBLIC_COLLECTION_NOTIFICATIONS_ID;

if (!process.env.NEXT_PUBLIC_COLLECTION_NOTIFICATIONS_READ_ID) throw new Error("Falta NEXT_PUBLIC_COLLECTION_NOTIFICATIONS_READ_ID");
export const COLLECTION_NOTIFICATIONS_READ = process.env.NEXT_PUBLIC_COLLECTION_NOTIFICATIONS_READ_ID;

if (!process.env.NEXT_PUBLIC_COLLECTION_INVITATION_TOKENS_ID) throw new Error("Falta NEXT_PUBLIC_COLLECTION_INVITATION_TOKENS_ID");
export const COLLECTION_INVITATION_TOKENS = process.env.NEXT_PUBLIC_COLLECTION_INVITATION_TOKENS_ID;

/**
 * Ayudante para variables de SERVIDOR (no públicas).
 * Estas sí permiten acceso dinámico porque solo corren en Node.js.
 */
export function getRequiredServerEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`CRÍTICO: Falta la variable de servidor '${key}'.`);
    }
    return value;
}

export { client, account, databases };
