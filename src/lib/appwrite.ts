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

// 📊 Database & Collection IDs - Validados estáticamente con fallbacks verificados
export const DATABASE_ID = process.env.NEXT_PUBLIC_DATABASE_ID || "69af56940011a3eb0e76";

export const COLLECTION_PROFILES = process.env.NEXT_PUBLIC_COLLECTION_PROFILES_ID || "69af582b0025b191f08f";
export const COLLECTION_CLASSES = process.env.NEXT_PUBLIC_COLLECTION_CLASSES_ID || "69af5838002f3e0a0022";
export const COLLECTION_BOOKINGS = process.env.NEXT_PUBLIC_COLLECTION_BOOKINGS_ID || "69af5849000da08bd614";
export const COLLECTION_REVENUE = process.env.NEXT_PUBLIC_COLLECTION_REVENUE_ID || "69b05347002894ef6a84";
export const COLLECTION_PAYMENTS = process.env.NEXT_PUBLIC_COLLECTION_PAYMENTS_ID || "69b0523e001364e1b4fa";
export const COLLECTION_NOTIFICATIONS = process.env.NEXT_PUBLIC_COLLECTION_NOTIFICATIONS_ID || "69c5c81a002d3d4de570";
export const COLLECTION_NOTIFICATIONS_READ = "69c5c8b5003e46582a04";

export const COLLECTION_INVITATION_TOKENS = process.env.NEXT_PUBLIC_COLLECTION_INVITATION_TOKENS_ID || "69c7be36002621773c55";

export { client, account, databases };
