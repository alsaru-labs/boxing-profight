"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, CreditCard, CalendarClock, History, Settings, LogOut, ArrowLeft, ShieldAlert, CheckCircle2, XCircle, Activity, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { account } from "@/lib/appwrite";
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

const upcomingClasses = [
  { id: "1", type: "Boxeo", date: "15 Oct 2026", time: "18:00 - 19:30", instructor: "Álex Pintor", status: "Confirmado" },
  { id: "2", type: "K1", date: "17 Oct 2026", time: "19:30 - 21:00", instructor: "Álex Pintor", status: "Confirmado" },
];

const pastClasses = [
  { id: "3", type: "Boxeo", date: "10 Oct 2026", time: "18:00 - 19:30", instructor: "Álex Pintor", status: "Asistido" },
  { id: "4", type: "Boxeo", date: "08 Oct 2026", time: "10:00 - 11:00", instructor: "Álex Pintor", status: "Asistido" },
  { id: "5", type: "K1", date: "05 Oct 2026", time: "19:30 - 21:00", instructor: "Álex Pintor", status: "Falta" },
];

export default function StudentProfile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
        setLoading(false);
      } catch (error) {
        // Redirige al login silenciosamente si no hay sesión
        router.push("/login"); 
      }
    };

    fetchUser();
  }, [router]);

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
    <div className="dark min-h-screen bg-black text-white font-sans flex flex-col md:flex-row relative">
      {/* Background glow effects */}
      <div className="absolute inset-0 z-0 opacity-80 mix-blend-screen pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-gradient-to-bl from-zinc-800/40 via-stone-900/20 to-black rounded-full blur-[100px]" />
      </div>

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-72 bg-zinc-950 border-r border-white/10 p-6 flex flex-col justify-between hidden md:flex z-10">
        <div>
          <div className="flex items-center space-x-3 mb-10 w-full justify-between">
            <Link href="/" className="group flex items-center space-x-3 hover:text-white/80 transition-colors">
              <ArrowLeft className="h-5 w-5 text-white/50 group-hover:text-white transition-colors" />
              <span className="font-semibold text-lg tracking-tight">Volver al Tatami</span>
            </Link>
          </div>

          <div className="flex flex-col items-center justify-center text-center mb-10 pb-8 border-b border-white/10">
            <Avatar className="h-24 w-24 border-2 border-white/20 mb-4 shadow-2xl">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-to-br from-zinc-700 to-black text-white text-2xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold tracking-tight">{user?.name || "Usuario"}</h2>
            <p className="text-white/50 text-sm mt-1">{user?.email}</p>
          </div>

          <nav className="space-y-2">
            <Button variant="ghost" className="w-full justify-start text-white bg-white/10">
              <User className="mr-3 h-5 w-5 text-white/70" />
              Mi Perfil
            </Button>
            {/* Si quisieras tener navegación lateral la tendrías aquí */}
          </nav>
        </div>

        <div className="pt-8 border-t border-white/10">
          <button 
            onClick={async () => {
              await account.deleteSession("current");
              router.push("/login");
            }}
            className="inline-flex w-full items-center justify-start rounded-lg px-3 py-2 text-sm font-medium transition-colors text-white/50 hover:text-white hover:bg-white/5"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto z-10">
        {/* Mobile Header elements */}
        <div className="md:hidden flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <Link href="/" className="flex items-center space-x-2 text-white/70">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-semibold text-sm">Inicio</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm">{user?.name || "Usuario"}</span>
            <Avatar className="h-8 w-8 border border-white/20">
              <AvatarFallback className="bg-zinc-800 text-white text-xs">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </div>

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
              Resumen de Alumno
            </TabsTrigger>
            <TabsTrigger 
              value="classes" 
              className="py-3 text-base font-semibold w-full md:w-auto rounded-xl text-white/60 hover:text-white hover:bg-white/10 data-active:bg-white data-active:text-black dark:data-active:bg-white dark:data-active:text-black data-active:hover:bg-neutral-200 data-active:hover:text-black dark:data-active:hover:bg-neutral-200 dark:data-active:hover:text-black data-active:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all"
            >
              Mis Clases y Reservas
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
                {/* Glow behind successful payment */}
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-transparent blur-2xl opacity-50 block" />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-white font-semibold flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-white/60" />
                      Estado de tu Cuota
                    </CardTitle>
                    <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-medium px-3 py-1 text-sm border-0 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Al día
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 pb-6">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <p className="text-white/50 text-sm mb-1">Plan Actual</p>
                      <p className="text-3xl font-bold text-white tracking-tight">Tarifa Completa <span className="text-lg text-white/40 ml-2 font-medium">/ 55€ mes</span></p>
                    </div>
                    <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                      <p className="text-sm font-medium text-white/60">Próxima renovación</p>
                      <p className="text-lg font-bold text-white tracking-wide">01 de Noviembre</p>
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
                      <span className="text-white/60">Clases Entrenadas</span>
                      <span className="text-2xl font-bold text-white">42</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Clases Reservadas hoy</span>
                      <span className="text-2xl font-bold text-white">1</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: Clases */}
          <TabsContent value="classes" className="space-y-8 focus:outline-none focus:ring-0">
            <div className="space-y-4">
              <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-amber-500" /> Reservas Activas (Próximas)
              </h3>
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl overflow-hidden shadow-2xl">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/70">Disciplina</TableHead>
                      <TableHead className="text-white/70">Fecha</TableHead>
                      <TableHead className="text-white/70">Horario</TableHead>
                      <TableHead className="text-white/70">Estado</TableHead>
                      <TableHead className="text-right text-white/70">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingClasses.map((cls) => (
                      <TableRow key={cls.id} className="border-white/10 hover:bg-white/5 transition-colors">
                        <TableCell className="font-semibold text-white">{cls.type}</TableCell>
                        <TableCell className="text-white/80">{cls.date}</TableCell>
                        <TableCell className="text-white/80 font-medium">{cls.time}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{cls.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 font-medium">
                            Cancelar Reserva
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {upcomingClasses.length === 0 && (
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableCell colSpan={5} className="text-center text-white/50 h-24">
                          No tienes ninguna clase reservada próximamente.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <History className="w-5 h-5 text-white/40" /> Historial de Clases
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
                    {pastClasses.map((cls) => (
                      <TableRow key={cls.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="font-medium text-white/80">{cls.type}</TableCell>
                        <TableCell className="text-white/60">{cls.date}</TableCell>
                        <TableCell className="text-white/60">{cls.instructor}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={cls.status === 'Asistido' ? "bg-white/10 text-white border-white/20" : "bg-red-500/10 text-red-500 border-red-500/20"}>
                            {cls.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
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
