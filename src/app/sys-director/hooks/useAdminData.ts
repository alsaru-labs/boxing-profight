"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Query } from "appwrite";
import { 
  account, 
  databases, 
  DATABASE_ID, 
  COLLECTION_PROFILES, 
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
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
    try {
      if (!silent) setLoading(true);
      const targetMonth = monthOverride || selectedMonth;
      const result = await getAdminDashboardData(targetMonth);
      
      if (!result.success) {
        console.error(result.error);
        setLoading(false);
        return;
      }

      const { students, classes, announcements, currentMonth = "" } = result;
      
      setTotalStudents(students.length);
      setClassesList(classes);
      setAnnouncements(announcements);

      // Fetch Revenue (Keep client-side or move to server action later if needed)
      try {
        const revData = await databases.listDocuments(DATABASE_ID, COLLECTION_REVENUE, [Query.equal("month", currentMonth), Query.limit(1)]);
        if (revData.documents.length > 0) {
          setMonthlyRevenue(revData.documents[0].amount);
        } else {
          setMonthlyRevenue(0);
        }
      } catch (e) {
        console.error("Revenue fetch error:", e);
      }

      const paidStudentsCount = students.filter((s: any) => s.is_paid === true).length;
      setUnpaidCount(students.length - paidStudentsCount);
      setStudentsList(students);
      setLoading(false);
    } catch (error) {
      console.error("Dashboard load error:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      try {
        const userData = await account.get();
        let profile;
        try {
          profile = await databases.getDocument(DATABASE_ID, COLLECTION_PROFILES, userData.$id);
        } catch (e: any) {
          if (e.code === 404) { router.push("/login"); return; }
          throw e;
        }

        if (profile.role !== "admin") {
          router.push("/perfil");
          return;
        }

        await loadDashboardData();
      } catch (error) {
        router.push("/login");
      }
    };

    initDashboard();

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
        }, 800);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [router]);

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
