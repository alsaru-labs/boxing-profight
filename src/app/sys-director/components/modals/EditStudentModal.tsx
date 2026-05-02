"use client";

import { X, UserCog, Loader2, Mail, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { databases, DATABASE_ID, COLLECTION_PROFILES } from "@/lib/appwrite";
import { Query } from "appwrite";

import { checkStudentVerifiedStatus } from "../../actions";

interface EditStudentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  student: any;
  isUpdating: boolean;
  onSave: (student: any, name: string, lastName: string, email: string, phone: string, level: string, forceResend?: boolean) => Promise<any>;
}

export function EditStudentModal({ isOpen, onOpenChange, student, isUpdating, onSave }: EditStudentModalProps) {
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState("Iniciación");
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [isUnverified, setIsUnverified] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);

  useEffect(() => {
    if (student && isOpen) {
      setName(student.name || "");
      setLastName(student.last_name || "");
      setEmail(student.email || "");
      setPhone(student.phone || "");
      setLevel(student.level || "Iniciación");
      setErrors({});
      setInvitationUrl(null);
      
      // Zero-waste on-demand fetch of Auth verification status
      setIsUnverified(false);
      setCheckingStatus(true);
      checkStudentVerifiedStatus(student.$id, student.user_id).then(res => {
        if (res.success) {
            setIsUnverified(res.isUnverified || false);
        }
        setCheckingStatus(false);
      });
    }
  }, [student, isOpen]);

  const isEmailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const isFormValid = 
    name.trim().length > 0 && 
    name.length <= 15 &&
    !/[0-9]/.test(name) &&
    lastName.trim().length > 0 && 
    lastName.length <= 50 &&
    !/[0-9]/.test(lastName) &&
    isEmailValid(email) &&
    (!phone || (phone.replace(/\s/g, "").length <= 12 && /^(\+?[0-9]{1,12})$/.test(phone.replace(/\s/g, ""))));

  const handleApply = async (forceResend: boolean = false) => {
    if (isUpdating || !isFormValid) return;

    const result = await onSave(student, name, lastName, email, phone, level, forceResend);
    if (result?.success) {
      if (result.token) {
        const url = `${window.location.origin}/set-password?token=${result.token}`;
        setInvitationUrl(url);
      } else {
        onOpenChange(false);
      }
    } else {
        setErrors({ server: result?.error || "Email ya en uso o error de servidor." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        showCloseButton={false}
        className="bg-zinc-950 border-white/10 text-white max-w-md rounded-[2rem] overflow-hidden backdrop-blur-2xl p-0 focus:outline-none shadow-2xl max-h-[96vh] flex flex-col"
      >
        <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
        
        <button 
          onClick={() => onOpenChange(false)}
          className="absolute right-6 top-6 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <DialogHeader className="p-8 pb-0 relative z-10">
          <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <UserCog className="w-6 h-6 text-blue-400" /> Editar Alumno
          </DialogTitle>
          <DialogDescription className="text-white/40 font-medium italic">
            Actualiza los datos de <strong className="text-white">{name} {lastName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-6 relative z-10 overflow-y-auto flex-1 custom-scrollbar">
          {invitationUrl ? (
            <div className="space-y-6 py-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[1.5rem] space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 text-center">Enlace de Acceso Actualizado</p>
                <div className="bg-black/40 p-4 rounded-xl border border-white/5 break-all">
                  <p className="text-[11px] font-mono text-white/70 text-center select-all">{invitationUrl}</p>
                </div>
                <p className="text-[9px] text-white/40 text-center italic">Copia este enlace y envíaselo al alumno para que cree su contraseña.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => {
                    if (invitationUrl) {
                      navigator.clipboard.writeText(invitationUrl);
                      import("sonner").then(({ toast }) => {
                        toast.success("Enlace Copiado", {
                          description: "El link de invitación está en tu portapapeles.",
                        });
                      });
                    }
                  }}
                  variant="outline"
                  size="xl"
                  className="bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-black tracking-widest uppercase rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                >
                  COPIAR LINK
                </Button>
                <Button 
                  onClick={() => onOpenChange(false)}
                  variant="ghost"
                  size="xl"
                  className="bg-white/5 border-white/5 text-white/40 hover:text-white font-black tracking-widest uppercase rounded-xl transition-all"
                >
                  CERRAR
                </Button>
              </div>
            </div>
          ) : (
            <>
            <div className="space-y-4">
            {errors.server && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <p className="text-red-400 text-[9px] font-black uppercase tracking-tighter">{errors.server}</p>
                </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={`text-[10px] font-black uppercase tracking-widest ${name.length > 15 || /[0-9]/.test(name) ? 'text-red-400' : 'text-white/40'}`}>Nombre</Label>
                <Input
                  value={name}
                  onChange={(e) => {
                      const val = e.target.value.replace(/[0-9]/g, "");
                      if (val.length <= 15) {
                        setName(val);
                        if (errors.server) setErrors({});
                      }
                  }}
                  placeholder="Nombre"
                  className={`bg-white/5 border-white/10 text-white focus:border-blue-500/50 transition-all font-bold h-12 ${/[0-9]/.test(name) || name.length > 15 ? 'border-red-500/50 bg-red-500/5' : ''}`}
                />
                {name.length >= 15 && <p className="text-red-400 text-[8px] font-bold uppercase tracking-widest pl-1">Máx 15 caracteres</p>}
              </div>
              <div className="space-y-2">
                <Label className={`text-[10px] font-black uppercase tracking-widest ${lastName.length > 50 || /[0-9]/.test(lastName) ? 'text-red-400' : 'text-white/40'}`}>Apellidos</Label>
                <Input
                  value={lastName}
                  placeholder="Apellidos"
                  onChange={(e) => {
                      const val = e.target.value.replace(/[0-9]/g, "");
                      if (val.length <= 50) {
                        setLastName(val);
                        if (errors.server) setErrors({});
                      }
                  }}
                  className={`bg-white/5 border-white/10 text-white focus:border-blue-500/50 transition-all font-bold h-12 ${/[0-9]/.test(lastName) || lastName.length > 50 ? 'border-red-500/50 bg-red-500/5' : ''}`}
                />
                {lastName.length >= 50 && <p className="text-red-400 text-[8px] font-bold uppercase tracking-widest pl-1">Máx 50 caracteres</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label className={`text-[10px] font-black uppercase tracking-widest ${email && !isEmailValid(email) ? 'text-red-400' : 'text-white/40'}`}>Correo Electrónico</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.server) setErrors({});
                  }}
                  className={`bg-white/5 border-white/10 text-white focus:border-blue-500/50 transition-all font-bold h-12 flex-1 ${email && !isEmailValid(email) ? 'border-red-500/50 bg-red-500/5' : ''}`}
                />
                {isUnverified && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-12 w-12 p-0 bg-white/5 border-white/10 hover:bg-white/10 flex items-center justify-center shrink-0 text-white/70 hover:text-white"
                    onClick={() => handleApply(true)}
                    disabled={isUpdating || !isFormValid || checkingStatus}
                    title="Guardar y reenviar invitación"
                  >
                      {checkingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  </Button>
                )}
              </div>
              {email && !isEmailValid(email) && <p className="text-red-400 text-[8px] font-bold uppercase tracking-widest pl-1">Email no válido</p>}
            </div>

            <div className="space-y-2">
              <Label className={`text-[10px] font-black uppercase tracking-widest ${phone && (phone.length > 12 || !/^(\+?[0-9]*)$/.test(phone)) ? 'text-red-400' : 'text-white/40'}`}>Teléfono (WhatsApp)</Label>
              <Input
                type="tel"
                placeholder="+34 600 000 000"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9+]/g, "");
                  if (val.length <= 12) {
                    setPhone(val);
                    if (errors.server) setErrors({});
                  }
                }}
                className={`bg-white/5 border-white/10 text-white focus:border-blue-500/50 transition-all font-bold h-12 ${phone && (phone.length > 12 || !/^(\+?[0-9]*)$/.test(phone)) ? 'border-red-500/50 bg-red-500/5' : ''}`}
              />
              {phone.length >= 12 && <p className="text-red-400 text-[8px] font-bold uppercase tracking-widest pl-1">Máx 12 dígitos</p>}
            </div>

            {errors.server && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-red-400 text-[9px] font-black text-center uppercase tracking-tighter">{errors.server}</p>
                </div>
            )}

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Nivel de Combate</Label>
              <div className="grid grid-cols-3 gap-2">
                {["Iniciación", "Media", "Profesional"].map((l) => (
                  <Button
                    key={l}
                    type="button"
                    variant="ghost"
                    size="xl"
                    onClick={() => setLevel(l)}
                    className={`border transition-all font-black text-[10px] tracking-widest uppercase rounded-xl ${
                      level === l 
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-400" 
                      : "bg-white/5 border-white/5 text-white/20 hover:text-white"
                    }`}
                  >
                    {l === "Profesional" ? "Pro" : l}
                  </Button>
                ))}
              </div>
            </div>
            </div>

            <DialogHeader className="pt-2">
              <Button
                size="xl"
                onClick={() => handleApply(false)}
                disabled={isUpdating || !isFormValid}
                className="w-full bg-white text-black hover:bg-blue-400 hover:text-white font-black tracking-widest uppercase rounded-xl shadow-xl transition-all disabled:opacity-20"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "GUARDAR CAMBIOS"}
              </Button>
            </DialogHeader>
          </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
