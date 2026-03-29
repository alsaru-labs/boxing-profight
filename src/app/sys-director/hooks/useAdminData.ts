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
  COLLECTION_BOOKINGS
} from "@/lib/appwrite";

export function useAdminData() {
  const router = useRouter();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [unpaidCount, setUnpaidCount] = useState(0);

  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const [profilesData, classesData, announcementsData] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_PROFILES, [Query.limit(500)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [Query.limit(500), Query.orderAsc("date")]),
        databases.listDocuments(DATABASE_ID, COLLECTION_NOTIFICATIONS, [Query.orderDesc("createdAt"), Query.limit(20)])
      ]);

      const allStudents = profilesData.documents.filter((s: any) => s.role !== "admin");
      
      setTotalStudents(allStudents.length);
      setClassesList(classesData.documents);
      setAnnouncements(announcementsData.documents);

      const d = new Date();
      const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      try {
        const revData = await databases.listDocuments(DATABASE_ID, COLLECTION_REVENUE, [Query.equal("month", currentMonthStr), Query.limit(1)]);
        if (revData.documents.length > 0) {
          setMonthlyRevenue(revData.documents[0].amount);
        } else {
          setMonthlyRevenue(0);
        }
      } catch (e) {
        console.error("Revenue fetch error:", e);
      }

      const paidStudentsCount = allStudents.filter((s: any) => s.is_paid === true).length;
      setUnpaidCount(allStudents.length - paidStudentsCount);
      setStudentsList(allStudents);
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
      `databases.${DATABASE_ID}.collections.${COLLECTION_BOOKINGS}.documents`
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
    loadDashboardData
  };
}
