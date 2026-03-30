import { Handler } from "@netlify/functions";

/**
 * Trigger for Bulk Payment Update (Mark All as Paid)
 * Schedule: MANUAL (No automatic cron).
 */
const triggerHandler: Handler = async (event, context) => {
    const siteUrl = process.env.URL || "http://localhost:3000";
    const secret = process.env.CRON_SECRET;
    const endpoint = `${siteUrl}/api/cron/mark-all-paid`;

    console.log(`[TRIGGER] Pinging manual task: ${endpoint}`);

    try {
        const response = await fetch(endpoint, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${secret}`
            }
        });

        const data = await response.json();
        console.log(`[TRIGGER] Manual task result:`, data);
        
        return {
            statusCode: response.status,
            body: JSON.stringify(data)
        };
    } catch (error: any) {
        console.error(`[TRIGGER] Manual task failure:`, error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

export const handler = triggerHandler;
