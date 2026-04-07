"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { User, ShieldCheck, CalendarDays, LogOut, Loader2, Wallet } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LITERALS } from "@/constants/literals";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationPanel from "./NotificationPanel";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar({ isHome = false }: { isHome?: boolean }) {
  const { user, profile, isAdmin, logout: contextLogout, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    if (isHome) {
      window.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (isHome) window.removeEventListener("scroll", handleScroll);
    };
  }, [isHome]);

  const handleLogout = async () => {
    try {
      await contextLogout();
    } catch (e) {
      console.error("Error logging out", e);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  const profileName = profile?.name || "Usuario";
  const isLoggedIn = !!user;

  const styleClass = "px-5 py-3 md:px-12 backdrop-blur-xl bg-black/40 shadow-[0_10px_40px_rgba(0,0,0,0.3)]";

  const positionClass = isHome
    ? "absolute md:fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    : "relative w-full z-50 mb-6 md:mb-12";

  const sizeClass = "h-20 md:h-24";

  return (
    <nav className={`${positionClass} ${styleClass}`}>
      <div className={`flex items-center justify-between w-full max-w-7xl mx-auto transition-all duration-300 ${sizeClass}`}>

        {/* Left Side Links */}
        <div className="flex w-1/3 items-center">
          {!isHome && (
            <Link href="/" className="text-white/60 hover:text-white text-sm md:text-lg font-medium tracking-tight transition-colors">
              &lt; Atrás
            </Link>
          )}
        </div>

        {/* Center Logo */}
        <div className="flex w-1/3 justify-center">
          <Link href="/" className="relative group flex items-center justify-center">
            <div className={`relative transition-all duration-300 w-14 h-14 md:w-18 md:h-18`}>
              <Image
                src="/logo_boxing_profight.webp"
                alt="PROFIGHT Logo"
                fill
                className="rounded-full object-cover border border-white/20 shadow-xl"
              />
            </div>
          </Link>
        </div>

        {/* Right Side */}
        <div className="flex w-1/3 items-center justify-end gap-2 md:gap-4">
          {loading ? (
            <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse"></div>
          ) : isLoggedIn ? (
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Notificaciones Reales */}
              {!isAdmin && (
                <NotificationPanel />
              )}

              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none focus:outline-none">
                    <div className="flex items-center gap-2 md:gap-3 cursor-pointer hover:bg-white/10 pr-1 md:pr-1.5 pl-3 md:pl-4 py-1 rounded-full transition-all border border-white/5 hover:border-white/20 group">
                      <span className="font-semibold text-sm hidden sm:block truncate max-w-[120px] text-white/90 group-hover:text-white transition-colors">{profileName.split(' ')[0]}</span>
                      <Avatar className="h-9 w-9 md:h-10 md:w-10 border border-white/20 shadow-sm transition-transform group-hover:scale-105">
                        <AvatarFallback className="bg-zinc-800 text-white text-[10px] md:text-xs font-bold">{getInitials(profileName)}</AvatarFallback>
                      </Avatar>
                    </div>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="bg-zinc-950 border-white/10 text-white min-w-[200px] mt-2 rounded-xl p-2 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
                  <div className="px-2 py-2 mb-2 border-b border-white/10 sm:hidden">
                    <p className="font-bold text-sm truncate">{profileName}</p>
                  </div>

                  {isAdmin ? (
                    <>
                      <Link href="/sys-director">
                        <DropdownMenuItem className="cursor-pointer focus:bg-white/10 rounded-lg focus:text-white transition-colors py-2.5">
                          <ShieldCheck className="mr-3 h-4 w-4 text-white/40" />
                          <span className="font-medium">{LITERALS.NAVBAR.CONTROL_PANEL}</span>
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/sys-director/contabilidad">
                        <DropdownMenuItem className="cursor-pointer focus:bg-white/10 rounded-lg focus:text-white transition-colors py-2.5">
                          <Wallet className="mr-3 h-4 w-4 text-white/40" />
                          <span className="font-medium">{LITERALS.NAVBAR.ACCOUNTING}</span>
                        </DropdownMenuItem>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href="/perfil">
                        <DropdownMenuItem className="cursor-pointer focus:bg-white/10 rounded-lg focus:text-white transition-colors py-2.5">
                          <User className="mr-3 h-4 w-4 text-white/40" />
                          <span className="font-medium">{LITERALS.NAVBAR.MY_PROFILE}</span>
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/bookings">
                        <DropdownMenuItem className="cursor-pointer focus:bg-white/10 rounded-lg focus:text-white transition-colors py-2.5">
                          <CalendarDays className="mr-3 h-4 w-4 text-white/40" />
                          <span className="font-medium">{LITERALS.NAVBAR.BOOKINGS}</span>
                        </DropdownMenuItem>
                      </Link>
                    </>
                  )}

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer focus:bg-red-500/10 focus:text-red-400 text-red-500 transition-colors py-2.5 mt-1 border-t border-white/5 rounded-none rounded-b-lg"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    <span className="font-medium">{LITERALS.COMMON.LOGOUT}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
