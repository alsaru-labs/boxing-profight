import { NextResponse } from "next/server";
import { markAllStudentsAsPaid } from "@/app/sys-director/actions";

/**
 * API Route to manually trigger bulk payment status update (set all to Paid).
 */
export async function GET(request: Request) {
    // 1. Security Check
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;
    
    if (secret && authHeader !== `Bearer ${secret}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        console.log("[CRON] Manually triggering bulk-paid update...");
        const result = await markAllStudentsAsPaid();

        if (result.success) {
            return NextResponse.json(result);
        } else {
            console.error("[CRON] Bulk-paid update failed:", result.error);
            return NextResponse.json({ error: result.error }, { status: 500 });
        }
    } catch (error: any) {
        console.error("[CRON] Fatal error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
