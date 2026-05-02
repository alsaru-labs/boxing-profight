"use client";

import { useState, useEffect, useMemo, useOptimistic, useTransition } from "react";
import { Loader2, Calendar, Clock, CheckCircle2, History as HistoryIcon, ArrowLeft, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import AuthTransition from "@/components/AuthTransition";
import { bookClassAction, cancelBookingAction, getStudentPastBookingsAction } from "@/app/sys-director/actions";
import Navbar from "@/components/Navbar";
import ConfirmedClasses from "@/components/ConfirmedClasses";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ClassGrid } from "@/components/ClassGrid";
import { isCancellable } from "@/lib/bookingUtils";
import { LITERALS } from "@/constants/literals";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { motion } from "framer-motion";

export default function BookingsPage() {
    const router = useRouter();
    const {
        user,
        profile: profileInfo,
        loading: authLoading,
        userBookings,
        availableClasses: allPossibleClasses
    } = useAuth();

    const [isPending, startTransition] = useTransition();
    const [currentTime, setCurrentTime] = useState(new Date());

    // 📜 HISTORIAL LAZY (Zero-Waste)
    const [pastClasses, setPastClasses] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);

    // 🛡️ DETECCIÓN DE ENTORNO
    const [isProduction, setIsProduction] = useState(false);
    useEffect(() => {
        if (typeof window !== "undefined") {
            const hostname = window.location.hostname;
            setIsProduction(
                hostname === "boxingprofight.es" ||
                hostname === "www.boxingprofight.es" ||
                hostname === "boxing-profight.vercel.app" ||
                hostname === "boxingprofight.es"
            );
        }
    }, []);

    const [optimisticBookings, setOptimisticBookings] = useOptimistic(
        userBookings,
        (state: any[], payload: { action: "add" | "remove", booking: any }) => {
            if (payload.action === "add") return [...state, payload.booking];
            return state.filter((b: any) => b.class_id !== payload.booking.class_id);
        }
    );

    const [optimisticClasses, setOptimisticClasses] = useOptimistic(
        allPossibleClasses,
        (state: any[], payload: { class_id: string, action: "increment" | "decrement" }) => {
            return state.map((c: any) => {
                if (c.$id === payload.class_id) {
                    return { ...c, registeredCount: Math.max(0, (c.registeredCount || 0) + (payload.action === "increment" ? 1 : -1)) };
                }
                return c;
            });
        }
    );

    // 🌪️ PROCESAMIENTO DE DATOS GLOBAL
    const processedAvailableClasses = useMemo(() => {
        const now = new Date();
        return optimisticClasses.filter((cls: any) => {
            try {
                const startTime = cls.time.split('-')[0].trim();
                const [year, month, day] = cls.date.substring(0, 10).split("-").map(Number);
                const [hours, minutes] = startTime.split(":").map(Number);
                const classDateTime = new Date(year, month - 1, day, hours, minutes);
                const msIn7Days = 7 * 24 * 60 * 60 * 1000;
                return classDateTime >= now && classDateTime.getTime() <= now.getTime() + msIn7Days;
            } catch { return false; }
        }).sort((a: any, b: any) => {
            const dateComp = new Date(a.date).getTime() - new Date(b.date).getTime();
            if (dateComp !== 0) return dateComp;
            return a.time.localeCompare(b.time);
        });
    }, [optimisticClasses]);

    // 📜 Carga de Historial
    useEffect(() => {
        if (historyLoaded || historyLoading || !user) return;
        const loadHistory = async () => {
            setHistoryLoading(true);
            try {
                const result = await getStudentPastBookingsAction(user.$id);
                if (result.success) {
                    setPastClasses(result.classes);
                }
            } finally {
                setHistoryLoading(false);
                setHistoryLoaded(true);
            }
        };
        loadHistory();
    }, [user, historyLoaded, historyLoading]);

    // Custom Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        variant: "info" | "success" | "warning" | "danger";
        onConfirm: () => void | Promise<void>;
        showCancel?: boolean;
        confirmText?: string;
    }>({
        isOpen: false,
        title: "",
        description: "",
        variant: "info",
        onConfirm: () => { },
    });

    const showConfirm = (title: string, description: string, onConfirm: () => Promise<boolean>, variant: "info" | "success" | "warning" | "danger" = "warning") => {
        setModalConfig({
            isOpen: true,
            title,
            description,
            variant,
            onConfirm: async () => {
                const success = await onConfirm();
                if (success) {
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                }
            },
            showCancel: true,
            confirmText: "Confirmar"
        });
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login?redirect=/bookings");
        }
        if (!authLoading && profileInfo?.role === "admin") {
            router.push("/sys-director");
        }
    }, [user, profileInfo, authLoading, router]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 10000);
        return () => clearInterval(timer);
    }, []);

    const handleBookClass = async (classObj: any) => {
        if (!user) return;
        showConfirm(
            LITERALS.BOOKINGS.CONFIRM_RESERVATION_TITLE,
            LITERALS.BOOKINGS.CONFIRM_RESERVATION_DESC(
                new Date(classObj.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
                classObj.time.split('-')[0].trim()
            ),
            async () => {
                let success = false;
                await new Promise<void>((resolve) => {
                    startTransition(async () => {
                        setOptimisticBookings({ action: "add", booking: { $id: `opt-${Date.now()}`, class_id: classObj.$id, student_id: user.$id } });
                        setOptimisticClasses({ class_id: classObj.$id, action: "increment" });

                        try {
                            const result: any = await bookClassAction(classObj.$id, user.$id);
                            if (result.success) {
                                import("sonner").then(({ toast }) => {
                                    toast.success("¡Reserva Éxitosa!", {
                                        description: "Tu plaza ha quedado confirmada. ¡Nos vemos en el tatami!"
                                    });
                                });
                                success = true;
                            } else {
                                import("sonner").then(({ toast }) => {
                                    if (result.code === "FULL") {
                                        toast.warning("Clase Llena", { description: "¡Lo sentimos! Las plazas para esta clase se acaban de llenar." });
                                    } else {
                                        toast.error("Error", { description: result.error || "No se ha podido realizar la reserva. Inténtalo de nuevo." });
                                    }
                                });
                            }
                        } catch (err: any) {
                            import("sonner").then(({ toast }) => {
                                toast.error("Error", { description: "No se ha podido realizar la reserva. Inténtalo de nuevo." });
                            });
                            console.error(err);
                        } finally {
                            resolve();
                        }
                    });
                });
                return success;
            },
            "success"
        );
    };

    const handleCancelBooking = async (classObj: any) => {
        if (!isCancellable(classObj.date, classObj.time, new Date())) {
            import("sonner").then(({ toast }) => {
                toast.warning("Acción Prohibida", {
                    description: "Por política del club, solo se puede cancelar hasta 1 minuto antes del inicio de la clase."
                });
            });
            return;
        }

        showConfirm(
            LITERALS.BOOKINGS.CANCEL_RESERVATION_TITLE,
            LITERALS.BOOKINGS.CANCEL_RESERVATION_DESC(
                new Date(classObj.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
                classObj.time.split('-')[0].trim()
            ),
            async () => {
                let success = false;
                await new Promise<void>((resolve) => {
                    startTransition(async () => {
                        const bookingToCancel = userBookings.find((b: any) => b.class_id === classObj.$id);
                        if (!bookingToCancel) {
                            resolve();
                            return;
                        }

                        setOptimisticBookings({ action: "remove", booking: bookingToCancel });
                        setOptimisticClasses({ class_id: classObj.$id, action: "decrement" });

                        try {
                            const result = await cancelBookingAction(classObj.$id, bookingToCancel.$id);
                            if (result.success) {
                                import("sonner").then(({ toast }) => {
                                    toast.success("Éxito", { description: "Reserva cancelada correctamente." });
                                });
                                success = true;
                            } else {
                                import("sonner").then(({ toast }) => {
                                    toast.error("Error", { description: result.error || "No se ha podido cancelar la reserva." });
                                });
                            }
                        } catch (err: any) {
                            import("sonner").then(({ toast }) => {
                                toast.error("Error", { description: "No se ha podido cancelar la reserva." });
                            });
                            console.error(err);
                        } finally {
                            resolve();
                        }
                    });
                });
                return success;
            },
            "danger"
        );
    };

    if (authLoading || !user || profileInfo?.role === "admin") {
        return <AuthTransition message="Verificando acceso..." subMessage="Preparando tatami" />;
    }

    return (
        <div className="dark min-h-screen bg-black text-white font-sans flex flex-col relative text-center md:text-left">
            <div className="absolute inset-0 z-0 opacity-80 mix-blend-screen pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-gradient-to-bl from-emerald-900/20 via-zinc-900/40 to-black rounded-full blur-[120px]" />
            </div>

            <Navbar isHome={false} />

            <main className="flex-1 max-w-7xl mx-auto w-full px-6 pt-1 md:pt-2 pb-12 md:px-12 z-10 space-y-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <Link href="/perfil" className="flex items-center gap-2 text-white/40 hover:text-emerald-500 transition-colors mb-4 group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Volver al Perfil</span>
                        </Link>
                    </div>


                </div>

                <div className="grid grid-cols-1 gap-16">
                    {/* 1. CLASES DISPONIBLES (Grid Principal) */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-4">
                            <h4 className="text-xl font-black uppercase tracking-widest text-white/90 flex items-center gap-3">
                                <Sparkles className="w-5 h-5 text-emerald-500" /> Clases Disponibles
                            </h4>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>
                        <ClassGrid
                            classes={processedAvailableClasses}
                            userBookings={optimisticBookings}
                            profileInfo={profileInfo}
                            isProcessingBooking={isPending ? "ALL" : null}
                            onBookClass={handleBookClass}
                        />
                    </section>

                    {/* 2. MIS RESERVAS CONFIRMADAS */}
                    <ConfirmedClasses
                        availableClasses={processedAvailableClasses}
                        userBookings={optimisticBookings}
                        isProcessingBooking={isPending ? "ALL" : null}
                        handleCancelBooking={handleCancelBooking}
                        currentTime={currentTime}
                    />

                    {/* 3. HISTORIAL DE ASISTENCIA */}
                    <section className="space-y-6 pt-16 border-t border-white/10">
                        <div className="flex items-center gap-4">
                            <h4 className="text-xl font-black uppercase tracking-widest text-white/90 flex items-center gap-3">
                                <HistoryIcon className="w-5 h-5 text-emerald-500" /> Historial de Asistencia
                            </h4>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden w-full">
                            {historyLoading && pastClasses.length === 0 ? (
                                <div className="p-12 flex items-center justify-center gap-3 text-white/40">
                                    <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                                    <span className="text-sm font-medium">Sincronizando historial...</span>
                                </div>
                            ) : pastClasses.length === 0 ? (
                                <div className="p-16 text-center text-white/60 font-medium text-sm tracking-wide">
                                    Aún no has asistido a ninguna clase registrada. ¡Tu primera sesión te está esperando!
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {pastClasses.map(cls => (
                                        <div key={cls.$id} className="p-5 flex justify-between items-center hover:bg-white/[0.03] transition-colors group">
                                            <div className="flex items-center gap-6">
                                                <div className="flex flex-col items-start">
                                                    <span className="text-lg font-black text-white leading-none">
                                                        {new Date(cls.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).toUpperCase()}
                                                    </span>
                                                    <span className="text-xs font-black text-white uppercase mt-1">{cls.time.split(':')[0]}h</span>
                                                </div>
                                                <div className="flex flex-col items-start border-l border-white/10 pl-6 py-1">
                                                    <span className="text-[10px] text-white/90 font-bold block">{cls.coach}</span>
                                                    <span className="text-[9px] text-white/20 uppercase font-black tracking-widest leading-none mt-0.5">{cls.name}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] font-black tracking-tighter uppercase px-2 py-0.5">
                                                    ASISTIDO
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>

            <ConfirmModal
                isOpen={modalConfig.isOpen}
                onOpenChange={(open) => !isPending && setModalConfig(prev => ({ ...prev, isOpen: open }))}
                title={modalConfig.title}
                description={modalConfig.description}
                variant={modalConfig.variant}
                onConfirm={modalConfig.onConfirm}
                showCancel={modalConfig.showCancel && !isPending}
                confirmText={modalConfig.confirmText}
                isLoading={isPending}
            />
        </div>
    );
}
