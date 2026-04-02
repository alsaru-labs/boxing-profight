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
    refreshStudentsList
  } = useAdmin();

  // El hook ahora es un simple puente al Contexto Global de Administración.
  // Esto mantiene el estado compartido entre todas las pestañas del panel.

  return {
    loading,
    studentsLoading,
    studentsList,
    setStudentsList,
    classesList,
    setClassesList: () => {}, // Mock o implementar si es necesario
    announcements,
    setAnnouncements: () => {}, // Mock o implementar si es necesario
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
