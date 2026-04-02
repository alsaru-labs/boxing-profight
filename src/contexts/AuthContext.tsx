"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { account, databases, DATABASE_ID, COLLECTION_PROFILES, COLLECTION_PAYMENTS, client } from "@/lib/appwrite";
import { Models, Query } from "appwrite";

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchUserAndProfile = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    try {
      const currentUser = await account.get();
      setUser(currentUser);

      const d = new Date();
      const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const [userProfile, paymentData] = await Promise.all([
        databases.getDocument(DATABASE_ID, COLLECTION_PROFILES, currentUser.$id),
        databases.listDocuments(DATABASE_ID, COLLECTION_PAYMENTS, [
          Query.equal("student_id", currentUser.$id),
          Query.equal("month", currentMonthStr),
          Query.limit(1)
        ])
      ]);
      
      const enrichedProfile = {
        ...userProfile,
        is_paid: paymentData.total > 0
      };

      setProfile(enrichedProfile);
      setIsAdmin(userProfile.role === "admin");
    } catch (error) {
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchUserAndProfile();

    // Suscripción en tiempo real
    let unsubscribeProfile: () => void;
    let unsubscribePayments: () => void;

    const setupRealtime = async () => {
      try {
        const currentUser = await account.get();
        
        // 1. Suscripción al Perfil
        unsubscribeProfile = client.subscribe(
          [`databases.${DATABASE_ID}.collections.${COLLECTION_PROFILES}.documents.${currentUser.$id}`],
          (response) => {
            if (response.events.some(e => e.includes(".update"))) {
              setProfile((prev: any) => ({ ...prev, ...(response.payload as any) }));
              setIsAdmin((response.payload as any).role === "admin");
            }
          }
        );

        // 2. Suscripción a Pagos (Relacional)
        unsubscribePayments = client.subscribe(
          [`databases.${DATABASE_ID}.collections.${COLLECTION_PAYMENTS}.documents`],
          (response) => {
            const payload = response.payload as any;
            if (payload.student_id === currentUser.$id) {
              const d = new Date();
              const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              
              if (payload.month === currentMonthStr) {
                if (response.events.some(e => e.includes(".create"))) {
                  setProfile((prev: any) => prev ? { ...prev, is_paid: true } : null);
                } else if (response.events.some(e => e.includes(".delete"))) {
                  setProfile((prev: any) => prev ? { ...prev, is_paid: false } : null);
                }
              }
            }
          }
        );
      } catch {
        // No hay sesión activa para suscribirse
      }
    };

    setupRealtime();

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribePayments) unsubscribePayments();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAdmin, 
      refreshProfile: fetchUserAndProfile 
    }}>
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
