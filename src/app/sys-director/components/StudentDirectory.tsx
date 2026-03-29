'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ChevronDown
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Sub-components
import { StudentFilters } from "./directory/StudentFilters";
import { StudentMobileCard } from "./directory/StudentMobileCard";
import { StudentDesktopRow } from "./directory/StudentDesktopRow";

interface StudentDirectoryProps {
  studentsList: any[];
  isUpdating: boolean;
  handleActionClick: (student: any) => void;
  handleOpenEditModal: (student: any) => void;
  deleteStudentAccount: (id: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  setStudentsList: React.Dispatch<React.SetStateAction<any[]>>;
  showAlert: (title: string, message: string, variant: "success" | "danger" | "warning") => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, variant?: "danger" | "warning") => void;
}

export function StudentDirectory({
  studentsList,
  isUpdating,
  handleActionClick,
  handleOpenEditModal,
  deleteStudentAccount,
  setStudentsList,
  showAlert,
  showConfirm
}: StudentDirectoryProps) {
  // Local State for Search/Filter/Sort
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPayment, setFilterPayment] = useState("Todos");
  const [filterLevel, setFilterLevel] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Activos");
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [visibleCount, setVisibleCount] = useState(30);

  // Sorting Handler
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Processing Students Logic
  const processedStudents = useMemo(() => {
    let result = [...studentsList];

    // 0. Status filter
    if (filterStatus !== "Todos") {
      result = result.filter(s => filterStatus === "Activos" 
        ? (s.status !== "Baja" && s.is_active !== false) 
        : (s.status === "Baja" || s.is_active === false)
      );
    }

    // 1. Search filter
    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(lowSearch) ||
        (s.last_name && s.last_name.toLowerCase().includes(lowSearch)) ||
        s.email.toLowerCase().includes(lowSearch)
      );
    }

    // 2. Payment filter
    if (filterPayment !== "Todos") {
      result = result.filter(s => filterPayment === "pagado" ? s.is_paid : !s.is_paid);
    }

    // 3. Level filter
    if (filterLevel !== "Todos") {
      result = result.filter(s => (s.level || "Iniciación") === filterLevel);
    }

    // 4. Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        // Handle string comparison
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [studentsList, searchTerm, filterPayment, filterLevel, filterStatus, sortConfig]);

  const slicedStudents = processedStudents.slice(0, visibleCount);

  return (
    <div className="space-y-4">
      {/* Table Header & Controls */}
      <StudentFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterPayment={filterPayment}
        setFilterPayment={setFilterPayment}
        filterLevel={filterLevel}
        setFilterLevel={setFilterLevel}
        sortConfig={sortConfig}
        setSortConfig={setSortConfig}
        setVisibleCount={setVisibleCount}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
      />

      <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-lg shadow-2xl overflow-hidden">
        <div className="max-h-[700px] overflow-y-auto custom-scrollbar">
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <Table className="border-separate border-spacing-y-1.5">
              <TableHeader className="bg-white/[0.03] backdrop-blur-md border-b border-white/5 top-0 z-10 sticky">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/40 pl-6 h-12" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">Alumno <ArrowUpDown className="w-3 h-3 opacity-30" /></div>
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/40 h-12" onClick={() => handleSort('is_paid')}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">Estado y Pago <ArrowUpDown className="w-3 h-3 opacity-30" /></div>
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/40 h-12">Contacto</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/40 h-12" onClick={() => handleSort('level')}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">Nivel <ArrowUpDown className="w-3 h-3 opacity-30" /></div>
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/40 hidden md:table-cell h-12" onClick={() => handleSort('$createdAt')}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">Alta <ArrowUpDown className="w-3 h-3 opacity-30" /></div>
                  </TableHead>
                  <TableHead className="text-right text-white/70 pr-6 h-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slicedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-white/50">
                      No hay alumnos registrados todavía en la Base de Datos.
                    </TableCell>
                  </TableRow>
                ) : (
                  slicedStudents.map((student) => (
                    <StudentDesktopRow
                      key={student.$id}
                      student={student}
                      isUpdating={isUpdating}
                      handleActionClick={handleActionClick}
                      handleOpenEditModal={handleOpenEditModal}
                      deleteStudentAccount={deleteStudentAccount}
                      setStudentsList={setStudentsList}
                      showAlert={showAlert}
                      showConfirm={showConfirm}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden max-h-[750px] overflow-y-auto custom-scrollbar-mobile bg-black/20 rounded-b-2xl shadow-inner border-t border-white/5 p-4 space-y-4">
            {slicedStudents.length === 0 ? (
              <div className="p-8 text-center text-white/50 italic">
                No hay alumnos registrados.
              </div>
            ) : (
              slicedStudents.map((student) => (
                <StudentMobileCard
                  key={student.$id}
                  student={student}
                  isUpdating={isUpdating}
                  handleActionClick={handleActionClick}
                  handleOpenEditModal={handleOpenEditModal}
                  deleteStudentAccount={deleteStudentAccount}
                  setStudentsList={setStudentsList}
                  showAlert={showAlert}
                  showConfirm={showConfirm}
                />
              ))
            )}
          </div>

          {visibleCount < processedStudents.length && (
            <div className="w-full flex justify-center py-4 border-t border-white/10 bg-white/5">
              <Button
                variant="ghost"
                onClick={() => setVisibleCount(prev => prev + 30)}
                className="text-white hover:bg-white/10 flex items-center gap-2"
              >
                <ChevronDown className="w-4 h-4" />
                Cargar más alumnos ({processedStudents.length - visibleCount} restantes)
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
