"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, CalendarClock, LogOut, ArrowLeft, CheckCircle2, History, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { account, databases, DATABASE_ID, COLLECTION_PROFILES, COLLECTION_CLASSES, COLLECTION_BOOKINGS, COLLECTION_PAYMENTS, client } from "@/lib/appwrite";
import { Query, ID } from "appwrite";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import ConfirmedClasses from "@/components/ConfirmedClasses";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ClassGrid } from "@/components/ClassGrid";
import { isCancellable } from "@/lib/bookingUtils";
import { LITERALS } from "@/constants/literals";

import { useAuth } from "@/contexts/AuthContext";

export default function BookingsPage() {
    const router = useRouter();
    const { user, profile: profileInfo, loading: authLoading } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [simulatedDay, setSimulatedDay] = useState<number | undefined>(undefined);

    // Real-time Class & Booking States
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isFetchingRef = useRef(false);
    const lastFetchTimeRef = useRef(0);
    const [availableClasses, setAvailableClasses] = useState<any[]>([]);
    const [userBookings, setUserBookings] = useState<any[]>([]);
    const [isProcessingBooking, setIsProcessingBooking] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

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
        let unsubscribe: () => void;

        const loadData = async (silent = false) => {
            if (isFetchingRef.current || authLoading || !user) return;
            const fetchTime = Date.now();
            if (silent && (fetchTime - lastFetchTimeRef.current < 10000)) return;

            try {
                isFetchingRef.current = true;
                lastFetchTimeRef.current = fetchTime;
                if (!silent) setLoading(true);

                // Fetch data for the first time (Profile already comes from Context)
                const [bookingsData, classesData] = await Promise.all([
                    databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [Query.equal("student_id", user.$id), Query.limit(100)]),
                    databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [Query.limit(100), Query.orderAsc("date")])
                ]);

                if (profileInfo?.role === "admin") {
                    router.push("/sys-director");
                    return;
                }

                setUserBookings(bookingsData.documents);

                const now = new Date();
                const validUpcomingClasses = classesData.documents.filter((cls: any) => {
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
                setAvailableClasses(validUpcomingClasses);
                setLoading(false);

                // 🟢 TIEMPO REAL: Suscripción a cambios
                if (!unsubscribe) {
                    unsubscribe = client.subscribe([
                        `databases.${DATABASE_ID}.collections.${COLLECTION_PROFILES}.documents.${user.$id}`,
                        `databases.${DATABASE_ID}.collections.${COLLECTION_CLASSES}.documents`,
                        `databases.${DATABASE_ID}.collections.${COLLECTION_BOOKINGS}.documents`,
                        `databases.${DATABASE_ID}.collections.${COLLECTION_PAYMENTS}.documents`
                    ], (response) => {
                        // Refrescamos los datos con un pequeño retraso para agrupar cambios
                        if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
                        refreshTimeoutRef.current = setTimeout(() => {
                            loadData(true);
                        }, 800);
                    });
                }

            } catch (error: any) {
                setLoading(false);
                if (error.code === 401 || error.code === 403) {
                    router.push("/login?redirect=/bookings");
                } else {
                    console.error("Critical error in loadData (bookings):", error);
                }
            } finally {
                isFetchingRef.current = false;
            }
        };

        loadData();

        // Timer for cancellation limits
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 10000);

        // 📡 RESILIENCIA: Refresco por foco/visibilidad (Crítico para iOS PWA)
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            loadData(true);
          }
        };
        const handleFocus = () => loadData(true);

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            if (unsubscribe) unsubscribe();
            if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            if (timer) clearInterval(timer);
        };
    }, [router, user, authLoading]);

    const handleBookClass = async (classObj: any) => {
        if (!user) return;
        showConfirm(
            LITERALS.BOOKINGS.CONFIRM_RESERVATION_TITLE, 
            LITERALS.BOOKINGS.CONFIRM_RESERVATION_DESC(classObj.name, classObj.coach),
            async () => {
                try {
                    setIsProcessingBooking(classObj.$id);

                    // 1. Verify class still has space in DB acting as single truth
                    const freshClass = await databases.getDocument(DATABASE_ID, COLLECTION_CLASSES, classObj.$id);
                    if (freshClass.registeredCount >= freshClass.capacity) {
                        showAlert("Clase Llena", "¡Lo sentimos! Las plazas para esta clase se acaban de llenar.", "warning");
                        return;
                    }

                    // 2. Increment Registered Count locally and remotely
                    await databases.updateDocument(DATABASE_ID, COLLECTION_CLASSES, classObj.$id, {
                        registeredCount: freshClass.registeredCount + 1
                    });

                    // 3. Save directly to Bookings Collection table
                    const newBooking = await databases.createDocument(
                        DATABASE_ID,
                        COLLECTION_BOOKINGS,
                        ID.unique(),
                        {
                            student_id: user.$id,
                            class_id: classObj.$id
                        }
                    );

                    // 4. Update UI State without reloading
                    setUserBookings(prev => [...prev, newBooking]);
                    setAvailableClasses(prev => prev.map(c =>
                        c.$id === classObj.$id ? { ...c, registeredCount: c.registeredCount + 1 } : c
                    ));
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
        // Check strict cancellation policy: at least 1 minute before
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

                    // Find the specific booking document id for this class and user
                    const bookingToCancel = userBookings.find((b: any) => b.class_id === classObj.$id);
                    if (!bookingToCancel) return;

                    const freshClass = await databases.getDocument(DATABASE_ID, COLLECTION_CLASSES, classObj.$id);

                    // Free the slot
                    await databases.updateDocument(DATABASE_ID, COLLECTION_CLASSES, classObj.$id, {
                        registeredCount: Math.max(0, freshClass.registeredCount - 1)
                    });

                    // Remove from Bookings collection database
                    await databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, bookingToCancel.$id);

                    // Update UI 
                    setUserBookings(prev => prev.filter((b: any) => b.$id !== bookingToCancel.$id));
                    setAvailableClasses(prev => prev.map(c =>
                        c.$id === classObj.$id ? { ...c, registeredCount: Math.max(0, c.registeredCount - 1) } : c
                    ));
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

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="dark min-h-screen bg-black text-white font-sans flex flex-col relative">
            {/* Background glow effects */}
            <div className="absolute inset-0 z-0 opacity-80 mix-blend-screen pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-gradient-to-bl from-emerald-900/20 via-zinc-900/40 to-black rounded-full blur-[120px]" />
            </div>

            <Navbar isHome={false} />

            {/* Main Panel */}
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-12 z-10 space-y-12">

                <div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4 uppercase">{LITERALS.BOOKINGS.TITLE}</h1>
                    <p className="text-white/40 text-lg font-medium">{LITERALS.BOOKINGS.SUBTITLE}</p>
                </div>

                {/* Simulador de Fecha para Tests */}
                <div className="bg-black/40 border border-white/5 p-6 rounded-2xl backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500">Modo de Prueba: Periodo de Gracia</h3>
                        <p className="text-white/40 text-xs font-medium">Verifica el acceso según el día del mes (Días 1-10: Libre | Día 11+: Requiere Pago).</p>
                    </div>
                    <div className="flex items-center gap-4 bg-zinc-900/50 p-2 rounded-xl border border-white/10">
                        <span className="text-xs font-black text-white/30 uppercase px-2 italic">Día {simulatedDay || new Date().getDate()}</span>
                        <input 
                            type="range" 
                            min="1" 
                            max="31" 
                            value={simulatedDay || new Date().getDate()}
                            onChange={(e) => setSimulatedDay(parseInt(e.target.value))}
                            className="w-32 md:w-48 accent-emerald-500 cursor-pointer"
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

                {/* Disponibles Para Reservar (Componentized & Grouped) */}
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

                {/* Mis Reservas (Ya confirmadas) */}
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
