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
import { getCompleteUserData } from "@/app/sys-director/actions";
import { Models, Query } from "appwrite";

import { Loader2 } from "lucide-react";

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
  refreshProfile: () => Promise<void>;
  refreshGlobalData: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  const logout = React.useCallback(async () => {
    try {
      // 1. Activar estado de cierre de sesión para mostrar la UI de transición
      setIsLoggingOut(true);

      // 2. Limpiar estado local inmediatamente
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
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
    if (isFetchingRef.current && !force) return;
    const now = Date.now();
    
    // 🛡️ COOLDOWN ABSOLUTO: Bloquear si hubo una petición exitosa hace menos de 5s (Aumentado de 2s)
    if (!force && (now - lastFetchTimeRef.current < 5000)) return;
    
    // 🛡️ COOLDOWN SILENCIOSO (Foco/Visibilidad): 300 segundos
    if (silent && !force && (now - lastFetchTimeRef.current < 300000)) return;
    
    isFetchingRef.current = true;
    
    // Si es forzado, reseteamos el tiempo para permitir la llamada inmediata
    if (force) lastFetchTimeRef.current = 0; 
    else lastFetchTimeRef.current = now;
    
    try {
      const currentUser = await account.get();
      setUser(currentUser);

      // 1. O(1) LOAD: Obtener TODO el contexto en una sola llamada de servidor
      const result = await getCompleteUserData(currentUser.$id);
      
      if (result.success && result.data) {
        const { 
          profile: fullProfile, 
          isAdmin: userIsAdmin,
          classes, 
          userBookings: bookings, 
          announcements: notifs, 
          readNotifications: readIds 
        } = result.data;
        
        setProfile(fullProfile);
        setIsAdmin(userIsAdmin);
        setUserBookings(bookings);
        setAvailableClasses(classes);
        setAnnouncements(notifs);
        setReadNotifications(readIds);
      } else {
        throw new Error(result.error || "Error al cargar datos de usuario.");
      }
    } catch (error: any) {
      // 🛡️ SILENCIAR ERROR DE INVITADO: Si no hay sesión, es un estado válido (GUEST), no un error crítico.
      if (error?.code !== 401) {
        console.error("[AuthContext] Auth error:", error);
      }
      
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      setUserBookings([]);
      setAvailableClasses([]);
      setAnnouncements([]);
      setReadNotifications([]);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchUserAndProfile();
  }, [fetchUserAndProfile]);

  // 📡 CENTRALIZACIÓN DE TIEMPO REAL (Suscripción Unificada Zero-Fetch)
  useEffect(() => {
    if (!user?.$id) return;

    const unsubscribe = client.subscribe([
      `databases.${DATABASE_ID}.collections.${COLLECTION_PROFILES}.documents.${user.$id}`,
      `databases.${DATABASE_ID}.collections.${COLLECTION_PAYMENTS}.documents`,
      `databases.${DATABASE_ID}.collections.${COLLECTION_BOOKINGS}.documents`,
      `databases.${DATABASE_ID}.collections.${COLLECTION_CLASSES}.documents`,
      `databases.${DATABASE_ID}.collections.${COLLECTION_NOTIFICATIONS}.documents`,
      `databases.${DATABASE_ID}.collections.${COLLECTION_NOTIFICATIONS_READ}.documents`
    ], (response) => {
      const event = response.events[0];
      const payload = response.payload as any;
      const collectionId = payload.$collectionId;

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

      // ⚡️ Reservas (Alta/Baja de clase con actualización de cupo)
      if (collectionId === COLLECTION_BOOKINGS) {
        const isMyBooking = payload.student_id === user.$id;
        
        if (event.includes(".create")) {
          if (isMyBooking) setUserBookings(prev => [...prev, payload]);
          setAvailableClasses(prev => prev.map(c => 
            c.$id === payload.class_id ? { ...c, registeredCount: (c.registeredCount || 0) + 1 } : c
          ));
          return;
        }
        if (event.includes(".delete")) {
          if (isMyBooking) setUserBookings(prev => prev.filter(b => b.$id !== payload.$id));
          setAvailableClasses(prev => prev.map(c => 
            c.$id === payload.class_id ? { ...c, registeredCount: Math.max(0, (c.registeredCount || 0) - 1) } : c
          ));
          return;
        }
      }

      // ⚡️ Clases (Horarios globales)
      if (collectionId === COLLECTION_CLASSES) {
        if (event.includes(".create")) {
          setAvailableClasses(prev => [...prev, payload].sort((a,b) => a.date.localeCompare(b.date)));
          return;
        }
        if (event.includes(".update")) {
          setAvailableClasses(prev => prev.map(c => c.$id === payload.$id ? payload : c));
          return;
        }
        if (event.includes(".delete")) {
          setAvailableClasses(prev => prev.filter(c => c.$id !== payload.$id));
          return;
        }
      }

      // ⚡️ Anuncios y Notificaciones
      if (collectionId === COLLECTION_NOTIFICATIONS && event.includes(".create")) {
        setAnnouncements(prev => [payload, ...prev].slice(0, 50));
        return;
      }

      if (collectionId === COLLECTION_NOTIFICATIONS_READ && event.includes(".create") && payload.user_id === user.$id) {
        setReadNotifications(prev => [...prev, payload.notification_id]);
        return;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.$id]);

  const unreadNotificationsCount = announcements.filter(n => !readNotifications.includes(n.$id)).length;

  const value = React.useMemo(() => ({
    user, 
    profile, 
    loading, 
    isAdmin, 
    userBookings,
    availableClasses,
    announcements,
    readNotifications,
    unreadNotificationsCount,
    refreshProfile: () => fetchUserAndProfile(false, true),
    refreshGlobalData: () => fetchUserAndProfile(false, true),
    logout
  }), [user, profile, loading, isAdmin, userBookings, availableClasses, announcements, readNotifications, unreadNotificationsCount, fetchUserAndProfile, logout]);

  if (isLoggingOut) {
    return (
      <div className="relative min-h-screen bg-black overflow-hidden font-sans text-white flex items-center justify-center p-6">
        {/* Background Gradient effects */}
        <div className="absolute inset-0 z-0 opacity-80 mix-blend-screen pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] animate-pulse bg-gradient-to-bl from-zinc-800 via-stone-900 to-black rounded-full blur-[100px]" />
          <div className="absolute bottom-[20%] left-[-20%] w-[60%] h-[60%] bg-gradient-to-tr from-red-950/20 via-neutral-900/20 to-transparent rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-white animate-spin mb-6" />
            <p className="text-white font-black uppercase tracking-widest text-sm animate-pulse italic">Cerrando sesión...</p>
            <p className="text-white/20 text-[10px] uppercase font-bold tracking-[0.4em] mt-4">Sincronizando seguridad</p>
        </div>
      </div>
    );
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
