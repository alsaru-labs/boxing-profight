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
  // bookingsList eliminada - ahora se carga bajo demanda en el modal
  totalStudents: number;
  monthlyRevenue: number;
  unpaidCount: number;
  loading: boolean;
  studentsLoading: boolean;
  selectedMonth: string;
  revenueRecords: any[];
  setStudentsList: React.Dispatch<React.SetStateAction<any[]>>;
  setClassesList: React.Dispatch<React.SetStateAction<any[]>>;
  setAnnouncements: React.Dispatch<React.SetStateAction<any[]>>;
  setMonthlyRevenue: React.Dispatch<React.SetStateAction<number>>;
  setUnpaidCount: React.Dispatch<React.SetStateAction<number>>;
  setTotalStudents: React.Dispatch<React.SetStateAction<number>>;
  setSelectedMonth: (month: string) => void;
  refreshAdminData: (silent?: boolean, month?: string) => Promise<void>;
  refreshStudentsList: (silent?: boolean) => Promise<void>;
  loadRevenueHistory: (silent?: boolean) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
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
  const isFetchingStudentsRef = useRef(false);
  const isFetchingRevenueRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadDashboardData = React.useCallback(async (silent = false, monthOverride?: string) => {
    if (!isAdmin || isFetchingRef.current) return;
    
    const now = Date.now();
    // 🛡️ COOLDOWN ABSOLUTO: 2 segundos
    if (now - lastFetchTimeRef.current < 2000) return;
    // 🛡️ COOLDOWN SILENCIOSO (Foco/Visibilidad): 300 segundos (5 MINUTOS)
    if (silent && (now - lastFetchTimeRef.current < 300000)) return;

    try {
      isFetchingRef.current = true;
      lastFetchTimeRef.current = now;
      if (!silent) setLoading(true);

      const targetMonth = monthOverride || selectedMonth;
      const { getAdminDashboardData } = await import("@/app/sys-director/actions");
      const result = await getAdminDashboardData(targetMonth);
      
      if (result.success) {
        // Stats Ligeras (Sin lista de alumnos completa)
        setClassesList(result.classes);
        setAnnouncements(result.announcements);
        setTotalStudents(result.totalStudents || 0);
        setMonthlyRevenue(result.totalRevenue || 0); 
        setUnpaidCount(result.unpaidCount || 0);

        // ⚡️ OPTIMIZACIÓN ZERO-WASTE: Actualizar estados de pago localmente
        if (result.paidStudentIds && studentsList.length > 0) {
          const paidSet = new Set(result.paidStudentIds);
          setStudentsList(prev => prev.map(s => ({
            ...s,
            is_paid: paidSet.has(s.$id)
          })));
        }
      }
    } catch (error) {
      console.error("Admin data load error:", error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [isAdmin, selectedMonth]);
  
  const loadStudentsList = React.useCallback(async (silent = false) => {
    if (!isAdmin || isFetchingStudentsRef.current) return;
    try {
      if (!silent) setStudentsLoading(true);
      isFetchingStudentsRef.current = true;
      const { getAdminStudentsList } = await import("@/app/sys-director/actions");
      const result = await getAdminStudentsList(selectedMonth);
      if (result.success) {
        setStudentsList(result.students);
      }
    } catch (error) {
      console.error("[AdminContext] Error loading students:", error);
    } finally {
      if (!silent) setStudentsLoading(false);
      isFetchingStudentsRef.current = false;
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
      const event = response.events[0];
      const payload = response.payload as any;
      const collectionId = payload.$collectionId;

      // ⚡️ ACTUALIZACIÓN INCREMENTAL: Pagos (Registro/Anulación)
      if (collectionId === COLLECTION_PAYMENTS) {
        if (payload.month === selectedMonth) {
          if (event.includes(".create")) {
            setStudentsList(prev => prev.map(s => 
              s.$id === payload.student_id ? { ...s, is_paid: true, payment_method: payload.method } : s
            ));
            setMonthlyRevenue(prev => prev + (payload.amount || 0));
            setUnpaidCount(prev => Math.max(0, prev - 1));
            return;
          }
          if (event.includes(".delete")) {
            setStudentsList(prev => prev.map(s => 
              s.$id === payload.student_id ? { ...s, is_paid: false, payment_method: null } : s
            ));
            setMonthlyRevenue(prev => Math.max(0, prev - (payload.amount || 0)));
            setUnpaidCount(prev => prev + 1);
            return;
          }
        }
      }

      // ⚡️ ACTUALIZACIÓN INCREMENTAL: Clases (Crear/Editar/Borrar)
      if (collectionId === COLLECTION_CLASSES) {
        if (event.includes(".create")) {
          setClassesList(prev => {
            if (prev.some(c => c.$id === payload.$id)) return prev;
            return [...prev, payload].sort((a,b) => a.date.localeCompare(b.date));
          });
          return;
        }
        if (event.includes(".update")) {
          setClassesList(prev => prev.map(c => c.$id === payload.$id ? payload : c));
          return;
        }
        if (event.includes(".delete")) {
          setClassesList(prev => prev.filter(c => c.$id !== payload.$id));
          return;
        }
      }

      // ⚡️ ACTUALIZACIÓN INCREMENTAL: Reservas (Asistentes en tiempo real)
      // Se maneja via actualización de clase (registeredCount) o bajo demanda en el modal.

      // ⚡️ ACTUALIZACIÓN INCREMENTAL: Anuncios (Tablón)
      if (collectionId === COLLECTION_NOTIFICATIONS) {
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

      // ⚡️ ACTUALIZACIÓN INCREMENTAL: Perfiles (Cambios de estado/baja)
      if (collectionId === COLLECTION_PROFILES) {
         if (event.includes(".update")) {
            setStudentsList(prev => prev.map(s => s.$id === payload.$id ? { ...s, ...payload } : s));
            return;
         }
      }

      // 💡 OPTIMIZACIÓN ZERO-FETCH:
      // Hemos eliminado el fallback de re-fetch (setTimeout) porque todas las 
      // colecciones críticas (Pagos, Clases, Perfiles, Anuncios) ya tienen lógica
      // de actualización incremental manual arriba. Esto ahorra cientos de lecturas.
    });

    return () => {
      unsubscribe();
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [isAdmin, user?.$id, loadDashboardData, loadRevenueHistory, selectedMonth]);

  const value = React.useMemo(() => ({
    studentsList,
    classesList,
    announcements,
    totalStudents,
    monthlyRevenue,
    unpaidCount,
    loading,
    studentsLoading,
    selectedMonth,
    revenueRecords,
    setStudentsList,
    setClassesList,
    setAnnouncements,
    setMonthlyRevenue,
    setUnpaidCount,
    setTotalStudents,
    setSelectedMonth,
    refreshAdminData: loadDashboardData,
    refreshStudentsList: loadStudentsList,
    loadRevenueHistory
  }), [studentsList, classesList, announcements, totalStudents, monthlyRevenue, unpaidCount, loading, studentsLoading, selectedMonth, revenueRecords, setStudentsList, setClassesList, setAnnouncements, setMonthlyRevenue, setUnpaidCount, setTotalStudents, loadDashboardData, loadStudentsList, loadRevenueHistory]);

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
