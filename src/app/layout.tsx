import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Boxing Profight | Entrenamiento Real",
  description: "Entrenamiento de Boxeo y K1 en Alcorcón con Álex Pintor. Asegura tu plaza.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${inter.variable} font-sans antialiased selection:bg-white/30 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
