"use client";

import { useState, useEffect, useMemo, useOptimistic, startTransition, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import AuthTransition from "@/components/AuthTransition";
import { bookClassAction, cancelBookingAction } from "@/app/sys-director/actions";
import Navbar from "@/components/Navbar";
import ConfirmedClasses from "@/components/ConfirmedClasses";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ClassGrid } from "@/components/ClassGrid";
import { isCancellable } from "@/lib/bookingUtils";
import { LITERALS } from "@/constants/literals";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

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

    // 🌪️ PROCESAMIENTO DE DATOS GLOBAL (Sin peticiones extra)
    const availableClasses = useMemo(() => {
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

    // Toasts replacement for showAlert
    const showConfirm = (title: string, description: string, onConfirm: () => Promise<boolean>, variant: "info" | "success" | "warning" | "danger" = "warning") => {
        setModalConfig({
            isOpen: true,
            title,
            description,
            variant,
            onConfirm: async () => {
                // Not using startTransition here directly because we need to await the result to decide if we close the modal
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
            LITERALS.BOOKINGS.CONFIRM_RESERVATION_DESC(classObj.name, classObj.coach),
            async () => {
                let success = false;
                // Wrapping the server action in startTransition for mutation blocking
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
            "info"
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
            LITERALS.BOOKINGS.CANCEL_RESERVATION_DESC,
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

            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-12 z-10 space-y-12">
                <div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4 uppercase">{LITERALS.BOOKINGS.TITLE}</h1>
                    <p className="text-white/40 text-lg font-medium">{LITERALS.BOOKINGS.SUBTITLE}</p>
                </div>


                <div className="space-y-12">
                    <ConfirmedClasses
                        availableClasses={availableClasses}
                        userBookings={optimisticBookings}
                        isProcessingBooking={isPending ? "ALL" : null}
                        handleCancelBooking={handleCancelBooking}
                        currentTime={currentTime}
                    />
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
