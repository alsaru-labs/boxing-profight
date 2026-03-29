import { NextResponse } from "next/server";
import { autoGenerateNextWeekClasses } from "@/app/sys-director/actions";

/**
 * API Route for Automated Class Generation
 * Designed to be triggered by a Cron Job (e.g. Netlify Scheduled Functions)
 * Every Saturday at 00:00.
 */
export async function GET(request: Request) {
    // 1. Security Check (Optional but recommended)
    // You should set a CRON_SECRET in your environment variables to prevent unauthorized calls.
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        console.log("[CRON] Starting weekly class generation...");
        const result = await autoGenerateNextWeekClasses();

        if (result.success) {
            console.log(`[CRON] Success: ${result.count} classes created.`);
            return NextResponse.json({ 
                message: "Semana generada correctamente", 
                count: result.count 
            });
        } else {
            console.error("[CRON] Generation failed:", result.error);
            return NextResponse.json({ error: result.error }, { status: 500 });
        }
    } catch (error: any) {
        console.error("[CRON] Fatal error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
