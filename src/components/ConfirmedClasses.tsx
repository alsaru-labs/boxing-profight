import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

interface ConfirmedClassesProps {
    availableClasses: any[];
    userBookings: any[];
    isProcessingBooking: string | null;
    handleCancelBooking: (cls: any) => void;
}

export default function ConfirmedClasses({
    availableClasses,
    userBookings,
    isProcessingBooking,
    handleCancelBooking
}: ConfirmedClassesProps) {
    const confirmedClasses = availableClasses.filter(c => userBookings.some((b: any) => b.class_id === c.$id));

    return (
        <div className="space-y-6 pt-8 border-t border-white/10">
            <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-white/40" /> Clases confirmadas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {confirmedClasses.length === 0 ? (
                    <div className="col-span-full border border-white/5 bg-white/5 rounded-xl p-6 text-white/30 text-sm italic">
                        Aún no te has apuntado a ninguna clase esta semana.
                    </div>
                ) : (
                    confirmedClasses.map(cls => (
                        <div key={cls.$id} className="bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors border border-emerald-500/20 rounded-xl p-5 flex items-center justify-between group">
                            <div>
                                <Badge className="bg-emerald-500/20 text-emerald-400 font-medium mb-2 border-0 rounded-sm">
                                    {cls.name} • Plaza Confirmada
                                </Badge>
                                <p className="text-white font-bold text-lg">{new Date(cls.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                <p className="text-white/60 text-sm">{cls.time} - {cls.coach}</p>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={() => handleCancelBooking(cls)}
                                disabled={isProcessingBooking === cls.$id}
                                className="text-red-400 hover:text-red-500 hover:bg-red-500/10 px-4 h-10"
                            >
                                {isProcessingBooking === cls.$id ? <Loader2 className="w-5 h-5 animate-spin" /> : "Cancelar Plaza"}
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
