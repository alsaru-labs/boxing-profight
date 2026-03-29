'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  ArrowUpDown, 
  MoreVertical, 
  CalendarX, 
  ShieldCheck, 
  UserCog, 
  Trash2, 
  Signal,
  ChevronDown
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LITERALS } from "@/constants/literals";

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
  const [filterPayment, setFilterPayment] = useState("todos");
  const [filterLevel, setFilterLevel] = useState("todos");
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
    if (filterPayment !== "todos") {
      result = result.filter(s => filterPayment === "pagado" ? s.is_paid : !s.is_paid);
    }

    // 3. Level filter
    if (filterLevel !== "todos") {
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
  }, [studentsList, searchTerm, filterPayment, filterLevel, sortConfig]);

  const slicedStudents = processedStudents.slice(0, visibleCount);

  return (
    <div className="space-y-4">
      {/* Table Header & Controls */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold tracking-tight">{LITERALS.DASHBOARD.STUDENTS_DIRECTORY}</h2>

        <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-3 items-center">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/50" />
            <Input
              type="text"
              placeholder="Buscar alumno o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white focus-visible:ring-emerald-500 w-full rounded-md"
            />
          </div>

          {/* Filter Payment */}
          <Select value={filterPayment} onValueChange={setFilterPayment}>
            <SelectTrigger className="w-full sm:w-44 h-10">
              <SelectValue placeholder={LITERALS.DASHBOARD.FILTER_ALL_PAYMENTS} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">{LITERALS.DASHBOARD.FILTER_ALL_PAYMENTS}</SelectItem>
              <SelectItem value="pagado">{LITERALS.DASHBOARD.FILTER_PAID}</SelectItem>
              <SelectItem value="pendiente">{LITERALS.DASHBOARD.FILTER_PENDING}</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter Level */}
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-full sm:w-44 h-10">
              <SelectValue placeholder="Todos los Niveles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los Niveles</SelectItem>
              <SelectItem value="Iniciación">Iniciación</SelectItem>
              <SelectItem value="Media">Media</SelectItem>
              <SelectItem value="Profesional">Profesional</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filters / Sorting Button */}
          {(searchTerm !== "" || filterPayment !== "todos" || filterLevel !== "todos" || sortConfig !== null) && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchTerm("");
                setFilterPayment("todos");
                setFilterLevel("todos");
                setSortConfig(null);
                setVisibleCount(30);
              }}
              className="h-10 text-red-400 hover:text-red-300 hover:bg-red-500/10 whitespace-nowrap px-3"
            >
              <X className="w-4 h-4 mr-1.5" />
              Limpiar Filtros
            </Button>
          )}
        </div>
      </div>

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
                    <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">Estado <ArrowUpDown className="w-3 h-3 opacity-30" /></div>
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
                    <TableRow key={student.$id} className="border-white/5 hover:bg-white/[0.04] transition-all duration-300 group/row ease-out rounded-xl overflow-hidden shadow-none hover:shadow-xl hover:shadow-black/20">
                      <TableCell className="font-medium pl-6 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="h-9 w-9 rounded-full bg-white/5 flex items-center justify-center border border-white/5 text-[10px] font-black">
                            {(student.name?.[0] || "") + (student.last_name?.[0] || "")}
                          </div>
                          <div>
                            <p className="text-white font-bold leading-tight">{student.name} {student.last_name || ""}</p>
                            <p className="text-white/30 text-[10px] tracking-tight">{student.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            student.is_paid
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }
                        >
                          {student.is_paid ? "Pagado" : "Pendiente"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {student.phone ? (
                          <a
                            href={`https://wa.me/${student.phone.replace(/\+/g, '').replace(/\s/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-white/70 hover:text-[#25D366] transition-colors group"
                          >
                            <svg className="w-4 h-4 text-[#25D366] group-hover:scale-110 transition-transform fill-current" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            <span className="text-sm font-medium">{student.phone}</span>
                          </a>
                        ) : (
                          <span className="text-white/30 text-xs italic">No indicado</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={`
                          ${student.level === 'Iniciación' ? 'border-amber-500/30 text-amber-500' : ''}
                          ${student.level === 'Media' ? 'border-blue-500/30 text-blue-400' : ''}
                          ${student.level === 'Profesional' ? 'border-red-500/30 text-red-500' : ''}
                          bg-black/40 shadow-inner px-2.5 py-1 text-[10px] font-black tracking-widest uppercase
                        `}>
                          <Signal className="w-3 h-3 mr-1" />
                          {student.level || "Iniciación"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-white/30 text-[10px] font-black tracking-widest hidden md:table-cell uppercase">
                        {new Date(student.$createdAt).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-9 w-9 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-white/5 outline-none focus:ring-2 focus:ring-emerald-500/50">
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900/95 backdrop-blur-xl border-white/10 text-white min-w-[200px] p-2 rounded-2xl shadow-2xl">
                            <DropdownMenuGroup className="p-1">
                              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2 py-1.5">Gestión de Alumno</DropdownMenuLabel>
                              <DropdownMenuItem
                                className="group flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-white/70 focus:bg-white/10 focus:text-white cursor-pointer transition-colors"
                                onClick={() => handleActionClick(student)}
                                disabled={isUpdating}
                              >
                                {student.is_paid ? (
                                  <><CalendarX className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" /> <span className="text-red-400">Marcar como Pendiente</span></>
                                ) : (
                                  <><ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" /> <span className="text-emerald-400">Registrar Pago Hoy</span></>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-white/70 focus:bg-white/10 focus:text-white cursor-pointer transition-colors"
                                onClick={() => handleOpenEditModal(student)}
                                disabled={isUpdating}
                              >
                                <UserCog className="w-4 h-4 text-blue-400" />
                                <span>Editar Alumno</span>
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator className="bg-white/5 mx-1" />
                            <DropdownMenuGroup className="p-1">
                              <DropdownMenuItem
                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-red-400 focus:bg-red-500/20 focus:text-red-400 cursor-pointer transition-colors"
                                onClick={() => {
                                  showConfirm(
                                    "Dar de baja",
                                    `¿Seguro que quieres eliminar a ${student.name}? Esta acción es irreversible.`,
                                    async () => {
                                      try {
                                        const result = await deleteStudentAccount(student.$id, student.user_id);
                                        if (result.success) {
                                          setStudentsList(prev => prev.filter(s => s.$id !== student.$id));
                                          showAlert("Éxito", "Alumno dado de baja.", "success");
                                        } else {
                                          showAlert("Error", result.error || "No se pudo eliminar.", "danger");
                                        }
                                      } catch (err) {
                                        showAlert("Error", "Error de red.", "danger");
                                      }
                                    },
                                    "danger"
                                  );
                                }}
                                disabled={isUpdating}
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Eliminar Cuenta</span>
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden max-h-[750px] overflow-y-auto custom-scrollbar-mobile divide-y divide-white/5 bg-black/20 rounded-b-2xl shadow-inner border-t border-white/5">
            <div className="grid grid-cols-1">
            {slicedStudents.length === 0 ? (
              <div className="p-8 text-center text-white/50 italic">
                No hay alumnos registrados.
              </div>
            ) : (
              slicedStudents.map((student) => (
                <div key={student.$id} className="p-5 space-y-4 hover:bg-white/[0.03] transition-colors relative backdrop-blur-2xl bg-white/[0.02]">
                  <div className="flex justify-between items-start pr-12">
                    <div className="min-w-0">
                      <h3 className="text-white font-bold truncate leading-tight text-base">
                        {student.name} {student.last_name || ""}
                      </h3>
                      <p className="text-white/30 text-[10px] break-all mt-1 font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                        {student.email}
                      </p>
                    </div>
                    
                    <div className="absolute right-4 top-5">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-11 w-11 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-2xl transition-all border border-white/10 bg-black/40 shadow-xl outline-none focus:ring-2 focus:ring-emerald-500/50">
                          <MoreVertical className="h-5 w-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900/95 backdrop-blur-xl border-white/10 text-white min-w-[220px] p-2 rounded-2xl shadow-2xl">
                          <DropdownMenuGroup className="p-1">
                            <DropdownMenuItem
                              className="group flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-bold text-white/70 focus:bg-white/10 focus:text-white cursor-pointer transition-colors"
                              onClick={() => handleActionClick(student)}
                              disabled={isUpdating}
                            >
                              {student.is_paid ? (
                                <><CalendarX className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" /> <span className="text-red-400">Marcar Pendiente</span></>
                              ) : (
                                <><ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" /> <span className="text-emerald-400">Registrar Pago</span></>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-bold text-white/70 focus:bg-white/10 focus:text-white cursor-pointer transition-colors"
                              onClick={() => handleOpenEditModal(student)}
                              disabled={isUpdating}
                            >
                              <UserCog className="w-4 h-4 text-blue-400" />
                              <span>Editar Alumno</span>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator className="bg-white/5 mx-1" />
                          <DropdownMenuGroup className="p-1">
                            <DropdownMenuItem
                              className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-bold text-red-400 focus:bg-red-500/20 focus:text-red-400 cursor-pointer transition-colors"
                              onClick={() => {
                                showConfirm(
                                  "Dar de baja",
                                  `¿Seguro borrar a ${student.name}?`,
                                  async () => {
                                    const res = await deleteStudentAccount(student.$id, student.user_id);
                                    if (res.success) setStudentsList(p => p.filter(s => s.$id !== student.$id));
                                  },
                                  "danger"
                                );
                              }}
                              disabled={isUpdating}
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Eliminar Cuenta</span>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Badge variant="outline" className={`text-xs px-3 py-1.5 font-black uppercase tracking-widest shadow-lg ${student.is_paid ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500 text-white border-red-400 shadow-red-500/20"}`}>
                      {student.is_paid ? "PAGADO" : "PENDIENTE"}
                    </Badge>
                    <Badge variant="outline" className={`px-2 py-0.5 text-[8px] font-bold tracking-widest uppercase opacity-40 border-white/10 ${student.level === 'Iniciación' ? 'text-amber-500' : student.level === 'Media' ? 'text-blue-400' : 'text-red-500'}`}>
                      {student.level || "Iniciación"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
                    {student.phone ? (
                      <a
                        href={`https://wa.me/${student.phone.replace(/\+/g, '').replace(/\s/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center h-10 w-10 rounded-xl bg-[#25D366] text-black shadow-[0_4px_14px_0_rgba(37,211,102,0.39)] transition-all active:scale-90 hover:bg-[#20bd5a] hover:shadow-[0_6px_20px_rgba(37,211,102,0.23)]"
                        title="Contactar por WhatsApp"
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                      </a>
                    ) : (
                      <div className="text-[10px] text-white/20 italic font-medium px-1 underline decoration-white/10 underline-offset-4">Contacto no registrado</div>
                    )}
                    <span className="text-white/20 text-[10px] font-bold tracking-tighter uppercase px-1">
                      ALTA: {new Date(student.$createdAt).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
            </div>
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
