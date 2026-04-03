"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { Loader2, ShieldCheck } from "lucide-react";
import AuthTransition from "@/components/AuthTransition";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isSetupPath = pathname === "/sys-director/setup";

  useEffect(() => {
    if (!isSetupPath && !authLoading && (!user || profile?.role !== "admin")) {
      router.push("/perfil");
    }
  }, [user, profile, isAdmin, authLoading, router, isSetupPath]);

  // Si estamos en la ruta de inicialización, omitimos el AdminProvider y cualquier bloqueo
  if (isSetupPath) {
    return <>{children}</>;
  }

  if (authLoading) {
    return <AuthTransition message="Verificando Credenciales..." subMessage="Sincronizando seguridad" />;
  }

  if (!user || profile?.role !== "admin") {
    return <AuthTransition message="Redirigiendo..." subMessage="Acceso asegurado" />;
  }

  return (
    <AdminProvider>
      {children}
    </AdminProvider>
  );
}
