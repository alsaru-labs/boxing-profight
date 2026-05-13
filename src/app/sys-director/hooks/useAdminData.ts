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
    loading,
    studentsLoading,
    selectedMonth,
    setSelectedMonth,
    refreshAdminData,
    refreshStudentsList,
    setClassesList,
    setAnnouncements,
    paidStudentIds,
    registerProfileOptimistically,
    deactivateProfileOptimistically,
    updatePaymentOptimistically
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
    selectedMonth,
    setSelectedMonth,
    loadDashboardData: refreshAdminData,
    refreshStudentsList,
    paidStudentIds,
    registerProfileOptimistically,
    deactivateProfileOptimistically,
    updatePaymentOptimistically
  };
}
