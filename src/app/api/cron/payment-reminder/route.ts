import { NextResponse } from "next/server";
import { publishAnnouncementAction } from "@/app/sys-director/actions";

export const dynamic = 'force-dynamic';

/**
 * API Route for Monthly Payment Reminder
 * Triggered by Vercel Cron Jobs on the 1st of every month at 9:00 AM (Spain time).
 */
export async function GET(request: Request) {
    // 🛡️ Security Check: Ensure the call is authorized by Vercel
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        console.log("[CRON] Sending payment reminder...");

        const result = await publishAnnouncementAction({
            title: "💳 Recordatorio de Pago de Cuotas",
            content: "Recordamos a todos los alumnos que las cuotas deberán abonarse entre el día 1 y el 5 de cada mes. Aquellas personas que no realicen el pago dentro de ese plazo no podrán reservar clases y, sin reserva, no se podrá entrenar.\n\nGracias por vuestra colaboración.",
            type: "info"
        });

        if (result.success) {
            console.log("[CRON] Payment reminder sent successfully.");
            return NextResponse.json({
                message: "Recordatorio de pago enviado correctamente",
                id: result.data?.$id
            });
        } else {
            console.error("[CRON] Failed to send reminder:", result.error);
            return NextResponse.json({ error: result.error }, { status: 500 });
        }
    } catch (error: any) {
        console.error("[CRON] Fatal error in payment reminder:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
