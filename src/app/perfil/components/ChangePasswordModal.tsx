"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (oldPass: string, newPass: string) => Promise<void>;
  isUpdating: boolean;
}

export function ChangePasswordModal({ isOpen, onOpenChange, onSubmit, isUpdating }: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const passwordRequirements = [
    { id: 'length', label: 'Mínimo 8 caracteres', regex: /.{8,}/ },
    { id: 'upper', label: 'Al menos una Mayúscula', regex: /[A-Z]/ },
    { id: 'number', label: 'Al menos un Número', regex: /[0-9]/ },
    { id: 'special', label: 'Un carácter especial (@, #, $, etc.)', regex: /[!@#$%^&*(),.?":{}|<>]/ },
  ];

  const metRequirements = passwordRequirements.filter(req => req.regex.test(newPassword));
  const allMet = metRequirements.length === passwordRequirements.length;
  const isMatching = newPassword !== "" && newPassword === confirmPassword;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!oldPassword) {
      setError("Debes introducir tu contraseña actual.");
      return;
    }

    if (!allMet) {
      setError("La nueva contraseña no cumple los requisitos.");
      return;
    }

    if (!isMatching) {
      setError("Las nuevas contraseñas no coinciden.");
      return;
    }

    try {
      await onSubmit(oldPassword, newPassword);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Error al actualizar la contraseña.");
    }
  };

  // 🧼 Reset fields on close
  useEffect(() => {
    if (!isOpen) {
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setShowPass(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        showCloseButton={false}
        className="bg-zinc-950 border-white/10 text-white max-w-md rounded-[2rem] overflow-hidden backdrop-blur-2xl p-0 focus:outline-none"
      >
        <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
        
        {/* Custom Close Button */}
        <button 
          onClick={() => onOpenChange(false)}
          className="absolute right-6 top-6 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <DialogHeader className="p-8 pb-0 relative z-10">
          <DialogTitle className="text-2xl font-black tracking-tight">Cambiar Contraseña</DialogTitle>
          <DialogDescription className="text-white/40 font-medium">
            Por seguridad, necesitamos verificar tu identidad antes de establecer la nueva clave.
          </DialogDescription>
        </DialogHeader>


        <form onSubmit={handleApply} className="p-8 space-y-6 relative z-10">
          <div className="space-y-4">
            {/* Old Password */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Contraseña Actual</Label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="bg-white/5 border-white/10 h-12 pl-10 focus:border-emerald-500/50 transition-all font-bold"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-white/20" />
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-white/5 border-white/10 h-12 pl-10 pr-10 focus:border-emerald-500/50 transition-all font-bold"
                  placeholder="••••••••"
                />
                <ShieldCheck className="absolute left-3.5 top-3.5 w-4 h-4 text-white/20" />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-3.5 text-white/20 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Requirement Checklist */}
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2 mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Seguridad</span>
                  <span className={`text-[9px] font-black tracking-widest ${allMet ? 'text-emerald-400' : 'text-zinc-600'}`}>{metRequirements.length}/4</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {passwordRequirements.map(req => {
                    const met = req.regex.test(newPassword);
                    return (
                      <div key={req.id} className="flex items-center gap-1.5">
                        <div className={`p-0.5 rounded-full ${met ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/10'}`}>
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        </div>
                        <span className={`text-[10px] font-bold truncate ${met ? 'text-white/60' : 'text-white/20'}`}>{req.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Repetir Nueva Contraseña</Label>
              <Input
                type={showPass ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`bg-white/5 border-white/10 h-12 focus:border-emerald-500/50 transition-all font-bold ${confirmPassword !== "" && !isMatching ? 'border-red-500/50 bg-red-500/5' : ''}`}
                placeholder="••••••••"
              />
              {confirmPassword !== "" && !isMatching && (
                <p className="text-red-500/60 text-[9px] font-black uppercase tracking-wider pl-1">Las contraseñas no coinciden</p>
              )}
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-[11px] font-bold italic text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <DialogHeader className="pt-2">
            <Button 
              type="submit"
              size="xl"
              disabled={isUpdating || !allMet || !isMatching || !oldPassword}
              className={`w-full tracking-widest uppercase transition-all shadow-xl ${
                allMet && isMatching && oldPassword
                ? "bg-white text-black hover:bg-emerald-500 hover:text-white" 
                : "bg-white/5 text-white/20 border-white/5 cursor-not-allowed opacity-50"
              }`}
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "GUARDAR NUEVA CONTRASEÑA"}
            </Button>
          </DialogHeader>
        </form>
      </DialogContent>
    </Dialog>
  );
}
