import { NextResponse } from "next/server";
import { ensureMonthlyRevenueRecord } from "@/app/sys-director/actions";

/**
 * API Route for Automated Revenue Initialization
 * Designed to be triggered by a Cron Job (e.g. Netlify Scheduled Functions)
 * Every 1st of the month at 00:00 (can run more frequently for safety).
 */
export async function GET(request: Request) {
    // 1. Security Check
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;
    
    if (secret && authHeader !== `Bearer ${secret}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        console.log("[CRON] Starting revenue month sync...");
        const result = await ensureMonthlyRevenueRecord();

        if (result.success) {
            console.log(`[CRON] Success: ${result.message}`);
            return NextResponse.json(result);
        } else {
            console.error("[CRON] Sync failed:", result.error);
            return NextResponse.json({ error: result.error }, { status: 500 });
        }
    } catch (error: any) {
        console.error("[CRON] Fatal error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
