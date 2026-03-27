"use client";

import { motion } from "framer-motion";
import { Phone, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProfileSettingsProps {
  profileInfo: any;
}

export function ProfileSettings({ profileInfo }: ProfileSettingsProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-xl space-y-8">
      <div className="space-y-4">
        <h4 className="text-xl font-black tracking-tight">Preferencias del Perfil</h4>
        <p className="text-white/40 text-sm">Gestiona la información de contacto y privacidad de tu cuenta de alumno.</p>
      </div>

      <div className="p-8 bg-white/5 border border-white/10 rounded-2xl space-y-6">
        <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-white/40" />
            <div>
              <span className="text-sm font-bold block">Teléfono Principal</span>
              <span className="text-xs text-white/30">{profileInfo?.phone || "No registrado"}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="bg-transparent border-white/10 text-white/60 hover:text-white">Editar</Button>
        </div>

        <div className="pt-4 border-t border-white/5">
          <Button className="w-full bg-white text-black hover:bg-emerald-500 hover:text-white font-black h-14 rounded-xl shadow-xl transition-all">
            ACTUALIZAR DATOS DE PERFIL
          </Button>
        </div>
      </div>

      <div className="p-6 border border-white/5 rounded-2xl bg-gradient-to-br from-emerald-900/10 to-transparent">
        <h6 className="font-bold flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-emerald-500" /> Protección de Datos</h6>
        <p className="text-xs text-white/40 leading-relaxed font-medium line-clamp-2 italic">Boxing Profight cumple con la RGPD. Tus datos solo se usan para la gestión de las clases y contactarte en caso de urgencia.</p>
      </div>
    </motion.div>
  );
}
