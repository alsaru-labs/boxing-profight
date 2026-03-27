"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { account, databases, DATABASE_ID, COLLECTION_PROFILES } from "@/lib/appwrite";
import { Bell, LogOut, User, ShieldCheck, CalendarDays } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar({ isHome = false }: { isHome?: boolean }) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    // Only bind scroll events eagerly if we are on Home page
    if (isHome) {
      window.addEventListener("scroll", handleScroll);
    }

    const checkUserRole = async () => {
      try {
        const currentUser = await account.get();
        setIsLoggedIn(true);
        const profile = await databases.getDocument(
          DATABASE_ID,
          COLLECTION_PROFILES,
          currentUser.$id
        );
        setIsAdmin(profile.role === "admin");
        setProfileName(profile.name || "Usuario");
      } catch (error) {
        setIsLoggedIn(false);
        setIsAdmin(false);
      } finally {
        setRoleLoading(false);
      }
    };

    checkUserRole();
    return () => {
      if (isHome) window.removeEventListener("scroll", handleScroll);
    };
  }, [isHome]);

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      router.push("/login");
    } catch (e) {
      console.error("Error logging out", e);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  // Visual appearance now completely unified
  const styleClass = "px-5 py-3 md:px-12 backdrop-blur-xl bg-black/40 shadow-[0_10px_40px_rgba(0,0,0,0.3)]";

  const positionClass = isHome
    ? "absolute md:fixed top-0 left-0 right-0 z-50 transition-all duration-300" // Overlay for home
    : "relative w-full z-50 mb-6 md:mb-12"; // Flow in internal views

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
          {roleLoading ? (
            <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse"></div>
          ) : isLoggedIn ? (
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Notificaciones Mock */}
              <button className="relative p-2.5 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center text-white/80 hover:text-white">
                <Bell className="w-6 h-6 md:w-5 md:h-5" />
                <span className="absolute top-1.5 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none focus:outline-none">
                  <div className="flex items-center gap-2 md:gap-3 cursor-pointer hover:bg-white/5 pr-1 md:pr-4 pl-1 py-1 rounded-full transition-colors border border-transparent hover:border-white/10">
                    <span className="font-semibold text-sm hidden sm:block truncate max-w-[120px] ml-2 text-white/90">{profileName.split(' ')[0]}</span>
                    <Avatar className="h-10 w-10 border border-white/20 shadow-sm">
                      <AvatarFallback className="bg-zinc-800 text-white text-xs font-bold">{getInitials(profileName)}</AvatarFallback>
                    </Avatar>
                  </div>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="bg-zinc-950 border-white/10 text-white min-w-[200px] mt-2 rounded-xl p-2 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
                  <div className="px-2 py-2 mb-2 border-b border-white/10 sm:hidden">
                    <p className="font-bold text-sm truncate">{profileName}</p>
                  </div>

                  {isAdmin ? (
                    <Link href="/sys-director">
                      <DropdownMenuItem className="cursor-pointer focus:bg-white/10 rounded-lg focus:text-white transition-colors py-2.5">
                        <ShieldCheck className="mr-3 h-4 w-4 text-amber-400" />
                        <span className="font-medium">Panel de Control</span>
                      </DropdownMenuItem>
                    </Link>
                  ) : (
                    <>
                      <Link href="/perfil">
                        <DropdownMenuItem className="cursor-pointer focus:bg-white/10 rounded-lg focus:text-white transition-colors py-2.5">
                          <User className="mr-3 h-4 w-4 text-emerald-400" />
                          <span className="font-medium">Mi Perfil</span>
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/bookings">
                        <DropdownMenuItem className="cursor-pointer focus:bg-white/10 rounded-lg focus:text-white transition-colors py-2.5">
                          <CalendarDays className="mr-3 h-4 w-4 text-blue-400" />
                          <span className="font-medium">Reservas</span>
                        </DropdownMenuItem>
                      </Link>
                    </>
                  )}

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer focus:bg-red-500/10 focus:text-red-400 text-red-500 transition-colors py-2.5 mt-1 border-t border-white/5 rounded-none rounded-b-lg"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    <span className="font-medium">Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Link
              href="/login?redirect=/bookings"
              className={`inline-flex items-center justify-center bg-white text-black hover:bg-neutral-200 border border-transparent rounded-full font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all hover:scale-105 h-10 md:h-12 px-6 md:px-10 text-sm md:text-base`}
            >
              Reservar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
