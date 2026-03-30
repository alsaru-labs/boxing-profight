import { schedule, Handler } from "@netlify/functions";

/**
 * Trigger for Weekly Class Generation
 * Schedule: Every Saturday at 00:00 UTC
 */
const triggerHandler: Handler = async (event, context) => {
    const siteUrl = process.env.URL || "http://localhost:3000";
    const secret = process.env.CRON_SECRET;
    const endpoint = `${siteUrl}/api/cron/generate-classes`;

    console.log(`[TRIGGER] Pinging: ${endpoint}`);

    try {
        const response = await fetch(endpoint, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${secret}`
            }
        });

        const data = await response.json();
        console.log(`[TRIGGER] Success:`, data);
        
        return {
            statusCode: response.status,
            body: JSON.stringify(data)
        };
    } catch (error: any) {
        console.error(`[TRIGGER] Fatal failure:`, error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

// Netlify Cron Schedule: Sat at 00:00
export const handler = schedule("0 0 * * 6", triggerHandler);
