"use client";

import { useState } from "react";
import { updateStudentProfileAction, createClassServer, handleCreateOrReactivateStudent, recordPaymentAction, deletePaymentAction, deleteClassAction } from "../actions";

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
  selectedMonth: string;
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
  selectedMonth
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

      if (!result.success) {
        showAlert("Error", result.error || "No se pudo procesar el pago.", "danger");
        return false;
      }

      // Update local state for immediate feedback (Individual student row)
      const newList = studentsList.map(s => s.$id === studentId ? { ...s, is_paid: newStatus, payment_method: newStatus ? paymentMethod : null } : s);
      setStudentsList(newList);
      
      // aggregators (revenue, unpaidCount) will be updated by AdminContext's REALTIME subscription
      return true;
    } catch (error) {
      console.error(error);
      showAlert("Error", "Error de red al procesar el pago.", "danger");
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveProfile = async (selectedStudent: any, editLastName: string, editEmail: string, editPhone: string, editLevel: string) => {
    try {
      setIsUpdating(true);
      const result = await updateStudentProfileAction(selectedStudent.$id, {
        last_name: editLastName,
        email: editEmail.toLowerCase(),
        phone: editPhone,
        level: editLevel
      });

      if (!result.success) {
        showAlert("Error", result.error || "No se pudo actualizar el perfil.", "danger");
        return false;
      }

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

      const result = await handleCreateOrReactivateStudent(form);

      if (!result.success) {
        showAlert("Error", result.error || "No se pudo registrar al alumno.", "danger");
        return false;
      }

      const newProfile = result.profile;

      if (result.reactivated) {
        setStudentsList((prev: any[]) => prev.map(s => s.$id === newProfile.$id ? { ...s, ...newProfile } : s));
        showAlert("Reactivación Exitosa", `Se ha reactivado la cuenta de ${newProfile.name} ${newProfile.last_name || ""}.`, "success");
      } else {
        // Por ser creación nueva, el Realtime listener lo añadirá solo, 
        // pero podemos añadirlo aquí también para mayor velocidad si preferimos.
        showAlert("Éxito", "Alumno registrado correctamente. Se le ha enviado el acceso.", "success");
      }

      return result;
    } catch (err) {
      console.error(err);
      showAlert("Error", "Error de red al registrar al alumno.", "danger");
      return { success: false, error: "Error de red." };
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
        showAlert("Error", result.error || "No se pudo programar la clase. Revisa los datos.", "danger");
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
              setClassesList((prev: any[]) => {
                  const existingIds = new Set(prev.map(c => c.$id));
                  const newClasses = (result.classes || []).filter((c: any) => !existingIds.has(c.$id));
                  return [...prev, ...newClasses].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              });
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
          const result = await deleteClassAction(classObj.$id);

          if (result.success) {
            setClassesList(classesList.filter(c => c.$id !== classObj.$id));
            showAlert("Éxito", "Clase eliminada correctamente.", "success");
          } else {
            showAlert("Error", result.error || "No se pudo borrar la clase.", "danger");
          }
        } catch (error: any) {
          console.error("Error al borrar la clase:", error);
          showAlert("Error", "Error de red al intentar borrar la clase.", "danger");
        } finally {
          setIsUpdating(false);
        }
      },
      "danger"
    );
  };

  const handlePermanentDeleteStudent = (profileId: string, userId: string, studentName: string, onSuccess?: () => void) => {
    showConfirm(
      "ELIMINACIÓN PERMANENTE",
      `¿Estás absolutamente seguro de borrar a ${studentName}? Esta acción eliminará su cuenta de acceso, su ficha y todas sus reservas de forma IRREVERSIBLE.`,
      async () => {
        try {
          console.log(`🚀 [CLIENT] Iniciando borrado permanente para: ${studentName} (Profile: ${profileId}, User: ${userId})`);
          setIsUpdating(true);
          const { permanentDeleteStudentAction } = await import("../actions");
          const result = await permanentDeleteStudentAction(profileId, userId);

          if (result.success) {
            setStudentsList(studentsList.filter(s => s.$id !== profileId));
            // NO MANUAL COUNTER UPDATE: AdminContext handles it via Realtime (.delete) once added
            showAlert("Éxito", "Alumno eliminado permanentemente de la base de datos.", "success");
            if (onSuccess) onSuccess();
          } else {
            showAlert("Error", result.error || "No se pudo realizar el borrado físico.", "danger");
          }
        } catch (err) {
          console.error(err);
          showAlert("Error", "Error de red al intentar el borrado físico.", "danger");
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
    handleDeleteClass,
    handlePermanentDeleteStudent
  };
}
