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
import { useAdmin } from "@/contexts/AdminContext";
import { getAdminDashboardData } from "../actions";

export function useAdminData() {
  const { 
    loading,
    studentsList,
    classesList,
    announcements,
    totalStudents,
    monthlyRevenue,
    unpaidCount,
    selectedMonth,
    setSelectedMonth,
    refreshAdminData: loadDashboardData
  } = useAdmin();

  // El hook ahora es un simple puente al Contexto Global de Administración.
  // Mantenemos la interfaz para no romper los componentes que lo usan.

  return {
    loading,
    studentsList,
    setStudentsList: () => {}, // Ya no se debe setear manualmente el estado global
    classesList,
    setClassesList: () => {},
    announcements,
    setAnnouncements: () => {},
    totalStudents,
    setTotalStudents: () => {},
    monthlyRevenue,
    setMonthlyRevenue: () => {},
    unpaidCount,
    setUnpaidCount: () => {},
    selectedMonth,
    setSelectedMonth,
    loadDashboardData
  };
}
