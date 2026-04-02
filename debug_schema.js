const { createAdminClient } = require("./src/lib/server/appwrite");
const { DATABASE_ID, COLLECTION_PAYMENTS } = require("./src/lib/appwrite");

async function debugSchema() {
    try {
        const { databases } = await createAdminClient();
        console.log("Fetching collection:", COLLECTION_PAYMENTS);
        const result = await databases.listDocuments(DATABASE_ID, COLLECTION_PAYMENTS, []);
        if (result.documents.length > 0) {
            console.log("Sample Document Keys:", Object.keys(result.documents[0]));
            console.log("Sample Document:", JSON.stringify(result.documents[0], null, 2));
        } else {
            console.log("No documents found in collection to inspect schema.");
        }
    } catch (error) {
        console.error("Debug Error:", JSON.stringify(error, null, 2));
    }
}

debugSchema();
