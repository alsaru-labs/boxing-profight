"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { bootstrapAdminAction } from "../actions-setup";

export default function BootstrapPage() {
  const [formData, setFormData] = useState({
    name: "",
    lastName: "",
    email: "",
    pass: "",
    secret: ""
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const data = {
        name: formData.name.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        pass: formData.pass.trim(),
        secret: formData.secret.trim()
      };
      const res = await bootstrapAdminAction(data);
      setResult(res);
    } catch (err: any) {
      setResult({ success: false, error: err.message || "Error de red" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black overflow-hidden font-sans text-white flex items-center justify-center p-6">
      {/* Background Gradient effects */}
      <div className="absolute inset-0 z-0 opacity-80 mix-blend-screen pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] animate-pulse bg-gradient-to-bl from-zinc-800 via-stone-900 to-black rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] left-[-20%] w-[60%] h-[60%] bg-gradient-to-tr from-red-950/20 via-neutral-900/20 to-transparent rounded-full blur-[120px]" />
      </div>

      <Link href="/login" className="absolute top-8 left-6 md:top-12 md:left-12 flex items-center text-white/50 hover:text-white transition-colors group z-20">
        <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Volver al login</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg bg-white/5 border border-white/10 backdrop-blur-2xl rounded-[2rem] p-8 md:p-12 shadow-2xl overflow-hidden"
      >
        {/* Glow effect inside card */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 blur-[60px] rounded-full pointer-events-none" />

        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-20 h-20 relative mb-6">
            <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full animate-pulse" />
            <div className="w-full h-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center relative z-10">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 mb-2">
            System Director Setup
          </h1>
          <p className="text-white/40 text-sm font-medium tracking-tight max-w-[280px]">
            Configuración maestra del núcleo administrativo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/60 text-[10px] font-black uppercase tracking-widest ml-1">Nombre</Label>
                <Input
                  required
                  type="text"
                  placeholder="Álex"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={loading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-white/30 transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/60 text-[10px] font-black uppercase tracking-widest ml-1">Apellidos</Label>
                <Input
                  required
                  type="text"
                  placeholder="Pintor"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={loading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-white/30 transition-all font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/60 text-[10px] font-black uppercase tracking-widest ml-1">Email Gestión</Label>
                <Input
                  required
                  type="email"
                  placeholder="admin@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={loading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-white/30 transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/60 text-[10px] font-black uppercase tracking-widest ml-1">Contraseña</Label>
                <Input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={formData.pass}
                  onChange={(e) => setFormData({ ...formData, pass: e.target.value })}
                  disabled={loading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-white/30 transition-all"
                />
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-white/5">
              <div className="space-y-2">
                <Label className="text-red-500/80 text-[10px] font-black uppercase tracking-widest ml-1">Universal Bootstrap Secret</Label>
                <Input
                  required
                  type="password"
                  placeholder="Master Recovery Key"
                  value={formData.secret}
                  onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                  disabled={loading}
                  className="bg-red-500/5 border-red-500/20 text-white placeholder:text-red-900/40 h-12 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-red-500/30 transition-all"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black hover:bg-neutral-200 h-14 rounded-2xl text-base font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                "Inicializar Directorio"
            )}
          </Button>
        </form>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-8 p-5 rounded-2xl border flex items-start gap-4 ${
              result.success 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            {result.success ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <AlertCircle className="w-6 h-6 shrink-0" />}
            <div className="space-y-1">
              <p className="font-bold text-sm leading-tight text-white">
                {result.success ? "Núcleo Sincronizado" : "Error de Autorización"}
              </p>
              <p className="text-xs opacity-70 leading-relaxed">
                {result.message || result.error}
              </p>
              {result.success && (
                <Link href="/login" className="inline-block mt-3 bg-emerald-500 text-black px-5 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-colors">
                  ACCEDER AL PANEL
                </Link>
              )}
            </div>
          </motion.div>
        )}

        <div className="mt-8 text-center">
            <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.3em]">
                Boxing Profight Security Layer v4.0
            </p>
        </div>
      </motion.div>
    </div>
  );
}
