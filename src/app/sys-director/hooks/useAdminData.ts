"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Query } from "appwrite";
import { 
  databases, 
  DATABASE_ID, 
  COLLECTION_CLASSES, 
  COLLECTION_NOTIFICATIONS, 
  COLLECTION_REVENUE, 
  client,
  COLLECTION_BOOKINGS,
  COLLECTION_PAYMENTS
} from "@/lib/appwrite";
import { getAdminDashboardData } from "../actions";

export function useAdminData() {
  const router = useRouter();
  const { user: userData, profile: profileData, loading: authLoading } = useAuth();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [totalStudents, setTotalStudents] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [unpaidCount, setUnpaidCount] = useState(0);

  const loadDashboardData = async (silent = false, monthOverride?: string) => {
    if (isFetchingRef.current) return;
    const now = Date.now();
    
    // Cooldown: No refrescar más de una vez cada 10s en modo silencioso (evita bucles infinitos)
    if (silent && (now - lastFetchTimeRef.current < 10000)) return;

    try {
      isFetchingRef.current = true;
      lastFetchTimeRef.current = now;
      if (!silent) setLoading(true);
      const targetMonth = monthOverride || selectedMonth;
      const result = await getAdminDashboardData(targetMonth);
      
      if (!result.success) {
        console.error(result.error);
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      const { students, classes, announcements } = result;
      
      // Calculate revenue 
      const paidStudents = students.filter((s: any) => s.is_paid);
      const paidStudentsCount = paidStudents.length;
      
      setTotalStudents(students.length);
      setClassesList(classes);
      setAnnouncements(announcements);
      setMonthlyRevenue(paidStudentsCount * 60);
      setUnpaidCount(students.length - paidStudentsCount);
      setStudentsList(students);
      setLoading(false);
    } catch (error) {
      console.error("Dashboard load error:", error);
      setLoading(false);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (authLoading) return;
    
    // Redirección si no es admin (Seguridad en el cliente)
    if (!userData || profileData?.role !== "admin") {
      router.push("/login?redirect=/sys-director");
      return;
    }

    loadDashboardData();

    // 📡 RESILIENCIA: Refresco por foco/visibilidad
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadDashboardData(true);
      }
    };
    const handleFocus = () => loadDashboardData(true);

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [router, authLoading, userData, profileData]);

  // Suscripción Realtime para el Dashboard
  useEffect(() => {
    if (!userData) return;
    
    const unsubscribe = client.subscribe([
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
        }, 800);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userData]);

  return {
    loading,
    studentsList,
    setStudentsList,
    classesList,
    setClassesList,
    announcements,
    setAnnouncements,
    totalStudents,
    setTotalStudents,
    monthlyRevenue,
    setMonthlyRevenue,
    unpaidCount,
    setUnpaidCount,
    selectedMonth,
    setSelectedMonth,
    loadDashboardData
  };
}
