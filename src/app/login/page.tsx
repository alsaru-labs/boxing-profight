"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import AuthTransition from "@/components/AuthTransition";
import { account } from "@/lib/appwrite";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshGlobalData } = useAuth();

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Password reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");

  // Redirect already-logged-in users
  useEffect(() => {
    if (authLoading) return;
    if (user && profile) {
      if (profile.role === "admin") {
        router.push("/sys-director");
      } else {
        router.push("/perfil");
      }
    } else {
      setCheckingAuth(false);
    }
  }, [user, profile, authLoading, router]);

  // ============================================================
  // 🔐 LOGIN HANDLER
  // ============================================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, rellena todos los campos.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // PASO 1: Crear sesión en el cliente (Appwrite Cloud nativo)
      try {
        await account.createEmailPasswordSession(email, password);
      } catch (authErr: any) {
        console.warn("[Auth Attempt Failed]", authErr);
        if (authErr?.code === 429) {
          setError("Demasiados intentos. Por favor, espera unos minutos.");
        } else {
          setError("Credenciales incorrectas.");
        }
        setLoading(false);
        return;
      }

      // PASO 2: Validación de Estado en el Servidor (Two-Step Security)
      const currentUser = await account.get();
      const { validateLoginStatusAction } = await import("./actions");
      const validation = await validateLoginStatusAction(currentUser.$id);

      if (validation.success) {
        // 🛡️ SICRONIZACIÓN ATÓMICA DE ESTADO (Para evitar redirecciones a ciegas)
        // Forzamos refreshGlobalData con el flag 'force' (bypass de cooldown de 5s)
        await refreshGlobalData(false, true);

        // 🚀 NAVEGACIÓN ACTIVA: router.refresh() purga el Client Router Cache
        // Esto obliga a Next.js a evaluar de nuevo si hay cookies de sesión
        router.refresh();

        if (validation.role === "admin") {
          router.push("/sys-director");
        } else {
          const urlParams = new URLSearchParams(window.location.search);
          const redirectPath = urlParams.get("redirect");
          if (redirectPath && redirectPath.startsWith("/")) {
            router.push(redirectPath);
          } else {
            router.push("/bookings");
          }
        }
      } else {
        await account.deleteSession("current");
        setError(validation.error || "Tu acceso ha sido denegado.");
      }
    } catch (err: any) {
      console.error("[LOGIN ERROR]", err);
      setError("Error técnico al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 🔑 PASSWORD RESET HANDLER
  // ============================================================
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError("Introduce tu correo electrónico.");
      return;
    }
    try {
      setResetLoading(true);
      setResetError("");
      const { requestPasswordResetAction } = await import("./actions");
      await requestPasswordResetAction(resetEmail);
      setResetSent(true);
    } catch {
      setResetError("Error técnico. Por favor inténtalo de nuevo.");
    } finally {
      setResetLoading(false);
    }
  };

  // ============================================================
  // 🔄 LOADING GUARDS
  // ============================================================
  if (checkingAuth) {
    return <AuthTransition message="Comprobando sesión segura..." subMessage="Sincronizando seguridad" />;
  }

  if (loading) {
    return <AuthTransition message="Iniciando sesión segura..." subMessage="Sincronizando seguridad" />;
  }

  // ============================================================
  // 🎨 RENDER
  // ============================================================
  return (
    <>
      {/* 🔑 MODAL: Recuperación de Contraseña */}
      {showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowResetModal(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 bg-red-950/50 border border-red-900/50 rounded-full px-3 py-1 mb-4">
                <span className="text-red-400 text-xs font-bold uppercase tracking-widest">
                  Recuperación de acceso
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                ¿Olvidaste tu contraseña?
              </h2>
              <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                Introduce tu correo y recibirás un enlace seguro para crear una nueva contraseña.
              </p>
            </div>

            {resetSent ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-950/50 border border-emerald-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✅</span>
                </div>
                <p className="text-white font-semibold text-lg mb-2">¡Enlace enviado!</p>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Si tu correo está registrado, recibirás un mensaje en breve. Revisa también tu carpeta de spam.
                </p>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="mt-6 w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                {resetError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {resetError}
                  </div>
                )}
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-zinc-300 mb-2">
                    Correo electrónico
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    placeholder="alumno@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    disabled={resetLoading}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl px-4 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 border border-zinc-700 text-zinc-400 font-semibold py-3 rounded-xl hover:border-zinc-500 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {resetLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                    ) : (
                      "Enviar enlace"
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* 🏠 LOGIN PAGE */}
      <div className="relative min-h-screen bg-black overflow-hidden font-sans text-white flex flex-col md:flex-row">
        {/* Background gradients */}
        <div className="absolute inset-0 z-0 opacity-80 mix-blend-screen pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] animate-pulse bg-gradient-to-bl from-zinc-800 via-stone-900 to-black rounded-full blur-[100px]" />
          <div className="absolute bottom-[20%] left-[-20%] w-[60%] h-[60%] bg-gradient-to-tr from-red-900/10 via-neutral-800/20 to-transparent rounded-full blur-[120px]" />
        </div>

        {/* Left Side: Branding */}
        <div className="w-full md:w-1/2 min-h-[40vh] md:min-h-screen relative flex flex-col items-center justify-center p-8 z-10 hidden md:flex">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center"
          >
            <div className="w-32 h-32 md:w-48 md:h-48 relative mb-8">
              <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full animate-pulse" />
              <Image
                src="/logo_boxing_profight.webp"
                alt="PROFIGHT Logo"
                fill
                className="rounded-full object-cover border-4 border-white/10 relative z-10 shadow-2xl"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-center bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 mb-4">
              BOXING PROFIGHT.
            </h1>
            <p className="text-white/50 text-xl font-medium tracking-tight">
              Accede al sistema de reservas.
            </p>
          </motion.div>
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black to-transparent pointer-events-none" />
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-1/2 min-h-screen relative flex flex-col justify-center px-6 py-12 md:px-16 lg:px-24 z-10 bg-black/60 md:bg-black/90 backdrop-blur-2xl">
          <Link
            href="/"
            className="absolute top-8 left-6 md:top-12 md:left-12 flex items-center text-white/50 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Volver al inicio</span>
          </Link>

          {/* Mobile logo */}
          <div className="md:hidden flex flex-col items-center mb-12 mt-8">
            <div className="w-24 h-24 relative mb-6">
              <Image
                src="/logo_boxing_profight.webp"
                alt="PROFIGHT Logo"
                fill
                className="rounded-full object-cover border-2 border-white/20"
              />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Inicia Sesión</h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-md mx-auto"
          >
            <div className="hidden md:block mb-10">
              <h2 className="text-4xl font-bold tracking-tight mb-2">Bienvenido de vuelta</h2>
              <p className="text-white/50">Introduce en tu cuenta para reservar clases.</p>
            </div>

            <form className="space-y-6" onSubmit={handleLogin}>
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80 font-medium">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="alumno@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-14 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30 transition-all"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-white/80 font-medium">
                    Contraseña
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetModal(true);
                      setResetSent(false);
                      setResetError("");
                      setResetEmail("");
                    }}
                    className="text-sm font-medium text-white/50 hover:text-white transition-colors"
                  >
                    ¿Has olvidado la contraseña?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-14 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/30 transition-all"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black hover:bg-neutral-200 h-14 rounded-xl text-lg font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </form>

            <div className="mt-8 text-center text-sm text-white/50">
              ¿Aún no tienes cuenta?{" "}
              <span className="font-medium text-white/80">
                Acércate al centro para solicitar registro
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
