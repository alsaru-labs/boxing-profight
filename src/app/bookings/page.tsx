"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, CalendarClock, LogOut, ArrowLeft, CheckCircle2, History, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { account, databases, DATABASE_ID, COLLECTION_PROFILES, COLLECTION_CLASSES, COLLECTION_BOOKINGS, client } from "@/lib/appwrite";
import { Query, ID } from "appwrite";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import ConfirmedClasses from "@/components/ConfirmedClasses";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { BookingList } from "./components/BookingList";

export default function BookingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [profileInfo, setProfileInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Real-time Class & Booking States
    const [availableClasses, setAvailableClasses] = useState<any[]>([]);
    const [userBookings, setUserBookings] = useState<any[]>([]);
    const [isProcessingBooking, setIsProcessingBooking] = useState<string | null>(null);
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        onConfirm: () => {},
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
            try {
                if (!silent) setLoading(true);
                const currentUser = await account.get();
                setUser(currentUser);

                // Fetch data for the first time
                const [profile, bookingsData, classesData] = await Promise.all([
                    databases.getDocument(DATABASE_ID, COLLECTION_PROFILES, currentUser.$id),
                    databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [Query.equal("student_id", currentUser.$id), Query.limit(100)]),
                    databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [Query.limit(100), Query.orderAsc("date")])
                ]);

                if (profile.role === "admin") {
                    router.push("/sys-director");
                    return;
                }

                setProfileInfo(profile);
                setUserBookings(bookingsData.documents);

                const now = new Date();
                const msIn7Days = 7 * 24 * 60 * 60 * 1000;
                const validUpcomingClasses = classesData.documents.filter((cls: any) => {
                    try {
                        const startTime = cls.time.split('-')[0].trim();
                        const [year, month, day] = cls.date.substring(0, 10).split("-").map(Number);
                        const [hours, minutes] = startTime.split(":").map(Number);
                        const classDateTime = new Date(year, month - 1, day, hours, minutes);
                        return classDateTime >= now && classDateTime.getTime() <= now.getTime() + msIn7Days;
                    } catch { return false; }
                });
                setAvailableClasses(validUpcomingClasses);
                setLoading(false);

                // 🟢 TIEMPO REAL: Suscripción a cambios
                if (!unsubscribe) {
                    unsubscribe = client.subscribe([
                        `databases.${DATABASE_ID}.collections.${COLLECTION_PROFILES}.documents.${currentUser.$id}`,
                        `databases.${DATABASE_ID}.collections.${COLLECTION_CLASSES}.documents`,
                        `databases.${DATABASE_ID}.collections.${COLLECTION_BOOKINGS}.documents`
                    ], (response) => {
                        // Refrescamos los datos con un pequeño retraso para agrupar cambios
                        if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
                        refreshTimeoutRef.current = setTimeout(() => {
                            loadData(true);
                        }, 800);
                    });
                }

            } catch (error: any) {
                if (error.code === 404) return;
                router.push("/login?redirect=/bookings");
            }
        };

        loadData();

        return () => {
            if (unsubscribe) unsubscribe();
            if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
        };
    }, [router]);

    const handleBookClass = async (classObj: any) => {
        showConfirm(
            "Confirmar Reserva", 
            `¿Quieres reservar tu plaza para la clase de ${classObj.name} con ${classObj.coach}?`,
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
        showConfirm(
            "Cancelar Reserva", 
            "¿Seguro que quieres cancelar tu plaza en esta clase? Esta acción permitirá que otro compañero asista.",
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
            <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-12 z-10 space-y-12">

                <div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4 uppercase">Reservar Clase.</h1>
                    <p className="text-white/40 text-lg font-medium">Selecciona tu próxima sesión en el tatami.</p>
                </div>

                {/* Disponibles Para Reservar (Componentized & Grouped) */}
                <BookingList 
                    availableClasses={availableClasses}
                    userBookings={userBookings}
                    profileInfo={profileInfo}
                    isProcessingBooking={isProcessingBooking}
                    handleBookClass={handleBookClass}
                />

                {/* Mis Reservas (Ya confirmadas) */}
                <ConfirmedClasses
                    availableClasses={availableClasses}
                    userBookings={userBookings}
                    isProcessingBooking={isProcessingBooking}
                    handleCancelBooking={handleCancelBooking}
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
