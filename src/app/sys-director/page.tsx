"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, CreditCard, CalendarX, MoreVertical, LogOut, BicepsFlexed, ShieldCheck, Loader2, Home, MessageCircle, Signal, CalendarDays } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { account, databases, DATABASE_ID, COLLECTION_PROFILES } from "@/lib/appwrite";
import { Query } from "appwrite";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";



export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [unpaidCount, setUnpaidCount] = useState(0);

  // Payment Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("55");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [isUpdating, setIsUpdating] = useState(false);

  // Profile Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editLevel, setEditLevel] = useState("Iniciación");
  const [editPhoneError, setEditPhoneError] = useState("");

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        // 1. Get current logged in user
        const userData = await account.get();
        
        // 2. Fetch their profile from the database to check role
        const profile = await databases.getDocument(
          DATABASE_ID,
          COLLECTION_PROFILES,
          userData.$id
        );

        if (profile.role !== "admin") {
          throw new Error("No tienes permisos de administrador.");
        }

        // 3. Admin verified. Let's fetch all real data.
        const profilesData = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_PROFILES,
          [Query.limit(500)] // Ensures we get a big chunk of users
        );

        const allStudents = profilesData.documents.filter((s: any) => s.role !== "admin");
        setStudentsList(allStudents);
        setTotalStudents(allStudents.length);

        // Revenue calculation (55€ per paid student)
        const paidStudentsCount = allStudents.filter(s => s.is_paid === true).length;
        setMonthlyRevenue(paidStudentsCount * 55);
        setUnpaidCount(allStudents.length - paidStudentsCount);

        // If verified and data loaded, remove loading state
        setLoading(false);
      } catch (error) {
        // If they are not logged in or not an admin, kick them to login
        router.push("/login");
      }
    };

    verifyAdmin();
  }, [router]);

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
    } catch (error) {
      // Ignore if session already destroyed
    } finally {
      router.push("/login");
    }
  };

  const handleActionClick = (student: any) => {
    if (student.is_paid) {
      // If already paid, flip directly back to pending without modal
      handleConfirmPayment(student.$id, false);
    } else {
      // If not paid, open the confirmation modal
      setSelectedStudent(student);
      setPaymentAmount("55"); // Reset default
      setPaymentMethod("Efectivo"); // Reset default
      setIsPaymentModalOpen(true);
    }
  };

  const handleConfirmPayment = async (studentId: string, newStatus: boolean) => {
    try {
      setIsUpdating(true);
      
      // Update in Appwrite Database
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_PROFILES,
        studentId,
        { 
          is_paid: newStatus,
          payment_method: newStatus ? paymentMethod : null 
        }
      );

      // Update Local State for instant UI feedback
      const updatedList = studentsList.map(s => 
        s.$id === studentId ? { ...s, is_paid: newStatus, payment_method: newStatus ? paymentMethod : null } : s
      );
      
      setStudentsList(updatedList);
      
      // Recalculate quick stats locally
      const paidStudentsCount = updatedList.filter(s => s.is_paid === true).length;
      setMonthlyRevenue(paidStudentsCount * 55);
      setUnpaidCount(updatedList.length - paidStudentsCount);

      if (newStatus === true) {
         setIsPaymentModalOpen(false); // Close Modal only when it was used to pay
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenEditModal = (student: any) => {
    setSelectedStudent(student);
    setEditPhone(student.phone || "");
    setEditLevel(student.level || "Iniciación");
    setEditPhoneError(""); // Clear previous errors
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedStudent) return;
    
    // Front-end Validation for Phone Number
    // Allows empty strings (to remove phone), OR valid formats: e.g. 600123456, +34600123456, 0034600123456...
    const phoneRegex = /^(\+34|0034|34)?[6789]\d{8}$/;
    
    if (editPhone.trim() !== "" && !phoneRegex.test(editPhone.trim())) {
      setEditPhoneError("Por favor, introduce un número válido (ej: 600123456 o +34600123456).");
      return; // Stop execution
    }

    // Reset error just in case
    setEditPhoneError("");
    
    try {
      setIsUpdating(true);
      
      // Update in Appwrite Database
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_PROFILES,
        selectedStudent.$id,
        { 
          phone: editPhone,
          level: editLevel
        }
      );

      // Update Local State for instant UI feedback
      const updatedList = studentsList.map(s => 
        s.$id === selectedStudent.$id ? { ...s, phone: editPhone, level: editLevel } : s
      );
      
      setStudentsList(updatedList);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error updating profile stats:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <ShieldCheck className="w-16 h-16 text-white/20 mb-4" />
        <Loader2 className="w-10 h-10 text-white animate-spin" />
        <p className="text-white/50 mt-4 font-medium">Verificando credenciales de instructor...</p>
      </div>
    );
  }

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
            <Link href="/">
              <Button variant="ghost" className="w-full justify-start text-white/50 hover:text-white hover:bg-white/5 mb-4">
                <Home className="mr-3 h-5 w-5" />
                Volver a la Web
              </Button>
            </Link>
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
          <button onClick={handleLogout} className="inline-flex w-full items-center justify-start rounded-lg px-3 py-2 text-sm font-medium transition-colors text-red-500 hover:text-red-400 hover:bg-red-500/10">
            <LogOut className="mr-3 h-5 w-5" />
            Cerrar Sesión Segura
          </button>
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
          <button onClick={handleLogout} className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors text-red-500 hover:bg-muted/50">
            Salir
          </button>
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
              <div className="text-4xl font-bold text-white">{totalStudents}</div>
              <p className="text-xs text-emerald-400 mt-1">Total registrados en bbdd</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/70">Ingresos Proyectados</CardTitle>
              <CreditCard className="h-4 w-4 text-white/50" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">{monthlyRevenue}€</div>
              <p className="text-xs text-red-400 mt-1">
                {unpaidCount > 0 ? `${unpaidCount} alumnos pendientes de pago` : "Todos al día"}
              </p>
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
                  <TableHead className="text-white/70">Contacto</TableHead>
                  <TableHead className="text-white/70">Nivel</TableHead>
                  <TableHead className="text-white/70">Estado de Pago</TableHead>
                  <TableHead className="text-white/70">Siguiente Clase</TableHead>
                  <TableHead className="text-white/70">Alta</TableHead>
                  <TableHead className="text-right text-white/70"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-white/50">
                      No hay alumnos registrados todavía en la Base de Datos.
                    </TableCell>
                  </TableRow>
                ) : (
                  studentsList.map((student) => (
                    <TableRow key={student.$id} className="border-white/10 hover:bg-white/5 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-9 w-9 border border-white/20">
                            <AvatarFallback className="bg-black text-white">
                              {student.name ? student.name.substring(0, 2).toUpperCase() : "US"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-white font-medium">{student.name || "Usuario Desconocido"}</p>
                            <p className="text-white/50 text-xs">{student.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      
                      {/* Contacto (Teléfono/WhatsApp) */}
                      <TableCell>
                        {student.phone ? (
                          <div className="flex items-center gap-2 text-white/80 hover:text-white transition-colors cursor-pointer w-fit group">
                            <MessageCircle className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">{student.phone}</span>
                          </div>
                        ) : (
                          <span className="text-white/30 text-xs italic">No indicado</span>
                        )}
                      </TableCell>

                      {/* Nivel de Experiencia */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-white/70">
                          <Signal className={`w-4 h-4 ${
                            student.level === 'Profesional' ? 'text-purple-400' :
                            student.level === 'Media' ? 'text-amber-400' :
                            'text-white/40' // Iniciación or Null
                          }`} />
                          <span className="text-sm">{student.level || 'Iniciación'}</span>
                        </div>
                      </TableCell>

                      {/* Estado de Pago */}
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <Badge
                            variant="outline"
                            className={
                              student.is_paid 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }
                          >
                            {student.is_paid ? "Pagado" : "No Pagado"}
                          </Badge>
                          {student.is_paid && student.payment_method && (
                            <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                              {student.payment_method}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Próxima Clase */}
                      <TableCell className="text-white/80">
                        ---
                      </TableCell>

                      {/* Fecha de Alta (Antigüedad) */}
                      <TableCell className="text-white/50 text-xs font-medium">
                        {new Date(student.$createdAt).toLocaleDateString('es-ES', { month: 'short', year: 'numeric'})}
                      </TableCell>

                      {/* Acciones */}
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
                            <DropdownMenuItem 
                              className="focus:bg-white/10 focus:text-white cursor-pointer hover:bg-white/5"
                              onClick={() => handleActionClick(student)}
                              disabled={isUpdating}
                            >
                              {student.is_paid ? "Marcar como pendiente" : "Registrar Pago"}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="focus:bg-white/10 focus:text-white cursor-pointer hover:bg-white/5"
                              onClick={() => handleOpenEditModal(student)}
                              disabled={isUpdating}
                            >
                              Editar Perfil (Contacto/Nivel)
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
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

      </main>

      {/* Payment Confirmation Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Registrar Mensualidad</DialogTitle>
            <DialogDescription className="text-white/50">
              Vas a confirmar el pago mensual de <strong className="text-white">{selectedStudent?.name}</strong>. Rellena los detalles de la transacción.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount" className="text-white/80">Cantidad Recibida (€)</Label>
              <Input
                id="amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="bg-black border-white/20 text-white focus-visible:ring-emerald-500"
              />
            </div>
            
            <div className="grid gap-2">
              <Label className="text-white/80 mb-2">Método de Pago</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setPaymentMethod("Efectivo")}
                  className={paymentMethod === "Efectivo" ? "bg-emerald-500 hover:bg-emerald-600 text-white border-0" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}
                >
                  Efectivo
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setPaymentMethod("Bizum")}
                  className={paymentMethod === "Bizum" ? "bg-cyan-500 hover:bg-cyan-600 text-white border-0" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}
                >
                  Bizum
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setPaymentMethod("Tarjeta")}
                  className={paymentMethod === "Tarjeta" ? "bg-purple-500 hover:bg-purple-600 text-white border-0" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}
                >
                  Tarjeta
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 border-t border-white/10 pt-4">
            <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)} className="text-white/50 hover:text-white bg-transparent">
              Cancelar
            </Button>
            <Button 
              onClick={() => handleConfirmPayment(selectedStudent?.$id, true)}
              disabled={isUpdating}
              className="bg-white text-black hover:bg-neutral-200"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar Ingreso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile (Contact/Level) Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Editar Información de Alumno</DialogTitle>
            <DialogDescription className="text-white/50">
              Añade un número de teléfono de contacto y ajusta el nivel táctico actuál de <strong className="text-white">{selectedStudent?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Phone */}
            <div className="grid gap-2">
              <Label htmlFor="phone" className="text-white/80">Teléfono (WhatsApp)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+34 600 000 000"
                value={editPhone}
                onChange={(e) => {
                  setEditPhone(e.target.value);
                  if (editPhoneError) setEditPhoneError(""); // clear error on typing
                }}
                className={`bg-black text-white placeholder:text-white/20 focus-visible:ring-blue-500 ${editPhoneError ? 'border-red-500 bg-red-500/5' : 'border-white/20'}`}
              />
              {editPhoneError && (
                <p className="text-red-400 text-xs mt-1 font-medium">{editPhoneError}</p>
              )}
            </div>
            
            {/* Level */}
            <div className="grid gap-2">
              <Label className="text-white/80 mb-2">Nivel de Experiencia</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setEditLevel("Iniciación")}
                  className={editLevel === "Iniciación" ? "bg-white/20 hover:bg-white/30 text-white border-0" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}
                >
                  Iniciación
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditLevel("Media")}
                  className={editLevel === "Media" ? "bg-amber-500 hover:bg-amber-600 text-white border-0" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}
                >
                  Media
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditLevel("Profesional")}
                  className={editLevel === "Profesional" ? "bg-purple-500 hover:bg-purple-600 text-white border-0" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}
                >
                  Profesional
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 border-t border-white/10 pt-4">
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="text-white/50 hover:text-white bg-transparent">
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveProfile}
              disabled={isUpdating}
              className="bg-white text-black hover:bg-neutral-200"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
