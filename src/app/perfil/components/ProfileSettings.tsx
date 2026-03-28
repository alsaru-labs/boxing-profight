import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Shield, Loader2, Check, Lock, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChangePasswordModal } from "./ChangePasswordModal";

interface ProfileSettingsProps {
  profileInfo: any;
  onUpdatePhone: (newPhone: string) => Promise<void>;
  onChangePassword: (oldPass: string, newPass: string) => Promise<void>;
  isUpdating: boolean;
}

export function ProfileSettings({ profileInfo, onUpdatePhone, onChangePassword, isUpdating }: ProfileSettingsProps) {
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [tempPhone, setTempPhone] = useState(profileInfo?.phone || "");
  const [phoneError, setPhoneError] = useState("");

  const validatePhone = (phone: string) => {
    if (!phone.trim()) return true; // Allow empty
    const cleanPhone = phone.replace(/[\s\-\.]/g, '');
    const phoneRegex = /^(\+34|0034|34)?[6789]\d{8}$/;
    return phoneRegex.test(cleanPhone);
  };

  const handleUpdate = async () => {
    if (isEditingPhone) {
      if (!validatePhone(tempPhone)) {
        setPhoneError("Introduce un número válido (ej: 600123456)");
        return;
      }
      setPhoneError("");
      await onUpdatePhone(tempPhone);
      setIsEditingPhone(false);
    }
  };


  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-xl space-y-8">
      <div className="space-y-4">
        <h4 className="text-xl font-black tracking-tight">Preferencias del Perfil</h4>
        <p className="text-white/40 text-sm">Gestiona la información de contacto y privacidad de tu cuenta de alumno.</p>
      </div>

      <div className="p-8 bg-white/5 border border-white/10 rounded-2xl space-y-6">
        {/* Phone Row */}
        <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5 min-h-[80px]">
          <div className="flex items-center gap-4 flex-1">
            <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20"><Phone className="w-5 h-5 text-emerald-400" /></div>
            <div className="flex-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-1">Teléfono Principal</span>
              {isEditingPhone ? (
                <div className="flex flex-col gap-1.5 flex-1">
                  <Input 
                    value={tempPhone}
                    onChange={(e) => {
                      setTempPhone(e.target.value);
                      if (phoneError) setPhoneError("");
                    }}
                    placeholder="600 000 000"
                    className={`bg-white/5 border-white/10 h-10 text-sm focus:border-emerald-500/50 transition-all font-bold ${phoneError ? 'border-red-500/50 ring-1 ring-red-500/20' : ''}`}
                    autoFocus
                  />
                  {phoneError && <span className="text-[10px] text-red-500/60 font-black tracking-widest uppercase italic pl-1">{phoneError}</span>}
                </div>
              ) : (
                <span className="text-sm font-bold block text-white/80">{profileInfo?.phone || "No registrado"}</span>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setIsEditingPhone(!isEditingPhone);
              setPhoneError(""); // Clear error on cancel
            }}
            className="ml-4 text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            {isEditingPhone ? "Cancelar" : "Editar"}
          </Button>

        </div>

        {/* Password Row */}
        <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5 min-h-[80px]">
          <div className="flex items-center gap-4 flex-1">
            <div className="bg-blue-500/10 p-2.5 rounded-lg border border-blue-500/20"><Lock className="w-5 h-5 text-blue-400" /></div>
            <div className="flex-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-1">Contraseña de Acceso</span>
              <span className="text-sm font-bold block text-white/30 tracking-widest">••••••••</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsChangingPass(true)}
            className="ml-4 text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            Editar
          </Button>
        </div>

        <div className="pt-4 border-t border-white/5">
          <Button 
            onClick={handleUpdate}
            disabled={isUpdating || (isEditingPhone && tempPhone === profileInfo?.phone)}
            className="w-full bg-white text-black hover:bg-emerald-500 hover:text-white font-black h-14 rounded-xl shadow-xl transition-all disabled:opacity-20 flex items-center justify-center gap-2"
          >
            {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> ACTUALIZAR DATOS DE PERFIL</>}
          </Button>
        </div>
      </div>

      <div className="p-6 border border-white/5 rounded-2xl bg-gradient-to-br from-emerald-900/10 to-transparent flex items-start gap-4">
        <div className="bg-emerald-500/20 p-2 rounded-lg mt-0.5"><Shield className="w-4 h-4 text-emerald-500" /></div>
        <div className="space-y-1">
          <h6 className="font-bold text-sm">Protección de Datos</h6>
          <p className="text-[11px] text-white/40 leading-relaxed font-medium italic">Boxing Profight cumple con la RGPD. Tus datos solo se usan para la gestión de las clases y contactarte en caso de urgencia.</p>
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={isChangingPass}
        onOpenChange={setIsChangingPass}
        onSubmit={onChangePassword}
        isUpdating={isUpdating}
      />
    </motion.div>
  );
}
