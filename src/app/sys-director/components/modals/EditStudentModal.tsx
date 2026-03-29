"use client";

import { X, UserCog, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { databases, DATABASE_ID, COLLECTION_PROFILES } from "@/lib/appwrite";
import { Query } from "appwrite";

interface EditStudentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  student: any;
  isUpdating: boolean;
  onSave: (student: any, lastName: string, email: string, phone: string, level: string) => Promise<boolean>;
}

export function EditStudentModal({ isOpen, onOpenChange, student, isUpdating, onSave }: EditStudentModalProps) {
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState("Iniciación");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    if (student && isOpen) {
      setLastName(student.last_name || "");
      setEmail(student.email || "");
      setPhone(student.phone || "");
      setLevel(student.level || "Iniciación");
      setEmailError("");
      setPhoneError("");
    }
  }, [student, isOpen]);

  const handleApply = async () => {
    // Basic validations
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Formato de correo no válido.");
      return;
    }

    const success = await onSave(student, lastName, email, phone, level);
    if (success) {
      onOpenChange(false);
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
            Actualiza los datos de <strong className="text-white">{student?.name} {student?.last_name || ""}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-6 relative z-10 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Nombre (Fijo)</Label>
                <Input
                  value={student?.name || ""}
                  disabled
                  className="bg-white/[0.03] border-white/5 text-white/30 cursor-not-allowed h-12 font-bold opacity-60"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Apellidos</Label>
                <Input
                  value={lastName}
                  placeholder="Apellidos"
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white focus:border-blue-500/50 transition-all font-bold h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Correo Electrónico</Label>
              <Input
                type="email"
                placeholder="email@ejemplo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                className={`bg-white/5 border-white/10 text-white focus:border-blue-500/50 transition-all font-bold h-12 ${emailError ? 'border-red-500/50 bg-red-500/5' : ''}`}
              />
              {emailError && (
                <p className="text-red-400 text-[10px] font-bold italic tracking-wider pl-1">{emailError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Teléfono (WhatsApp)</Label>
              <Input
                type="tel"
                placeholder="+34 600 000 000"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneError) setPhoneError(""); 
                }}
                className={`bg-white/5 border-white/10 text-white focus:border-blue-500/50 transition-all font-bold h-12 ${phoneError ? 'border-red-500/50 bg-red-500/5' : ''}`}
              />
            </div>

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
              onClick={handleApply}
              disabled={isUpdating}
              className="w-full bg-white text-black hover:bg-blue-500 hover:text-white font-black tracking-widest uppercase rounded-xl shadow-xl transition-all disabled:opacity-20"
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "GUARDAR CAMBIOS"}
            </Button>
          </DialogHeader>
        </div>
      </DialogContent>
    </Dialog>
  );
}
