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
    userBookings = []
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
    const [daysToView, setDaysToView] = useState(2);
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
            {!isAdmin && (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                        <CalendarClock className="w-7 h-7 text-emerald-500" /> {LITERALS.CLASS_GRID.TITLE}
                    </h3>
                </div>
            )}

            {displayClasses.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="col-span-full border border-dashed border-white/5 bg-white/[0.02] rounded-2xl p-16 text-center text-white/20"
                >
                    <CalendarClock className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="text-lg font-medium">
                        {isHistory
                            ? LITERALS.CLASS_CARD.HISTORY_EMPTY_STATE
                            : LITERALS.BOOKINGS.EMPTY_STATE}
                    </p>
                    <p className="text-sm text-white/40 mt-2">
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
                                    <h4 className="text-sm md:text-lg font-black uppercase tracking-[0.2em] text-emerald-500/80">
                                        {formatDate(dateKey)}
                                    </h4>
                                    <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                                    {groupedByDate[dateKey]
                                        .sort((a, b) => a.time.localeCompare(b.time))
                                        .map((cls) => {
                                        const isFull = cls.registeredCount >= cls.capacity;

                                        // Determine if class has passed (for admin grayscale)
                                        let isPastClass = false;
                                        try {
                                            const startTime = cls.time.split('-')[0].trim();
                                            const [year, month, day] = cls.date.substring(0, 10).split("-").map(Number);
                                            const [hours, minutes] = startTime.split(":").map(Number);
                                            const classDateTime = new Date(year, month - 1, day, hours, minutes);
                                            isPastClass = classDateTime < new Date();
                                        } catch (e) { }

                                        return (
                                            <Card
                                                key={cls.$id}
                                                className={`bg-white/5 border-white/10 backdrop-blur-lg overflow-hidden group transition-all duration-500 hover:shadow-[0_0_40px_rgba(16,185,129,0.08)] py-1 md:py-4 gap-0.5 md:gap-4 ${isAdmin ? 'hover:border-white/20' : 'hover:border-emerald-500/30'} ${isAdmin && isPastClass ? 'opacity-60 grayscale-[0.3]' : ''}`}
                                            >
                                                <CardHeader className="p-2.5 md:p-4 border-b border-white/5 relative">
                                                    {!isAdmin && (
                                                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="w-12 h-12 bg-emerald-500/10 rounded-full blur-xl animate-pulse" />
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-start relative z-10">
                                                        <div>
                                                            <Badge className={`mb-1 md:mb-3 font-black text-[8px] md:text-[10px] tracking-widest px-2 py-0.5 border-0 rounded-sm ${cls.name === 'Boxeo' ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'}`}>
                                                                {cls.name.toUpperCase()}
                                                            </Badge>
                                                            <CardTitle className="text-sm md:text-2xl font-black text-white tracking-tight">{cls.coach}</CardTitle>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {!isAdmin && (
                                                                <div className="text-right">
                                                                    <span className="block text-[13px] md:text-lg font-black text-white leading-none">
                                                                        {cls.time.split('-')[0].trim()}
                                                                    </span>
                                                                    <span className="text-[7px] md:text-[10px] text-white/30 font-bold uppercase tracking-tighter">{LITERALS.CLASS_CARD.START_TIME}</span>
                                                                </div>
                                                            )}
                                                            {isAdmin && (
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger className="h-10 w-10 flex justify-center items-center text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all outline-none">
                                                                        <MoreVertical className="h-5 w-5" />
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white min-w-[200px] rounded-xl shadow-2xl p-2">
                                                                        {!isPastClass ? (
                                                                            <DropdownMenuItem 
                                                                                className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer font-bold py-3 px-4 rounded-lg flex items-center justify-between gap-2 border border-transparent hover:border-red-500/20 transition-all"
                                                                                onClick={() => onCancelClass?.(cls)}
                                                                            >
                                                                                <div className="flex items-center gap-2">
                                                                                    <Trash2 className="w-4 h-4" /> 
                                                                                    <span>{LITERALS.CLASS_CARD.CANCEL_CLASS}</span>
                                                                                </div>
                                                                                <Badge className="bg-red-500/10 text-[8px] text-red-500 border-0 p-0.5 px-1.5 font-black uppercase">{LITERALS.CLASS_CARD.DANGER_BADGE}</Badge>
                                                                            </DropdownMenuItem>
                                                                        ) : (
                                                                            <div className="px-4 py-3 text-xs text-white/30 italic font-medium"> {LITERALS.CLASS_CARD.PAST_CLASS_INFO} </div>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-2.5 pt-0 md:p-6 relative z-10">
                                                    <div>
                                                        {isAdmin && (
                                                            <div className="space-y-1.5 md:space-y-4 mb-2 md:mb-6">
                                                                <div className="flex items-center gap-2 text-[10px] md:text-sm">
                                                                    <CalendarDays className="w-3 h-3 md:w-3.5 md:h-3.5 text-white/40" />
                                                                    <span className="text-white/70 font-medium">
                                                                        {new Date(cls.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[10px] md:text-sm">
                                                                    <ShieldCheck className="w-3 h-3 md:w-3.5 md:h-3.5 text-white/40" />
                                                                    <span className="text-white/70 font-medium">{cls.time}</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex justify-between text-[9px] md:text-xs mb-0.5 md:mb-2 font-bold uppercase tracking-wider">
                                                            <span className={isFull ? 'text-red-400' : 'text-emerald-400'}>
                                                                {isFull ? LITERALS.CLASS_CARD.FULL : LITERALS.CLASS_CARD.FREE_SPACES(cls.capacity - cls.registeredCount)}
                                                            </span>
                                                            <span className="text-white/20">{LITERALS.CLASS_CARD.TOTAL_CAPACITY(cls.capacity)}</span>
                                                        </div>
                                                        <div className="h-1 w-full md:h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 mb-2 md:mb-6">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${Math.min(100, (cls.registeredCount / cls.capacity) * 100)}%` }}
                                                                transition={{ duration: 1, ease: "easeOut" }}
                                                                className={`h-full ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400'}`}
                                                            />
                                                        </div>

                                                        {!isAdmin && (
                                                            <Button
                                                                onClick={() => onBookClass?.(cls)}
                                                                disabled={isFull || isProcessingBooking === cls.$id || !profileInfo?.is_paid}
                                                                className={`w-full font-black h-8 md:h-14 text-[9px] md:text-sm uppercase tracking-widest rounded-xl transition-all duration-300 ${isFull
                                                                    ? 'bg-red-500/10 text-red-500/50 border border-red-500/20 cursor-not-allowed shadow-none'
                                                                    : !profileInfo?.is_paid
                                                                        ? 'bg-amber-500/10 text-amber-500/50 border border-amber-500/20 cursor-not-allowed shadow-none'
                                                                        : 'bg-white text-black hover:bg-emerald-500 hover:text-white hover:scale-[1.02] shadow-[0_10px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_30px_rgba(16,185,129,0.3)] active:scale-95'
                                                                    }`}
                                                            >
                                                                {isProcessingBooking === cls.$id ? (
                                                                    <Loader2 className="w-6 h-6 animate-spin" />
                                                                ) : (
                                                                    !profileInfo?.is_paid ? LITERALS.CLASS_CARD.PENDING_PAYMENT : isFull ? LITERALS.CLASS_CARD.NO_SPACES : LITERALS.CLASS_CARD.RESERVE_BUTTON
                                                                )}
                                                            </Button>
                                                        )}

                                                        {isAdmin && (
                                                            <Button
                                                                onClick={() => onViewAttendees?.(cls)}
                                                                variant="outline"
                                                                className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 font-black h-8 md:h-12 uppercase tracking-widest text-[9px] rounded-xl transition-all"
                                                            >
                                                                {LITERALS.CLASS_CARD.VIEW_ATTENDEES}
                                                            </Button>
                                                        )}
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
                        <div className="flex justify-center pt-8 px-4">
                            <Button
                                onClick={() => setDaysToView(prev => prev + 1)}
                                variant="outline"
                                className="w-full sm:w-auto bg-white/[0.03] border-white/10 text-white hover:bg-emerald-500 hover:border-emerald-500 hover:text-white px-6 md:px-10 h-12 md:h-14 rounded-xl md:rounded-2xl font-black uppercase tracking-widest transition-all duration-300 group text-[11px] md:text-xs shadow-lg hover:shadow-emerald-500/20"
                            >
                                {isHistory ? LITERALS.CLASS_CARD.LOAD_MORE_HISTORY(formatDate(sortedDates[daysToView])) : LITERALS.CLASS_CARD.LOAD_MORE(formatDate(sortedDates[daysToView]))}
                                <ChevronDown className="ml-2 w-4 h-4 md:w-5 md:h-5 group-hover:translate-y-1 transition-transform shrink-0" />
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
