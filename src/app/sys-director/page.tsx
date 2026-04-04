"use client";

import { useState } from "react";
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
    paidStudentIds
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

  const showAlert = (title: string, description: string, variant: "info" | "success" | "warning" | "danger" = "info") => {
    setModalConfig({
      isOpen: true, title, description, variant,
      onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
      showCancel: false, confirmText: "Entendido"
    });
  };

  const showConfirm = (title: string, description: string, onConfirm: () => void | Promise<void>, variant: "info" | "success" | "warning" | "danger" = "warning") => {
    setModalConfig({
      isOpen: true, title, description, variant,
      onConfirm: async () => {
        await onConfirm();
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      },
      showCancel: true, confirmText: "Confirmar"
    });
  };

  const {
    isUpdating,
    handleConfirmPayment,
    handleSaveProfile,
    handleCreateStudent,
    handleCreateClass,
    handleAutoGenerateWeekClasses,
    handleDeleteClass,
    handlePermanentDeleteStudent
  } = useAdminActions({
    studentsList, setStudentsList, classesList, setClassesList,
    setMonthlyRevenue, setUnpaidCount, setTotalStudents,
    showAlert, showConfirm, selectedMonth, paidStudentIds
  });

  const handleActionClick = (student: any) => {
    if (student.is_paid) {
      showConfirm(
        "Marcar Pendiente",
        `¿Confirmar que el pago de ${student.name} vuelve a estar PENDIENTE?`,
        async () => { await handleConfirmPayment(student.$id, false); },
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
              showAlert={showAlert}
              showConfirm={showConfirm}
            />
          </TabsContent>

          <TabsContent value="general" className="space-y-6 md:space-y-10 focus-visible:outline-none">
            {/* Month Selector */}
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

            <DashboardStats
              totalStudents={totalStudents}
              monthlyRevenue={monthlyRevenue}
              unpaidCount={unpaidCount}
              selectedMonth={selectedMonth}
              onNewStudent={() => setIsNewStudentModalOpen(true)}
            />

            <StudentDirectory
              isUpdating={isUpdating}
              handleActionClick={handleActionClick}
              handleOpenEditModal={handleOpenEditModal}
              deleteStudentAccount={deleteStudentAccount}
              handlePermanentDeleteStudent={handlePermanentDeleteStudent}
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
                  <Button variant="outline" className="bg-zinc-900 border-white/10 text-white" onClick={handleAutoGenerateWeekClasses} disabled={isUpdating}>
                    <CalendarDays className="w-4 h-4 mr-2 text-blue-400" /> {LITERALS.DASHBOARD.CLASSES.AUTO_GENERATE}
                  </Button>
                  <Button onClick={() => setIsClassModalOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                    <Plus className="w-4 h-4 mr-2" /> {LITERALS.DASHBOARD.CLASSES.SCHEDULE_BUTTON}
                  </Button>
                </div>
              </div>
              <ClassGrid isAdmin classes={sortedClassesList} onViewAttendees={handleViewAttendees} onCancelClass={handleDeleteClass} />
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
        isUpdating={isUpdating}
        onConfirm={handleConfirmPayment}
      />
      <EditStudentModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        student={selectedStudent}
        isUpdating={isUpdating}
        onSave={handleSaveProfile}
      />
      <NewStudentModal
        isOpen={isNewStudentModalOpen}
        onOpenChange={setIsNewStudentModalOpen}
        isUpdating={isUpdating}
        onSave={handleCreateStudent}
      />
      <CreateClassModal
        isOpen={isClassModalOpen}
        onOpenChange={setIsClassModalOpen}
        isUpdating={isUpdating}
        onSave={handleCreateClass}
        classesList={classesList}
      />
      <AttendeesModal
        isOpen={isAttendeesModalOpen}
        onOpenChange={setIsAttendeesModalOpen}
        selectedClass={selectedClassForAttendees}
      />

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onOpenChange={(open) => setModalConfig(prev => ({ ...prev, isOpen: open }))}
        title={modalConfig.title}
        description={modalConfig.description}
        variant={modalConfig.variant}
        onConfirm={modalConfig.onConfirm}
        showCancel={modalConfig.showCancel}
        confirmText={modalConfig.confirmText}
      />
    </div>
  );
}
