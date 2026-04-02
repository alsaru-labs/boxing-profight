"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { databases, DATABASE_ID, COLLECTION_CLASSES, COLLECTION_BOOKINGS } from "@/lib/appwrite";
import { ID } from "appwrite";
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
    
    const [simulatedDay, setSimulatedDay] = useState<number | undefined>(undefined);
    const [isProcessingBooking, setIsProcessingBooking] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // 🌪️ PROCESAMIENTO DE DATOS GLOBAL (Sin peticiones extra)
    const availableClasses = useMemo(() => {
        const now = new Date();
        return allPossibleClasses.filter((cls: any) => {
            try {
                const startTime = cls.time.split('-')[0].trim();
                const [year, month, day] = cls.date.substring(0, 10).split("-").map(Number);
                const [hours, minutes] = startTime.split(":").map(Number);
                const classDateTime = new Date(year, month - 1, day, hours, minutes);
                const msIn7Days = 7 * 24 * 60 * 60 * 1000;
                return classDateTime >= now && classDateTime.getTime() <= now.getTime() + msIn7Days;
            } catch { return false; }
        }).sort((a, b) => {
            const dateComp = new Date(a.date).getTime() - new Date(b.date).getTime();
            if (dateComp !== 0) return dateComp;
            return a.time.localeCompare(b.time);
        });
    }, [allPossibleClasses]);

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

    const showAlert = (title: string, description: string, variant: "info" | "success" | "warning" | "danger" = "info") => {
        setModalConfig({
            isOpen: true,
            title,
            description,
            variant,
            onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
            showCancel: false,
            confirmText: "Entendido"
        });
    };

    const showConfirm = (title: string, description: string, onConfirm: () => void | Promise<void>, variant: "info" | "success" | "warning" | "danger" = "warning") => {
        setModalConfig({
            isOpen: true,
            title,
            description,
            variant,
            onConfirm: async () => {
                await onConfirm();
                setModalConfig(prev => ({ ...prev, isOpen: false }));
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
                try {
                    setIsProcessingBooking(classObj.$id);

                    const freshClass = await databases.getDocument(DATABASE_ID, COLLECTION_CLASSES, classObj.$id);
                    if (freshClass.registeredCount >= freshClass.capacity) {
                        showAlert("Clase Llena", "¡Lo sentimos! Las plazas para esta clase se acaban de llenar.", "warning");
                        return;
                    }

                    await databases.updateDocument(DATABASE_ID, COLLECTION_CLASSES, classObj.$id, {
                        registeredCount: freshClass.registeredCount + 1
                    });

                    await databases.createDocument(
                        DATABASE_ID,
                        COLLECTION_BOOKINGS,
                        ID.unique(),
                        {
                            student_id: user.$id,
                            class_id: classObj.$id
                        }
                    );

                    showAlert("¡Reserva Éxitosa!", "Tu plaza ha quedado confirmada. ¡Nos vemos en el tatami!", "success");
                } catch (err: any) {
                    if (err.code !== 404) {
                        showAlert("Error", "No se ha podido realizar la reserva. Inténtalo de nuevo.", "danger");
                    }
                    console.error(err);
                } finally {
                    setIsProcessingBooking(null);
                }
            },
            "info"
        );
    };

    const handleCancelBooking = async (classObj: any) => {
        if (!isCancellable(classObj.date, classObj.time, new Date())) {
            showAlert("Acción Prohibida", "Por política del club, solo se puede cancelar hasta 1 minute antes del inicio de la clase.", "warning");
            return;
        }

        showConfirm(
            LITERALS.BOOKINGS.CANCEL_RESERVATION_TITLE, 
            LITERALS.BOOKINGS.CANCEL_RESERVATION_DESC,
            async () => {
                try {
                    setIsProcessingBooking(classObj.$id);
                    const bookingToCancel = userBookings.find((b: any) => b.class_id === classObj.$id);
                    if (!bookingToCancel) return;

                    const freshClass = await databases.getDocument(DATABASE_ID, COLLECTION_CLASSES, classObj.$id);
                    await databases.updateDocument(DATABASE_ID, COLLECTION_CLASSES, classObj.$id, {
                        registeredCount: Math.max(0, freshClass.registeredCount - 1)
                    });
                    await databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, bookingToCancel.$id);
                    
                    showAlert("Éxito", "Reserva cancelada correctamente.", "success");
                } catch (err: any) {
                    if (err.code !== 404) {
                        showAlert("Error", "No se ha podido cancelar la reserva.", "danger");
                        console.error(err);
                    }
                } finally {
                    setIsProcessingBooking(null);
                }
            },
            "danger"
        );
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            </div>
        );
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

                <div className="bg-black/40 border border-white/5 p-6 rounded-2xl backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="space-y-1 text-left">
                        <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500">Modo de Prueba: Periodo de Gracia</h3>
                        <p className="text-white/40 text-xs font-medium">Verifica el acceso según el día del mes (Días 1-10: Libre | Día 11+: Requiere Pago).</p>
                    </div>
                    <div className="flex items-center gap-4 bg-zinc-900/50 p-2 rounded-xl border border-white/10 w-full sm:w-auto">
                        <span className="text-xs font-black text-white/30 uppercase px-2 italic">Día {simulatedDay || new Date().getDate()}</span>
                        <input 
                            type="range" 
                            min="1" 
                            max="31" 
                            value={simulatedDay || new Date().getDate()}
                            onChange={(e) => setSimulatedDay(parseInt(e.target.value))}
                            className="flex-1 sm:w-48 accent-emerald-500 cursor-pointer"
                        />
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setSimulatedDay(undefined)}
                            className="text-[10px] font-black uppercase text-white/40 hover:text-white"
                        >
                            Reset
                        </Button>
                    </div>
                </div>

                <div className="space-y-12">
                    <ClassGrid
                        classes={availableClasses}
                        userBookings={userBookings}
                        profileInfo={profileInfo}
                        isProcessingBooking={isProcessingBooking}
                        onBookClass={handleBookClass}
                        simulatedDay={simulatedDay}
                    />
                </div>

                <ConfirmedClasses
                    availableClasses={availableClasses}
                    userBookings={userBookings}
                    isProcessingBooking={isProcessingBooking}
                    handleCancelBooking={handleCancelBooking}
                    currentTime={currentTime}
                />
            </main>
            <ConfirmModal
                isOpen={modalConfig.isOpen}
                onOpenChange={(open) => setModalConfig(prev => ({ ...prev, isOpen: open }))}
                title={modalConfig.title}
                description={modalConfig.description}
                variant={modalConfig.variant}
                onConfirm={modalConfig.onConfirm}
                showCancel={modalConfig.showCancel}
                confirmText={modalConfig.confirmText}
            />
        </div>
    );
}
