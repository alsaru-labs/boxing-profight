"use client";

import { useState } from "react";
import { Query, ID } from "appwrite";
import { 
  databases, 
  DATABASE_ID, 
  COLLECTION_PROFILES, 
  COLLECTION_CLASSES, 
  COLLECTION_PAYMENTS, 
  COLLECTION_REVENUE, 
  COLLECTION_BOOKINGS 
} from "@/lib/appwrite";
import { createClassServer } from "../actions";

interface UseAdminActionsProps {
  studentsList: any[];
  setStudentsList: (val: any) => void;
  classesList: any[];
  setClassesList: (val: any) => void;
  setMonthlyRevenue: (val: any) => void;
  setUnpaidCount: (val: any) => void;
  setTotalStudents: (val: any) => void;
  showAlert: (title: string, description: string, variant?: any) => void;
  showConfirm: (title: string, description: string, onConfirm: () => void | Promise<void>, variant?: any) => void;
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
  showConfirm
}: UseAdminActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  // Student Actions
  const handleConfirmPayment = async (studentId: string, newStatus: boolean, paymentMethod?: string, paymentAmount?: string) => {
    try {
      setIsUpdating(true);
      const pAmount = Number(paymentAmount) || 55;
      const d = new Date();
      const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      await databases.updateDocument(DATABASE_ID, COLLECTION_PROFILES, studentId, {
        is_paid: newStatus,
        payment_method: newStatus ? paymentMethod : null
      });

      let paymentAmountToDeduct = pAmount;

      try {
        if (newStatus) {
          await databases.createDocument(DATABASE_ID, COLLECTION_PAYMENTS, ID.unique(), {
            student_id: studentId,
            month: currentMonthStr,
            amount: pAmount,
            method: paymentMethod
          });
        } else {
          const userPayments = await databases.listDocuments(DATABASE_ID, COLLECTION_PAYMENTS, [
            Query.equal("student_id", studentId), 
            Query.equal("month", currentMonthStr), 
            Query.limit(1)
          ]);

          if (userPayments.documents.length > 0) {
            paymentAmountToDeduct = userPayments.documents[0].amount;
            await databases.deleteDocument(DATABASE_ID, COLLECTION_PAYMENTS, userPayments.documents[0].$id);
          }
        }

        const revData = await databases.listDocuments(DATABASE_ID, COLLECTION_REVENUE, [Query.equal("month", currentMonthStr), Query.limit(1)]);
        if (revData.documents.length > 0) {
          const doc = revData.documents[0];
          const updatedRev = newStatus ? doc.amount + pAmount : Math.max(0, doc.amount - paymentAmountToDeduct);
          await databases.updateDocument(DATABASE_ID, COLLECTION_REVENUE, doc.$id, { amount: updatedRev });
          setMonthlyRevenue(updatedRev);
        } else if (newStatus) {
          await databases.createDocument(DATABASE_ID, COLLECTION_REVENUE, ID.unique(), { month: currentMonthStr, amount: pAmount });
          setMonthlyRevenue(pAmount);
        }
      } catch (e) { console.error(e); }

      const newList = studentsList.map(s => s.$id === studentId ? { ...s, is_paid: newStatus, payment_method: newStatus ? paymentMethod : null } : s);
      setStudentsList(newList);
      setUnpaidCount(newList.filter(s => !s.is_paid).length);
      
      return true;
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveProfile = async (selectedStudent: any, editLastName: string, editEmail: string, editPhone: string, editLevel: string) => {
    try {
      setIsUpdating(true);
      await databases.updateDocument(DATABASE_ID, COLLECTION_PROFILES, selectedStudent.$id, {
        last_name: editLastName,
        email: editEmail.toLowerCase(),
        phone: editPhone,
        level: editLevel
      });

      setStudentsList(studentsList.map(s => 
        s.$id === selectedStudent.$id ? { ...s, last_name: editLastName, email: editEmail.toLowerCase(), phone: editPhone, level: editLevel } : s
      ));
      return true;
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateStudent = async (form: any) => {
    try {
      setIsUpdating(true);

      // Normal flow (Profile only, requires invite system)
      const uniqueRef = ID.unique();
      const newProfile = await databases.createDocument(DATABASE_ID, COLLECTION_PROFILES, uniqueRef, {
        user_id: uniqueRef,
        name: form.name,
        last_name: form.lastName,
        email: form.email.toLowerCase(),
        phone: form.phone || null,
        role: "alumno",
        is_paid: false,
        level: form.level
      });

      setStudentsList([newProfile, ...studentsList]);
      setTotalStudents((prev: number) => prev + 1);
      setUnpaidCount((prev: number) => prev + 1);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Class Actions
  const handleCreateClass = async (newClass: any) => {
    try {
      setIsUpdating(true);
      const result = await createClassServer(newClass);
      
      if (result.success && result.class) {
        setClassesList([...classesList, result.class].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        return true;
      } else {
        console.error("Error creating class:", result.error);
        return false;
      }
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAutoGenerateWeekClasses = async () => {
    showConfirm(
      "Generar Clases",
      "¿Seguro que quieres auto-generar las clases de la PRÓXIMA SEMANA? (El sistema saltará las que ya existan)",
      async () => {
        try {
          setIsUpdating(true);
          const { autoGenerateNextWeekClasses } = await import("../actions");
          const result = await autoGenerateNextWeekClasses();

          if (result.success) {
            if (result.count === 0) {
              showAlert("Info", "No se han generado clases nuevas porque ya existían todas.", "info");
            } else {
              setClassesList([...classesList, ...result.classes].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
              showAlert("Éxito", `Se han generado ${result.count} clases nuevas.`, "success");
            }
          } else {
            showAlert("Error", result.error || "No se pudieron generar las clases.", "danger");
          }
        } catch (e) {
          console.error(e);
          showAlert("Error", "Error de red al generar la semana.", "danger");
        } finally {
          setIsUpdating(false);
        }
      }
    );
  };

  const handleDeleteClass = async (classObj: any) => {
    try {
      const startTime = classObj.time.split('-')[0].trim();
      const [year, month, day] = classObj.date.substring(0, 10).split("-").map(Number);
      const [hours, minutes] = startTime.split(":").map(Number);
      const classDateTime = new Date(year, month - 1, day, hours, minutes);

      if (classDateTime < new Date()) {
        showAlert("Acción Prohibida", "No se puede cancelar una clase que ya ha ocurrido. Queda registrada en el historial.", "warning");
        return;
      }
    } catch (e) {
      // Allow passing if date parsing fails
    }

    showConfirm(
      "Borrar Clase", 
      "¿Seguro que quieres borrar esta clase de forma permanente? Se cancelarán también todas las reservas de los alumnos.",
      async () => {
        try {
          setIsUpdating(true);
          const relatedBookings = await databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [
            Query.equal("class_id", classObj.$id), Query.limit(100)
          ]);

          const deleteBookingPromises = relatedBookings.documents.map(booking =>
            databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, booking.$id)
          );
          await Promise.all(deleteBookingPromises);

          await databases.deleteDocument(DATABASE_ID, COLLECTION_CLASSES, classObj.$id);

          setClassesList(classesList.filter(c => c.$id !== classObj.$id));
          showAlert("Éxito", "Clase eliminada correctamente.", "success");
        } catch (error: any) {
          if (error.code !== 404) {
            console.error("Error al borrar la clase:", error);
            showAlert("Error", "No se pudo borrar la clase o sus reservas.", "danger");
          }
        } finally {
          setIsUpdating(false);
        }
      },
      "danger"
    );
  };

  return {
    isUpdating,
    setIsUpdating,
    handleConfirmPayment,
    handleSaveProfile,
    handleCreateStudent,
    handleCreateClass,
    handleAutoGenerateWeekClasses,
    handleDeleteClass
  };
}
