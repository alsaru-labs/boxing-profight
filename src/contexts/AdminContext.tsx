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

// 🛡️ BLOQUEADORES GLOBALES (PROMESAS): Dedup absoluto en vuelo
let globalDashboardPromise: Promise<any> | null = null;
let globalStudentsPromise: Promise<any> | null = null;
let globalRevenuePromise: Promise<any> | null = null;

let globalDashboardFetchTime = 0;
let globalStudentsFetchTime = 0;
let globalRevenueFetchTime = 0;

export function AdminProvider({ children }: { children: React.ReactNode }) {


  const { user, profile, isAdmin, loading: authLoading, adminOmniData } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [revenueRecords, setRevenueRecords] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(0);
  const [unpaidCount, setUnpaidCount] = useState<number>(0);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const selectedMonthRef = useRef(selectedMonth);
  const subscriptionRef = useRef<any>(null);
  const processedProfilesRef = useRef<Set<string>>(new Set()); // 🛡️ ESCUDO DE DUPLICADOS

  // 1️⃣ MEGA-HIDRATACIÓN "OMNI" DESDE AUTH (Zero-Waste Inicial)
  useEffect(() => {
    if (isAdmin && adminOmniData && !isHydrated) {
      setStudentsList(adminOmniData.studentsList || []);
      setClassesList(adminOmniData.classes || []); // AuthContext already has classes but whatever
      setTotalStudents(adminOmniData.dashboard?.totalStudents || 0);
      setMonthlyRevenue(adminOmniData.dashboard?.totalRevenue || 0);
      setUnpaidCount(adminOmniData.dashboard?.unpaidCount || 0);
      setRevenueRecords(adminOmniData.revenueHistory || []);
      
      setIsHydrated(true);
      setLoading(false);
      setStudentsLoading(false);
    }
  }, [isAdmin, adminOmniData, isHydrated]);


  // Reset del escudo al cargar datos iniciales para sincronizar con la realidad
  useEffect(() => {
    if (studentsList.length > 0) {
        processedProfilesRef.current = new Set(studentsList.map(s => s.$id));
    }
  }, [studentsList]);

  // Mantener la referencia del mes siempre actualizada para el listener de Realtime
  useEffect(() => {
    selectedMonthRef.current = selectedMonth;
  }, [selectedMonth]);

  const loadDashboardData = React.useCallback(async (silent = false, monthOverride?: string) => {
    if (!isAdmin) return;
    const now = Date.now();

    // Si hay una promesa en vuelo, nos colgamos de ella
    if (globalDashboardPromise) {
        try { await globalDashboardPromise; } catch { }
        return;
    }

    if (now - globalDashboardFetchTime < 2000) return;
    if (silent && (now - globalDashboardFetchTime < 300000)) return;

    globalDashboardFetchTime = now;

    const fetchCore = async () => {
      try {
        const targetMonth = monthOverride || selectedMonthRef.current || selectedMonth;
        const { getAdminDashboardData } = await import("@/app/sys-director/actions");
        const result = await getAdminDashboardData(targetMonth);
        
        if (result.success) {
          setClassesList(result.classes);
          setAnnouncements(result.announcements);
          setTotalStudents(result.totalStudents || 0);
          setMonthlyRevenue(result.totalRevenue || 0); 
          setUnpaidCount(result.unpaidCount || 0);

          if (result.paidStudentIds) {
            setStudentsList(prev => {
              if(prev.length === 0) return prev;
              const paidSet = new Set(result.paidStudentIds);
              return prev.map(s => ({ ...s, is_paid: paidSet.has(s.$id) }));
            });
          }
        }
      } catch (error) {
        console.error("Admin data load error:", error);
      } finally {
        if (!silent) setLoading(false);
        globalDashboardPromise = null;
      }
    };

    if (!silent) setLoading(true);
    globalDashboardPromise = fetchCore();
    await globalDashboardPromise;
  }, [isAdmin, selectedMonth]);

  
  const loadStudentsList = React.useCallback(async (silent = false) => {
    if (!isAdmin) return;
    const now = Date.now();

    if (globalStudentsPromise) {
        try { await globalStudentsPromise; } catch { }
        return;
    }

    if (now - globalStudentsFetchTime < 2000) return;

    globalStudentsFetchTime = now;

    const fetchCore = async () => {
      try {
        const { getAdminStudentsList } = await import("@/app/sys-director/actions");
        const result = await getAdminStudentsList(selectedMonthRef.current || selectedMonth);
        if (result.success) {
          setStudentsList(result.students);
        }
      } catch (error) {
        console.error("[AdminContext] Error loading students:", error);
      } finally {
        if (!silent) setStudentsLoading(false);
        globalStudentsPromise = null;
      }
    };

    if (!silent) setStudentsLoading(true);
    globalStudentsPromise = fetchCore();
    await globalStudentsPromise;
  }, [isAdmin, selectedMonth]);


  const loadRevenueHistory = React.useCallback(async (force = false) => {
    if (!isAdmin) return;
    if (!force && revenueRecords.length > 0) return;

    const now = Date.now();
    
    if (globalRevenuePromise && !force) {
        try { await globalRevenuePromise; } catch { }
        return;
    }

    if (!force && (now - globalRevenueFetchTime < 5000)) return;

    globalRevenueFetchTime = now;

    const fetchCore = async () => {
      try {
        const { getAllRevenueRecords } = await import("@/app/sys-director/actions");
        const res = await getAllRevenueRecords();
        if (res.success && res.documents) {
          setRevenueRecords(res.documents);
        }
      } catch (e) {
        console.error("Error loading revenue history in context:", e);
      } finally {
        globalRevenuePromise = null;
      }
    };

    globalRevenuePromise = fetchCore();
    await globalRevenuePromise;
  }, [isAdmin, revenueRecords.length]);


  // Solo llamamos a los loaders si el mes cambia EXPLÍCITAMENTE (diferente al mes actual)
  useEffect(() => {
    if (!authLoading && isAdmin && isHydrated) {
      const d = new Date();
      const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      // Si el month cambia (el usuario lo seleccionó), hacemos fetch parcial de ese mes
      if (selectedMonth !== currentMonthStr) {
        loadDashboardData(true);
        loadStudentsList(true);
      } else if (adminOmniData) {
        // Volvemos a restaurar la chicha "omni" si vuelve al mes actual
        setStudentsList(adminOmniData.studentsList || []);
        setTotalStudents(adminOmniData.dashboard?.totalStudents || 0);
        setMonthlyRevenue(adminOmniData.dashboard?.totalRevenue || 0);
        setUnpaidCount(adminOmniData.dashboard?.unpaidCount || 0);
        setLoading(false);
      }
    }
  }, [selectedMonth, isHydrated, isAdmin, authLoading]);

  // Suscripción Realtime Singleton para el Administrador
  useEffect(() => {
    if (!isAdmin || !user?.$id) return;
    
    // 🛡️ SINGLETON PATTERN: Evitar suscripciones dobles
    if (subscriptionRef.current) {
        console.log("[AdminContext] Realtime already active, skipping duplicate subscription.");
        return;
    }

    console.log("[AdminContext] Initializing SINGLETON Realtime Subscription...");
    
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
      const currentMonth = selectedMonthRef.current; // Usar REF para evitar stale closure

      // ⚡️ ACTUALIZACIÓN INCREMENTAL: Pagos (Registro/Anulación)
      if (collectionId === COLLECTION_PAYMENTS) {
        if (payload.month === currentMonth) {
          if (event.includes(".create")) {
            setStudentsList(prev => prev.map(s => 
              s.$id === payload.student_id ? { ...s, is_paid: true, payment_method: payload.method } : s
            ));
            setUnpaidCount(prev => Math.max(0, prev - 1));
            return;
          }
          if (event.includes(".delete")) {
            setStudentsList(prev => prev.map(s => 
              s.$id === payload.student_id ? { ...s, is_paid: false, payment_method: null } : s
            ));
            setUnpaidCount(prev => prev + 1);
            return;
          }
        }
      }

      // ⚡️ ACTUALIZACIÓN INCREMENTAL: Ingresos Totales (Contabilidad)
      if (collectionId === COLLECTION_REVENUE) {
        if (event.includes(".update") || event.includes(".create")) {
          if (payload.month === currentMonth) {
            setMonthlyRevenue(payload.amount || 0);
          }
          setRevenueRecords(prev => {
            const exists = prev.some(r => r.month === payload.month);
            if (exists) {
              return prev.map(r => r.month === payload.month ? payload : r);
            }
            return [payload, ...prev].sort((a,b) => b.month.localeCompare(a.month));
          });
          return;
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

      // ⚡️ ACTUALIZACIÓN INCREMENTAL: Perfiles (Registro/Baja)
      if (collectionId === COLLECTION_PROFILES) {
         if (event.includes(".create")) {
            setStudentsList(prev => {
              if (prev.some(s => s.$id === payload.$id)) return prev;
              
              // 🛡️ ESCUDO: Solo sumamos si NO está en el Set de procesados
              if (!processedProfilesRef.current.has(payload.$id)) {
                  console.log(`[Realtime] 🛡️ Adding student to stats (NEW): ${payload.name}`);
                  processedProfilesRef.current.add(payload.$id);
                  setTotalStudents(t => t + 1);
                  setUnpaidCount(u => u + 1);
              }
              
              return [payload, ...prev];
            });
            return;
         }
         if (event.includes(".update")) {
            setStudentsList(prev => {
              const exists = prev.find(s => s.$id === payload.$id);
              
              // Si pasa de inactivo a activo, sumamos SOLO si no lo habíamos contado ya
              if (payload.is_active === true && (!exists || exists.is_active === false)) {
                if (!processedProfilesRef.current.has(payload.$id)) {
                    console.log(`[Realtime] 🛡️ Reactivating Student (ADD): ${payload.name}`);
                    processedProfilesRef.current.add(payload.$id);
                    setTotalStudents(t => t + 1);
                    setUnpaidCount(u => u + 1);
                }
              } 
              // Si pasa de activo a inactivo, restamos
              else if (payload.is_active === false && exists && exists.is_active !== false) {
                if (processedProfilesRef.current.has(payload.$id)) {
                    console.log(`[Realtime] 🛡️ Deactivating Student (SUB): ${payload.name}`);
                    processedProfilesRef.current.delete(payload.$id);
                    setTotalStudents(t => Math.max(0, t - 1));
                    if (!exists.is_paid) setUnpaidCount(u => Math.max(0, u - 1));
                }
              }
              
              return prev.map(s => s.$id === payload.$id ? { ...s, ...payload } : s);
            });
            return;
         }
         if (event.includes(".delete")) {
            setStudentsList(prev => {
              const exists = prev.find(s => s.$id === payload.$id);
              if (exists || processedProfilesRef.current.has(payload.$id)) {
                console.log(`[Realtime] 🛡️ PERMANENT Delete (SUB): ${payload.$id}`);
                processedProfilesRef.current.delete(payload.$id);
                setTotalStudents(t => Math.max(0, t - 1));
                if (exists && !exists.is_paid) setUnpaidCount(u => Math.max(0, u - 1));
                return prev.filter(s => s.$id !== payload.$id);
              }
              return prev;
            });
            return;
         }
      }
    });

    subscriptionRef.current = unsubscribe;

    return () => {
      console.log("[AdminContext] Unsubscribing from Realtime Singleton...");
      if (subscriptionRef.current) {
          subscriptionRef.current();
          subscriptionRef.current = null;
      }
    };

  }, [isAdmin, user?.$id]);

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
