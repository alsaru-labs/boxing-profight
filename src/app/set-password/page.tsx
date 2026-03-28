"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPasswordWithToken } from "./actions";

function SetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // 🛡️ Robust Validation Logic
    const passwordRequirements = [
        { id: 'length', label: 'Mínimo 8 caracteres', regex: /.{8,}/ },
        { id: 'upper', label: 'Al menos una Mayúscula', regex: /[A-Z]/ },
        { id: 'number', label: 'Al menos un Número', regex: /[0-9]/ },
        { id: 'special', label: 'Un carácter especial (@, #, $, etc.)', regex: /[!@#$%^&*(),.?":{}|<>]/ },
    ];

    const metRequirements = passwordRequirements.filter(req => req.regex.test(password));
    const allMet = metRequirements.length === passwordRequirements.length;
    const isMatching = password !== "" && password === confirm;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            setError("Invitación no válida. Solicita una nueva al soporte técnico.");
            return;
        }

        if (!allMet) {
            setError("La contraseña no cumple con los requisitos de seguridad.");
            return;
        }

        setError("");
        setIsLoading(true);

        try {
            const result = await setPasswordWithToken(token, password, confirm);
            if (result.success) {
                setSuccess(true);
                setTimeout(() => {
                    router.push("/login?success=password-set");
                }, 3000);
            } else {
                setError(result.error || "Error al actualizar la contraseña.");
            }
        } catch (err) {
            setError("Error de conexión. Reinténtalo en unos minutos.");
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center space-y-6"
            >
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-black tracking-tight">¡Contraseña Guardada!</h2>
                    <p className="text-white/50 font-medium">Hemos configurado tu acceso con éxito. Redirigiéndote al ring...</p>
                </div>
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            </motion.div>
        );
    }

    if (!token) {
        return (
            <div className="text-center space-y-4">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto opacity-50" />
                <h1 className="text-2xl font-black">Invitación Inválida</h1>
                <p className="text-white/40 max-w-xs mx-auto">Parece que el enlace de invitación es incorrecto o no existe. Contacta con Boxing Profight.</p>
                <Button variant="outline" className="mt-4 border-white/10" onClick={() => router.push("/")}>Volver al Inicio</Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 w-full">
            <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight mb-2">Activar Acceso</h1>
                <p className="text-white/40 text-sm font-medium leading-relaxed">
                    Personaliza tu contraseña secreta para acceder al panel de reservas de Boxing Profight.
                </p>
            </div>

            <div className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-white/40">Nueva Contraseña</Label>
                    <div className="relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-white/5 border-white/10 text-white h-14 pl-12 pr-12 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-lg"
                        />
                        <Lock className="absolute left-4 top-4 w-5 h-5 text-white/20" />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-4 text-white/20 hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* 🛡️ Smart Validation Checklist */}
                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5 space-y-2.5 mt-4 group">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Nivel de Seguridad</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${allMet ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                {metRequirements.length}/4 Criterios
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {passwordRequirements.map((req) => {
                                const isMet = req.regex.test(password);
                                return (
                                    <div key={req.id} className="flex items-center gap-2.5 transition-all duration-300">
                                        <div className={`p-0.5 rounded-full border ${isMet ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/5 text-white/10'}`}>
                                            <CheckCircle2 className={`w-3 h-3 ${isMet ? 'opacity-100' : 'opacity-20'}`} />
                                        </div>
                                        <span className={`text-[11px] font-bold ${isMet ? 'text-white/80' : 'text-white/20'}`}>
                                            {req.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Dynamic Strength Bar */}
                        <div className="flex gap-1 h-1.5 mt-3">
                            {[1, 2, 3, 4].map((i) => {
                                const isActive = metRequirements.length >= i;
                                const colors = ['bg-red-500/20', 'bg-orange-500/30', 'bg-yellow-500/40', 'bg-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.3)]'];
                                return (
                                    <div 
                                        key={i} 
                                        className={`flex-1 rounded-full transition-all duration-500 ${isActive ? colors[metRequirements.length - 1] : 'bg-white/5'}`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-white/40">Repetir Contraseña</Label>
                    <div className="relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className="bg-white/5 border-white/10 text-white h-14 pl-12 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-lg"
                        />
                        <ShieldCheck className="absolute left-4 top-4 w-5 h-5 text-white/20" />
                    </div>
                    {confirm !== "" && !isMatching && (
                        <p className="text-red-500/60 text-[10px] font-black uppercase tracking-wider pl-1">Las contraseñas no coinciden</p>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: "auto" }}
                        className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold italic"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            <Button 
                type="submit" 
                disabled={isLoading || !allMet || !isMatching}
                className={`w-full h-14 font-black tracking-widest uppercase transition-all shadow-2xl ${
                    allMet && isMatching 
                    ? "bg-white text-black hover:bg-emerald-500 hover:text-white" 
                    : "bg-white/5 text-white/20 border-white/5 cursor-not-allowed opacity-50"
                }`}
            >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "ACTIVAR ACCESO"}
            </Button>
        </form>

    );
}

export default function SetPasswordPage() {
    return (
        <main className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-white flex items-center justify-center p-4">
            {/* Background Gradients */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[10%] w-[40vw] h-[40vw] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[10%] w-[30vw] h-[30vw] bg-zinc-800/20 rounded-full blur-[100px]" />
            </div>

            {/* Glass Card */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md p-8 md:p-12 rounded-[2.5rem] bg-white/[0.03] backdrop-blur-3xl border border-white/10 shadow-[0_25px_100px_rgba(0,0,0,0.8)] relative z-10"
            >
                <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-white/20" /></div>}>
                    <SetPasswordForm />
                </Suspense>
            </motion.div>
            
            <div className="fixed bottom-8 text-white/20 text-[10px] font-black uppercase tracking-[0.3em] pointer-events-none">
                Boxing Profight &reg; Secure Onboarding
            </div>
        </main>
    );
}
