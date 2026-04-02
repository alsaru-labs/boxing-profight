"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { Loader2, ShieldCheck } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== "admin")) {
      router.push("/perfil");
    }
  }, [user, profile, isAdmin, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin mb-4" />
        <p className="text-white/40 font-black uppercase tracking-widest text-xs">Verificando Credenciales...</p>
      </div>
    );
  }

  if (!user || profile?.role !== "admin") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
         <ShieldCheck className="w-16 h-16 text-red-600 mb-4 animate-pulse" />
         <p className="text-white font-black uppercase tracking-tighter text-2xl">Acceso Restringido</p>
         <p className="text-white/40 mt-2">Redirigiendo a tu perfil...</p>
      </div>
    );
  }

  return (
    <AdminProvider>
      {children}
    </AdminProvider>
  );
}
