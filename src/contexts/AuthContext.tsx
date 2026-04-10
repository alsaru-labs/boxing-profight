"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import {
  account,
  databases,
  DATABASE_ID,
  COLLECTION_PROFILES,
  COLLECTION_PAYMENTS,
  COLLECTION_BOOKINGS,
  COLLECTION_CLASSES,
  COLLECTION_NOTIFICATIONS,
  COLLECTION_NOTIFICATIONS_READ,
  client
} from "@/lib/appwrite";
import { getPlatformOmniData, revalidateAllDataAction } from "@/app/sys-director/actions";
import { Models, Query } from "appwrite";

import { Loader2 } from "lucide-react";
import AuthTransition from "@/components/AuthTransition";

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  userBookings: any[];
  availableClasses: any[];
  announcements: any[];
  readNotifications: string[];
  unreadNotificationsCount: number;
  adminOmniData: any | null;
  refreshProfile: (silent?: boolean, force?: boolean) => Promise<void>;
  refreshGlobalData: (silent?: boolean, force?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 🛡️ BLOQUEADORES GLOBALES (PROMESAS): Dedup absoluto en vuelo
let globalAuthPromise: Promise<any> | null = null;
let globalAuthFetchTime = 0;

export function AuthProvider({ children }: { children: React.ReactNode }) {

  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [adminOmniData, setAdminOmniData] = useState<any | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);


  const logout = React.useCallback(async () => {
    try {
      // 1. Activar estado de cierre de sesión para mostrar la UI de transición
      setIsLoggingOut(true);

      // 2. Limpiar estado local inmediatamente
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      setAdminOmniData(null);
      setUserBookings([]);
      setAvailableClasses([]);
      setAnnouncements([]);
      setReadNotifications([]);

      // 3. Eliminar sesión en Appwrite (Cliente)
      try {
        await account.deleteSession("current");
      } catch (e) {
        console.warn("[AuthContext] Active session not found during logout");
      }

      // 4. Eliminar cookies de servidor
      const { logout: serverLogout } = await import("@/app/set-password/actions");
      await serverLogout();

      // 5. Pequeña pausa para asegurar que el usuario vea la transición suave
      await new Promise(resolve => setTimeout(resolve, 800));

      // 6. Redirección forzada al login
      window.location.href = "/login";

    } catch (error) {
      console.error("[AuthContext] Logout error:", error);
      setIsLoggingOut(false);
    }
  }, []);

  const fetchUserAndProfile = React.useCallback(async (silent = false, force = false) => {
    const now = Date.now();

    // Si hay una promesa en vuelo y no forzamos, nos colgamos de ella
    if (globalAuthPromise && !force) {
      try { await globalAuthPromise; } catch { }
      return;
    }

    // Cooldown absoluto (1 segundo) para permitir refrescos rápidos tras acciones de UI
    if (!force && (now - globalAuthFetchTime < 1000)) return;
    if (silent && !force && (now - globalAuthFetchTime < 300000)) return;

    globalAuthFetchTime = now;

    // Creamos la promesa principal que todos compartirán
    const fetchCore = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
        // O(1) LOAD: Obtener TODO el contexto en una sola llamada de servidor
        const result = await getPlatformOmniData(currentUser.$id);
        if (result.success && result.data) {
          setProfile(result.data.profile);
          setIsAdmin(result.data.isAdmin);
          setUserBookings(result.data.userBookings);
          setAvailableClasses(result.data.classes);
          setAnnouncements(result.data.announcements);
          setReadNotifications(result.data.readNotifications);

          if (result.data.isAdmin && result.data.adminData) {
            // Guardamos la tajada "Omni" de admin en memoria para que AdminContext beba de aquí sin refetchear
            setAdminOmniData(result.data.adminData);
          }
        } else {
          throw new Error(result.error || "Error al cargar datos.");

        }
      } catch (error: any) {
        if (error?.code !== 401) console.error("[AuthContext] Auth error:", error);
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setAdminOmniData(null);
      } finally {
        if (!silent) setLoading(false);
        globalAuthPromise = null; // Limpiar promesa al terminar
      }
    };

    // Si ya tenemos un perfil en memoria, las llamadas posteriores deben ser silentes por defecto
    const isActuallySilent = silent || !!profile;

    if (!isActuallySilent) setLoading(true);

    globalAuthPromise = fetchCore();
    await globalAuthPromise;
  }, []);


  useEffect(() => {
    fetchUserAndProfile();
  }, [fetchUserAndProfile]);

  // 📡 CENTRALIZACIÓN DE TIEMPO REAL (Protocolo de Resurrección PWA)
  const subscriptionRef = useRef<(() => void) | null>(null);
  
  useEffect(() => {
    if (!user?.$id) return;

    const initSubscription = () => {
      // 🛡️ Prevenimos doble suscripción si el evento se dispara muy rápido
      if (subscriptionRef.current) return;

      console.log("[AuthContext] Iniciando Suscripción Realtime (PWA Resilient)...");
      const unsubscribe = client.subscribe([
        `databases.${DATABASE_ID}.collections.${COLLECTION_PROFILES}.documents.${user.$id}`,
        `databases.${DATABASE_ID}.collections.${COLLECTION_PAYMENTS}.documents`,
        `databases.${DATABASE_ID}.collections.${COLLECTION_BOOKINGS}.documents`,
        `databases.${DATABASE_ID}.collections.${COLLECTION_CLASSES}.documents`,
        `databases.${DATABASE_ID}.collections.${COLLECTION_NOTIFICATIONS}.documents`,
        `databases.${DATABASE_ID}.collections.${COLLECTION_NOTIFICATIONS_READ}.documents`
      ], (response: any) => {
        const event = response.events[0];
        const payload = response.payload as any;
        const collectionId = payload.$collectionId;

        // 🔄 Sincronización Real-Time de Verdad (Solo Estado Local para ahorrar recursos)
        // Eliminamos revalidateAllDataAction() para evitar saturar el servidor con cada evento


        // ⚡️ Perfil (Cambios de rol, datos, etc.)
        if (collectionId === COLLECTION_PROFILES && event.includes(".update")) {
          setProfile((prev: any) => ({ ...prev, ...payload }));
          setIsAdmin(payload.role === "admin");
          return;
        }

        // ⚡️ Pagos (Detección de estado de pago en el perfil)
        if (collectionId === COLLECTION_PAYMENTS) {
          if (payload.student_id === user.$id) {
            const d = new Date();
            const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (payload.month === currentMonthStr) {
              const hasPaid = !event.includes(".delete");
              setProfile((prev: any) => prev ? { ...prev, is_paid: hasPaid } : null);
            }
          }
          return;
        }

        // ⚡️ Clases (Horarios globales y plazas en tiempo real)
        if (collectionId === COLLECTION_CLASSES) {
          if (event.includes(".create")) {
            setAvailableClasses(prev => {
              if (prev.some(c => c.$id === payload.$id)) return prev;
              return [...prev, payload].sort((a, b) => a.date.localeCompare(b.date));
            });
            return;
          }
          if (event.includes(".update")) {
            setAvailableClasses(prev => prev.map(c => c.$id === payload.$id ? { ...c, ...payload } : c));
            return;
          }
          if (event.includes(".delete")) {
            setAvailableClasses(prev => prev.filter(c => c.$id !== payload.$id));
            return;
          }
        }

        // ⚡️ Reservas (Actualiza tu propia lista de reservas)
        if (collectionId === COLLECTION_BOOKINGS) {
          if (payload.student_id === user.$id) {
            if (event.includes(".create")) {
              setUserBookings(prev => {
                if (prev.some(b => b.$id === payload.$id)) return prev;
                return [...prev, payload];
              });
              return;
            }
            if (event.includes(".delete")) {
              setUserBookings(prev => prev.filter(b => b.$id !== payload.$id));
              return;
            }
          }
        }

        // ⚡️ Anuncios y Notificaciones (Campana)
        if (collectionId === COLLECTION_NOTIFICATIONS) {
          console.log("🔔 [Realtime] Cambio en Notificaciones:", event, payload);
          if (event.includes(".create")) {
            setAnnouncements(prev => {
              if (prev.some(a => a.$id === payload.$id)) return prev;
              return [payload, ...prev].slice(0, 50);
            });
            return;
          }
          if (event.includes(".delete")) {
            setAnnouncements(prev => prev.filter(a => a.$id !== payload.$id));
            return;
          }
        }

        if (collectionId === COLLECTION_NOTIFICATIONS_READ && event.includes(".create") && payload.user_id === user.$id) {
          console.log("🔔 [Realtime] Notificación Marcada como Leída:", payload.notifications_id);
          setReadNotifications(prev => {
             if (prev.includes(payload.notifications_id)) return prev;
             return [...prev, payload.notifications_id];
          });
          return;
        }
      });

      subscriptionRef.current = unsubscribe;
    };

    const handleResurrection = () => {
      if (document.visibilityState === "visible") {
        console.log("[AuthContext] PWA detectada como VISIBLE. Reiniciando flujos...");
        
        // 1. Limpieza de socket antiguo (si existe) para liberar recursos
        if (subscriptionRef.current) {
          subscriptionRef.current();
          subscriptionRef.current = null;
        }

        // 2. Nueva conexión de WebSocket limpia
        initSubscription();

        // 3. Catch-up Fetch (Ley de Deduplicación Zero-Fetch)
        // Volvemos a pedir los datos globales por si algo cambió durante la suspensión
        fetchUserAndProfile(true, true);
      }
    };

    const handleOnlineStatus = () => {
      console.log("[AuthContext] Conexión recuperada (Online). Forzando resincronización...");
      handleResurrection();
    };

    // Inicialización
    initSubscription();

    // Listeners de Resurrección para PWA
    window.addEventListener("visibilitychange", handleResurrection);
    window.addEventListener("online", handleOnlineStatus);

    return () => {
      console.log("[AuthContext] Limpieza de listeners y suscripción...");
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
      window.removeEventListener("visibilitychange", handleResurrection);
      window.removeEventListener("online", handleOnlineStatus);
    };
  }, [user?.$id, fetchUserAndProfile]);

  const unreadNotificationsCount = announcements.filter(n => !readNotifications.includes(n.$id)).length;

  const value = React.useMemo(() => ({
    user, profile, loading, isAdmin,
    userBookings, availableClasses, announcements, readNotifications,
    unreadNotificationsCount: unreadNotificationsCount,
    adminOmniData,
    refreshProfile: fetchUserAndProfile,
    refreshGlobalData: fetchUserAndProfile,
    logout
  }), [user, profile, loading, isAdmin, userBookings, availableClasses, announcements, readNotifications, unreadNotificationsCount, adminOmniData, logout, fetchUserAndProfile]);

  if (loading) {
    return <AuthTransition message="Verificando sesión segura..." subMessage="Sincronizando seguridad" />;
  }

  if (isLoggingOut) {
    return <AuthTransition message="Cerrando sesión..." subMessage="Sincronizando seguridad" />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
