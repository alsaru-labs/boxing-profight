import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Boxing Profight",
  description: "Entrenamiento de Boxeo y K1 en Alcorcón con Álex Pintor. Asegura tu plaza.",
  themeColor: "#000000",
  icons: {
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  // Esto es vital para que se abra sin la barra del navegador (modo app)
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Boxing Profight",
  },
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
