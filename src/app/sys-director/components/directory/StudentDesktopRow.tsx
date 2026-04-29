'use client';

import React from 'react';
import {
  MoreVertical,
  Signal,
  CalendarX,
  ShieldCheck,
  UserCog,
  Trash2,
  ArrowUpDown
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import {
  TableCell,
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

interface StudentDesktopRowProps {
  student: any;
  isUpdating: boolean;
  isProduction?: boolean;
  handleActionClick: (student: any) => void;
  handleOpenEditModal: (student: any) => void;
  deleteStudentAccount: (id: string, userId: string, name: string) => Promise<boolean>;
  handlePermanentDeleteStudent: (profileId: string, userId: string, studentName: string) => Promise<boolean>;
  setStudentsList: React.Dispatch<React.SetStateAction<any[]>>;
  showAlert: (title: string, message: string, variant: "success" | "danger" | "warning") => void;
  showConfirm: (title: string, message: string, onConfirm: () => Promise<any>, variant?: "danger" | "warning") => void;
}

export function StudentDesktopRow({
  student,
  isUpdating,
  isProduction,
  handleActionClick,
  handleOpenEditModal,
  deleteStudentAccount,
  handlePermanentDeleteStudent,
  setStudentsList,
  showAlert,
  showConfirm
}: StudentDesktopRowProps) {
  return (
    <TableRow className="border-white/5 hover:bg-white/[0.04] transition-all duration-300 group/row ease-out rounded-xl overflow-hidden shadow-none hover:shadow-xl hover:shadow-black/20">
      <TableCell className="font-medium pl-6 py-3">
        <div className={`flex items-center space-x-3 ${(student.status === 'Baja' || student.is_active === false) ? 'opacity-50 grayscale' : ''}`}>
          <div className="h-9 w-9 rounded-full bg-white/5 flex items-center justify-center border border-white/5 text-[10px] font-black">
            {(student.name?.[0] || "") + (student.last_name?.[0] || "")}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-white font-bold leading-tight">{student.name} {student.last_name || ""}</p>
              {(student.status === 'Baja' || student.is_active === false) && (
                <Badge variant="outline" className="bg-zinc-500/10 text-zinc-500 border-zinc-500/20 text-[8px] h-4 font-black px-1.5 uppercase tracking-tighter">Baja</Badge>
              )}
            </div>
            <p className="text-sky-400/80 text-[10px] tracking-tight font-medium">{student.email}</p>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex flex-col gap-1">
          <Badge
            variant="outline"
            className={
              student.is_paid
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 w-fit"
                : "bg-red-500/10 text-red-400 border-red-500/20 w-fit"
            }
          >
            {student.is_paid ? "Pagado" : "Pendiente"}
          </Badge>
          {student.is_paid && student.payment_method && (
            <span className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">
              {student.payment_method}
            </span>
          )}
        </div>
      </TableCell>

      <TableCell>
        {student.phone ? (
          <a
            href={`https://wa.me/${student.phone.replace(/\+/g, '').replace(/\s/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center h-8 w-8 rounded-full bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 transition-all active:scale-95 hover:bg-[#25D366]/20 group"
            title={student.phone}
          >
            <svg className="w-4 h-4 text-[#25D366] group-hover:scale-110 transition-transform fill-current" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
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

      <TableCell className="text-teal-400/80 text-[10px] font-black tracking-widest hidden md:table-cell uppercase">
        {new Date(student.$createdAt).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
      </TableCell>

      <TableCell className="text-right pr-6">
        <DropdownMenu>
          <DropdownMenuTrigger className="h-10 w-10 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-white/5 outline-none focus:ring-2 focus:ring-emerald-500/50">
            <MoreVertical className="h-5 w-5" />
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
                  <><CalendarX className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" /> <span className="text-orange-400">Pago Pendiente</span></>
                ) : (
                  <><ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" /> <span className="text-emerald-400">Registrar Pago</span></>
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
                    `¿Seguro que quieres dar de baja a ${student.name}? El alumno dejará de tener acceso y se cancelarán sus reservas futuras.`,
                    () => deleteStudentAccount(student.$id, student.user_id, student.name),
                    "danger"
                  );
                }}
                disabled={isUpdating}
              >
                <Signal className="w-4 h-4 opacity-50" />
                <span>Dar de Baja</span>
              </DropdownMenuItem>

              {!isProduction && (
                <DropdownMenuItem
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 focus:bg-red-600/20 focus:text-red-600 cursor-pointer transition-colors"
                  onClick={() => {
                    showConfirm(
                      "Eliminación Permanente",
                      `¿Estás TOTALMENTE SEGURO de querer borrar a ${student.name}? Esta acción es irreversible y eliminará todo su historial.`,
                      () => handlePermanentDeleteStudent(student.$id, student.user_id, student.name),
                      "danger"
                    );
                  }}
                  disabled={isUpdating}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Permanente</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
