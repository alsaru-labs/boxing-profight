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
import { account, databases, DATABASE_ID, COLLECTION_PROFILES } from "@/lib/appwrite";

import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshGlobalData } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Redirigir a los usuarios que ya tienen sesión
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

  const deleteAllCookies = () => {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, rellena todos los campos.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Create session safely
      try {
        await account.createEmailPasswordSession(email, password);
      } catch (sessionError: any) {
        if (
          sessionError?.message?.includes('session is active') ||
          sessionError?.message?.includes('creation is prohibited') ||
          sessionError?.message?.includes('missing scope')
        ) {
          // If a session already exists, delete it first and retry
          try {
            await account.deleteSession("current");
          } catch (deleteErr) {
            // If delete fails (e.g., user was deleted in console but cookie remains),
            // forcefully clear local storage tokens Appwrite generates.
            localStorage.clear();
            sessionStorage.clear();
            deleteAllCookies();
          }
          await account.createEmailPasswordSession(email, password);
        } else {
          throw sessionError; // Re-throw if it's a different error
        }
      }

      // ⚡️ FORZAR ACTUALIZACIÓN DEL CONTEXTO ANTES DE REDIRIGIR
      await refreshGlobalData();

      // Fetch user profile to determine correct redirection route via Server Action (API Key)
      const { getUserProfile } = await import("@/app/sys-director/actions");
      const currentUser = await account.get();
      const profileResult = await getUserProfile(currentUser.$id);

      if (profileResult.success && profileResult.data) {
        const profile = profileResult.data;
        if (profile.role === "admin") {
          router.push("/sys-director");
        } else {
          const urlParams = new URLSearchParams(window.location.search);
          const redirectPath = urlParams.get('redirect');
          if (redirectPath && redirectPath.startsWith('/')) {
            router.push(redirectPath);
          } else {
            router.push("/bookings");
          }
        }
      } else {
        setError("No se ha podido acceder a la cuenta. Por favor, inténtalo de nuevo.");
      }
    } catch (err: any) {
      console.error("[LOGIN ERROR]", err);
      
      const type = err?.type || "";
      const status = err?.code || 0;

      if (type === "user_invalid_credentials" || status === 401) {
        setError("Credenciales incorrectas.");
      } else if (type === "user_blocked") {
        setError("Acceso denegado.");
      } else if (status === 429) {
        setError("Demasiados intentos. Por favor, espera unos minutos.");
      } else {
        setError("Error al iniciar sesión. Por favor, inténtalo más tarde.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return <AuthTransition message="Comprobando sesión segura..." subMessage="Sincronizando seguridad" />;
  }

  if (loading) {
    return <AuthTransition message="Iniciando sesión segura..." subMessage="Sincronizando seguridad" />;
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden font-sans text-white flex flex-col md:flex-row">
      {/* Background Gradient effects */}
      <div className="absolute inset-0 z-0 opacity-80 mix-blend-screen pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] animate-pulse bg-gradient-to-bl from-zinc-800 via-stone-900 to-black rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] left-[-20%] w-[60%] h-[60%] bg-gradient-to-tr from-red-900/10 via-neutral-800/20 to-transparent rounded-full blur-[120px]" />
      </div>

      {/* Left Side: Visual / Branding */}
      <div className="w-full md:w-1/2 min-h-[40vh] md:min-h-screen relative flex flex-col items-center justify-center p-8 z-10 hidden md:flex">
        {/* Apple Style Glass Card inside visual side */}
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

        {/* Overlay gradient to subtly blend with black right side */}
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black to-transparent pointer-events-none" />
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full md:w-1/2 min-h-screen relative flex flex-col justify-center px-6 py-12 md:px-16 lg:px-24 z-10 bg-black/60 md:bg-black/90 backdrop-blur-2xl">

        <Link href="/" className="absolute top-8 left-6 md:top-12 md:left-12 flex items-center text-white/50 hover:text-white transition-colors group">
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Volver al inicio</span>
        </Link>

        {/* Mobile Logo Header */}
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
              <Label htmlFor="email" className="text-white/80 font-medium">Correo electrónico</Label>
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
                <Label htmlFor="password" className="text-white/80 font-medium">Contraseña</Label>
                <Link href="#" className="text-sm font-medium text-white/50 hover:text-white transition-colors">
                  ¿Has olvidado la contraseña?
                </Link>
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
  );
}
