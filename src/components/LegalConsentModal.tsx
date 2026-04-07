"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, LogOut, CheckCircle2, Loader2 } from "lucide-react";
import { acceptLegalTermsAction } from "@/app/sys-director/actions";
import { LITERALS } from "@/constants/literals";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { toast } from "sonner";

interface LegalConsentModalProps {
  profileId: string;
}

export default function LegalConsentModal({ profileId }: LegalConsentModalProps) {
  const { logout: contextLogout } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!accepted) return;
    setLoading(true);
    try {
      const res = await acceptLegalTermsAction(profileId);
      if (res.success) {
        toast.success("Términos aceptados correctamente");
        // Refrescar para actualizar el estado del perfil en AuthContext
        window.location.reload(); 
      } else {
        toast.error(res.error || "Error al aceptar los términos");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await contextLogout();
    } catch (error) {
      toast.error("Error al cerrar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 md:p-6"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="w-full max-w-xl bg-neutral-900 border border-white/10 p-8 md:p-12 shadow-2xl relative overflow-hidden rounded-2xl"
        >
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -mr-16 -mt-16" />
          
          <div className="relative z-10 text-center">
            <div className="flex justify-center mb-8">
              <div className="w-16 h-16 bg-white/10 flex items-center justify-center rounded-full">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
            </div>

            <h2 className="text-3xl font-black uppercase tracking-tighter italic mb-4 text-white leading-tight">
              Capa de Seguridad Legal
            </h2>
            <p className="text-white/50 mb-8 leading-relaxed text-sm md:text-base">
              Para continuar utilizando la plataforma de <span className="text-white font-bold italic underline decoration-white/20">Boxing Profight</span>, 
              es imperativo que revises y aceptes nuestro marco normativo actualizado (RGPD/LSSI-CE).
            </p>

            <div className="space-y-6 text-left mb-10">
              <label className="flex items-start gap-4 cursor-pointer group p-4 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors rounded-lg">
                <div className="relative pt-1 flex-shrink-0">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                  />
                  <div className="w-6 h-6 border-2 border-white/20 rounded peer-checked:border-white peer-checked:bg-white transition-all flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-black opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                </div>
                <span className="text-sm text-white/70 leading-relaxed pt-0.5">
                  He leído y acepto la{" "}
                  <Link href="/legal/privacidad" target="_blank" className="text-white underline hover:no-underline font-medium italic">Política de Privacidad</Link>, los{" "}
                  <Link href="/legal/terminos" target="_blank" className="text-white underline hover:no-underline font-medium italic">Términos de Uso</Link> y la{" "}
                  <Link href="/legal/cookies" target="_blank" className="text-white underline hover:no-underline font-medium italic">Política de Cookies</Link>.
                </span>
              </label>
            </div>

            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
              <button
                onClick={handleAccept}
                disabled={!accepted || loading}
                className="w-full h-14 bg-white text-black font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2 rounded-lg"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Aceptar y Entrar"}
              </button>
              
              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full h-14 border border-white/10 text-white/50 font-black uppercase tracking-widest text-sm hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2 group rounded-lg"
              >
                <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                No acepto
              </button>
            </div>
            
            <p className="mt-8 text-[10px] text-white/20 uppercase tracking-[0.2em] font-medium">
               Boxing Profight — Estándar de Seguridad EuropeA v1.0
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
