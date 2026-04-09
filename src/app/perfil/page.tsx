"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ArrowRight, Clock, CheckCircle2, History as HistoryIcon, BicepsFlexed } from "lucide-react";
import AuthTransition from "@/components/AuthTransition";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { account } from "@/lib/appwrite";
import { updateStudentProfileAction, getPlatformOmniData } from "../sys-director/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { isCancellable } from "@/lib/bookingUtils";
import Navbar from "@/components/Navbar";
import { ProfileCard } from "./components/ProfileCard";
import { ProfileTabs } from "./components/ProfileTabs";
import { ProfileSettings } from "./components/ProfileSettings";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAuth } from "@/contexts/AuthContext";
import { LITERALS } from "@/constants/literals";

export default function StudentProfile() {
  const router = useRouter();
  const { 
    user, 
    profile: profileInfo, 
    loading: authLoading,
    userBookings,
    availableClasses: allPossibleClasses,
    refreshGlobalData
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState("resumen");
  const [isPending, startTransition] = useTransition();
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 📅 GESTIÓN DE PERIODOS (Oculto en Producción)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [overriddenProfile, setOverriddenProfile] = useState<any | null>(null);
  
  // 🛡️ DETECCIÓN DE ENTORNO (Prevención de Hydration Mismatch)
  const [isProduction, setIsProduction] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      setIsProduction(
        hostname === "boxingprofight.es" || 
        hostname === "www.boxingprofight.es" || 
        hostname === "boxing-profight.vercel.app" ||
        hostname === "boxingprofight.com"
      );
    }
  }, []);

  // Custom Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: "info" | "success" | "warning" | "danger";
    onConfirm: () => void | Promise<void>;
    showCancel?: boolean;
    confirmText?: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
    variant: "info",
    onConfirm: () => {},
  });

  const showAlert = (title: string, description: string, variant: "info" | "success" | "warning" | "danger" = "info") => {
    import("sonner").then(({ toast }) => {
      const type = variant === "danger" ? "error" : variant === "warning" ? "warning" : variant === "success" ? "success" : "info";
      toast[type](title, { description: description });
    });
  };

  const showConfirm = (title: string, description: string, onConfirm: () => Promise<boolean>, variant: "info" | "success" | "warning" | "danger" = "warning") => {
    setModalConfig({
        isOpen: true,
        title,
        description,
        variant,
        onConfirm: async () => {
            const success = await onConfirm();
            if (success) {
                setModalConfig(prev => ({ ...prev, isOpen: false }));
            }
        },
        showCancel: true,
        confirmText: "Confirmar"
    });
  };

  // 🌪️ PROCESAMIENTO DE DATOS GLOBAL (Sin peticiones extra)
  const { validUpcomingClasses } = useMemo(() => {
    const now = new Date();
    const msIn7Days = 7 * 24 * 60 * 60 * 1000;

    const upcoming = allPossibleClasses.filter((cls: any) => {
      try {
        const [year, month, day] = cls.date.substring(0, 10).split("-").map(Number);
        const startTime = cls.time.split('-')[0].trim();
        const [hours, minutes] = startTime.split(":").map(Number);
        const classDateTime = new Date(year, month - 1, day, hours, minutes);
        return classDateTime >= now && classDateTime.getTime() <= now.getTime() + msIn7Days;
      } catch { return false; }
    });

    return { validUpcomingClasses: upcoming };
  }, [allPossibleClasses, userBookings]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (profileInfo?.role === "admin") {
        router.push("/sys-director");
      }
    }
  }, [user, profileInfo, authLoading, router]);

  // Timer para límites de cancelación
  useEffect(() => {
    const timer = setInterval(() => {
        setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // 📅 CARGA DE DATOS POR MES (Gestión Auditoría)
  useEffect(() => {
    const currentActualMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    
    // Si volvemos al mes actual, limpiamos el override para usar los datos vivos de AuthContext
    if (selectedMonth === currentActualMonth) {
      setOverriddenProfile(null);
      return;
    }

    if (!user?.$id) return;

    const fetchMonthData = async () => {
      // Usamos isUpdating para mostrar un feedback visual sutil si fuera necesario
      try {
        const result = await getPlatformOmniData(user.$id, selectedMonth);
        if (result.success && result.data) {
          setOverriddenProfile(result.data.profile);
        }
      } catch (err) {
        console.error("[Profile] Error al cargar datos del mes:", err);
      }
    };

    fetchMonthData();
  }, [selectedMonth, user?.$id]);



  const handleUpdatePhone = async (newPhone: string) => {
    if (isUpdating || isPending) return;
    try {
      setIsUpdating(true);
      const result = await updateStudentProfileAction(profileInfo.$id, {
        phone: newPhone
      });
      if (result.success) {
        showAlert("Éxito", "Teléfono actualizado correctamente.", "success");
      } else {
        showAlert("Error", result.error || "No se ha podido actualizar el teléfono.", "danger");
      }
    } catch (err) {
      showAlert("Error", "No se ha podido actualizar el teléfono.", "danger");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (oldPass: string, newPass: string) => {
    if (isUpdating || isPending) return;
    try {
      setIsUpdating(true);
      await account.updatePassword(newPass, oldPass);
      showAlert("Éxito", "Contraseña actualizada correctamente.", "success");
    } catch (err: any) {
      console.error(err);
      if (err.code === 401) throw new Error("La contraseña actual es incorrecta.");
      throw new Error("No se ha podido cambiar la contraseña. Inténtalo más tarde.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading || !user || profileInfo?.role === "admin") {
    return <AuthTransition message="Calculando área de acceso..." subMessage="Sincronizando seguridad" />;
  }

  const initials = profileInfo?.name 
    ? `${profileInfo.name.charAt(0)}${profileInfo.last_name?.charAt(0) || profileInfo.name.charAt(1) || ""}`.toUpperCase()
    : user?.name ? user.name.substring(0, 2).toUpperCase() : "US";

  return (
    <div className="dark min-h-screen bg-black text-white font-sans flex flex-col relative w-full text-center md:text-left">
      <Navbar isHome={false} />

      <main className="flex-1 w-full max-w-[1400px] mx-auto pt-1 md:pt-2 lg:pt-3 px-6 md:px-8 lg:px-12 pb-12 z-10">
        <Tabs defaultValue="resumen" className="w-full" onValueChange={setActiveTab}>
          <div className="flex flex-col gap-4">
            <ProfileTabs />

            <AnimatePresence mode="wait">
              <TabsContent key="resumen" value="resumen" className="focus-visible:outline-none focus:outline-none outline-none">
                
                {/* 📅 Selector de Periodo de Gestión (Solo visible en entornos NO-Producción) */}
                {!isProduction && (
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <HistoryIcon className="w-4 h-4 text-emerald-500" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500">Periodo de Gestión</h3>
                      </div>
                      <p className="text-white/40 text-[10px] uppercase font-bold tracking-tight">Auditoría: Consulta y valida pagos de cualquier mes.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-black/60 border border-white/10 text-white font-black uppercase tracking-widest p-3 rounded-xl outline-none focus:border-emerald-500/50 transition-all cursor-pointer min-w-[220px] text-xs"
                      >
                        {Array.from({ length: 24 }).map((_, i) => {
                          const d = new Date();
                          d.setDate(1);
                          d.setMonth(d.getMonth() - 12 + i);
                          const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                          const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                          return <option key={val} value={val} className="bg-zinc-900 border-none">{label}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                )}

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                  <div className="lg:col-span-4 space-y-6">
                    <ProfileCard user={user} profileInfo={overriddenProfile || profileInfo} initials={initials} />
                  </div>

                  <div className="lg:col-span-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="bg-white/5 border-white/5 hover:border-white/10 transition-colors">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Clases de esta semana
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-4xl font-black">{validUpcomingClasses.filter(c => userBookings.some((b: any) => b.class_id === c.$id)).length}</div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-lg font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-emerald-500" /> Próxima Cita</h4>
                      {validUpcomingClasses.filter(c => userBookings.some((b: any) => b.class_id === c.$id)).length > 0 ? (
                        <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden group">
                          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                             <BicepsFlexed className="w-40 h-40 text-emerald-400" />
                          </div>
                          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <Badge className="bg-emerald-500 text-black font-black uppercase">CONFIRMADA</Badge>
                                <span className="text-emerald-400 font-bold text-sm tracking-widest uppercase">
                                  {validUpcomingClasses.filter(c => userBookings.some((b: any) => b.class_id === c.$id))[0].name}
                                </span>
                              </div>
                              <h5 className="text-3xl font-black tracking-tighter mb-1">
                                {validUpcomingClasses.filter(c => userBookings.some((b: any) => b.class_id === c.$id))[0].coach}
                              </h5>
                              <p className="text-white/60 font-medium truncate max-w-[250px]">
                                {new Date(validUpcomingClasses.filter(c => userBookings.some((b: any) => b.class_id === c.$id))[0].date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                {" - "}
                                {validUpcomingClasses.filter(c => userBookings.some((b: any) => b.class_id === c.$id))[0].time.split('-')[0].trim()}
                              </p>
                            </div>
                            <Link href="/bookings">
                              <Button className="bg-white text-black hover:bg-emerald-500 hover:text-white font-black px-8 h-14 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.1)] group transition-all">
                                VER RESERVAS <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <Card className="bg-white/[0.02] border-dashed border-white/10 rounded-2xl py-12 flex flex-col items-center justify-center text-center">
                          <Calendar className="w-12 h-12 text-white/10 mb-4" />
                          <p className="text-white/40 font-medium mb-6">No tienes ninguna clase reservada para esta semana.</p>
                          <Link href="/bookings">
                            <Button className="bg-emerald-500 text-black hover:bg-emerald-400 font-black px-8 py-6 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 h-14">
                                RESERVAR AHORA <Calendar className="w-5 h-5" />
                            </Button>
                          </Link>
                        </Card>
                      )}
                    </div>
                  </div>
                </motion.div>
              </TabsContent>



              <TabsContent key="ajustes" value="ajustes" className="focus-visible:outline-none">
                <ProfileSettings 
                  profileInfo={profileInfo} 
                  onUpdatePhone={handleUpdatePhone}
                  onChangePassword={handleChangePassword}
                  isUpdating={isPending || isUpdating}
                />
              </TabsContent>
            </AnimatePresence>
          </div>
        </Tabs>
      </main>
      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        onOpenChange={(open) => !isPending && setModalConfig(prev => ({ ...prev, isOpen: open }))}
        title={modalConfig.title}
        description={modalConfig.description}
        variant={modalConfig.variant}
        onConfirm={modalConfig.onConfirm}
        showCancel={modalConfig.showCancel && !isPending}
        confirmText={modalConfig.confirmText}
        isLoading={isPending}
      />
    </div>
  );
}
