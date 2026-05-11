import { NextResponse } from "next/server";
import { publishAnnouncementAction } from "@/app/sys-director/actions";

export const dynamic = 'force-dynamic';

/**
 * API Route for Automated Sparring Reminder
 * Triggered by Vercel Cron Jobs every Wednesday at 8:00 AM (Spain time).
 */
export async function GET(request: Request) {
    // 🛡️ Security Check: Ensure the call is authorized by Vercel
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;
    
    if (!secret || authHeader !== `Bearer ${secret}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        console.log("[CRON] Sending sparring reminder...");
        
        const result = await publishAnnouncementAction({
            title: "🥊 ¡Hoy hay Sparring! No olvides tu bucal",
            content: "¡Buenos días! Te recordamos que hoy miércoles es día de sparring. Por seguridad, el uso del protector bucal es obligatorio para participar en la clase. ¡Nos vemos en el tatami!",
            type: "info"
        });

        if (result.success) {
            console.log("[CRON] Sparring reminder sent successfully.");
            return NextResponse.json({ 
                message: "Recordatorio de sparring enviado correctamente",
                id: result.data?.$id
            });
        } else {
            console.error("[CRON] Failed to send reminder:", result.error);
            return NextResponse.json({ error: result.error }, { status: 500 });
        }
    } catch (error: any) {
        console.error("[CRON] Fatal error in sparring reminder:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
