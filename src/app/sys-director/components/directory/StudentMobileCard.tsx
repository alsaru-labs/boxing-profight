'use client';

import React from 'react';
import {
  MoreVertical,
  Signal,
  CalendarX,
  ShieldCheck,
  UserCog,
  Trash2
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StudentMobileCardProps {
  student: any;
  isUpdating: boolean;
  handleActionClick: (student: any) => void;
  handleOpenEditModal: (student: any) => void;
  deleteStudentAccount: (id: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  setStudentsList: React.Dispatch<React.SetStateAction<any[]>>;
  showAlert: (title: string, message: string, variant: "success" | "danger" | "warning") => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, variant?: "danger" | "warning") => void;
}

export function StudentMobileCard({
  student,
  isUpdating,
  handleActionClick,
  handleOpenEditModal,
  deleteStudentAccount,
  setStudentsList,
  showAlert,
  showConfirm
}: StudentMobileCardProps) {
  return (
    <div
      className={`
        group relative rounded-2xl p-4 transition-all duration-300
        bg-zinc-900/60 border border-white/5 hover:border-white/10
        ${!student.is_paid ? 'ring-1 ring-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)]' : 'shadow-xl shadow-black/40'}
      `}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0 flex-1">
          {/* Payment Info Labels */}
          <div className="flex items-center gap-2 mb-1.5">
            {student.is_paid && student.payment_method && (
              <span className="text-[9px] font-black uppercase tracking-[0.1em] text-emerald-400/60 ml-0.5">
                {student.payment_method}
              </span>
            )}
            {!student.is_paid && (
              <span className="text-[9px] font-black uppercase tracking-[0.1em] text-red-400/60 ml-0.5">
                Sin Pago
              </span>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2 mb-1">
            <Badge
              variant="outline"
              className={`
                text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full
                ${student.is_paid
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-red-500/20 text-red-400 border-red-500/30"
                }
              `}
            >
              {student.is_paid ? "PAGADO" : "PENDIENTE"}
            </Badge>
            {(student.status === 'Baja' || student.is_active === false) && (
              <Badge variant="outline" className="bg-zinc-500/10 text-zinc-500 border-zinc-500/20 text-[8px] h-4 font-black px-1.5 uppercase tracking-tighter">Baja</Badge>
            )}
          </div>

          <h3 className={`text-white font-bold leading-tight text-base tracking-tight mb-0.5 break-words whitespace-normal ${(student.status === 'Baja' || student.is_active === false) ? 'opacity-50' : ''}`}>
            {student.name} {student.last_name || ""}
          </h3>
          <p className={`text-white/30 text-[10px] truncate font-medium ${(student.status === 'Baja' || student.is_active === false) ? 'opacity-30' : ''}`}>
            {student.email}
          </p>
        </div>

        <div className="shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="h-10 w-10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-white/5 bg-zinc-800/50 outline-none focus:ring-2 focus:ring-emerald-500/50">
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
                    <><CalendarX className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" /> <span className="text-orange-400">Pago Pendiente</span></>
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
                        if (res.success) {
                          setStudentsList(prev => prev.map(s => s.$id === student.$id ? { ...s, status: "Baja", is_active: false } : s));
                          showAlert("Éxito", "Alumno dado de baja.", "success");
                        } else {
                          showAlert("Error", res.error || "No se pudo dar de baja", "danger");
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
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.03]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-white/30">
            <Signal className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{student.level || "Iniciación"}</span>
          </div>

          {student.phone && (
            <a
              href={`https://wa.me/${student.phone.replace(/\+/g, '').replace(/\s/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-2 rounded-full bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 transition-all active:scale-95 hover:bg-[#25D366]/20"
              title="WhatsApp"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            </a>
          )}
        </div>

        <span className="text-white/20 text-[9px] font-black tracking-widest uppercase">
          Alta: {new Date(student.$createdAt).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
