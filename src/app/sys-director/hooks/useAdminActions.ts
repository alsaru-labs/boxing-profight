"use client";

import { useState } from "react";
import {
  updateStudentProfileAction,
  createClassServer,
  handleCreateOrReactivateStudent,
  recordPaymentAction,
  deletePaymentAction,
  deleteClassAction,
  autoGenerateNextWeekClasses
} from "../actions";

interface UseAdminActionsProps {
  studentsList: any[];
  setStudentsList: (val: any) => void;
  classesList: any[];
  setClassesList: (val: any) => void;
  setMonthlyRevenue: (val: any) => void;
  setUnpaidCount: (val: any) => void;
  setTotalStudents: (val: any) => void;
  showAlert: (title: string, description: string, variant?: any) => void;
  showConfirm: (title: string, description: string, onConfirm: () => Promise<any>, variant?: any) => void;
  selectedMonth: string;
  paidStudentIds: Set<string>;
  registerProfileOptimistically: (profile: any) => void;
  deactivateProfileOptimistically: (profileId: string) => void;
  updatePaymentOptimistically: (studentId: string, isPaid: boolean, amount: number, method?: string) => void;
}

export function useAdminActions({
  studentsList,
  setStudentsList,
  classesList,
  setClassesList,
  setMonthlyRevenue,
  setUnpaidCount,
  setTotalStudents,
  showAlert,
  showConfirm,
  selectedMonth,
  paidStudentIds,
  registerProfileOptimistically,
  deactivateProfileOptimistically,
  updatePaymentOptimistically
}: UseAdminActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  // Student Actions
  const handleConfirmPayment = async (studentId: string, newStatus: boolean, paymentMethod?: string, paymentAmount?: string) => {
    try {
      setIsUpdating(true);
      const pAmount = Number(paymentAmount) || 55;

      let result;
      if (newStatus) {
        result = await recordPaymentAction(studentId, pAmount, paymentMethod || "Efectivo", selectedMonth);
      } else {
        result = await deletePaymentAction(studentId, selectedMonth);
      }

      if (result.success) {
        updatePaymentOptimistically(studentId, newStatus, pAmount, paymentMethod);
      }
      return result;
    } catch (error) {
      console.error(error);
      return { success: false, error: "Error de red al procesar el pago." };
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveProfile = async (selectedStudent: any, editName: string, editLastName: string, editEmail: string, editPhone: string, editLevel: string) => {
    try {
      setIsUpdating(true);
      const result = await updateStudentProfileAction(selectedStudent.$id, {
        name: editName,
        last_name: editLastName,
        email: editEmail.toLowerCase(),
        phone: editPhone,
        level: editLevel
      });

      if (result.success) {
        setStudentsList(studentsList.map(s =>
          s.$id === selectedStudent.$id ? { ...s, name: editName, last_name: editLastName, email: editEmail.toLowerCase(), phone: editPhone, level: editLevel } : s
        ));
      }
      return result;
    } catch (error) {
      console.error(error);
      return { success: false, error: "Error de red." };
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateStudent = async (form: any) => {
    try {
      setIsUpdating(true);
      const result = await handleCreateOrReactivateStudent(form);

      if (result.success) {
        registerProfileOptimistically(result.profile);
      }
      return result;
    } catch (err) {
      console.error(err);
      return { success: false, error: "Error de red al registrar al alumno." };
    } finally {
      setIsUpdating(false);
    }
  };

  // Class Actions
  const handleCreateClass = async (newClass: any) => {
    try {
      setIsUpdating(true);
      const result = await createClassServer(newClass);
      return result;
    } catch (error) {
      console.error(error);
      return { success: false, error: "Error de red." };
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClass = async (classObjId: string) => {
    try {
      setIsUpdating(true);
      const result = await deleteClassAction(classObjId);
      if (result.success) {
        setClassesList(classesList.filter(c => c.$id !== classObjId));
      }
      return result;
    } catch (error: any) {
      console.error("Error al borrar la clase:", error);
      return { success: false, error: "Error de red al intentar borrar la clase." };
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePermanentDeleteStudent = async (profileId: string, userId: string) => {
    try {
      setIsUpdating(true);
      const { permanentDeleteStudentAction } = await import("../actions");
      const result = await permanentDeleteStudentAction(profileId, userId);

      if (result.success) {
        // Usar el ayudante atómico para evitar doble-conteo con el Realtime (.delete)
        deactivateProfileOptimistically(profileId);
      }
      return result;
    } catch (err) {
      console.error(err);
      return { success: false, error: "Error de red al intentar el borrado físico." };
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    isUpdating,
    setIsUpdating,
    handleConfirmPayment,
    handleSaveProfile,
    handleCreateStudent,
    handleCreateClass,
    handleDeleteClass,
    handlePermanentDeleteStudent
  };
}
