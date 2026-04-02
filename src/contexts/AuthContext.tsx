"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { account, databases, DATABASE_ID, COLLECTION_PROFILES, client } from "@/lib/appwrite";
import { Models } from "appwrite";

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

      const userProfile = await databases.getDocument(
        DATABASE_ID,
        COLLECTION_PROFILES,
        currentUser.$id
      );
      
      setProfile(userProfile);
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

    // Suscripción en tiempo real solo si hay usuario
    let unsubscribe: () => void;

    const setupRealtime = async () => {
      try {
        const currentUser = await account.get();
        unsubscribe = client.subscribe(
          [`databases.${DATABASE_ID}.collections.${COLLECTION_PROFILES}.documents.${currentUser.$id}`],
          (response) => {
            if (response.events.some(e => e.includes(".update"))) {
              setProfile(response.payload);
              setIsAdmin((response.payload as any).role === "admin");
            }
          }
        );
      } catch {
        // No hay sesión activa para suscribirse
      }
    };

    setupRealtime();

    return () => {
      if (unsubscribe) unsubscribe();
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
