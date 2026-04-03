"use client";

import { useAdmin } from "@/contexts/AdminContext";

export function useAdminData() {
  const {
    studentsList,
    setStudentsList,
    classesList,
    announcements,
    totalStudents,
    setTotalStudents,
    monthlyRevenue,
    setMonthlyRevenue,
    unpaidCount,
    setUnpaidCount,
    loading,
    studentsLoading,
    selectedMonth,
    setSelectedMonth,
    refreshAdminData,
    refreshStudentsList,
    setClassesList,
    setAnnouncements
  } = useAdmin();

  return {
    loading,
    studentsLoading,
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
    loadDashboardData: refreshAdminData,
    refreshStudentsList
  };
}
