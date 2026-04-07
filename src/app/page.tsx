"use client";

import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowRight, Calendar, MapPin, Swords, Zap, CheckCircle2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-black text-white font-sans overflow-x-hidden">

      {/* Background Elements - Monochrome Atmosphere */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-white/[0.03] rounded-full blur-[120px] animate-pulse" />
        <div className="absolute inset-0 bg-white/[0.02] rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <filter id="noiseFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noiseFilter)" />
          </svg>
        </div>
      </div>


      <Navbar isHome={true} />

      <main className="relative z-10">

        {/* ======================== HERO SECTION ======================== */}
        <section className="min-h-screen flex flex-col items-center justify-center px-10 md:px-20 pt-32 md:pt-40 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-6xl w-full flex flex-col items-center"
          >

            <h1 className="text-[20vw] md:text-[8rem] lg:text-[10rem] font-black leading-[0.8] tracking-tighter uppercase mb-6 md:mb-8">
              <span className="block italic">BOXING</span>
              <span className="block text-white/20">PROFIGHT</span>
            </h1>

            <p className="text-base md:text-xl lg:text-2xl font-bold uppercase tracking-tight text-white/40 max-w-2xl mx-auto mb-10 md:mb-12">
              Domina la técnica Forja la disciplina <br className="hidden md:block" />
              Entrenamientos reales en el corazón de Alcorcón
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <Link href="/bookings" className="w-full sm:w-auto">
                <Button className="h-14 md:h-16 w-full sm:px-12 bg-white hover:bg-zinc-200 text-black rounded-none font-black uppercase tracking-widest text-[10px] md:text-xs shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-all hover:scale-105">
                  RESERVAR CLASE <ArrowRight className="ml-3 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button className="h-14 md:h-16 w-full sm:px-12 bg-white text-black hover:bg-black hover:text-white border border-white rounded-none font-black uppercase tracking-widest text-[10px] md:text-xs transition-all">
                  ÁREA ALUMNOS
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-20"
          >
            <div className="w-px h-12 bg-gradient-to-b from-white to-transparent" />
          </motion.div>
        </section>

        {/* ======================== DISCIPLINES GRID ======================== */}
        <motion.section
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="py-32 px-6 md:px-12 lg:px-24 border-t border-white/5"
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-16">
              <div className="h-px w-8 bg-white" />
              <h2 className="text-xs font-black uppercase tracking-[0.4em] text-white/40">Nuestras Disciplinas</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {[
                { title: "Boxeo", desc: "Técnica, potencia y el arte de la esquiva Clases para todos los niveles", icon: Swords },
                { title: "K1", desc: "Uso combinado de puños y piernas Kickboxing y Muay Thai de alta intensidad", icon: Zap },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -5 }}
                  className="group p-10 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all relative overflow-hidden text-center flex flex-col items-center"
                >
                  <div className="mb-6 opacity-40 group-hover:opacity-100 transition-opacity">
                    <item.icon className="w-12 h-12" />
                  </div>
                  <h3 className="text-4xl font-black uppercase tracking-tighter mb-4">{item.title}</h3>
                  <p className="text-white/40 text-sm font-bold leading-relaxed mb-8">{item.desc}</p>
                  <div className="h-1 w-8 bg-white/20 group-hover:w-16 transition-all" />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ======================== COACH SPOTLIGHT ======================== */}
        <motion.section
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="py-32 bg-white text-black"
        >
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
            <div className="flex flex-col lg:flex-row gap-16 items-center">
              <div className="w-full lg:w-1/2">
                <div className="text-[10px] font-black uppercase tracking-[0.5em] text-black/30 mb-8 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> HEAD COACH
                </div>
                <h2 className="text-7xl md:text-9xl font-black tracking-tighter leading-[0.8] mb-12 uppercase">
                  ÁLEX<br />PINTOR
                </h2>
                <div className="border-l-4 border-black/10 pl-8 space-y-6">
                  <p className="text-lg md:text-xl font-bold leading-relaxed max-w-lg">
                    "Transmitimos la táctica, la disciplina y la realidad del combate aprendida tras años dentro del cuadrilátero"
                  </p>
                  <p className="text-black/50 text-sm font-medium max-w-md">
                    Coach profesional con más de una década de experiencia competitiva en Boxeo y K1
                  </p>
                </div>
              </div>

              <div className="w-full lg:w-1/2 aspect-square md:aspect-video relative overflow-hidden bg-black group p-1 border-8 border-black">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/luOWGnr_SBU?autoplay=1&mute=1&loop=1&playlist=luOWGnr_SBU&start=115"
                  title="Álex Pintor en acción"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full object-cover scale-110 group-hover:scale-100 transition-all duration-1000 grayscale hover:grayscale-0"
                ></iframe>
              </div>
            </div>
          </div>
        </motion.section>



      </main>

      <Footer />
    </div>
  );
}
