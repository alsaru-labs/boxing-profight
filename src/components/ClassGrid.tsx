"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, ChevronDown, Loader2, Info, MoreVertical, Eye, Trash2, CalendarDays, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { LITERALS } from "@/constants/literals";

interface ClassGridProps {
    classes: any[];
    isAdmin?: boolean;
    isHistory?: boolean;
    onBookClass?: (cls: any) => void;
    onCancelClass?: (cls: any) => void;
    onViewAttendees?: (cls: any) => void;
    isProcessingBooking?: string | null;
    profileInfo?: any;
    userBookings?: any[]; // Only for students to filter
    simulatedDay?: number;
}

export function ClassGrid({
    classes,
    isAdmin = false,
    isHistory = false,
    onBookClass,
    onCancelClass,
    onViewAttendees,
    isProcessingBooking,
    profileInfo,
    userBookings = [],
    simulatedDay
}: ClassGridProps) {
    // Filter out classes if student is already booked
    const displayClasses = isAdmin
        ? classes
        : classes.filter(c => !userBookings.some((b: any) => b.class_id === c.$id));

    // Group by date
    const groupedByDate: { [key: string]: any[] } = displayClasses.reduce((acc, cls) => {
        const dateKey = cls.date.substring(0, 10);
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(cls);
        return acc;
    }, {} as any);

    // Get sorted unique dates
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
        return isHistory ? b.localeCompare(a) : a.localeCompare(b);
    });

    // State for progressive loading
    const [daysToView, setDaysToView] = useState(1);
    const visibleDates = sortedDates.slice(0, daysToView);
    const hasMore = daysToView < sortedDates.length;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return LITERALS.COMMON.TODAY;
        if (date.toDateString() === tomorrow.toDateString()) return LITERALS.COMMON.TOMORROW;
        if (date.toDateString() === yesterday.toDateString()) return LITERALS.COMMON.YESTERDAY;

        return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    return (
        <div className="space-y-8 md:space-y-12">

            {displayClasses.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="col-span-full border border-dashed border-white/10 bg-white/[0.03] rounded-2xl p-16 text-center text-white/60"
                >
                    <CalendarClock className="w-12 h-12 mx-auto mb-4 opacity-30 text-emerald-500" />
                    <p className="text-lg font-bold tracking-wide">
                        {isHistory
                            ? LITERALS.CLASS_CARD.HISTORY_EMPTY_STATE
                            : LITERALS.BOOKINGS.EMPTY_STATE}
                    </p>
                    <p className="text-sm text-white/40 mt-2 tracking-wide font-medium">
                        {isHistory
                            ? LITERALS.CLASS_CARD.HISTORY_EMPTY_SUB
                            : LITERALS.CLASS_CARD.EMPTY_SUB}
                    </p>
                </motion.div>
            ) : (
                <div className="space-y-10 md:space-y-16">
                    <AnimatePresence mode="popLayout">
                        {visibleDates.map((dateKey) => (
                            <motion.div
                                key={dateKey}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-4 md:space-y-6"
                            >
                                <div className="flex items-center gap-4">
                                    <h4 className="text-sm md:text-lg font-black uppercase tracking-[0.2em] text-white/80">
                                        {formatDate(dateKey)}
                                    </h4>
                                    <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
                                </div>

                                <div className="space-y-4">
                                    {groupedByDate[dateKey]
                                        .sort((a, b) => a.time.localeCompare(b.time))
                                        .map((cls) => {
                                            const isFull = cls.registeredCount >= cls.capacity;
                                            let isPastClass = false;
                                            try {
                                                const startTime = cls.time.split('-')[0].trim();
                                                const [year, month, day] = cls.date.substring(0, 10).split("-").map(Number);
                                                const [hours, minutes] = startTime.split(":").map(Number);
                                                const classDateTime = new Date(year, month - 1, day, hours, minutes);
                                                isPastClass = classDateTime < new Date();
                                            } catch (e) { }

                                            const today = new Date();
                                            const dayOfMonth = simulatedDay || today.getDate();
                                            const isGracePeriod = dayOfMonth >= 1 && dayOfMonth <= 10;
                                            const canBook = isGracePeriod || profileInfo?.is_paid;

                                            return (
                                                <div 
                                                    key={cls.$id} 
                                                    className={`
                                                        bg-white/5 hover:bg-white/[0.07] transition-all border border-white/10 
                                                        ${isAdmin ? 'hover:border-white/20' : 'hover:border-emerald-500/20'} 
                                                        rounded-2xl p-3 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-6 group relative overflow-hidden
                                                        ${isAdmin && isPastClass ? 'opacity-60 grayscale-[0.3]' : ''}
                                                    `}
                                                >
                                                    {/* Glow effect on hover for students */}
                                                    {!isAdmin && !isFull && canBook && (
                                                        <div className="absolute -inset-1 bg-emerald-500/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    )}

                                                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8 flex-1 relative z-10 w-full">
                                                        <div className="space-y-0.5 md:space-y-1 min-w-[140px]">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Badge className={`font-black text-[8px] md:text-[9px] tracking-widest px-2 py-0 border-0 rounded-sm ${cls.name === 'Boxeo' ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'}`}>
                                                                    {cls.name.toUpperCase()}
                                                                </Badge>
                                                                {isFull && (
                                                                    <Badge className="bg-rose-500/10 text-rose-500 font-black text-[8px] md:text-[9px] border-0 rounded-sm animate-pulse">COMPLETO</Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-white font-black text-xl md:text-3xl tracking-tighter leading-none">
                                                                {cls.time.split('-')[0].trim()}
                                                            </p>
                                                            <p className="text-white/40 font-bold text-[9px] md:text-xs uppercase tracking-widest leading-none">
                                                                {LITERALS.CLASS_CARD.START_TIME}
                                                            </p>
                                                        </div>

                                                        <div className="flex-1 space-y-2 md:space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex flex-col">
                                                                    <span className="text-white font-black text-sm md:text-lg tracking-tight leading-tight">{cls.coach}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className={`text-[9px] md:text-xs font-black uppercase tracking-widest ${isFull ? 'text-rose-500' : 'text-emerald-400'}`}>
                                                                        {isFull ? LITERALS.CLASS_CARD.FULL : LITERALS.CLASS_CARD.FREE_SPACES(cls.capacity - cls.registeredCount)}
                                                                    </span>
                                                                    <div className="text-[9px] text-sky-400 font-bold">{LITERALS.CLASS_CARD.TOTAL_CAPACITY(cls.capacity)}</div>
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Compact Progress Bar */}
                                                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${Math.min(100, (cls.registeredCount / cls.capacity) * 100)}%` }}
                                                                    className={`h-full rounded-full ${isFull 
                                                                        ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' 
                                                                        : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'}`}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="w-full sm:w-auto flex items-center gap-3 relative z-10">
                                                        {isAdmin ? (
                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    onClick={() => onViewAttendees?.(cls)}
                                                                    variant="outline"
                                                                    className="bg-white/5 border-white/10 text-white hover:bg-white/10 font-bold h-10 px-4 rounded-xl text-[10px] uppercase tracking-widest transition-all"
                                                                >
                                                                    {LITERALS.CLASS_CARD.VIEW_ATTENDEES}
                                                                </Button>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger className="h-10 w-10 flex justify-center items-center text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all outline-none border border-white/5">
                                                                        <MoreVertical className="h-5 w-5" />
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="bg-zinc-900/95 backdrop-blur-xl border-white/10 text-white min-w-[160px] rounded-xl shadow-2xl p-1.5">
                                                                        {!isPastClass ? (
                                                                            <DropdownMenuItem 
                                                                                className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer text-xs font-bold py-2.5 px-3 rounded-lg flex items-center gap-2 border border-transparent hover:border-red-500/20 transition-all whitespace-nowrap"
                                                                                onClick={() => onCancelClass?.(cls)}
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" /> 
                                                                                <span>{LITERALS.CLASS_CARD.CANCEL_CLASS}</span>
                                                                            </DropdownMenuItem>
                                                                        ) : (
                                                                            <div className="px-3 py-2 text-[10px] text-white/30 italic font-medium"> {LITERALS.CLASS_CARD.PAST_CLASS_INFO} </div>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                onClick={() => onBookClass?.(cls)}
                                                                disabled={isFull || !!isProcessingBooking || !canBook}
                                                                className={`
                                                                    w-full sm:w-auto font-black h-10 md:h-14 px-8 text-[10px] md:text-xs uppercase tracking-[0.2em] rounded-xl transition-all duration-300
                                                                    ${isFull
                                                                        ? 'bg-zinc-900 text-zinc-600 border border-white/5 cursor-not-allowed'
                                                                        : !canBook
                                                                            ? 'bg-amber-500/5 text-amber-500/40 border border-amber-500/10 cursor-not-allowed'
                                                                            : 'bg-white text-black hover:bg-emerald-500 hover:text-white hover:scale-[1.03] shadow-lg hover:shadow-emerald-500/20 border-b-4 border-zinc-200 hover:border-emerald-700'
                                                                    }
                                                                `}
                                                            >
                                                                {!!isProcessingBooking && (isProcessingBooking === "ALL" || isProcessingBooking === cls.$id) ? (
                                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                                ) : (
                                                                    !canBook ? LITERALS.CLASS_CARD.PENDING_PAYMENT : isFull ? LITERALS.CLASS_CARD.NO_SPACES : LITERALS.CLASS_CARD.RESERVE_BUTTON
                                                                )}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {hasMore && (
                        <div className="flex justify-center pt-8 px-4">
                            <Button
                                onClick={() => setDaysToView(prev => prev + 1)}
                                variant="outline"
                                className={`
                                    w-full sm:w-auto bg-white/[0.03] border-white/10 text-white hover:bg-emerald-500 hover:border-emerald-500 hover:text-white px-3 sm:px-10 h-12 md:h-14 rounded-xl md:rounded-2xl font-black uppercase tracking-wider sm:tracking-widest transition-all duration-300 group text-[9px] sm:text-[11px] md:text-xs shadow-lg hover:shadow-emerald-500/20
                                    ${isAdmin ? 'flex items-center gap-2 sm:gap-3 border-emerald-500/30 ring-1 ring-emerald-500/10' : ''}
                                `}
                            >
                                {isAdmin ? (
                                    <>
                                        VER SIGUIENTE DÍA ({formatDate(sortedDates[daysToView])})
                                        <div>
                                            <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {isHistory ? LITERALS.CLASS_CARD.LOAD_MORE_HISTORY(formatDate(sortedDates[daysToView])) : LITERALS.CLASS_CARD.LOAD_MORE(formatDate(sortedDates[daysToView]))}
                                        <ChevronDown className="ml-2 w-4 h-4 md:w-5 md:h-5 group-hover:translate-y-1 transition-transform shrink-0" />
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
