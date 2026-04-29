
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Boxing Profight",
  description: "Entrenamiento de Boxeo y K1 en Alcorcón con Álex Pintor. Asegura tu plaza.",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon_boxing_profight-192x192.webp",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Boxing Profight",
  },
};

import LegalOnboardingGate from "@/components/LegalOnboardingGate";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${inter.className} bg-black text-white antialiased`}>
        <AuthProvider>
          <LegalOnboardingGate>
            {children}
          </LegalOnboardingGate>
          <PwaInstallPrompt />
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: "bg-zinc-900 border-white/10 text-white font-sans",
              style: {
                background: "rgba(9, 9, 11, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "white",
              },
            }}
            theme="dark"
            richColors
            closeButton
          />
        </AuthProvider>
      </body>
    </html>
  );
}
