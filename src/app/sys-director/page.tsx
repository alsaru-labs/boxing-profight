"use client";

import { useState, useTransition, useEffect } from "react";
import { Loader2, ShieldCheck, CalendarDays, Plus } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AdminTabs } from "./components/AdminTabs";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ClassGrid } from "@/components/ClassGrid";
import { StudentDirectory } from "./components/StudentDirectory";
import { LITERALS } from "@/constants/literals";
import Navbar from "@/components/Navbar";
import { deleteStudentAccount } from "./actions";

// Hooks
import { useAdminData } from "./hooks/useAdminData";
import { useAdminActions } from "./hooks/useAdminActions";

// Components
import { DashboardStats } from "./components/dashboard/DashboardStats";
import { AnnouncementManager } from "./components/dashboard/AnnouncementManager";

// Modals
import { PaymentModal } from "./components/modals/PaymentModal";
import { EditStudentModal } from "./components/modals/EditStudentModal";
import { NewStudentModal } from "./components/modals/NewStudentModal";
import { CreateClassModal } from "./components/modals/CreateClassModal";
import { AttendeesModal } from "./components/modals/AttendeesModal";

export default function AdminDashboard() {
  // 🛡️ DETECCIÓN DE ENTORNO
  const [isProduction, setIsProduction] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      setIsProduction(
        hostname === "boxingprofight.com" || 
        hostname === "www.boxingprofight.com" || 
        hostname === "boxingprofight.netlify.app"
      );
    }
  }, []);

  const {
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
    loadDashboardData,
    refreshStudentsList,
    paidStudentIds,
    registerProfileOptimistically,
    deactivateProfileOptimistically,
    updatePaymentOptimistically
  } = useAdminData();

  // Modal States
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState(false);
  const [selectedClassForAttendees, setSelectedClassForAttendees] = useState<any>(null);

  // Custom Modal State (for Alert/Confirm)
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: "info" | "success" | "warning" | "danger";
    onConfirm: () => void | Promise<void>;
    showCancel?: boolean;
    confirmText?: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
    variant: "info",
    onConfirm: () => { },
  });

  // Toasts replacement for showAlert
  const showAlert = (title: string, msg: string, variant: "info" | "success" | "warning" | "danger" = "info") => {
    import("sonner").then(({ toast }) => {
      const type = variant === "danger" ? "error" : variant === "warning" ? "warning" : variant === "success" ? "success" : "info";
      toast[type](title, { description: msg });
    });
  };

  const showConfirm = (title: string, description: string, onConfirm: () => Promise<any>, variant: "info" | "success" | "warning" | "danger" = "warning") => {
    setModalConfig({
        isOpen: true,
        title,
        description,
        variant,
        onConfirm: async () => {
          const result = await onConfirm();
          // Assume result format { success: boolean, error?: string } or boolean
          const success = typeof result === 'boolean' ? result : result?.success;
          if (success) {
              setModalConfig(prev => ({ ...prev, isOpen: false }));
          }
        },
        showCancel: true,
        confirmText: "Confirmar"
    });
  };

  const {
    isUpdating, // Local hook state still useful for some internal logic
    handleConfirmPayment,
    handleSaveProfile,
    handleCreateStudent,
    handleCreateClass,
    handleDeleteClass,
    handlePermanentDeleteStudent
  } = useAdminActions({
    studentsList, setStudentsList, classesList, setClassesList,
    setMonthlyRevenue, setUnpaidCount, setTotalStudents,
    showAlert, showConfirm, selectedMonth, paidStudentIds,
    registerProfileOptimistically, deactivateProfileOptimistically, 
    updatePaymentOptimistically
  });

  const [isPending, startTransition] = useTransition();

  // Wrapped Actions for UI feedback
  const wrappedHandleDeleteClass = (classObj: any) => {
    if (isPending) return;
    try {
      const startTime = classObj.time.split('-')[0].trim();
      const [year, month, day] = classObj.date.substring(0, 10).split("-").map(Number);
      const [hours, minutes] = startTime.split(":").map(Number);
      const classDateTime = new Date(year, month - 1, day, hours, minutes);

      if (classDateTime < new Date()) {
        showAlert("Acción Prohibida", "No se puede cancelar una clase que ya ha ocurrido.", "warning");
        return;
      }
    } catch (e) { }

    showConfirm(
      "Borrar Clase",
      "¿Seguro que quieres borrar esta clase de forma permanente? Se cancelarán también todas las reservas de los alumnos.",
      async () => {
        let success = false;
        await new Promise<void>((resolve) => {
          startTransition(async () => {
            try {
              const result = await handleDeleteClass(classObj.$id);
              if (result.success) {
                import("sonner").then(({ toast }) => {
                  toast.success("Éxito", { description: "Clase eliminada correctamente." });
                });
                success = true;
              } else {
                import("sonner").then(({ toast }) => {
                  toast.error("Error", { description: result.error || "No se pudo borrar la clase." });
                });
              }
            } catch (err) {
              import("sonner").then(({ toast }) => {
                toast.error("Error", { description: "Error de red al intentar borrar la clase." });
              });
            } finally { resolve(); }
          });
        });
        return success;
      },
      "danger"
    );
  };

  const handleConfirmPaymentUI = async (...args: any[]) => {
    const res = await handleConfirmPayment(args[0], args[1], args[2], args[3]);
    if (res.success) {
      import("sonner").then(({ toast }) => toast.success("Pago Registrado", { description: "El estado de pago ha sido actualizado." }));
    } else {
      import("sonner").then(({ toast }) => toast.error("Error", { description: res.error || "No se pudo registrar el pago." }));
    }
    return res;
  };

  const handleSaveProfileUI = async (...args: any[]) => {
    const res = await handleSaveProfile(args[0], args[1], args[2], args[3], args[4], args[5]);
    if (res.success) {
      import("sonner").then(({ toast }) => toast.success("Perfil Actualizado", { description: "Los cambios se han guardado correctamente." }));
    } else {
      import("sonner").then(({ toast }) => toast.error("Error", { description: res.error || "No se pudo actualizar el perfil." }));
    }
    return res;
  };

  const handleCreateStudentUI = async (...args: any[]) => {
    const res = await handleCreateStudent(args[0]);
    if (res.success) {
      import("sonner").then(({ toast }) => toast.success("Alumno Registrado", { description: res.reactivated ? "Cuenta reactivada con éxito." : "Acceso enviado por email." }));
    } else {
      import("sonner").then(({ toast }) => toast.error("Error", { description: res.error || "No se pudo crear el alumno." }));
    }
    return res;
  };

  const handleCreateClassUI = async (...args: any[]) => {
    const res = await handleCreateClass(args[0]);
    if (res.success) {
      import("sonner").then(({ toast }) => toast.success("Clase Programada", { description: "La clase ya es visible para los alumnos." }));
    } else {
      import("sonner").then(({ toast }) => toast.error("Error", { description: res.error || "No se pudo programar la clase." }));
    }
    return res;
  };

  const wrappedDeleteStudentAccount = async (profileId: string, userId: string, name: string) => {
    if (isPending) return false;
    let success = false;
    await new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          const result = await deleteStudentAccount(profileId, userId);
          if (result.success) {
            deactivateProfileOptimistically(profileId);
            import("sonner").then(({ toast }) => toast.success("Alumno dado de baja", { description: `${name} ha sido desactivado.` }));
            success = true;
          } else {
            import("sonner").then(({ toast }) => toast.error("Error", { description: result.error || "No se pudo dar de baja." }));
          }
        } catch (err) {
          import("sonner").then(({ toast }) => toast.error("Error", { description: "Error de red al intentar dar de baja." }));
        } finally { resolve(); }
      });
    });
    return success;
  };

  const wrappedPermanentDeleteStudentUI = async (profileId: string, userId: string, name: string) => {
    if (isPending) return false;
    let success = false;
    await new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          const result = await handlePermanentDeleteStudent(profileId, userId);
          if (result.success) {
            import("sonner").then(({ toast }) => toast.success("Eliminación Permanente", { description: `Los datos de ${name} han sido borrados.` }));
            success = true;
          } else {
            import("sonner").then(({ toast }) => toast.error("Error", { description: result.error || "No se pudo eliminar permanentemente." }));
          }
        } catch (err) {
          import("sonner").then(({ toast }) => toast.error("Error", { description: "Error de red al intentar el borrado físico." }));
        } finally { resolve(); }
      });
    });
    return success;
  };

  const handleActionClick = (student: any) => {
    if (student.is_paid) {
      showConfirm(
        "Marcar Pendiente",
        `¿Confirmar que el pago de ${student.name} vuelve a estar PENDIENTE?`,
        async () => {
          let success = false;
          await new Promise<void>(resolve => {
            startTransition(async () => {
              const result = await handleConfirmPayment(student.$id, false);
              if (result.success) {
                import("sonner").then(({ toast }) => {
                  toast.success("Éxito", { description: "Estado de pago actualizado." });
                });
                success = true;
              } else {
                import("sonner").then(({ toast }) => {
                  toast.error("Error", { description: result.error || "No se pudo actualizar el pago." });
                });
              }
              resolve();
            });
          });
          return success;
        },
        "warning"
      );
    } else {
      setSelectedStudent(student);
      setIsPaymentModalOpen(true);
    }
  };

  const handleOpenEditModal = (student: any) => {
    setSelectedStudent(student);
    setIsEditModalOpen(true);
  };

  const handleViewAttendees = (classObj: any) => {
    setSelectedClassForAttendees(classObj);
    setIsAttendeesModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <ShieldCheck className="w-16 h-16 text-white/20 mb-4" />
        <Loader2 className="w-10 h-10 text-white animate-spin" />
        <p className="text-white/50 mt-4 font-medium">Verificando credenciales de instructor...</p>
      </div>
    );
  }

  // Filter logic for ClassGrid
  const now = new Date();
  const sortedClassesList = [...classesList].filter(cls => {
    try {
      const startTime = cls.time.split('-')[0].trim();
      const [year, month, day] = cls.date.substring(0, 10).split("-").map(Number);
      const [hours, minutes] = startTime.split(":").map(Number);
      const classDateTime = new Date(year, month - 1, day, hours, minutes);
      return classDateTime >= now && classDateTime.getTime() <= now.getTime() + (21 * 24 * 60 * 60 * 1000);
    } catch { return false; }
  }).sort((a, b) => {
    const dateComp = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateComp !== 0) return dateComp;
    return a.time.localeCompare(b.time);
  });

  const recentPastClasses = [...classesList].filter(cls => {
    try {
      const startTime = cls.time.split('-')[0].trim();
      const [year, month, day] = cls.date.substring(0, 10).split("-").map(Number);
      const [hours, minutes] = startTime.split(":").map(Number);
      const classDateTime = new Date(year, month - 1, day, hours, minutes);
      return classDateTime < now && classDateTime.getTime() >= now.getTime() - (30 * 24 * 60 * 60 * 1000);
    } catch { return false; }
  }).sort((a, b) => {
    const dateComp = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateComp !== 0) return dateComp;
    return b.time.localeCompare(a.time);
  });

  return (
    <div className="dark min-h-screen bg-black text-white font-sans flex flex-col relative w-full">
      <Navbar isHome={false} />

      <main className="flex-1 w-full max-w-[1400px] mx-auto pt-4 md:pt-6 lg:pt-8 px-4 md:px-8 lg:px-12 pb-12 z-10">
        <Tabs defaultValue="general" className="w-full">
          <AdminTabs />

          <TabsContent value="tablon" className="space-y-6 md:space-y-10 focus-visible:outline-none">
            <AnnouncementManager
              announcements={announcements}
              setAnnouncements={setAnnouncements}
              showAlert={showAlert as any}
              showConfirm={showConfirm as any}
              isPending={isPending}
              startTransition={startTransition}
            />
          </TabsContent>

          <TabsContent value="general" className="space-y-6 md:space-y-10 focus-visible:outline-none">
            {/* Month Selector (Oculto en Producción) */}
            {!isProduction && (
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 bg-zinc-900/40 p-6 rounded-2xl border border-white/5">
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500">Periodo de Gestión</h3>
                  <p className="text-white/40 text-xs">Consulta y valida pagos de cualquier mes.</p>
                </div>
                <div className="flex items-center gap-3">
                  <select 
                    value={selectedMonth}
                    onChange={(e) => {
                      const newMonth = e.target.value;
                      setSelectedMonth(newMonth);
                      loadDashboardData(false, newMonth);
                    }}
                    className="bg-black/60 border border-white/10 text-white font-black uppercase tracking-widest p-3 rounded-xl outline-none focus:border-emerald-500/50 transition-all cursor-pointer min-w-[220px]"
                  >
                    {Array.from({ length: 24 }).map((_, i) => {
                      const d = new Date();
                      d.setDate(1);
                      d.setMonth(d.getMonth() - 12 + i);
                      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                      return <option key={val} value={val} className="bg-zinc-900 border-none">{label}</option>;
                    })}
                  </select>
                </div>
              </div>
            )}

            <DashboardStats
              totalStudents={totalStudents}
              monthlyRevenue={monthlyRevenue}
              unpaidCount={unpaidCount}
              selectedMonth={selectedMonth}
              onNewStudent={() => setIsNewStudentModalOpen(true)}
            />

            <StudentDirectory
              isUpdating={isPending || isUpdating}
              isProduction={isProduction}
              handleActionClick={handleActionClick}
              handleOpenEditModal={handleOpenEditModal}
              deleteStudentAccount={wrappedDeleteStudentAccount}
              handlePermanentDeleteStudent={wrappedPermanentDeleteStudentUI}
              setStudentsList={setStudentsList}
              showAlert={showAlert as any}
              showConfirm={showConfirm as any}
            />
          </TabsContent>

          <TabsContent value="clases" className="space-y-6 md:space-y-10 focus-visible:outline-none">
            <div className="space-y-4 mt-16 pb-12">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{LITERALS.DASHBOARD.CLASSES.TITLE}</h2>
                  <p className="text-white/50 text-sm mt-1">{LITERALS.DASHBOARD.CLASSES.DESCRIPTION}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={() => setIsClassModalOpen(true)} 
                    className="group relative bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-[0.2em] text-[10px] h-12 px-8 rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-emerald-500/40 border-b-4 border-emerald-700 hover:border-emerald-600 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Plus className="w-4 h-4 mr-2 relative z-10 group-hover:rotate-90 transition-transform duration-500" /> 
                    <span className="relative z-10">{LITERALS.DASHBOARD.CLASSES.SCHEDULE_BUTTON.replace('+ ', '')}</span>
                  </Button>
                </div>
              </div>
              <ClassGrid isAdmin classes={sortedClassesList} onViewAttendees={handleViewAttendees} onCancelClass={wrappedHandleDeleteClass} />
            </div>

            <div className="space-y-4 pt-16 border-t border-white/10 pb-12">
              <h2 className="text-2xl font-bold tracking-tight text-white/70">{LITERALS.DASHBOARD.CLASSES.HISTORY_TITLE}</h2>
              <ClassGrid isAdmin isHistory classes={recentPastClasses} onViewAttendees={handleViewAttendees} />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals Container */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        student={selectedStudent}
        isUpdating={isPending || isUpdating}
        onConfirm={handleConfirmPaymentUI}
      />
      <EditStudentModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        student={selectedStudent}
        isUpdating={isPending || isUpdating}
        onSave={handleSaveProfileUI}
      />
      <NewStudentModal
        isOpen={isNewStudentModalOpen}
        onOpenChange={setIsNewStudentModalOpen}
        isUpdating={isPending || isUpdating}
        onSave={handleCreateStudentUI}
      />
      <CreateClassModal
        isOpen={isClassModalOpen}
        onOpenChange={setIsClassModalOpen}
        isUpdating={isPending || isUpdating}
        onSave={handleCreateClassUI}
        classesList={classesList}
      />
      <AttendeesModal
        isOpen={isAttendeesModalOpen}
        onOpenChange={setIsAttendeesModalOpen}
        selectedClass={selectedClassForAttendees}
      />

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onOpenChange={(open) => !isPending && setModalConfig(prev => ({ ...prev, isOpen: open }))}
        title={modalConfig.title}
        description={modalConfig.description}
        variant={modalConfig.variant}
        onConfirm={modalConfig.onConfirm}
        showCancel={modalConfig.showCancel && !isPending}
        confirmText={modalConfig.confirmText}
        isLoading={isPending}
      />
    </div>
  );
}
