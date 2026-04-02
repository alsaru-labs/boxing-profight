"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { 
  client, 
  DATABASE_ID, 
  COLLECTION_CLASSES, 
  COLLECTION_REVENUE, 
  COLLECTION_NOTIFICATIONS, 
  COLLECTION_BOOKINGS, 
  COLLECTION_PAYMENTS,
  COLLECTION_PROFILES
} from "@/lib/appwrite";
import { getAdminDashboardData } from "@/app/sys-director/actions";
import { useAuth } from "./AuthContext";

interface AdminContextType {
  studentsList: any[];
  classesList: any[];
  announcements: any[];
  totalStudents: number;
  monthlyRevenue: number;
  unpaidCount: number;
  loading: boolean;
  selectedMonth: string;
  revenueRecords: any[];
  setSelectedMonth: (month: string) => void;
  refreshAdminData: (silent?: boolean, monthOverride?: string) => Promise<void>;
  loadRevenueHistory: (force?: boolean) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [revenueRecords, setRevenueRecords] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const isFetchingRef = useRef(false);
  const isFetchingRevenueRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadDashboardData = React.useCallback(async (silent = false, monthOverride?: string) => {
    if (!isAdmin || isFetchingRef.current) return;
    
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 2000) return;
    if (silent && (now - lastFetchTimeRef.current < 30000)) return;

    try {
      isFetchingRef.current = true;
      lastFetchTimeRef.current = now;
      if (!silent) setLoading(true);

      const targetMonth = monthOverride || selectedMonth;
      const result = await getAdminDashboardData(targetMonth);
      
      if (result.success) {
        setStudentsList(result.students);
        setClassesList(result.classes);
        setAnnouncements(result.announcements);
        setTotalStudents(result.students.length);
        
        const paidCount = result.students.filter((s: any) => s.is_paid).length;
        setMonthlyRevenue(paidCount * 60); 
        setUnpaidCount(result.students.length - paidCount);
      }
    } catch (error) {
      console.error("Admin data load error:", error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [isAdmin, selectedMonth]);

  const loadRevenueHistory = React.useCallback(async (force = false) => {
    if (!isAdmin || (isFetchingRevenueRef.current)) return;
    if (!force && revenueRecords.length > 0) return;

    try {
      isFetchingRevenueRef.current = true;
      const { getAllRevenueRecords } = await import("@/app/sys-director/actions");
      const res = await getAllRevenueRecords();
      if (res.success && res.documents) {
        setRevenueRecords(res.documents);
      }
    } catch (e) {
      console.error("Error loading revenue history in context:", e);
    } finally {
      isFetchingRevenueRef.current = false;
    }
  }, [isAdmin, revenueRecords.length]);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadDashboardData();
    }
  }, [authLoading, isAdmin, loadDashboardData]);

  // Suscripción Realtime Unificada para el Administrador
  useEffect(() => {
    if (!isAdmin || !user?.$id) return;

    const unsubscribe = client.subscribe([
      `databases.${DATABASE_ID}.collections.${COLLECTION_PROFILES}.documents`,
      `databases.${DATABASE_ID}.collections.${COLLECTION_CLASSES}.documents`,
      `databases.${DATABASE_ID}.collections.${COLLECTION_REVENUE}.documents`,
      `databases.${DATABASE_ID}.collections.${COLLECTION_NOTIFICATIONS}.documents`,
      `databases.${DATABASE_ID}.collections.${COLLECTION_BOOKINGS}.documents`,
      `databases.${DATABASE_ID}.collections.${COLLECTION_PAYMENTS}.documents`
    ], (response) => {
      if (response.events.some(e => e.includes(".create") || e.includes(".delete") || e.includes(".update"))) {
        if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = setTimeout(() => {
          loadDashboardData(true);
          // If something changes in revenue, we might want to refresh history too
          if (response.events.some(e => e.includes(COLLECTION_REVENUE))) {
             loadRevenueHistory(true);
          }
        }, 1000); 
      }
    });

    return () => {
      unsubscribe();
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [isAdmin, user?.$id, loadDashboardData, loadRevenueHistory]);

  const value = React.useMemo(() => ({
    studentsList,
    classesList,
    announcements,
    totalStudents,
    monthlyRevenue,
    unpaidCount,
    loading,
    selectedMonth,
    revenueRecords,
    setSelectedMonth,
    refreshAdminData: loadDashboardData,
    loadRevenueHistory
  }), [studentsList, classesList, announcements, totalStudents, monthlyRevenue, unpaidCount, loading, selectedMonth, revenueRecords, loadDashboardData, loadRevenueHistory]);

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin debe usarse dentro de un AdminProvider");
  }
  return context;
}
