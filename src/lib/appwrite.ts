import { Client, Account, Databases } from "appwrite";

const client = new Client()
    .setEndpoint("https://fra.cloud.appwrite.io/v1")
    .setProject("69af4c53003151ed5830");

const account = new Account(client);
const databases = new Databases(client);

export const DATABASE_ID = "69af56940011a3eb0e76";
export const COLLECTION_PROFILES = "69af582b0025b191f08f";
export const COLLECTION_CLASSES = "69af5838002f3e0a0022";
export const COLLECTION_CLASS_BOOKINGS = "69af5849000da08bd614"; // Old bookings name if used, fallback
export const COLLECTION_BOOKINGS = "69af5849000da08bd614";
export const COLLECTION_REVENUE = "69b05347002894ef6a84";
export const COLLECTION_PAYMENTS = "69b0523e001364e1b4fa";

export { client, account, databases };
