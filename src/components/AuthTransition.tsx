"use client";

import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface AuthTransitionProps {
  message?: string;
  subMessage?: string;
}

export default function AuthTransition({ 
  message = "Syncronizando seguridad...", 
  subMessage = "Verificando acceso" 
}: AuthTransitionProps) {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden font-sans text-white flex items-center justify-center p-6 z-[9999]">
      {/* Background Gradient effects */}
      <div className="absolute inset-0 z-0 opacity-80 mix-blend-screen pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] animate-pulse bg-gradient-to-bl from-zinc-800 via-stone-900 to-black rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] left-[-20%] w-[60%] h-[60%] bg-gradient-to-tr from-red-950/20 via-neutral-900/20 to-transparent rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="relative mb-8">
            <div className="absolute inset-0 bg-white/10 blur-2xl rounded-full animate-pulse" />
            <Loader2 className="w-12 h-12 text-white animate-spin relative z-10" />
        </div>
        
        <p className="text-white font-black uppercase tracking-[0.2em] text-sm md:text-base animate-pulse italic text-center">
            {message}
        </p>
        
        <p className="text-white/20 text-[10px] md:text-[11px] uppercase font-bold tracking-[0.5em] mt-4 text-center">
            {subMessage}
        </p>
      </motion.div>
    </div>
  );
}
