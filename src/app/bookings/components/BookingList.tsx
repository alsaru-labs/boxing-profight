"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, ChevronDown, Loader2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BookingListProps {
    availableClasses: any[];
    userBookings: any[];
    profileInfo: any;
    isProcessingBooking: string | null;
    handleBookClass: (cls: any) => void;
}

export function BookingList({
    availableClasses,
    userBookings,
    profileInfo,
    isProcessingBooking,
    handleBookClass
}: BookingListProps) {
    // Filter out classes where the user is already booked
    const bookableClasses = availableClasses.filter(c => !userBookings.some((b: any) => b.class_id === c.$id));

    // Group by date
    const groupedByDate: { [key: string]: any[] } = bookableClasses.reduce((acc, cls) => {
        const dateKey = cls.date.substring(0, 10);
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(cls);
        return acc;
    }, {} as any);

    // Get sorted unique dates
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
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                    <CalendarClock className="w-7 h-7 text-emerald-500" /> Clases Disponibles
                </h3>
                <div className="flex items-center gap-2 text-sm text-white/40 bg-white/5 px-4 py-2 rounded-full border border-white/10 italic">
                    <Info className="w-4 h-4" /> Mostrando disponibilidad para los próximos 7 días
                </div>
            </div>

            {bookableClasses.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="col-span-full bg-white/5 border border-dashed border-white/10 rounded-2xl p-16 text-center text-white/40"
                >
                    <CalendarClock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg">No hay plazas nuevas disponibles para reservar en este momento.</p>
                    <p className="text-sm">Vuelve a consultar más tarde o revisa tus clases confirmadas abajo.</p>
                </motion.div>
            ) : (
                <div className="space-y-16">
                    <AnimatePresence mode="popLayout">
                        {visibleDates.map((dateKey) => (
                            <motion.div 
                                key={dateKey}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center gap-4">
                                    <h4 className="text-lg font-black uppercase tracking-[0.2em] text-emerald-500/80">
                                        {formatDate(dateKey)}
                                    </h4>
                                    <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {groupedByDate[dateKey].map((cls) => {
                                        const isFull = cls.registeredCount >= cls.capacity;
                                        return (
                                            <Card 
                                                key={cls.$id} 
                                                className="bg-white/5 border-white/10 backdrop-blur-lg overflow-hidden group hover:border-emerald-500/30 transition-all duration-500 hover:shadow-[0_0_40px_rgba(16,185,129,0.08)]"
                                            >
                                                <CardHeader className="pb-3 border-b border-white/5 relative">
                                                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="w-12 h-12 bg-emerald-500/10 rounded-full blur-xl animate-pulse" />
                                                    </div>
                                                    <div className="flex justify-between items-start relative z-10">
                                                        <div>
                                                            <Badge className={`mb-3 font-black text-[10px] tracking-widest px-2 py-0.5 border-0 ${cls.name === 'Boxeo' ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'}`}>
                                                                {cls.name.toUpperCase()}
                                                            </Badge>
                                                            <CardTitle className="text-2xl font-black text-white tracking-tight">{cls.coach}</CardTitle>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-lg font-black text-white block leading-none">
                                                                {cls.time.split('-')[0].trim()}
                                                            </span>
                                                            <span className="text-[10px] text-white/30 font-bold uppercase tracking-tighter">Comienzo</span>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="pt-6 pb-6 relative z-10">
                                                    <div>
                                                        <div className="flex justify-between text-xs mb-2 font-bold uppercase tracking-wider">
                                                            <span className={isFull ? 'text-red-400' : 'text-emerald-400'}>
                                                                {isFull ? 'Clase Completa' : `${cls.capacity - cls.registeredCount} plazas libres`}
                                                            </span>
                                                            <span className="text-white/20">{cls.capacity} TOTAL</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 mb-8">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${Math.min(100, (cls.registeredCount / cls.capacity) * 100)}%` }}
                                                                transition={{ duration: 1, ease: "easeOut" }}
                                                                className={`h-full ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400'}`}
                                                            />
                                                        </div>
                                                        <Button
                                                            onClick={() => handleBookClass(cls)}
                                                            disabled={isFull || isProcessingBooking === cls.$id || !profileInfo?.is_paid}
                                                            className={`w-full font-black h-14 text-sm uppercase tracking-widest rounded-xl transition-all duration-300 ${
                                                                isFull 
                                                                ? 'bg-red-500/10 text-red-500/50 border border-red-500/20 cursor-not-allowed shadow-none' 
                                                                : !profileInfo?.is_paid
                                                                ? 'bg-amber-500/10 text-amber-500/50 border border-amber-500/20 cursor-not-allowed shadow-none'
                                                                : 'bg-white text-black hover:bg-emerald-500 hover:text-white hover:scale-[1.02] shadow-[0_10px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_30px_rgba(16,185,129,0.3)] active:scale-95'
                                                            }`}
                                                        >
                                                            {isProcessingBooking === cls.$id ? (
                                                                <Loader2 className="w-6 h-6 animate-spin" />
                                                            ) : (
                                                                !profileInfo?.is_paid ? "Pago Pendiente" : isFull ? "Sin Plazas" : "Reservar Mi Sitio"
                                                            )}
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {hasMore && (
                        <div className="flex justify-center pt-8">
                            <Button 
                                onClick={() => setDaysToView(prev => prev + 1)}
                                variant="outline"
                                className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 px-10 h-14 rounded-2xl font-black uppercase tracking-widest transition-all group"
                            >
                                Ver clases del {formatDate(sortedDates[daysToView])}
                                <ChevronDown className="ml-2 w-5 h-5 group-hover:translate-y-1 transition-transform" />
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
