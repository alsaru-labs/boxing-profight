import { schedule, Handler } from "@netlify/functions";

/**
 * Trigger for Monthly Revenue Initialization & Payment Reset
 * Schedule: Every 1st of the month at midnight
 */
const triggerHandler: Handler = async (event, context) => {
    const siteUrl = process.env.URL || "http://localhost:3000";
    const secret = process.env.CRON_SECRET;
    const endpoint = `${siteUrl}/api/cron/revenue-sync`;

    console.log(`[TRIGGER] Pinging: ${endpoint}`);

    try {
        const response = await fetch(endpoint, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${secret}`
            }
        });

        const data = await response.json();
        console.log(`[TRIGGER] Sync results:`, data);
        
        return {
            statusCode: response.status,
            body: JSON.stringify(data)
        };
    } catch (error: any) {
        console.error(`[TRIGGER] Sync failure:`, error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

// Netlify Cron Schedule: Day 1 of month at 00:00
export const handler = schedule("0 0 1 * *", triggerHandler);
