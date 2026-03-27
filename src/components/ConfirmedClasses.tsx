import { useState } from "react";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

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
            <h3 className="text-xl font-black uppercase tracking-widest text-white/40 flex items-center gap-3">
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
                                        <div key={cls.$id} className="bg-white/5 hover:bg-white/[0.07] transition-all border border-white/5 hover:border-emerald-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 group">
                                            <div className="space-y-1">
                                                <Badge className="bg-emerald-500 text-black font-black text-[10px] tracking-widest mb-2 border-0 rounded-sm">
                                                    {cls.name.toUpperCase()} • CONFIRMADA
                                                </Badge>
                                                <p className="text-white font-black text-xl tracking-tight leading-tight">
                                                    {new Date(cls.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                </p>
                                                <div className="flex items-center gap-2 text-white/50 text-sm font-medium">
                                                    <span>{cls.time}</span>
                                                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                                                    <span>Prof. {cls.coach}</span>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleCancelBooking(cls)}
                                                disabled={isProcessingBooking === cls.$id}
                                                className="w-full sm:w-auto text-red-400 hover:text-red-500 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 px-6 h-12 font-bold transition-all rounded-xl"
                                            >
                                                {isProcessingBooking === cls.$id ? <Loader2 className="w-5 h-5 animate-spin" /> : "Anular Reserva"}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {hasMore && (
                        <div className="flex justify-center pt-4">
                            <Button 
                                onClick={() => setDaysToView(prev => prev + 1)}
                                variant="outline"
                                className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 px-8 h-12 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all group"
                            >
                                Ver reservas del {formatDate(sortedDates[daysToView])}
                                <ChevronDown className="ml-2 w-4 h-4 group-hover:translate-y-1 transition-transform" />
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
