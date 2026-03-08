"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? "px-5 py-3 md:px-12 backdrop-blur-xl bg-black/60 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
          : "px-5 py-5 md:px-16 md:py-8 bg-transparent border-b border-transparent"
        }`}
    >
      <div className="flex items-center justify-between w-full">
        {/* Left Side Links */}
        <div className="flex w-1/3 items-center">
          <div className="hidden md:flex items-center space-x-12 text-2xl font-semibold text-white/80">
            <Link href="#classes" className="hover:text-white transition-colors">
              Clases y Horarios
            </Link>
          </div>
        </div>

        {/* Center Logo */}
        <div className="flex w-1/3 justify-center">
          <Link href="/" className="relative group flex items-center justify-center">
            <div className={`absolute inset-0 bg-white/20 blur-2xl rounded-full transition-opacity duration-300 opacity-0 group-hover:opacity-100 ${scrolled ? 'scale-75' : 'scale-100'}`} />
            <div className={`relative transition-all duration-300 ${scrolled ? 'w-12 h-12 md:w-20 md:h-20' : 'w-16 h-16 md:w-36 md:h-36'}`}>
              <Image
                src="/logo_boxing_profight.webp"
                alt="PROFIGHT Logo"
                fill
                className="rounded-full object-cover border-2 border-white/20"
              />
            </div>
          </Link>
        </div>

        {/* Right Side Links & Button */}
        <div className="flex w-1/3 items-center justify-end space-x-2 md:space-x-10">
          <div className="hidden md:flex items-center space-x-10">
            <Link href="/perfil" className="text-2xl font-semibold text-white/80 hover:text-white transition-colors">
              Perfil
            </Link>
            <Link href="/admin" className="text-2xl font-semibold text-white/80 hover:text-white transition-colors">
              Admin
            </Link>
          </div>
          <Link
            href="/login"
            className={`inline-flex shrink-0 items-center justify-center bg-white/10 text-white backdrop-blur-lg hover:bg-white/20 border border-white/20 rounded-full transition-all duration-300 font-bold
              ${scrolled
                ? 'px-4 py-2 text-xs md:px-8 md:py-3 md:text-lg h-8 md:h-10'
                : 'px-5 py-2.5 text-sm md:px-10 md:py-8 md:text-2xl h-10 md:h-16'
              }`}
          >
            Reservar
          </Link>
        </div>
      </div>
    </nav>
  );
}
