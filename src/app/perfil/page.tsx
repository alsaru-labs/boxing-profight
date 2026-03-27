"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, CreditCard, CalendarClock, History, Settings, LogOut, ArrowLeft, ShieldAlert, CheckCircle2, XCircle, Activity, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { account, databases, DATABASE_ID, COLLECTION_PROFILES, COLLECTION_CLASSES, COLLECTION_BOOKINGS, client } from "@/lib/appwrite";
import { Query, ID } from "appwrite";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Navbar from "@/components/Navbar";
import ConfirmedClasses from "@/components/ConfirmedClasses";

export default function StudentProfile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profileInfo, setProfileInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Real-time Class & Booking States
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [pastClasses, setPastClasses] = useState<any[]>([]);
  const [isProcessingBooking, setIsProcessingBooking] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: () => void;

    const loadData = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser);

        // Fetch all primary data
        const [profile, bookingsData, classesData] = await Promise.all([
          databases.getDocument(DATABASE_ID, COLLECTION_PROFILES, currentUser.$id),
          databases.listDocuments(DATABASE_ID, COLLECTION_BOOKINGS, [Query.equal("student_id", currentUser.$id), Query.limit(100)]),
          databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [Query.limit(100), Query.orderAsc("date")])
        ]);

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
        setProfileInfo(profile);
        setLoading(false);

        // 🟢 TIEMPO REAL: Suscripción a cambios
        unsubscribe = client.subscribe([
          `databases.${DATABASE_ID}.collections.${COLLECTION_PROFILES}.documents.${currentUser.$id}`,
          `databases.${DATABASE_ID}.collections.${COLLECTION_CLASSES}.documents`,
          `databases.${DATABASE_ID}.collections.${COLLECTION_BOOKINGS}.documents`
        ], (response) => {
          loadData(); // Refrescamos todo si hay cambios en mis datos o en las clases generales
        });

      } catch (error) {
        router.push("/login?redirect=/perfil");
      }
    };

    loadData();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [router]);

  const handleBookClass = async (classObj: any) => {
    try {
      setIsProcessingBooking(classObj.$id);

      // 1. Verify class still has space in DB acting as single truth
      const freshClass = await databases.getDocument(DATABASE_ID, COLLECTION_CLASSES, classObj.$id);
      if (freshClass.registeredCount >= freshClass.capacity) {
        alert("¡Lo sentimos! Las plazas para esta clase se acaban de llenar.");
        return;
      }

      // 2. Increment Registered Count locally and remotely
      await databases.updateDocument(DATABASE_ID, COLLECTION_CLASSES, classObj.$id, {
        registeredCount: freshClass.registeredCount + 1
      });

      // 3. Save directly to Bookings Collection table
      const newBooking = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_BOOKINGS,
        ID.unique(),
        {
          student_id: user.$id,
          class_id: classObj.$id
        }
      );

      // 4. Update UI State without reloading
      setUserBookings(prev => [...prev, newBooking]);
      setAvailableClasses(prev => prev.map(c =>
        c.$id === classObj.$id ? { ...c, registeredCount: c.registeredCount + 1 } : c
      ));

    } catch (err: any) {
      alert("Error al intentar realizar la reserva. Inténtalo de nuevo.");
      console.error(err);
    } finally {
      setIsProcessingBooking(null);
    }
  };

  const handleCancelBooking = async (classObj: any) => {
    if (!window.confirm("¿Seguro que quieres cancelar tu plaza en esta clase?")) return;

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

    } catch (err: any) {
      alert("Error al cancelar la reserva.");
      console.error(err);
    } finally {
      setIsProcessingBooking(null);
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
  const initials = user?.name ? user.name.substring(0, 2).toUpperCase() : "US";

  return (
    <div className="dark min-h-screen bg-black text-white font-sans flex flex-col relative w-full">
      {/* Background glow effects */}
      <div className="absolute inset-0 z-0 opacity-80 mix-blend-screen pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-gradient-to-bl from-zinc-800/40 via-stone-900/20 to-black rounded-full blur-[100px]" />
      </div>

      <Navbar isHome={false} />

      {/* Main Panel */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-12 z-10 px-6">

        <div className="mb-10">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">Mi Área Personal</h1>
          <p className="text-white/50 text-lg">Consulta tus reservas, estado de pago y ajusta tus preferencias.</p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 p-2 mb-8 rounded-2xl flex flex-col md:flex-row w-full md:inline-flex md:w-auto h-auto gap-3">
            <TabsTrigger
              value="overview"
              className="py-3 text-base font-semibold w-full md:w-auto rounded-xl text-white/60 hover:text-white hover:bg-white/10 data-active:bg-white data-active:text-black dark:data-active:bg-white dark:data-active:text-black data-active:hover:bg-neutral-200 data-active:hover:text-black dark:data-active:hover:bg-neutral-200 dark:data-active:hover:text-black data-active:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all"
            >
              Datos Generales
            </TabsTrigger>
            <TabsTrigger
              value="classes"
              className="py-3 text-base font-semibold w-full md:w-auto rounded-xl text-white/60 hover:text-white hover:bg-white/10 data-active:bg-white data-active:text-black dark:data-active:bg-white dark:data-active:text-black data-active:hover:bg-neutral-200 data-active:hover:text-black dark:data-active:hover:bg-neutral-200 dark:data-active:hover:text-black data-active:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all"
            >
              Datos de las clases
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="py-3 text-base font-semibold w-full md:w-auto rounded-xl text-white/60 hover:text-white hover:bg-white/10 data-active:bg-white data-active:text-black dark:data-active:bg-white dark:data-active:text-black data-active:hover:bg-neutral-200 data-active:hover:text-black dark:data-active:hover:bg-neutral-200 dark:data-active:hover:text-black data-active:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all"
            >
              Ajustes de Cuenta
            </TabsTrigger>
          </TabsList>

          {/* TAB: Resumen */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Payment Status Card - Prominent design */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl lg:col-span-2 overflow-hidden relative group">
                {/* Glow behind payment status */}
                <div
                  className={`absolute -inset-1 blur-2xl opacity-50 block transition-colors duration-1000 ${profileInfo?.is_paid
                    ? "bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-transparent"
                    : "bg-gradient-to-r from-red-500/0 via-red-500/10 to-transparent"
                    }`}
                />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-white font-semibold flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-white/60" />
                      Estado de tu Cuota
                    </CardTitle>
                    {profileInfo?.is_paid ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-medium px-3 py-1 text-sm border-0 flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        <CheckCircle2 className="w-4 h-4" /> Al día
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium px-3 py-1 text-sm border-0 flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse">
                        <XCircle className="w-4 h-4" /> Pago Pendiente
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 pb-6">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <p className="text-white/50 text-sm mb-1">Plan Actual</p>
                      <p className="text-3xl font-bold text-white tracking-tight">
                        Tarifa Completa <span className="text-lg text-white/40 ml-2 font-medium">/ 55€ mes</span>
                      </p>
                      {profileInfo?.payment_method && profileInfo?.is_paid && (
                        <p className="text-emerald-400/80 text-xs mt-2 uppercase tracking-widest font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Abonado vía {profileInfo.payment_method}
                        </p>
                      )}
                    </div>
                    <div className="bg-black/30 p-3 rounded-lg border border-white/5 flex flex-col justify-center items-center text-center px-6 shadow-inner">
                      <p className="text-sm font-medium text-white/60">Aviso</p>
                      <p className={`text-lg font-bold tracking-wide mt-1 ${profileInfo?.is_paid ? 'text-white' : 'text-red-400'}`}>
                        {profileInfo?.is_paid ? "Todo correcto" : "Acude a recepción"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-white font-semibold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-white/60" /> {/* Needs Activity icon import */}
                    Tus Estadísticas
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <div className="flex flex-col">
                        <span className="text-white/60">Clases completadas</span>
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">Ya pasadas</span>
                      </div>
                      <span className="text-3xl font-bold text-white">{pastClasses.length}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-white/60">Reservas Activas</span>
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">Próximas</span>
                      </div>
                      <span className="text-2xl font-bold text-emerald-400">
                        {userBookings.length - pastClasses.length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: Clases */}
          <TabsContent value="classes" className="space-y-12 focus:outline-none focus:ring-0">
            {/* Mis Reservas (Ya confirmadas) */}
            <ConfirmedClasses
              availableClasses={availableClasses}
              userBookings={userBookings}
              isProcessingBooking={isProcessingBooking}
              handleCancelBooking={handleCancelBooking}
            />

            {/* Historial de Asistencia */}
            <div className="space-y-4 pt-8 border-t border-white/10">
              <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <History className="w-5 h-5 text-white/40" /> Historial de clases
              </h3>
              <Card className="bg-transparent border-white/5 overflow-hidden">
                <Table>
                  <TableHeader className="bg-black/40">
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-white/50">Disciplina</TableHead>
                      <TableHead className="text-white/50">Fecha</TableHead>
                      <TableHead className="text-white/50">Instructor</TableHead>
                      <TableHead className="text-right text-white/50">Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastClasses.length === 0 ? (
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableCell colSpan={4} className="text-center text-white/50 h-24">
                          Todavía no has asistido a ninguna clase.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pastClasses.map((cls) => (
                        <TableRow key={cls.$id} className="border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell className="font-medium text-white/80">{cls.name}</TableCell>
                          <TableCell className="text-white/60">
                            {new Date(cls.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} a las {cls.time.split('-')[0].trim()}
                          </TableCell>
                          <TableCell className="text-white/60">{cls.coach}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                              Asistido
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: Ajustes */}
          <TabsContent value="settings" className="space-y-6 focus:outline-none focus:ring-0">
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-white/60" /> Configuración de Cuenta
                </CardTitle>
                <CardDescription className="text-white/50">Actualiza tus datos personales y credenciales aquí.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white/60 font-medium">Nombre Completo</Label>
                    <Input id="name" defaultValue="Javier Díaz" className="bg-black/50 border-white/10 text-white focus-visible:ring-1 focus-visible:ring-white/20 h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/60 font-medium">Correo Electrónico</Label>
                    <Input id="email" type="email" defaultValue="javier.diaz@email.com" className="bg-black/50 border-white/10 text-white focus-visible:ring-1 focus-visible:ring-white/20 h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white/60 font-medium">Teléfono de contacto</Label>
                    <Input id="phone" type="tel" defaultValue="+34 600 000 000" className="bg-black/50 border-white/10 text-white focus-visible:ring-1 focus-visible:ring-white/20 h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pass" className="text-white/60 font-medium">Nueva Contraseña (Opcional)</Label>
                    <Input id="pass" type="password" placeholder="••••••••" className="bg-black/50 border-white/10 text-white focus-visible:ring-1 focus-visible:ring-white/20 h-11" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t border-white/5 pt-6 pb-6">
                <Button className="bg-white text-black hover:bg-neutral-200 font-bold px-8">Guardar Cambios</Button>
              </CardFooter>
            </Card>

            {/* DANGER ZONE */}
            <Card className="bg-red-950/20 border-red-500/20 relative overflow-hidden group">
              {/* Glow inside danger zone */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-[80px] rounded-full mix-blend-screen pointer-events-none" />
              <CardHeader>
                <CardTitle className="text-xl font-bold text-red-500 flex items-center gap-2 justify-between">
                  Zona de Peligro
                  <ShieldAlert className="w-5 h-5 opacity-60" />
                </CardTitle>
                <CardDescription className="text-white/50">
                  Una vez que elimines tu cuenta, todas tus reservas e historial se borrarán permanentemente del sistema. No se puede deshacer.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Button variant="outline" className="text-red-500 border-red-500/30 bg-transparent hover:bg-red-500 hover:text-white transition-colors">
                  <XCircle className="w-4 h-4 mr-2" />
                  Eliminar cuenta y mis datos
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

      </main>
    </div>
  );
}
