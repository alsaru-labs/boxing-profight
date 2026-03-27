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
        try {
            setIsProcessingBooking(classObj.$id);

            // 1. Verify class still has space in DB acting as single truth
            const freshClass = await databases.getDocument(DATABASE_ID, COLLECTION_CLASSES, classObj.$id);
            if (freshClass.registeredCount >= freshClass.capacity) {
                alert("¡Lo sentimos! Las plazas para esta clase se acaban de llenar.");
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

        } catch (err: any) {
            if (err.code !== 404) {
                alert("Error al intentar realizar la reserva. Inténtalo de nuevo.");
            }
            console.error(err);
        } finally {
            setIsProcessingBooking(null);
        }
    };

    const handleCancelBooking = async (classObj: any) => {
        if (!window.confirm("¿Seguro que quieres cancelar tu plaza en esta clase?")) return;

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

        } catch (err: any) {
            if (err.code !== 404) {
                alert("Error al cancelar la reserva.");
                console.error(err);
            }
        } finally {
            setIsProcessingBooking(null);
        }
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
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4">Reservar Clase.</h1>
                    <p className="text-white/50 text-lg">Selecciona tu próxima sesión en el tatami.</p>
                </div>

                {/* Disponibles Para Reservar */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                            <CalendarClock className="w-6 h-6 text-emerald-500" /> Clases Disponibles
                        </h3>
                        <span className="text-sm text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/10">Próximos 7 días</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {availableClasses.filter(c => !userBookings.some((b: any) => b.class_id === c.$id)).length === 0 ? (
                            <div className="col-span-full bg-white/5 border border-white/10 rounded-xl p-10 text-center text-white/50">
                                <CalendarClock className="w-10 h-10 text-white/20 mx-auto mb-3" />
                                No hay clases nuevas disponibles para reservar en los próximos 7 días.
                            </div>
                        ) : (
                            availableClasses.filter(c => !userBookings.some((b: any) => b.class_id === c.$id)).map(cls => {
                                const isFull = cls.registeredCount >= cls.capacity;
                                return (
                                    <Card key={cls.$id} className="bg-white/5 border-white/10 backdrop-blur-lg overflow-hidden group hover:border-white/20 transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.05)]">
                                        <CardHeader className="pb-3 border-b border-white/5">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <Badge className={`mb-3 font-medium px-3 py-1 border-0 ${cls.name === 'Boxeo' ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'}`}>
                                                        {cls.name}
                                                    </Badge>
                                                    <CardTitle className="text-2xl font-bold text-white">{cls.coach}</CardTitle>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm font-bold text-white block">
                                                        {new Date(cls.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase()}
                                                    </span>
                                                    <span className="text-sm text-white/50">{cls.time.split('-')[0].trim()}</span>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-5 pb-5">
                                            <div>
                                                <div className="flex justify-between text-xs mb-2 font-medium">
                                                    <span className={isFull ? 'text-red-400' : 'text-emerald-400'}>
                                                        {cls.capacity - cls.registeredCount} / {cls.capacity} plazas libres
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 mb-6">
                                                    <div
                                                        className={`h-full transition-all duration-500 ease-out ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`}
                                                        style={{ width: `${Math.min(100, (cls.registeredCount / cls.capacity) * 100)}%` }}
                                                    />
                                                </div>
                                                <Button
                                                    onClick={() => handleBookClass(cls)}
                                                    disabled={isFull || isProcessingBooking === cls.$id || !profileInfo?.is_paid}
                                                    className={`w-full font-bold h-12 text-base rounded-xl transition-all duration-300 ${isFull ? 'bg-red-500/20 text-red-400 hover:bg-red-500/20 cursor-not-allowed' : 'bg-white text-black hover:bg-emerald-500 hover:text-white hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]'}`}
                                                >
                                                    {isProcessingBooking === cls.$id ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                                        !profileInfo?.is_paid ? "⚠️ Pago Pendiente" : isFull ? "Clase Llena" : "Reservar Plaza"
                                                    )}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Mis Reservas (Ya confirmadas) */}
                <ConfirmedClasses
                    availableClasses={availableClasses}
                    userBookings={userBookings}
                    isProcessingBooking={isProcessingBooking}
                    handleCancelBooking={handleCancelBooking}
                />

            </main>
        </div>
    );
}
