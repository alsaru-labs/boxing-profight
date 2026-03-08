"use client";

import { motion } from "framer-motion";
import { Users, CreditCard, CalendarX, MoreVertical, LogOut, BicepsFlexed, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const students = [
  {
    id: "1",
    name: "Carlos Martínez",
    email: "carlos@example.com",
    plan: "Mensualidad Completa",
    status: "Pagado",
    nextClass: "Boxeo (18:00)",
  },
  {
    id: "2",
    name: "Laura Gómez",
    email: "laura.g@example.com",
    plan: "Bono 10 Clases",
    status: "No Pagado",
    nextClass: "K1 (19:30)",
  },
  {
    id: "3",
    name: "David Ruiz",
    email: "david.r@example.com",
    plan: "Mensualidad Completa",
    status: "Pagado",
    nextClass: "Boxeo (10:00)",
  },
  {
    id: "4",
    name: "Sofía Ibáñez",
    email: "sofia.i@example.com",
    plan: "Clase Suelta",
    status: "Pendiente",
    nextClass: "K1 (19:30)",
  },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-zinc-950 border-r border-white/10 p-6 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="flex items-center space-x-3 mb-12">
            <div className="w-10 h-10 relative">
              <Image
                src="/logo_boxing_profight.webp"
                alt="PROFIGHT Logo"
                fill
                className="rounded-full object-cover border border-white/20"
              />
            </div>
            <span className="font-bold text-lg tracking-tight">PROFIGHT ADMIN</span>
          </div>
          
          <nav className="space-y-2">
            <Button variant="ghost" className="w-full justify-start text-white/80 hover:text-white bg-white/5">
              <Users className="mr-3 h-5 w-5" />
              Alumnos
            </Button>
            <Button variant="ghost" className="w-full justify-start text-white/50 hover:text-white hover:bg-white/5">
              <BicepsFlexed className="mr-3 h-5 w-5" />
              Clases
            </Button>
            <Button variant="ghost" className="w-full justify-start text-white/50 hover:text-white hover:bg-white/5">
              <CreditCard className="mr-3 h-5 w-5" />
              Pagos
            </Button>
          </nav>
        </div>

        <div className="pt-8 border-t border-white/10">
          <Link href="/" className="inline-flex w-full items-center justify-start rounded-lg px-3 py-2 text-sm font-medium transition-colors text-red-500 hover:text-red-400 hover:bg-red-500/10">
            <LogOut className="mr-3 h-5 w-5" />
            Salir del Panel
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 relative">
              <Image
                src="/logo_boxing_profight.webp"
                alt="PROFIGHT Logo"
                fill
                className="rounded-full object-cover border border-white/20"
              />
            </div>
            <span className="font-bold text-sm tracking-tight">PROFIGHT ADMIN</span>
          </div>
          <Link href="/" className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors text-red-500 hover:bg-muted/50">
            Salir
          </Link>
        </div>

        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">Panel de Control</h1>
            <p className="text-white/50 text-lg">Gestiona tus alumnos, clases y pagos actuales.</p>
          </div>
        </div>

        {/* Dashboard Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/70">Alumnos Activos</CardTitle>
              <Users className="h-4 w-4 text-white/50" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">28<span className="text-lg text-white/30 ml-2">/ 30</span></div>
              <p className="text-xs text-emerald-400 mt-1">Casi al límite de capacidad</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/70">Ingresos Mensuales</CardTitle>
              <CreditCard className="h-4 w-4 text-white/50" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">1.120€</div>
              <p className="text-xs text-red-400 mt-1">2 alumnos pendientes de pago</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/70">Próxima Clase</CardTitle>
              <ShieldCheck className="h-4 w-4 text-white/50" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">Boxeo (18:00)</div>
              <p className="text-xs text-emerald-400 mt-1">14 reservas confirmadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Students Table Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Directorio de Alumnos</h2>
            <Button className="bg-white text-black hover:bg-neutral-200">
              + Nuevo Alumno
            </Button>
          </div>

          <Card className="bg-white/5 border-white/10 backdrop-blur-lg shadow-2xl overflow-hidden">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/70">Alumno</TableHead>
                  <TableHead className="text-white/70">Plan / Tarifa</TableHead>
                  <TableHead className="text-white/70">Estado de Pago</TableHead>
                  <TableHead className="text-white/70">Siguiente Clase</TableHead>
                  <TableHead className="text-right text-white/70">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id} className="border-white/10 hover:bg-white/5 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-9 w-9 border border-white/20">
                          <AvatarFallback className="bg-black text-white">{student.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-white font-medium">{student.name}</p>
                          <p className="text-white/50 text-xs">{student.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-white/80">{student.plan}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          student.status === "Pagado" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            student.status === "No Pagado" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                              "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }
                      >
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white/80">{student.nextClass}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 flex flex-col justify-center items-center text-white hover:bg-white/10 border-0 outline-none rounded-md transition-colors">
                          <span className="sr-only">Abrir menú</span>
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Gestión de Alumno</DropdownMenuLabel>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer hover:bg-white/5">
                            Marcar como pagado
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-amber-400 focus:bg-amber-500/10 focus:text-amber-400 cursor-pointer">
                            <CalendarX className="mr-2 h-4 w-4" />
                            Cancelar su reserva actual
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer">
                            Dar de baja (Eliminar)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

      </main>
    </div>
  );
}
