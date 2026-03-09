import { Client, Account, Databases } from "appwrite";

const client = new Client()
    .setEndpoint("https://fra.cloud.appwrite.io/v1")
    .setProject("69af4c53003151ed5830");

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };
