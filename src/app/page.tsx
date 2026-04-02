"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Instagram, MapPin, Youtube, Calendar } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { availableClasses, announcements, user, loading } = useAuth();

  // 🌪️ Filtrar clases para la Home (Próximas 7 días, limitadas a 3 principales)
  const displayClasses = useMemo(() => {
    if (!availableClasses || availableClasses.length === 0) {
      return [
        { title: "Boxeo", type: "Técnica / Física", time: "10:00 - 11:00 AM", slots: "Verde" },
        { title: "Boxeo", type: "General / Sparring", time: "18:00 - 19:30 PM", slots: "Amarillo" },
        { title: "K1", type: "Kickboxing & Muay Thai", time: "19:30 - 21:00 PM", slots: "Verde" },
      ];
    }
    return availableClasses.slice(0, 3).map(c => ({
      title: c.name,
      type: c.coach,
      time: `${c.time.split('-')[0].trim()} (${new Date(c.date).toLocaleDateString('es-ES', { weekday: 'short' })})`,
      slots: c.registeredCount >= c.capacity ? 'Rojo' : c.registeredCount >= c.capacity * 0.8 ? 'Amarillo' : 'Verde'
    }));
  }, [availableClasses]);

  return (
    <div className="relative min-h-screen bg-black overflow-hidden font-sans text-white">
      {/* Background Video Simulator - Abstract Gradient Flow simulating slow motion */}
      <div className="absolute inset-0 z-0 opacity-80 mix-blend-screen pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] animate-pulse bg-gradient-to-br from-zinc-800 via-stone-900 to-black rounded-full blur-[100px]" />
        <div className="absolute top-[30%] right-[-20%] w-[80%] h-[80%] bg-gradient-to-tl from-red-900/10 via-neutral-800/20 to-transparent rounded-full blur-[120px]" />
      </div>

      <Navbar isHome={true} />

      <main className="relative z-20 flex flex-col items-center justify-center pt-40 md:pt-56 px-6 md:px-24">

        {/* ================= HERO SECTION ================= */}
        <section className="min-h-[70vh] flex flex-col items-center justify-center text-center w-full max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10"
          >
            <h1 className="text-5xl md:text-8xl font-extrabold tracking-tighter mb-4 md:mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
              BOXING PROFIGHT.
            </h1>
            <p className="text-2xl md:text-4xl font-bold tracking-tighter mb-8 text-white/50">
              Entrenamiento Real.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10 max-w-2xl text-base md:text-xl text-white/60 font-medium"
          >
            Domina las técnicas y tácticas de combate definitivas. K1 y Boxeo en Alcorcón con profesionales en activo.
          </motion.div>


        </section>

        {/* ================= INSTRUCTOR SECTION ================= */}
        <section className="w-full max-w-6xl py-20 border-t border-white/10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Texto */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="w-full lg:w-1/2 flex flex-col justify-center"
            >
              <div className="flex items-center gap-2 mb-4 text-white/50">
                <MapPin className="w-5 h-5" />
                <span className="text-lg font-medium tracking-wide">Alcorcón, Madrid</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white/90 tracking-tight">
                Aprende de la Experiencia.
              </h2>
              <p className="text-lg text-white/60 mb-6 leading-relaxed">
                Las clases son impartidas por <span className="text-white font-semibold">Álex Pintor</span>,
                un joven talento originario de Alcorcón. Con más de una década subiéndose
                al ring y forjando una sólida experiencia competitiva, Álex no solo enseña la técnica,
                <span className="italic text-white/80"> transmite la táctica, la disciplina y la realidad del combate.</span>
              </p>

              <div className="flex items-center gap-4 text-white/40 mb-8 font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-600" />
                  <span>K1</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-white" />
                  <span>Boxeo</span>
                </div>
              </div>
            </motion.div>

            {/* Video Youtube */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="w-full lg:w-1/2"
            >
              {/* Contenedor tipo "Mac Studio Display" effect con Cristal */}
              <div className="p-[2px] rounded-[1.5rem] bg-gradient-to-br from-white/20 to-white/5 overflow-hidden">
                <div className="bg-black relative rounded-[1.4rem] overflow-hidden aspect-video shadow-2xl">
                  {/* Aspect Ratio iframe */}
                  <iframe
                    width="100%"
                    height="100%"
                    src="https://www.youtube.com/embed/luOWGnr_SBU"
                    title="Álex Pintor en acción"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 z-10"
                  ></iframe>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ================= CLASSES & SCHEDULE SECTION ================= */}
        <section id="classes" className="w-full max-w-6xl py-20 border-t border-white/10 scroll-mt-24 md:scroll-mt-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white/90 tracking-tight">
              Clases y Horarios
            </h2>
            <p className="text-white/50 text-lg md:text-xl max-w-2xl mx-auto">
              Grupos reducidos garantizando la calidad técnica. Limite de 30 plazas por sesión.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
            {displayClasses.map((cls, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group relative"
              >
                {/* Glow Effect Behind Card */}
                <div className="absolute -inset-0.5 bg-gradient-to-br from-white/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />


                {/* Card Front Glass Layer */}
                <Card className="relative h-full bg-white/5 backdrop-blur-xl border-white/10 overflow-hidden rounded-2xl flex flex-col justify-between">
                  <div className="absolute top-0 right-0 p-4 opacity-20">
                    <Calendar className="w-24 h-24" />
                  </div>

                  <CardHeader className="relative z-10 p-4 md:pb-2">
                    <CardTitle className="text-2xl md:text-3xl text-white font-bold">{cls.title}</CardTitle>
                    <CardDescription className="text-white/60 font-medium text-sm md:text-base mt-1">{cls.type}</CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10 p-4 md:pt-4">
                    <div className="flex flex-col space-y-4">
                      <div className="bg-black/40 rounded-lg p-3 md:p-4 border border-white/5">
                        <span className="text-lg md:text-xl font-semibold tracking-wider text-white/90">{cls.time}</span>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-medium text-white/50">Disponibilidad en vivo</span>
                        <div className="flex items-center space-x-2">
                          <span className={`w-3 h-3 rounded-full ${cls.slots === 'Verde' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' :
                            cls.slots === 'Amarillo' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]' :
                              'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]'
                            }`} />
                          <span className="text-sm font-medium text-white/70">
                            {cls.slots === 'Verde' ? 'Disponible' : cls.slots === 'Amarillo' ? 'Últimas plazas' : 'Completo'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
