"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ArrowRight, Clock, CheckCircle2, History as HistoryIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { account, databases, DATABASE_ID, COLLECTION_PROFILES, COLLECTION_CLASSES, COLLECTION_BOOKINGS, COLLECTION_PAYMENTS, client } from "@/lib/appwrite";
import { Query, ID } from "appwrite";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { isCancellable } from "@/lib/bookingUtils";
import Navbar from "@/components/Navbar";
import { ProfileCard } from "./components/ProfileCard";
import { ProfileTabs } from "./components/ProfileTabs";
import { ProfileSettings } from "./components/ProfileSettings";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function StudentProfile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profileInfo, setProfileInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("resumen");

  // Real-time Class & Booking States
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [pastClasses, setPastClasses] = useState<any[]>([]);
  const [isProcessingBooking, setIsProcessingBooking] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    setModalConfig({
        isOpen: true,
        title,
        description,
        variant,
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
        showCancel: false,
        confirmText: "Entendido"
    });
  };

  const showConfirm = (title: string, description: string, onConfirm: () => void | Promise<void>, variant: "info" | "success" | "warning" | "danger" = "warning") => {
    setModalConfig({
        isOpen: true,
        title,
        description,
        variant,
        onConfirm: async () => {
            await onConfirm();
            setModalConfig(prev => ({ ...prev, isOpen: false }));
        },
        showCancel: true,
        confirmText: "Confirmar"
    });
  };

  useEffect(() => {
    let unsubscribe: () => void;

    const loadData = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const currentUser = await account.get();
        setUser(currentUser);

        // Fetch all primary data
        const [profile, bookingsData, classesData] = await Promise.all([
          databases.getDocument(DATABASE_ID, COLLECTION_PROFILES, currentUser.$id),
          databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [Query.equal("student_id", currentUser.$id), Query.limit(100)]),
          databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [Query.limit(100), Query.orderAsc("date")])
        ]);

        // PASO 3: Verificar pago en la nueva tabla payments
        const d = new Date();
        const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        
        const paymentsData = await databases.listDocuments(DATABASE_ID, COLLECTION_PAYMENTS, [
          Query.equal("student_id", currentUser.$id),
          Query.equal("month", currentMonthStr),
          Query.limit(1)
        ]);

        // Enriquecemos el perfil con el estado de pago real
        const profileWithPayment = {
          ...profile,
          is_paid: paymentsData.total > 0
        };

        if (profile.role === "admin") {
          router.push("/sys-director");
          return;
        }

        const now = new Date();
        const msIn7Days = 7 * 24 * 60 * 60 * 1000;

        // Process Classes: Upcoming
        const validUpcomingClasses = classesData.documents.filter((cls: any) => {
          try {
            const [year, month, day] = cls.date.substring(0, 10).split("-").map(Number);
            const startTime = cls.time.split('-')[0].trim();
            const [hours, minutes] = startTime.split(":").map(Number);
            const classDateTime = new Date(year, month - 1, day, hours, minutes);
            return classDateTime >= now && classDateTime.getTime() <= now.getTime() + msIn7Days;
          } catch { return false; }
        });

        // Process Classes: Past
        const attendedClasses = classesData.documents.filter((cls: any) => {
          try {
            const [year, month, day] = cls.date.substring(0, 10).split("-").map(Number);
            const startTime = cls.time.split('-')[0].trim();
            const [hours, minutes] = startTime.split(":").map(Number);
            const classDateTime = new Date(year, month - 1, day, hours, minutes);
            return classDateTime < now && bookingsData.documents.some((b: any) => b.class_id === cls.$id);
          } catch { return false; }
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setAvailableClasses(validUpcomingClasses);
        setPastClasses(attendedClasses);
        setUserBookings(bookingsData.documents);
        setProfileInfo(profileWithPayment);
        setLoading(false);

        // 🟢 TIEMPO REAL: Suscripción a cambios
        if (!unsubscribe) {
          unsubscribe = client.subscribe([
            `databases.${DATABASE_ID}.collections.${COLLECTION_PROFILES}.documents.${currentUser.$id}`,
            `databases.${DATABASE_ID}.collections.${COLLECTION_CLASSES}.documents`,
            `databases.${DATABASE_ID}.collections.${COLLECTION_BOOKINGS}.documents`,
            `databases.${DATABASE_ID}.collections.${COLLECTION_PAYMENTS}.documents`
          ], (response) => {
            if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
            refreshTimeoutRef.current = setTimeout(() => {
              loadData(true);
            }, 800);
          });
        }

      } catch (error: any) {
        setLoading(false);
        if (error.code === 401 || error.code === 403) {
          router.push("/login?redirect=/perfil");
        } else {
          console.error("Critical error in loadData:", error);
        }
      }
    };

    loadData();

    // Timer for cancellation limits
    const timer = setInterval(() => {
        setCurrentTime(new Date());
    }, 10000);

    return () => {
      if (unsubscribe) unsubscribe();
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      clearInterval(timer);
    };
  }, [router]);

  const handleCancelBooking = async (classObj: any) => {
    // Check strict cancellation policy: at least 1 minute before
    if (!isCancellable(classObj.date, classObj.time, new Date())) {
        showAlert("Acción Prohibida", "Por política del club, solo se puede cancelar hasta 1 minuto antes del inicio de la clase.", "warning");
        return;
    }

    showConfirm(
        "Cancelar Reserva", 
        "¿Seguro que quieres cancelar tu plaza en esta clase? Esta acción liberará el sitio para otro compañero.",
        async () => {
            try {
              setIsProcessingBooking(classObj.$id);
        
              // Find the specific booking document id for this class and user
              const bookingToCancel = userBookings.find((b: any) => b.class_id === classObj.$id);
              if (!bookingToCancel) return;
        
              const freshClass = await databases.getDocument(DATABASE_ID, COLLECTION_CLASSES, classObj.$id);
        
              // Free the slot
              await databases.updateDocument(DATABASE_ID, COLLECTION_CLASSES, classObj.$id, {
                registeredCount: Math.max(0, freshClass.registeredCount - 1)
              });
        
              // Remove from Bookings collection database
              await databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, bookingToCancel.$id);
        
              // Update UI 
              setUserBookings(prev => prev.filter((b: any) => b.$id !== bookingToCancel.$id));
              setAvailableClasses(prev => prev.map(c =>
                c.$id === classObj.$id ? { ...c, registeredCount: Math.max(0, c.registeredCount - 1) } : c
              ));
              showAlert("Éxito", "Reserva cancelada correctamente.", "success");
            } catch (err: any) {
              if (err.code !== 404) {
                showAlert("Error", "No se ha podido cancelar la reserva.", "danger");
                console.error(err);
              }
            } finally {
              setIsProcessingBooking(null);
            }
        },
        "danger"
    );
  };

  const handleUpdatePhone = async (newPhone: string) => {
    try {
      setIsUpdating(true);
      await databases.updateDocument(DATABASE_ID, COLLECTION_PROFILES, profileInfo.$id, {
        phone: newPhone
      });
      setProfileInfo({ ...profileInfo, phone: newPhone });
      showAlert("Éxito", "Teléfono actualizado correctamente.", "success");
    } catch (err) {
      showAlert("Error", "No se ha podido actualizar el teléfono.", "danger");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (oldPass: string, newPass: string) => {
    try {
      setIsUpdating(true);
      await account.updatePassword(newPass, oldPass);
      showAlert("Éxito", "Contraseña actualizada correctamente.", "success");
    } catch (err: any) {
      console.error(err);
      if (err.code === 401) {
        throw new Error("La contraseña actual es incorrecta.");
      }
      throw new Error("No se ha podido cambiar la contraseña. Inténtalo más tarde.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {

    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  // Get user initials for Avatars
  // 🟢 Cálculo de iniciales basado en el perfil de la base de datos (prioridad)
  const initials = profileInfo?.name 
    ? `${profileInfo.name.charAt(0)}${profileInfo.last_name?.charAt(0) || profileInfo.name.charAt(1) || ""}`.toUpperCase()
    : user?.name ? user.name.substring(0, 2).toUpperCase() : "US";


  return (
    <div className="dark min-h-screen bg-black text-white font-sans flex flex-col relative w-full">
      <Navbar isHome={false} />

      <main className="flex-1 w-full max-w-[1400px] mx-auto pt-4 md:pt-6 lg:pt-8 px-6 md:px-8 lg:px-12 pb-12 z-10">
        <Tabs defaultValue="resumen" className="w-full" onValueChange={setActiveTab}>
          <div className="flex flex-col gap-8">
            {/* Tabs List at the top */}
            <ProfileTabs />

            <AnimatePresence mode="wait">
              {/* Resumen Tab */}
              <TabsContent key="resumen" value="resumen" className="focus-visible:outline-none focus:outline-none outline-none">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }} 
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12"
                >
                  {/* Left part: Profile Information */}
                  <div className="lg:col-span-4 space-y-6">
                    <ProfileCard user={user} profileInfo={profileInfo} initials={initials} />
                  </div>

                  {/* Right part: Summary Cards & Next Class */}
                  <div className="lg:col-span-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="bg-white/5 border-white/5 hover:border-white/10 transition-colors">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Clases de esta semana
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-4xl font-black">{availableClasses.filter(c => userBookings.some((b: any) => b.class_id === c.$id)).length}</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-white/5 border-white/5 hover:border-white/10 transition-colors">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                            <HistoryIcon className="w-4 h-4 text-emerald-400" /> Total asistidas
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-4xl font-black">{pastClasses.length}</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Proxima Clase Destacada */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-emerald-500" /> Próxima Cita</h4>
                      {availableClasses.filter(c => userBookings.some((b: any) => b.class_id === c.$id)).length > 0 ? (
                        <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden group">
                          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <BicepsFlexed className="w-40 h-40 text-emerald-400" />
                          </div>
                          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <Badge className="bg-emerald-500 text-black font-black uppercase">CONFIRMADA</Badge>
                                <span className="text-emerald-400 font-bold text-sm tracking-widest uppercase">
                                  {availableClasses.filter(c => userBookings.some((b: any) => b.class_id === c.$id))[0].name}
                                </span>
                              </div>
                              <h5 className="text-3xl font-black tracking-tighter mb-1">
                                {availableClasses.filter(c => userBookings.some((b: any) => b.class_id === c.$id))[0].coach}
                              </h5>
                              <p className="text-white/60 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                                {new Date(availableClasses.filter(c => userBookings.some((b: any) => b.class_id === c.$id))[0].date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                {" - "}
                                {availableClasses.filter(c => userBookings.some((b: any) => b.class_id === c.$id))[0].time.split('-')[0].trim()}
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

              {/* Clases Tab */}
              <TabsContent key="clases" value="clases" className="focus-visible:outline-none">
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-12">
                  {/* Próximas */}
                  <div className="space-y-6">
                    <h4 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-3">
                      <span className="w-8 h-1 bg-emerald-500 rounded-full" /> Próximas Sesiones
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      {availableClasses.filter(c => userBookings.some((b: any) => b.class_id === c.$id)).length === 0 ? (
                        <div className="text-white/30 italic text-sm py-4">No hay reservas activas.</div>
                      ) : (
                        availableClasses.filter(c => userBookings.some((b: any) => b.class_id === c.$id)).map(cls => (
                          <div key={cls.$id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-center gap-4 hover:border-emerald-500/30 transition-colors">
                            <div className="flex items-center gap-6">
                              <div className={`p-4 rounded-xl ${cls.name === 'Boxeo' ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'} font-black text-xs`}>
                                {cls.name.toUpperCase()}
                              </div>
                              <div>
                                <h6 className="font-black text-xl">{cls.coach}</h6>
                                <p className="text-white/40 text-sm font-medium">
                                  {new Date(cls.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()} • {cls.time.split('-')[0].trim()}
                                </p>
                              </div>
                            </div>
                            {isCancellable(cls.date, cls.time, currentTime) && (
                              <Button
                                onClick={() => handleCancelBooking(cls)}
                                disabled={isProcessingBooking === cls.$id}
                                variant="ghost"
                                className="text-red-400/50 hover:text-red-400 hover:bg-red-400/10 font-bold px-6"
                              >
                                {isProcessingBooking === cls.$id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancelar"}
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Historial */}
                  <div className="space-y-6">
                    <h4 className="text-xl font-black uppercase tracking-widest text-white/40 flex items-center gap-3">
                      <span className="w-8 h-1 bg-white/10 rounded-full" /> Historial de Asistencia
                    </h4>
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                      {pastClasses.length === 0 ? (
                        <div className="p-12 text-center text-white/20 italic">Aún no has asistido a ninguna clase.</div>
                      ) : (
                        <div className="divide-y divide-white/5">
                          {pastClasses.map(cls => (
                            <div key={cls.$id} className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                              <div className="flex items-center gap-4">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500/40" />
                                <div>
                                  <span className="text-sm font-bold block">{cls.coach}</span>
                                  <span className="text-[10px] text-white/30 uppercase font-black">{cls.name}</span>
                                </div>
                              </div>
                              <span className="text-xs text-white/40 font-medium">
                                {new Date(cls.date).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </TabsContent>

              {/* Ajustes Tab */}
              <TabsContent key="ajustes" value="ajustes" className="focus-visible:outline-none">
                <ProfileSettings 
                  profileInfo={profileInfo} 
                  onUpdatePhone={handleUpdatePhone}
                  onChangePassword={handleChangePassword}
                  isUpdating={isUpdating}
                />
              </TabsContent>
            </AnimatePresence>
          </div>
        </Tabs>
      </main>
      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        onOpenChange={(open) => setModalConfig(prev => ({ ...prev, isOpen: open }))}
        title={modalConfig.title}
        description={modalConfig.description}
        variant={modalConfig.variant}
        onConfirm={modalConfig.onConfirm}
        showCancel={modalConfig.showCancel}
        confirmText={modalConfig.confirmText}
      />
    </div>
  );
}

function BicepsFlexed({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12.42 17.10c-.96.39-1.85.73-2.73.96-1.58.41-3.23.11-4.66-.82-1.34-.87-2.22-2.31-2.43-3.95-.24-1.8.31-3.56 1.48-4.88 1.15-1.3 2.76-2 4.47-1.92 1.62.08 3.12.83 4.14 2.06.49-.07.98-.11 1.47-.11 3.73 0 6.84 2.82 7.15 6.31.06.72-.04 1.45-.3 2.13l-1.61-2.11" />
      <path d="M9 14.5c.33-.33.74-.5 1.1-.37.36.13.62.53.62.94 0 .41-.26.81-.62.94-.36.13-.77-.04-1.1-.37Z" />
      <path d="M16 8.5c.33-.33.74-.5 1.1-.37.36.13.62.53.62.94 0 .41-.26.81-.62.94-.36.13-.77-.04-1.1-.37Z" />
    </svg>
  );
}
