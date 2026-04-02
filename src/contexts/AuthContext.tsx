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
import { getStudentInitialData } from "@/app/sys-director/actions";
import { Models, Query } from "appwrite";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  const fetchUserAndProfile = React.useCallback(async (silent = false) => {
    if (isFetchingRef.current) return;
    const now = Date.now();
    
    // 🛡️ COOLDOWN ABSOLUTO: Bloquear si hubo una petición exitosa hace menos de 2s
    if (now - lastFetchTimeRef.current < 2000) return;
    
    // 🛡️ COOLDOWN SILENCIOSO (Foco/Visibilidad): 300 segundos (5 MINUTOS)
    if (silent && (now - lastFetchTimeRef.current < 300000)) return;
    
    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;
    
    try {
      const currentUser = await account.get();
      setUser(currentUser);

      // 🌪️ FETCH GLOBAL CONSOLIDADO (1 Petición vs 5)
      const result = await getStudentInitialData(currentUser.$id);

      if (result.success && result.data) {
        const { classes, userBookings: bookings, isPaid, announcements: notifs, readNotifications: readIds } = result.data;
        
        // El perfil base lo seguimos necesitando para el rol y datos básicos
        const userProfile = await databases.getDocument(DATABASE_ID, COLLECTION_PROFILES, currentUser.$id);

        setProfile({ ...userProfile, is_paid: isPaid });
        setIsAdmin(userProfile.role === "admin");
        setUserBookings(bookings);
        setAvailableClasses(classes);
        setAnnouncements(notifs);
        setReadNotifications(readIds);
      }
    } catch (error) {
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
             setProfile((prev: any) => prev ? { ...prev, is_paid: event.includes(".create") } : null);
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
    refreshProfile: fetchUserAndProfile,
    refreshGlobalData: fetchUserAndProfile
  }), [user, profile, loading, isAdmin, userBookings, availableClasses, announcements, readNotifications, unreadNotificationsCount, fetchUserAndProfile]);

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
