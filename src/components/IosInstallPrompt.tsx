"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Share, PlusSquare, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function IosInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // 0. Only show on specific routes
    const allowedRoutes = ["/perfil", "/bookings"];
    const isAllowedRoute = allowedRoutes.some(route => pathname.startsWith(route));
    if (!isAllowedRoute) {
      setShowPrompt(false);
      return;
    }

    // 1. Detect if it's iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // 2. Detect if it's Safari (not Chrome/Firefox on iOS)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    // 3. Detect if it's already in standalone mode (installed)
    const isStandalone = ('standalone' in window.navigator && (window.navigator as any).standalone) || 
                         window.matchMedia('(display-mode: standalone)').matches;

    // 4. Check localStorage for the "hidden" flag and expiration
    const lastHidden = localStorage.getItem("ios-install-prompt-hidden-until");
    const isHidden = lastHidden && new Date().getTime() < parseInt(lastHidden);

    if (isIOS && isSafari && !isStandalone && !isHidden) {
      setShowPrompt(true);
    }
  }, [pathname]);

  const handleClose = () => {
    // Hide for 15 days (15 * 24 * 60 * 60 * 1000 ms)
    const fifteenDaysInMs = 15 * 24 * 60 * 60 * 1000;
    const hideUntil = new Date().getTime() + fifteenDaysInMs;
    localStorage.setItem("ios-install-prompt-hidden-until", hideUntil.toString());
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed bottom-6 left-4 right-4 z-[9999] md:left-auto md:right-8 md:w-80"
        >
          <div className="relative bg-zinc-900 border border-white/10 text-white rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-1 text-white/40 hover:text-white transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="font-black text-black text-xs">BP</span>
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">Boxing Profight</p>
                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Instala la App</p>
              </div>
            </div>

            <p className="text-[13px] text-white/70 mb-5 leading-snug">
              Añade la app a tu pantalla de inicio para reservar tus clases con un solo toque.
            </p>

            {/* Instructions */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Share className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-[11px] font-medium leading-tight">
                  1. Pulsa el botón <span className="text-white font-bold">"Compartir"</span> abajo.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="p-2 bg-white/10 rounded-lg">
                  <PlusSquare className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-[11px] font-medium leading-tight">
                  2. Selecciona <span className="text-white font-bold">"Añadir a pantalla de inicio"</span>.
                </p>
              </div>
            </div>

            {/* Hint Arrow (Mobile only simulation) */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-900 border-r border-b border-white/10 rotate-45 hidden md:block" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
