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
import { Models, Query } from "appwrite";

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  userBookings: any[];
  availableClasses: any[];
  announcements: any[];
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

  const fetchUserAndProfile = React.useCallback(async () => {
    if (isFetchingRef.current) return;
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 2000) return;
    
    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;
    
    try {
      const currentUser = await account.get();
      setUser(currentUser);

      const d = new Date();
      const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      // 🌪️ FETCH GLOBAL MASIVO (5 Colecciones de una sola vez)
      const [
        userProfile, 
        paymentData, 
        bookingsData, 
        classesData, 
        announcementsData,
        readStatusData
      ] = await Promise.all([
        databases.getDocument(DATABASE_ID, COLLECTION_PROFILES, currentUser.$id),
        databases.listDocuments(DATABASE_ID, COLLECTION_PAYMENTS, [
          Query.equal("student_id", currentUser.$id),
          Query.equal("month", currentMonthStr),
          Query.limit(1)
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [
          Query.equal("student_id", currentUser.$id),
          Query.limit(100)
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [
          Query.limit(100),
          Query.orderAsc("date")
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_NOTIFICATIONS, [
          Query.orderDesc("$createdAt"),
          Query.limit(50)
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_NOTIFICATIONS_READ, [
          Query.equal("user_id", currentUser.$id),
          Query.limit(100)
        ])
      ]);
      
      const enrichedProfile = {
        ...userProfile,
        is_paid: paymentData.total > 0
      };

      setProfile(enrichedProfile);
      setIsAdmin(userProfile.role === "admin");
      setUserBookings(bookingsData.documents);
      setAvailableClasses(classesData.documents);
      setAnnouncements(announcementsData.documents);
      setReadNotifications(readStatusData.documents.map(d => d.notification_id));

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

  useEffect(() => {
    if (!user?.$id) return;

    // 📡 CENTRALIZACIÓN DE TIEMPO REAL (5 Suscripciones en 1 efecto)
    let unsubscribeProfile: () => void;
    let unsubscribePayments: () => void;
    let unsubscribeBookings: () => void;
    let unsubscribeClasses: () => void;
    let unsubscribeAnnouncements: () => void;

    // 1. Suscripción al Perfil
    unsubscribeProfile = client.subscribe(
      [`databases.${DATABASE_ID}.collections.${COLLECTION_PROFILES}.documents.${user.$id}`],
      (response) => {
        if (response.events.some(e => e.includes(".update"))) {
          setProfile((prev: any) => ({ ...prev, ...(response.payload as any) }));
          setIsAdmin((response.payload as any).role === "admin");
        }
      }
    );

    // 2. Suscripción a Pagos
    unsubscribePayments = client.subscribe(
      [`databases.${DATABASE_ID}.collections.${COLLECTION_PAYMENTS}.documents`],
      (response) => {
        const payload = response.payload as any;
        if (payload.student_id === user.$id) {
          const d = new Date();
          const currentMonthMonth = String(d.getMonth() + 1).padStart(2, '0');
          const currentMonthStr = `${d.getFullYear()}-${currentMonthMonth}`;
          
          if (payload.month === currentMonthStr) {
            setProfile((prev: any) => prev ? { 
              ...prev, 
              is_paid: response.events.some(e => e.includes(".create")) 
            } : null);
          }
        }
      }
    );

    // 3. Suscripción a Reservas
    unsubscribeBookings = client.subscribe(
      [`databases.${DATABASE_ID}.collections.${COLLECTION_BOOKINGS}.documents`],
      (response) => {
        const payload = response.payload as any;
        if (payload.student_id === user.$id) {
          fetchUserAndProfile(); // Refresco coordinado para reservas
        }
      }
    );

    // 4. Suscripción a Clases y Anuncios (Globales)
    unsubscribeClasses = client.subscribe(
      [`databases.${DATABASE_ID}.collections.${COLLECTION_CLASSES}.documents`],
      () => fetchUserAndProfile()
    );

    unsubscribeAnnouncements = client.subscribe(
      [
        `databases.${DATABASE_ID}.collections.${COLLECTION_NOTIFICATIONS}.documents`,
        `databases.${DATABASE_ID}.collections.${COLLECTION_NOTIFICATIONS_READ}.documents`
      ],
      () => fetchUserAndProfile()
    );

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribePayments) unsubscribePayments();
      if (unsubscribeBookings) unsubscribeBookings();
      if (unsubscribeClasses) unsubscribeClasses();
      if (unsubscribeAnnouncements) unsubscribeAnnouncements();
    };
  }, [user?.$id, fetchUserAndProfile]);

  const unreadNotificationsCount = announcements.filter(n => !readNotifications.includes(n.$id)).length;

  const value = React.useMemo(() => ({
    user, 
    profile, 
    loading, 
    isAdmin, 
    userBookings,
    availableClasses,
    announcements,
    unreadNotificationsCount,
    refreshProfile: fetchUserAndProfile,
    refreshGlobalData: fetchUserAndProfile
  }), [user, profile, loading, isAdmin, userBookings, availableClasses, announcements, unreadNotificationsCount, fetchUserAndProfile]);

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
