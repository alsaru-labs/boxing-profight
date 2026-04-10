"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
import LegalConsentModal from "./LegalConsentModal";

export default function LegalOnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();

  // 🛡️ Lógica de bloqueo: 
  // 1. El usuario debe estar autenticado y con perfil cargado.
  // 2. El campo legal_accepted debe ser explícitamente false.
  // 3. NO debe estar en una ruta legal (ej: /legal/privacidad) para permitir su lectura.
  const isLegalPage = pathname?.startsWith("/legal");
  const showModal = user && profile && profile.legal_accepted === false && !isLegalPage;

  return (
    <>
      {showModal && <LegalConsentModal profileId={profile.$id} />}
      {children}
    </>
  );
}
