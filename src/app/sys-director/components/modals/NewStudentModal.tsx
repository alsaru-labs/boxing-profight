"use client";

import { X, UserPlus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface NewStudentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isUpdating: boolean;
  onSave: (form: any) => Promise<any>;
}

export function NewStudentModal({ isOpen, onOpenChange, isUpdating, onSave }: NewStudentModalProps) {
  const [form, setForm] = useState({ name: "", lastName: "", email: "", phone: "", level: "Iniciación" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setForm({ name: "", lastName: "", email: "", phone: "", level: "Iniciación" });
      setErrors({});
    }
  }, [isOpen]);  const isEmailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  
  const isFormValid = 
    form.name.trim().length > 0 && 
    form.name.length <= 15 &&
    !/[0-9]/.test(form.name) &&
    form.lastName.trim().length > 0 && 
    form.lastName.length <= 50 &&
    !/[0-9]/.test(form.lastName) &&
    isEmailValid(form.email) &&
    (!form.phone || (form.phone.replace(/\s/g, "").length <= 12 && /^(\+?[0-9]{1,12})$/.test(form.phone.replace(/\s/g, ""))));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    const result = await onSave(form);
    if (result && result.success) {
      onOpenChange(false);
    } else if (result && !result.success) {
        setErrors({ server: result.error || "Error al registrar." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        showCloseButton={false}
        className="bg-zinc-950 border-white/10 text-white max-w-md w-[95vw] rounded-[2rem] overflow-hidden backdrop-blur-2xl p-0 focus:outline-none shadow-2xl max-h-[96vh] flex flex-col"
      >
        <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
        
        <button 
          onClick={() => onOpenChange(false)}
          className="absolute right-6 top-6 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <DialogHeader className="p-8 pb-0 relative z-10">
          <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-emerald-400" /> Registrar Alumno
          </DialogTitle>
          <DialogDescription className="text-white/40 font-medium italic">
            Añade los datos básicos para enviarle su acceso a la plataforma.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 relative z-10 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={`text-[10px] font-black uppercase tracking-widest ${form.name.length > 15 || /[0-9]/.test(form.name) ? 'text-red-400' : 'text-white/40'}`}>Nombre</Label>
                <Input
                  type="text"
                  required
                  placeholder="Paco"
                  value={form.name}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[0-9]/g, "");
                    if (val.length <= 15) setForm({ ...form, name: val });
                  }}
                  className={`bg-white/5 border-white/10 text-white focus:border-emerald-500/50 transition-all font-bold h-12 ${/[0-9]/.test(form.name) || form.name.length > 15 ? 'border-red-500/50 bg-red-500/5' : ''}`}
                />
                {form.name.length >= 15 && <p className="text-red-400 text-[8px] font-bold uppercase tracking-widest pl-1">Máx 15 caracteres</p>}
              </div>
              <div className="space-y-2">
                <Label className={`text-[10px] font-black uppercase tracking-widest ${form.lastName.length > 50 || /[0-9]/.test(form.lastName) ? 'text-red-400' : 'text-white/40'}`}>Apellidos</Label>
                <Input
                  type="text"
                  placeholder="Fernández"
                  value={form.lastName}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[0-9]/g, "");
                    if (val.length <= 50) setForm({ ...form, lastName: val });
                  }}
                  className={`bg-white/5 border-white/10 text-white focus:border-emerald-500/50 transition-all font-bold h-12 ${/[0-9]/.test(form.lastName) || form.lastName.length > 50 ? 'border-red-500/50 bg-red-500/5' : ''}`}
                />
                {form.lastName.length >= 50 && <p className="text-red-400 text-[8px] font-bold uppercase tracking-widest pl-1">Máx 50 caracteres</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label className={`text-[10px] font-black uppercase tracking-widest ${form.email && !isEmailValid(form.email) ? 'text-red-400' : 'text-white/40'}`}>Correo Electrónico</Label>
              <Input
                type="email"
                required
                placeholder="paco@email.com"
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  if (errors.server) setErrors({});
                }}
                className={`bg-white/5 border-white/10 text-white focus:border-emerald-500/50 transition-all font-bold h-12 ${form.email && !isEmailValid(form.email) ? 'border-red-500/50 bg-red-500/5' : ''}`}
              />
              {form.email && !isEmailValid(form.email) && <p className="text-red-400 text-[8px] font-bold uppercase tracking-widest pl-1">Email no válido</p>}
            </div>

            <div className="space-y-2">
              <Label className={`text-[10px] font-black uppercase tracking-widest ${form.phone && (form.phone.length > 12 || !/^(\+?[0-9]*)$/.test(form.phone)) ? 'text-red-400' : 'text-white/40'}`}>Teléfono (WhatsApp)</Label>
              <Input
                type="tel"
                placeholder="600 000 000"
                value={form.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9+]/g, "");
                  if (val.length <= 12) setForm({ ...form, phone: val });
                }}
                className={`bg-white/5 border-white/10 text-white focus:border-emerald-500/50 transition-all font-bold h-12 ${form.phone && (form.phone.length > 12 || !/^(\+?[0-9]*)$/.test(form.phone)) ? 'border-red-500/50 bg-red-500/5' : ''}`}
              />
              {form.phone.length >= 12 && <p className="text-red-400 text-[8px] font-bold uppercase tracking-widest pl-1">Máx 12 dígitos</p>}
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
                    onClick={() => setForm({ ...form, level: l })}
                    className={`border transition-all font-black text-[10px] tracking-widest uppercase rounded-xl ${
                      form.level === l 
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" 
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
              type="submit" 
              size="xl"
              disabled={isUpdating}
              className="w-full bg-white text-black hover:bg-emerald-500 hover:text-white font-black tracking-widest uppercase rounded-xl shadow-xl transition-all disabled:opacity-20"
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "REGISTRAR ALUMNO"}
            </Button>
          </DialogHeader>
        </form>
      </DialogContent>
    </Dialog>
  );
}
