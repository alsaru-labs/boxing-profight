"use client";

import { useState, useEffect } from "react";
import { Bell, X, Info, AlertTriangle, CheckCircle2, Loader2, Signal } from "lucide-react";
import { databases, DATABASE_ID, COLLECTION_NOTIFICATIONS, COLLECTION_NOTIFICATIONS_READ, client } from "@/lib/appwrite";
import { Query, ID } from "appwrite";
import { motion, AnimatePresence } from "framer-motion";
import { registerPushNotifications } from "@/lib/push-notifications";

interface Notification {
    $id: string;
    title: string;
    content: string;
    type: "info" | "warning" | "success";
    createdAt: string;
}

interface NotificationPanelProps {
    userId: string;
    isLoggedIn: boolean;
}

export default function NotificationPanel({ userId, isLoggedIn }: NotificationPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [readIds, setReadIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMarking, setIsMarking] = useState<string | null>(null);
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        // Al montar o abrir, comprobamos si ya hay permiso concedido
        if (typeof window !== "undefined" && "Notification" in window) {
            setIsSubscribed(Notification.permission === "granted");
        }
    }, []);

    const fetchNotifications = async () => {
        if (!isLoggedIn || !userId) return;

        try {
            setLoading(true);
            // 1. Fetch all announcements
            const globalResponse = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_NOTIFICATIONS,
                [Query.orderDesc("createdAt"), Query.limit(50)]
            );

            const allNotifs = globalResponse.documents as unknown as Notification[];

            // 2. Fetch what the user has read
            const readResponse = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_NOTIFICATIONS_READ,
                [Query.equal("user_id", userId), Query.limit(100)]
            );

            const readLogIds = readResponse.documents.map(doc => doc.notification_id);

            setNotifications(allNotifs);
            setReadIds(readLogIds);
        } catch (e) {
            console.error("Error fetching notifications:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // 🟢 SUSCRIPCIÓN EN TIEMPO REAL (Appwrite Realtime)
        // Escucha cambios en anuncios y en el estado de lectura
        const unsubscribe = client.subscribe(
            [
                `databases.${DATABASE_ID}.collections.${COLLECTION_NOTIFICATIONS}.documents`,
                `databases.${DATABASE_ID}.collections.${COLLECTION_NOTIFICATIONS_READ}.documents`
            ],
            (response) => {
                // Si alguien crea o borra un anuncio, o lo marca como leído desde otro sitio...
                if (response.events.some(e => e.includes(".create") || e.includes(".delete") || e.includes(".update"))) {
                    fetchNotifications();
                }
            }
        );

        return () => {
            unsubscribe();
        };
    }, [userId, isLoggedIn]);

    const unreadCount = notifications.filter(n => !readIds.includes(n.$id)).length;

    // Filter visible notifications: Strictly last 48h
    const visibleNotifications = notifications.filter(n => {
        const createdDate = new Date(n.createdAt);
        const fortyEightHoursAgo = new Date();
        fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

        return createdDate > fortyEightHoursAgo;
    });

    const handleMarkAsRead = async (notifId: string) => {
        if (readIds.includes(notifId) || isMarking) return;

        setIsMarking(notifId);
        try {
            await databases.createDocument(
                DATABASE_ID,
                COLLECTION_NOTIFICATIONS_READ,
                ID.unique(),
                {
                    user_id: userId,
                    notification_id: notifId,
                    read_at: new Date().toISOString()
                }
            );
            setReadIds(prev => [...prev, notifId]);
        } catch (e) {
            console.error("Error marking as read:", e);
        } finally {
            setIsMarking(null);
        }
    };

    const handleMarkAllAsRead = async () => {
        const unreadNotifs = notifications.filter(n => !readIds.includes(n.$id));
        if (unreadNotifs.length === 0 || isMarking) return;

        setIsMarking("all");
        try {
            // Create read entries for all unread
            const promises = unreadNotifs.map(n => 
                databases.createDocument(
                    DATABASE_ID,
                    COLLECTION_NOTIFICATIONS_READ,
                    ID.unique(),
                    {
                        user_id: userId,
                        notification_id: n.$id,
                        read_at: new Date().toISOString()
                    }
                )
            );
            await Promise.all(promises);
            const markedIds = unreadNotifs.map(n => n.$id);
            setReadIds(prev => [...prev, ...markedIds]);
        } catch (e) {
            console.error("Error marking all as read:", e);
        } finally {
            setIsMarking(null);
        }
    };

    if (!isLoggedIn) return null;

    return (
        <div
            className="relative"
            onMouseLeave={() => setIsOpen(false)}
        >
            {/* Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center text-white/80 hover:text-white"
            >
                <Bell className="w-6 h-6 md:w-5 md:h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-2 flex h-5 w-5 pointer-events-none">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 text-[10px] items-center justify-center font-bold text-white border-2 border-black/50">
                            {unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {/* Modal / Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Overlay to close on click outside */}
                        <div
                            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="fixed md:absolute inset-x-4 md:inset-x-auto md:right-0 top-24 md:top-full mt-2 md:mt-4 w-auto md:w-[400px] z-50 overflow-hidden"
                        >
                            <div className="bg-zinc-950 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                                    <div className="flex flex-col">
                                        <h3 className="font-bold text-lg text-white">Tablón de Anuncios</h3>
                                        {unreadCount > 0 && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkAllAsRead();
                                                }}
                                                disabled={!!isMarking}
                                                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors mt-0.5"
                                            >
                                                {isMarking === "all" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                                Marcar todo como leído
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5 text-white/60" />
                                    </button>
                                </div>

                                <div className="max-h-[70vh] overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                    {/* Push Permission Button - Solo se muestra si NO está suscrito */}
                                    {!isSubscribed && (
                                        <div className="mb-2 p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-3 group hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-500/10 rounded-full">
                                                    <Signal className="w-4 h-4 text-emerald-400" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-white">Notificaciones Móviles</span>
                                                    <span className="text-[10px] text-white/40">Recibe avisos push en tiempo real</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    const sub = await registerPushNotifications(userId);
                                                    if (sub) setIsSubscribed(true);
                                                }}
                                                className="px-3 py-1.5 bg-white text-black text-[10px] font-black uppercase rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg"
                                            >
                                                Activar
                                            </button>
                                        </div>
                                    )}

                                    {loading && notifications.length === 0 ? (
                                        <div className="py-12 flex flex-col items-center justify-center text-white/40 italic">
                                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                            Cargando anuncios...
                                        </div>
                                    ) : visibleNotifications.length === 0 ? (
                                        <div className="py-12 text-center text-white/40 italic">
                                            No hay anuncios recientes.
                                        </div>
                                    ) : (
                                        visibleNotifications.map((n) => {
                                            const isRead = readIds.includes(n.$id);
                                            return (
                                                <div
                                                    key={n.$id}
                                                    onClick={() => handleMarkAsRead(n.$id)}
                                                    className={`p-4 rounded-xl transition-all border group cursor-pointer ${isRead
                                                        ? "bg-white/5 border-white/5 opacity-60 grayscale-[0.5]"
                                                        : "bg-white/10 border-white/10 hover:bg-white/15 hover:scale-[1.01] shadow-lg"
                                                        }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${isRead ? 'bg-transparent' : 'bg-red-500 animate-pulse'}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className={`text-[10px] uppercase tracking-widest font-bold ${n.type === 'warning' ? 'text-amber-400' : n.type === 'success' ? 'text-emerald-400' : 'text-blue-400'
                                                                    }`}>
                                                                    {n.type || 'info'}
                                                                </span>
                                                                <span className="text-[10px] text-white/30 whitespace-nowrap">
                                                                    {new Date(n.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                                                </span>
                                                            </div>
                                                            <h4 className={`font-bold leading-tight mb-1 text-white ${isRead ? 'text-white/80' : 'text-white'}`}>
                                                                {n.title}
                                                            </h4>
                                                            <p className="text-sm text-white/60 line-clamp-3 leading-relaxed">
                                                                {n.content}
                                                            </p>
                                                            {!isRead && (
                                                                <div className="mt-3 flex justify-end">
                                                                    <span className="text-[10px] bg-white text-black px-2 py-0.5 rounded-full font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        MARCAR COMO LEÍDO
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                <div className="p-3 bg-white/5 text-center">
                                    <p className="text-[10px] text-white/20 uppercase tracking-tighter">
                                        Mostrando anuncios del tablón oficial • Boxeo ProFight
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
