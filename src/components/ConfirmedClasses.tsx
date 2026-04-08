import { useState } from "react";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { isCancellable } from "@/lib/bookingUtils";
import { LITERALS } from "@/constants/literals";

interface ConfirmedClassesProps {
    availableClasses: any[];
    userBookings: any[];
    isProcessingBooking: string | null;
    handleCancelBooking: (cls: any) => void;
    currentTime?: Date;
}

export default function ConfirmedClasses({
    availableClasses,
    userBookings,
    isProcessingBooking,
    handleCancelBooking,
    currentTime = new Date()
}: ConfirmedClassesProps) {
    const confirmedClasses = availableClasses.filter(c => userBookings.some((b: any) => b.class_id === c.$id));

    // Group by date
    const groupedByDate: { [key: string]: any[] } = confirmedClasses.reduce((acc, cls) => {
        const dateKey = cls.date.substring(0, 10);
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(cls);
        return acc;
    }, {} as any);

    // Sorted dates
    const sortedDates = Object.keys(groupedByDate).sort();

    // State for progressive loading
    const [daysToView, setDaysToView] = useState(2);
    const visibleDates = sortedDates.slice(0, daysToView);
    const hasMore = daysToView < sortedDates.length;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return "Hoy";
        if (date.toDateString() === tomorrow.toDateString()) return "Mañana";

        return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    return (
        <div className="space-y-8 pt-16 border-t border-white/10">
            <h3 className="text-xl font-black uppercase tracking-widest text-white/90 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" /> Mis Reservas Confirmadas
            </h3>

            {confirmedClasses.length === 0 ? (
                <div className="border border-dashed border-white/5 bg-white/[0.02] rounded-2xl p-8 text-white/30 text-sm italic text-center">
                    No tienes ninguna plaza reservada todavía para esta semana.
                </div>
            ) : (
                <div className="space-y-12">
                    <AnimatePresence mode="popLayout">
                        {visibleDates.map((dateKey) => (
                            <motion.div 
                                key={dateKey}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-4">
                                    <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                                        {formatDate(dateKey)}
                                    </h5>
                                    <div className="h-px flex-1 bg-white/5" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {groupedByDate[dateKey].map((cls) => (
                                        <div key={cls.$id} className="bg-white/5 hover:bg-white/[0.07] transition-all border border-white/5 hover:border-emerald-500/20 rounded-2xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-6 group">
                                            <div className="space-y-1">
                                                <Badge className="bg-emerald-500 text-black font-black text-[8px] md:text-[10px] tracking-widest mb-1.5 md:mb-2 border-0 rounded-sm">
                                                    {cls.name.toUpperCase()} • CONFIRMADA
                                                </Badge>
                                                <p className="text-emerald-400 font-black text-xl md:text-2xl tracking-tighter leading-none mb-1">
                                                    {cls.time}
                                                </p>
                                                <p className="text-white font-bold text-sm md:text-base tracking-tight opacity-90">
                                                    {new Date(cls.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                </p>
                                                <div className="flex items-center gap-2 text-white/40 text-[11px] md:text-xs font-medium pt-2">
                                                    <span className="bg-white/5 px-2 py-0.5 rounded-full border border-white/5 italic">Prof. {cls.coach}</span>
                                                </div>
                                            </div>
                                            {isCancellable(cls.date, cls.time, currentTime) && (
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => handleCancelBooking(cls)}
                                                    disabled={isProcessingBooking === cls.$id}
                                                    className="w-full sm:w-auto text-red-400 hover:text-red-500 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 px-6 h-10 md:h-12 font-bold transition-all rounded-xl"
                                                >
                                                    {isProcessingBooking === cls.$id ? <Loader2 className="w-5 h-5 animate-spin" /> : "Anular Reserva"}
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {hasMore && (
                        <div className="flex justify-center pt-8 px-4">
                            <Button 
                                onClick={() => setDaysToView(prev => prev + 1)}
                                variant="outline"
                                className="w-full sm:w-auto bg-white/[0.03] border-white/10 text-white hover:bg-emerald-500 hover:border-emerald-500 hover:text-white px-6 md:px-8 h-10 md:h-12 rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all duration-300 group shadow-lg hover:shadow-emerald-500/20"
                            >
                                {LITERALS.CLASS_CARD.LOAD_MORE(formatDate(sortedDates[daysToView]))}
                                <ChevronDown className="ml-2 w-4 h-4 group-hover:translate-y-1 transition-transform shrink-0" />
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
