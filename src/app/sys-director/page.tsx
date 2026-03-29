"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Users, CreditCard, CalendarX, MoreVertical, LogOut, BicepsFlexed, ShieldCheck, Loader2, Home, MessageCircle, Signal, CalendarDays, Search, ArrowUpDown, Filter, X, ChevronDown, History as HistoryIcon, Plus, UserCog, Trash2, CheckCircle2, UserPlus, AlertCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { account, databases, DATABASE_ID, COLLECTION_PROFILES, COLLECTION_CLASSES, COLLECTION_BOOKINGS, COLLECTION_REVENUE, COLLECTION_PAYMENTS, COLLECTION_NOTIFICATIONS, client } from "@/lib/appwrite";
import { Query, ID } from "appwrite";
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
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AdminTabs } from "./components/AdminTabs";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ClassGrid } from "@/components/ClassGrid";
import { StudentDirectory } from "./components/StudentDirectory";
import { LITERALS } from "@/constants/literals";
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
import Navbar from "@/components/Navbar";
import { deleteStudentAccount } from "./actions";

export default function AdminDashboard() {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
  const [editEmail, setEditEmail] = useState("");
  const [editLevel, setEditLevel] = useState("Iniciación");
  const [editPhoneError, setEditPhoneError] = useState("");
  const [editEmailError, setEditEmailError] = useState("");

  // New Student Modal States
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);
  
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
  const [newStudentForm, setNewStudentForm] = useState({ name: "", lastName: "", email: "", phone: "", level: "Iniciación" });
  const [newStudentFormError, setNewStudentFormError] = useState("");
  const [newStudentEmailError, setNewStudentEmailError] = useState("");
  const [newStudentPhoneError, setNewStudentPhoneError] = useState("");
  const [editLastName, setEditLastName] = useState("");

  // Classes States
  const [classesList, setClassesList] = useState<any[]>([]);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [newClass, setNewClass] = useState({ name: "Boxeo", date: "", time: "18:00 - 19:30", coach: "Álex Pintor", capacity: 30 });

  // Attendees Modal States
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState(false);
  const [selectedClassForAttendees, setSelectedClassForAttendees] = useState<any>(null);
  const [attendeesList, setAttendeesList] = useState<any[]>([]);
  const [isFetchingAttendees, setIsFetchingAttendees] = useState(false);

  // Announcements States
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "", type: "info" });
  const [isAnnouncementsLoading, setIsAnnouncementsLoading] = useState(false);

  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const [profilesData, classesData, announcementsData] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_PROFILES, [Query.limit(500)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_CLASSES, [Query.limit(500), Query.orderAsc("date")]),
        databases.listDocuments(DATABASE_ID, COLLECTION_NOTIFICATIONS, [Query.orderDesc("createdAt"), Query.limit(20)])
      ]);

      const allStudentsFromDB = profilesData.documents.filter((s: any) => s.role !== "admin");
      
      // Simular alumnos adicionales para probar el scroll (solicitado por el usuario)
      const dummyStudents = Array.from({ length: 12 }, (_, i) => ({
        $id: `dummy-${i}`,
        user_id: `dummy-u-${i}`,
        name: `Alumno Prueba ${i + 1}`,
        last_name: "Test",
        email: `test${i + 1}@example.com`,
        phone: "+34 600 000 000",
        level: i % 3 === 0 ? "Iniciación" : i % 3 === 1 ? "Media" : "Profesional",
        is_paid: i % 2 === 0,
        $createdAt: new Date().toISOString(),
        role: "student"
      }));

      const allStudents = [...allStudentsFromDB, ...dummyStudents];
      
      setTotalStudents(allStudents.length);
      setClassesList(classesData.documents);
      setAnnouncements(announcementsData.documents);

      const d = new Date();
      const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      try {
        const revData = await databases.listDocuments(DATABASE_ID, COLLECTION_REVENUE, [Query.equal("month", currentMonthStr), Query.limit(1)]);
        if (revData.documents.length > 0) {
          setMonthlyRevenue(revData.documents[0].amount);
        } else {
          setMonthlyRevenue(0);
        }
      } catch (e) {
        console.error("Revenue fetch error:", e);
      }

      const paidStudentsCount = allStudents.filter((s: any) => s.is_paid === true).length;
      setUnpaidCount(allStudents.length - paidStudentsCount);
      setStudentsList(allStudents);
      setLoading(false);
    } catch (error) {
      console.error("Dashboard load error:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      try {
        const userData = await account.get();
        let profile;
        try {
          profile = await databases.getDocument(DATABASE_ID, COLLECTION_PROFILES, userData.$id);
        } catch (e: any) {
          if (e.code === 404) { router.push("/login"); return; }
          throw e;
        }

        if (profile.role !== "admin") {
          router.push("/perfil");
          return;
        }

        await loadDashboardData();
      } catch (error) {
        router.push("/login");
      }
    };

    initDashboard();

    const unsubscribe = client.subscribe([
      `databases.${DATABASE_ID}.collections.${COLLECTION_PROFILES}.documents`,
      `databases.${DATABASE_ID}.collections.${COLLECTION_CLASSES}.documents`,
      `databases.${DATABASE_ID}.collections.${COLLECTION_REVENUE}.documents`,
      `databases.${DATABASE_ID}.collections.${COLLECTION_NOTIFICATIONS}.documents`,
      `databases.${DATABASE_ID}.collections.${COLLECTION_BOOKINGS}.documents`
    ], (response) => {
      if (response.events.some(e => e.includes(".create") || e.includes(".delete") || e.includes(".update"))) {
        if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = setTimeout(() => {
          loadDashboardData(true);
        }, 800);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
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
      showConfirm(
        "Marcar Pendiente",
        `¿Confirmar que el pago de ${student.name} vuelve a estar PENDIENTE?`,
        () => handleConfirmPayment(student.$id, false),
        "warning"
      );
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

      // --- Revenue Database Update Logic ---
      const pAmount = Number(paymentAmount) || 55;
      const d = new Date();
      const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      let paymentAmountToDeduct = pAmount;

      try {
        if (newStatus) {
          // --- 1. Create Individual Payment History Record ---
          await databases.createDocument(DATABASE_ID, COLLECTION_PAYMENTS, ID.unique(), {
            student_id: studentId,
            month: currentMonthStr,
            amount: pAmount,
            method: paymentMethod
          });
        } else {
          // --- 2. Remove Individual Payment History Record (if exists) ---
          const userPayments = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_PAYMENTS,
            [Query.equal("student_id", studentId), Query.equal("month", currentMonthStr), Query.limit(10)]
          );

          if (userPayments.documents.length > 0) {
            paymentAmountToDeduct = userPayments.documents[0].amount; // Real amount paid
            const deletePromises = userPayments.documents.map(p =>
              databases.deleteDocument(DATABASE_ID, COLLECTION_PAYMENTS, p.$id)
            );
            await Promise.all(deletePromises);
          }
        }

        // --- 3. Update Overall Revenue Aggregate ---
        const revData = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_REVENUE,
          [Query.equal("month", currentMonthStr), Query.limit(1)]
        );

        let updatedRevenue = 0;
        if (revData.documents.length > 0) {
          const doc = revData.documents[0];
          updatedRevenue = newStatus ? doc.amount + pAmount : Math.max(0, doc.amount - paymentAmountToDeduct);
          await databases.updateDocument(DATABASE_ID, COLLECTION_REVENUE, doc.$id, { amount: updatedRevenue });
          setMonthlyRevenue(updatedRevenue);
        } else if (newStatus) {
          // Create it if there's none this month and someone pays
          await databases.createDocument(DATABASE_ID, COLLECTION_REVENUE, ID.unique(), {
            month: currentMonthStr,
            amount: pAmount
          });
          setMonthlyRevenue(pAmount);
        } else {
          // Changing to unpaid but table was empty (0 anyway)
          setMonthlyRevenue(0);
        }
      } catch (e) {
        console.error("Could not update revenue or payment tables:", e);
      }

      // Update Local State for instant UI feedback
      const updatedList = studentsList.map(s =>
        s.$id === studentId ? { ...s, is_paid: newStatus, payment_method: newStatus ? paymentMethod : null } : s
      );

      setStudentsList(updatedList);

      // Recalculate quick stats locally for unpaid count
      const paidStudentsCount = updatedList.filter(s => s.is_paid === true).length;
      setUnpaidCount(updatedList.length - paidStudentsCount);

      if (newStatus === true) {
        setIsPaymentModalOpen(false); // Close Modal only when it was used to pay
      }
    } catch (error: any) {
      if (error.code !== 404) console.error("Error updating payment status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenEditModal = (student: any) => {
    setSelectedStudent(student);
    setEditLastName(student.last_name || "");
    setEditPhone(student.phone || "");
    setEditEmail(student.email || "");
    setEditPhoneError(""); // Clear previous errors
    setEditEmailError("");
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedStudent) return;

    // Front-end Validation for Phone Number
    const validatePhone = (phone: string) => {
      if (!phone.trim()) return true; // Allow empty
      const cleanPhone = phone.replace(/[\s\-\.]/g, '');
      const phoneRegex = /^(\+34|0034|34)?[6789]\d{8}$/;
      return phoneRegex.test(cleanPhone);
    };

    if (!validatePhone(editPhone)) {
      setEditPhoneError("Por favor, introduce un número válido (ej: 600123456 o +34600123456).");
      return; 
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail)) {
      setEditEmailError("Formato de correo no válido.");
      return;
    }

    try {
      setIsUpdating(true);

      // Duplicate email check (excluding current student)
      const existing = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_PROFILES,
        [
          Query.equal("email", editEmail.toLowerCase()),
          Query.notEqual("$id", selectedStudent.$id)
        ]
      );

      if (existing.total > 0) {
        setEditEmailError("Este correo electrónico ya está registrado por otro alumno.");
        setIsUpdating(false);
        return;
      }

      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_PROFILES,
        selectedStudent.$id,
        {
          last_name: editLastName,
          email: editEmail.toLowerCase(),
          phone: editPhone,
          level: editLevel
        }
      );

      // Update Local State for instant UI feedback
      const updatedList = studentsList.map(s =>
        s.$id === selectedStudent.$id ? { ...s, last_name: editLastName, email: editEmail.toLowerCase(), phone: editPhone, level: editLevel } : s
      );

      setStudentsList(updatedList);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error updating profile stats:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewStudentFormError("");
    setNewStudentEmailError("");
    setNewStudentPhoneError("");

    if (!newStudentForm.name || !newStudentForm.lastName || !newStudentForm.email) {
      setNewStudentFormError("Nombre, apellidos y correo son requeridos.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newStudentForm.email)) {
      setNewStudentEmailError("Formato de correo no válido.");
      return;
    }

    const validatePhone = (phone: string) => {
      if (!phone.trim()) return true; // Allow empty
      const cleanPhone = phone.replace(/[\s\-\.]/g, '');
      const phoneRegex = /^(\+34|0034|34)?[6789]\d{8}$/;
      return phoneRegex.test(cleanPhone);
    };

    if (!validatePhone(newStudentForm.phone)) {
      setNewStudentPhoneError("Formato de teléfono no válido (9 dígitos).");
      return;
    }

    try {
      setIsUpdating(true);

      // 1. Check if student already exists by email
      const existing = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_PROFILES,
        [Query.equal("email", newStudentForm.email.toLowerCase())]
      );

      if (existing.total > 0) {
        setNewStudentEmailError("Este correo electrónico ya está registrado por otro alumno.");
        setIsUpdating(false);
        return;
      }

      const uniqueRef = ID.unique();
      const newProfile = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_PROFILES,
        uniqueRef,
        {
          user_id: uniqueRef, // Fulfill required db schema constraint for manual creation
          name: newStudentForm.name,
          last_name: newStudentForm.lastName,
          email: newStudentForm.email.toLowerCase(),
          phone: newStudentForm.phone || null,
          role: "alumno",
          is_paid: false,
          level: newStudentForm.level
        }
      );

      setStudentsList(prev => [newProfile, ...prev]);
      setTotalStudents(prev => prev + 1);
      setUnpaidCount(prev => prev + 1);
      setIsNewStudentModalOpen(false);
      setNewStudentForm({ name: "", lastName: "", email: "", phone: "", level: "Iniciación" });
      showAlert("Éxito", "Alumno registrado correctamente.", "success");
    } catch (err) {
      console.error("Error creating student:", err);
      showAlert("Error", "Hubo un error al registrar el alumno.", "danger");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateClass = async () => {
    try {
      setIsUpdating(true);
      const createdClass = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_CLASSES,
        ID.unique(),
        {
          name: newClass.name,
          date: newClass.date,
          time: newClass.time,
          coach: newClass.coach,
          capacity: Number(newClass.capacity),
          registeredCount: 0,
          status: "Activa"
        }
      );

      setClassesList(prev => [...prev, createdClass].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setIsClassModalOpen(false);
    } catch (error) {
      console.error("Error creating class:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAutoGenerateWeekClasses = async () => {
    showConfirm(
      "Generar Clases",
      "¿Seguro que quieres auto-generar las clases de la PRÓXIMA SEMANA? (L-V, Boxeo y K1, Sparring los Miércoles)",
      async () => {
        setIsUpdating(true);
        try {
          const today = new Date();
          const nextMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
          const classesToGenerate: any[] = [];

          for (let i = 0; i < 5; i++) {
            const targetDate = new Date(nextMonday);
            targetDate.setDate(nextMonday.getDate() + i);
            const dayOfWeek = targetDate.getDay();
            targetDate.setMinutes(targetDate.getMinutes() - targetDate.getTimezoneOffset());
            const dateStr = targetDate.toISOString().split('T')[0];

            const isWednesday = dayOfWeek === 3;
            const className = isWednesday ? "Sparring" : "Boxeo y K1";

            classesToGenerate.push({
              name: className,
              date: dateStr,
              time: "10:00 - 11:00",
              coach: "Álex Pintor",
              capacity: 30,
              registeredCount: 0,
              status: "Activa"
            });

            const afternoonHours = [18, 19, 20, 21];
            for (const hour of afternoonHours) {
              classesToGenerate.push({
                name: className,
                date: dateStr,
                time: `${hour}:00 - ${hour + 1}:00`,
                coach: "Álex Pintor",
                capacity: 30,
                registeredCount: 0,
                status: "Activa"
              });
            }
          }

          const createdClasses: any[] = [];
          for (const cls of classesToGenerate) {
            const resp = await databases.createDocument(DATABASE_ID, COLLECTION_CLASSES, ID.unique(), cls);
            createdClasses.push(resp);
          }

          const updatedClasses = [...classesList, ...createdClasses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setClassesList(updatedClasses);
          showAlert("Éxito", "¡Clases de la próxima semana generadas con éxito!", "success");
        } catch (err: any) {
          console.error("Error auto generating classes:", err);
          showAlert("Error", "Hubo un error al generar las clases automáticamente.", "danger");
        } finally {
          setIsUpdating(false);
        }
      }
    );
  };


  const handleDeleteClass = async (classObj: any) => {
    // 0. Prevent deleting past classes logically
    try {
      const startTime = classObj.time.split('-')[0].trim();
      const [year, month, day] = classObj.date.substring(0, 10).split("-").map(Number);
      const [hours, minutes] = startTime.split(":").map(Number);
      const classDateTime = new Date(year, month - 1, day, hours, minutes);

      if (classDateTime < new Date()) {
        showAlert("Acción Prohibida", "No se puede cancelar una clase que ya ha ocurrido. Queda registrada en el historial.", "warning");
        return;
      }
    } catch (e) {
      // Allow passing if date parsing fails
    }

    showConfirm(
        "Borrar Clase", 
        "¿Seguro que quieres borrar esta clase de forma permanente? Se cancelarán también todas las reservas de los alumnos.",
        async () => {
            try {
              setIsUpdating(true);
              // 1. Fetch all bookings associated with this class
              const relatedBookings = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_BOOKINGS,
                [Query.equal("class_id", classObj.$id), Query.limit(100)]
              );
        
              // 2. Delete all related bookings
              const deleteBookingPromises = relatedBookings.documents.map(booking =>
                databases.deleteDocument(DATABASE_ID, COLLECTION_BOOKINGS, booking.$id)
              );
              await Promise.all(deleteBookingPromises);
        
              // 3. Delete the class itself
              await databases.deleteDocument(DATABASE_ID, COLLECTION_CLASSES, classObj.$id);
        
              // 4. Update the UI state
              setClassesList(prev => prev.filter(c => c.$id !== classObj.$id));
              showAlert("Éxito", "Clase eliminada correctamente.", "success");
            } catch (error: any) {
              if (error.code !== 404) {
                console.error("Error al borrar la clase:", error);
                showAlert("Error", "No se pudo borrar la clase o sus reservas.", "danger");
              }
            } finally {
              setIsUpdating(false);
            }
        },
        "danger"
    );
  };

  const handleViewAttendees = async (classObj: any) => {
    try {
      setIsFetchingAttendees(true);
      setSelectedClassForAttendees(classObj);
      setIsAttendeesModalOpen(true);

      const bookingsData = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_BOOKINGS,
        [Query.equal("class_id", classObj.$id), Query.limit(100)]
      );

      const studentIds = bookingsData.documents.map(b => b.student_id);

      // Filter out only the existing student profiles
      const attendees = studentsList.filter(student => studentIds.includes(student.$id));
      setAttendeesList(attendees);
    } catch (error) {
      console.error("Error fetching attendees:", error);
      showAlert("Error", "No se ha podido verificar la lista de asistentes en este momento.", "danger");
    } finally {
      setIsFetchingAttendees(false);
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

  // --- New Class Validation ---
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  const localTodayISO = new Date(Date.now() - tzOffset).toISOString().split('T')[0];

  const isDateValid = newClass.date !== "" && newClass.date >= localTodayISO;
  const isCoachValid = newClass.coach.trim() !== "" && !/\d/.test(newClass.coach);
  const isTimeFormatValid = /^([01]?\d|2[0-3]):[0-5]\d\s*-\s*([01]?\d|2[0-3]):[0-5]\d$/.test(newClass.time.trim());

  // Specific Time-in-past validation for today
  let isTimeFuture = true;
  if (isDateValid && isTimeFormatValid && newClass.date === localTodayISO) {
    const startTimeStr = newClass.time.split('-')[0].trim();
    const [startHours, startMinutes] = startTimeStr.split(':').map(Number);

    // Create an artificial Date representing "today at class start time" in local time
    const classTimeToday = new Date();
    classTimeToday.setHours(startHours, startMinutes, 0, 0);

    // Compare directly against current time
    if (classTimeToday <= new Date()) {
      isTimeFuture = false;
    }
  }

  const isCapacityValid = newClass.capacity > 0;

  // Duplicate class validation (same discipline, date, and time)
  const isDuplicate = classesList.some(cls =>
    cls.name === newClass.name &&
    cls.date.substring(0, 10) === newClass.date &&
    cls.time.trim() === newClass.time.trim()
  );

  const isNewClassFormValid = isDateValid && isCoachValid && isTimeFormatValid && isTimeFuture && isCapacityValid && !isDuplicate;

  // --- Next Class Calculation ---
  const now = new Date();
  const nextClass = classesList
    .filter(cls => {
      try {
        const startTime = cls.time.split('-')[0].trim();
        if (!startTime || !cls.date) return false;

        // Use substring(0, 10) to safely strip "T00:00..." if Appwrite returns a full Datetime
        const [year, month, day] = cls.date.substring(0, 10).split("-").map(Number);
        const [hours, minutes] = startTime.split(":").map(Number);

        const classDateTime = new Date(year, month - 1, day, hours, minutes);
        return classDateTime > now;
      } catch (err) {
        return false;
      }
    })
    .sort((a, b) => {
      try {
        const aStart = a.time.split('-')[0].trim();
        const bStart = b.time.split('-')[0].trim();

        const [aYear, aMonth, aDay] = a.date.substring(0, 10).split("-").map(Number);
        const [aHours, aMinutes] = aStart.split(":").map(Number);
        const aDate = new Date(aYear, aMonth - 1, aDay, aHours, aMinutes).getTime();

        const [bYear, bMonth, bDay] = b.date.substring(0, 10).split("-").map(Number);
        const [bHours, bMinutes] = bStart.split(":").map(Number);
        const bDate = new Date(bYear, bMonth - 1, bDay, bHours, bMinutes).getTime();

        return aDate - bDate;
      } catch (err) {
        return 0;
      }
    })[0];

  const sortedClassesList = [...classesList].filter(cls => {
    try {
      const startTime = cls.time.split('-')[0].trim();
      if (!startTime || !cls.date) return false;

      const [year, month, day] = cls.date.substring(0, 10).split("-").map(Number);
      const [hours, minutes] = startTime.split(":").map(Number);

      const classDateTime = new Date(year, month - 1, day, hours, minutes);

      // Remove classes in the past
      if (classDateTime < now) return false;

      // Limit to max 7 days in the future
      const msIn7Days = 7 * 24 * 60 * 60 * 1000;
      if (classDateTime.getTime() > now.getTime() + msIn7Days) return false;

      return true;
    } catch (err) {
      return false;
    }
  }).sort((a, b) => {
    try {
      const aStart = a.time.split('-')[0].trim();
      const bStart = b.time.split('-')[0].trim();

      const [aYear, aMonth, aDay] = a.date.substring(0, 10).split("-").map(Number);
      const [aHours, aMinutes] = aStart.split(":").map(Number);
      const aDate = new Date(aYear, aMonth - 1, aDay, aHours, aMinutes).getTime();

      const [bYear, bMonth, bDay] = b.date.substring(0, 10).split("-").map(Number);
      const [bHours, bMinutes] = bStart.split(":").map(Number);
      const bDate = new Date(bYear, bMonth - 1, bDay, bHours, bMinutes).getTime();

      return aDate - bDate;
    } catch (err) {
      return 0;
    }
  });

  const recentPastClasses = [...classesList].filter(cls => {
    try {
      const startTime = cls.time.split('-')[0].trim();
      if (!startTime || !cls.date) return false;

      const [year, month, day] = cls.date.substring(0, 10).split("-").map(Number);
      const [hours, minutes] = startTime.split(":").map(Number);

      const classDateTime = new Date(year, month - 1, day, hours, minutes);

      // Only classes in the past
      if (classDateTime >= now) return false;

      // Limit to 30 days in the past (to avoid overwhelming but show a good history)
      const msIn30Days = 30 * 24 * 60 * 60 * 1000;
      if (classDateTime.getTime() < now.getTime() - msIn30Days) return false;

      return true;
    } catch (err) {
      return false;
    }
  }).sort((a, b) => {
    try {
      const aStart = a.time.split('-')[0].trim();
      const bStart = b.time.split('-')[0].trim();

      const [aYear, aMonth, aDay] = a.date.substring(0, 10).split("-").map(Number);
      const [aHours, aMinutes] = aStart.split(":").map(Number);
      const aDate = new Date(aYear, aMonth - 1, aDay, aHours, aMinutes).getTime();

      const [bYear, bMonth, bDay] = b.date.substring(0, 10).split("-").map(Number);
      const [bHours, bMinutes] = bStart.split(":").map(Number);
      const bDate = new Date(bYear, bMonth - 1, bDay, bHours, bMinutes).getTime();

      return bDate - aDate; // Descending (most recent past first)
    } catch (err) {
      return 0;
    }
  });

  const isNewStudentFormValid =
    newStudentForm.name.trim().length > 0 &&
    newStudentForm.lastName.trim().length > 0 &&
    newStudentForm.name.length <= 50 &&
    newStudentForm.lastName.length <= 50 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newStudentForm.email) &&
    (newStudentForm.phone.trim() === "" || /^(\+34|0034|34)?[6789]\d{8}$/.test(newStudentForm.phone.trim()));

  return (
    <div className="dark min-h-screen bg-black text-white font-sans flex flex-col relative w-full">
      <Navbar isHome={false} />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto pt-4 md:pt-6 lg:pt-8 px-6 md:px-8 lg:px-12 pb-12 z-10">



        <Tabs defaultValue="general" className="w-full">
          <AdminTabs />

          <TabsContent value="tablon" className="space-y-10 focus-visible:outline-none">

        {/* Notificaciones / Tablón (Admin View) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
          <Card className="bg-white/5 border-white/10 backdrop-blur-lg xl:col-span-1">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-400" /> {LITERALS.DASHBOARD.ANNOUNCEMENTS.CREATE_TITLE}
              </CardTitle>
              <CardDescription className="text-white/40">{LITERALS.DASHBOARD.ANNOUNCEMENTS.DESCRIPTION}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-white/60 uppercase">Título</Label>
                <Input
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  placeholder="Ej: Festivo el Lunes"
                  className="bg-black/40 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-white/60 uppercase">Mensaje</Label>
                <textarea
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                  placeholder="Escribe el aviso aquí..."
                  className="w-full bg-black/40 border border-white/10 rounded-md p-3 text-sm min-h-[100px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-white/60 uppercase">Importancia</Label>
                <select
                  value={newAnnouncement.type}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-sm text-white outline-none"
                >
                  <option value="info">Info (Azul)</option>
                  <option value="warning">Aviso (Ambar)</option>
                  <option value="success">Éxito (Verde)</option>
                </select>
              </div>
              <Button
                onClick={() => {
                  if (!newAnnouncement.title || !newAnnouncement.content) return;
                  showConfirm(
                    "Confirmar Publicación",
                    "¿Estás seguro de que quieres publicar este anuncio? Todos los alumnos recibirán una notificación en su panel.",
                    async () => {
                      setIsCreatingAnnouncement(true);
                      try {
                        const res = await databases.createDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, ID.unique(), {
                          title: newAnnouncement.title,
                          content: newAnnouncement.content,
                          type: newAnnouncement.type,
                          createdAt: new Date().toISOString()
                        });
                        setAnnouncements([res, ...announcements]);
                        setNewAnnouncement({ title: "", content: "", type: "info" });
                        showAlert("Éxito", "Anuncio publicado correctamente.", "success");
                      } catch (e) { 
                        console.error(e); 
                        showAlert("Error", "No se pudo publicar el anuncio.", "danger");
                      } finally { 
                        setIsCreatingAnnouncement(false); 
                      }
                    },
                    "warning"
                  );
                }}
                disabled={isCreatingAnnouncement || !newAnnouncement.title || !newAnnouncement.content}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10"
              >
                {isCreatingAnnouncement ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar Anuncio"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-lg xl:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">Anuncios Recientes</CardTitle>
                <CardDescription className="text-white/40">Los alumnos verán esto en su campanita.</CardDescription>
              </div>
              <Badge variant="outline" className="text-white/50 border-white/10">{announcements.length}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {announcements.length === 0 ? (
                  <div className="py-12 text-center text-white/20 italic text-sm">No has publicado ningún anuncio todavía.</div>
                ) : (
                  announcements.map((a) => (
                    <div key={a.$id} className="bg-black/40 border border-white/5 rounded-xl p-4 flex justify-between items-start group">
                      <div className="min-w-0 flex-1 mr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${a.type === 'warning' ? 'bg-amber-500/20 text-amber-500' : a.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-blue-500/20 text-blue-500'
                            }`}>
                            {a.type}
                          </span>
                          <span className="text-[10px] text-white/30">{new Date(a.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h4 className="font-bold text-white truncate">{a.title}</h4>
                        <p className="text-sm text-white/50 line-clamp-2">{a.content}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          showConfirm(
                            "Borrar Anuncio",
                            "¿Seguro que quieres borrar este anuncio? Los alumnos dejarán de verlo en su tablón y campanita.",
                            async () => {
                              try {
                                await databases.deleteDocument(DATABASE_ID, COLLECTION_NOTIFICATIONS, a.$id);
                                setAnnouncements(announcements.filter(prev => prev.$id !== a.$id));
                                showAlert("Éxito", "Anuncio eliminado correctamente.", "success");
                              } catch (e: any) {
                                if (e.code !== 404) {
                                    console.error("Error al borrar anuncio:", e);
                                    showAlert("Error", "No se ha podido borrar el anuncio.", "danger");
                                }
                              }
                            },
                            "danger"
                          );
                        }}
                        className="text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="general" className="space-y-10 focus-visible:outline-none">

        {/* Dashboard Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-lg group hover:border-emerald-500/30 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black text-white/40 uppercase tracking-widest">{LITERALS.DASHBOARD.ACTIVE_STUDENTS}</CardTitle>
              <Users className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div>
                <div className="text-5xl font-black text-white leading-none">{totalStudents}</div>
                <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest mt-3">{LITERALS.DASHBOARD.TOTAL_STUDENTS}</p>
              </div>
              <Button
                onClick={() => setIsNewStudentModalOpen(true)}
                className="bg-white text-black hover:bg-emerald-500 hover:text-white font-black rounded-xl h-14 w-14 p-0 shadow-2xl transition-all hover:scale-110 active:scale-95 group-hover:shadow-emerald-500/10"
                title="Nuevo Alumno"
              >
                <Plus className="w-7 h-7" />
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-lg group hover:border-blue-500/30 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black text-white/40 uppercase tracking-widest leading-relaxed">
                {(() => {
                  const m = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date());
                  return LITERALS.DASHBOARD.MONTHLY_REVENUE(m.charAt(0).toUpperCase() + m.slice(1));
                })()}
              </CardTitle>
              <CreditCard className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-white leading-none">{monthlyRevenue}€</div>
              <p className={`text-[10px] uppercase font-bold tracking-widest mt-3 ${unpaidCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {unpaidCount > 0 ? `${unpaidCount} ${LITERALS.DASHBOARD.PENDING_PAYMENT}` : LITERALS.DASHBOARD.ALL_UP_TO_DATE}
              </p>
            </CardContent>
          </Card>
        </div>

        <StudentDirectory 
          studentsList={studentsList}
          isUpdating={isUpdating}
          handleActionClick={handleActionClick}
          handleOpenEditModal={handleOpenEditModal}
          deleteStudentAccount={deleteStudentAccount}
          setStudentsList={setStudentsList}
          showAlert={showAlert}
          showConfirm={showConfirm}
        />
      </TabsContent>

      <TabsContent value="clases" className="space-y-10 focus-visible:outline-none">

        {/* Classes Section */}
        <div className="space-y-4 mt-16 pb-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{LITERALS.DASHBOARD.CLASSES.TITLE}</h2>
              <p className="text-white/50 text-sm mt-1">{LITERALS.DASHBOARD.CLASSES.DESCRIPTION}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="bg-zinc-900 border-white/10 text-white hover:bg-white/5 whitespace-nowrap"
                onClick={handleAutoGenerateWeekClasses}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarDays className="w-4 h-4 mr-2 text-blue-400" />}
                {LITERALS.DASHBOARD.CLASSES.AUTO_GENERATE}
              </Button>

              <Button
                onClick={() => setIsClassModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white whitespace-nowrap"
              >
                {LITERALS.DASHBOARD.CLASSES.SCHEDULE_BUTTON}
              </Button>
            </div>
          </div>

          <div className="space-y-12">
            <ClassGrid 
              isAdmin 
              classes={sortedClassesList}
              onViewAttendees={handleViewAttendees}
              onCancelClass={handleDeleteClass}
            />
          </div>
        </div>

        {/* Recent Past Classes Section (History) */}
        <div className="space-y-4 pt-16 border-t border-white/10 pb-12">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white/70">{LITERALS.DASHBOARD.CLASSES.HISTORY_TITLE}</h2>
              <p className="text-white/40 text-sm mt-1">{LITERALS.DASHBOARD.CLASSES.HISTORY_DESCRIPTION}</p>
            </div>
          
          <ClassGrid 
            isAdmin
            isHistory
            classes={recentPastClasses}
            onViewAttendees={handleViewAttendees}
          />
        </div>
      </TabsContent>
    </Tabs>
  </main>

      {/* Payment Confirmation Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent 
          showCloseButton={false}
          className="bg-zinc-950 border-white/10 text-white max-w-md rounded-[2rem] overflow-hidden backdrop-blur-2xl p-0 focus:outline-none shadow-2xl"
        >
          <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
          
          <button 
            onClick={() => setIsPaymentModalOpen(false)}
            className="absolute right-6 top-6 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <DialogHeader className="p-8 pb-0 relative z-10">
            <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-emerald-400" /> Registrar Pago
            </DialogTitle>
            <DialogDescription className="text-white/40 font-medium">
              Confirmar mensualidad de <strong className="text-white">{selectedStudent?.name}</strong>. Rellena los detalles.
            </DialogDescription>
          </DialogHeader>

          <div className="p-8 space-y-6 relative z-10">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-[10px] font-black uppercase tracking-widest text-white/40">Cantidad Recibida (€)</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="bg-white/5 border-white/10 h-12 pl-10 focus:border-emerald-500/50 transition-all font-bold text-lg"
                    placeholder="55"
                  />
                  <div className="absolute left-3.5 top-3.5 text-white/20 font-bold">€</div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Método de Pago</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setPaymentMethod("Efectivo")}
                    className={`h-14 border transition-all font-black text-[10px] tracking-widest uppercase rounded-xl ${
                      paymentMethod === "Efectivo" 
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                      : "bg-white/5 border-white/5 text-white/20 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    Efectivo
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setPaymentMethod("Bizum")}
                    className={`h-14 border transition-all font-black text-[10px] tracking-widest uppercase rounded-xl ${
                      paymentMethod === "Bizum" 
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                      : "bg-white/5 border-white/5 text-white/20 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    Bizum
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setPaymentMethod("Tarjeta")}
                    className={`h-14 border transition-all font-black text-[10px] tracking-widest uppercase rounded-xl ${
                      paymentMethod === "Tarjeta" 
                      ? "bg-purple-500/20 border-purple-500/40 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]" 
                      : "bg-white/5 border-white/5 text-white/20 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    Tarjeta
                  </Button>
                </div>
              </div>
            </div>

            <DialogHeader className="pt-2">
              <Button
                onClick={() => handleConfirmPayment(selectedStudent?.$id, true)}
                disabled={isUpdating}
                className="w-full h-14 bg-white text-black hover:bg-emerald-500 hover:text-white font-black tracking-widest uppercase rounded-xl shadow-xl transition-all disabled:opacity-20"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "CONFIRMAR INGRESO"}
              </Button>
            </DialogHeader>
          </div>
        </DialogContent>
      </Dialog>


      {/* Edit Profile (Contact/Level) Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent 
          showCloseButton={false}
          className="bg-zinc-950 border-white/10 text-white max-w-md rounded-[2rem] overflow-hidden backdrop-blur-2xl p-0 focus:outline-none shadow-2xl"
        >
          <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
          
          <button 
            onClick={() => setIsEditModalOpen(false)}
            className="absolute right-6 top-6 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <DialogHeader className="p-8 pb-0 relative z-10">
            <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <UserCog className="w-6 h-6 text-blue-400" /> Editar Alumno
            </DialogTitle>
            <DialogDescription className="text-white/40 font-medium italic">
              Actualiza los datos de <strong className="text-white">{selectedStudent?.name} {selectedStudent?.last_name || ""}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="p-8 space-y-6 relative z-10">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Nombre (Fijo)</Label>
                  <Input
                    value={selectedStudent?.name || ""}
                    disabled
                    className="bg-white/[0.03] border-white/5 text-white/30 cursor-not-allowed h-12 font-bold opacity-60"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Apellidos</Label>
                  <Input
                    value={editLastName}
                    placeholder="Apellidos"
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white focus:border-blue-500/50 transition-all font-bold h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Correo Electrónico</Label>
                <Input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={editEmail}
                  onChange={(e) => {
                    setEditEmail(e.target.value);
                    if (editEmailError) setEditEmailError("");
                  }}
                  className={`bg-white/5 border-white/10 text-white focus:border-blue-500/50 transition-all font-bold h-12 ${editEmailError ? 'border-red-500/50 bg-red-500/5' : ''}`}
                />
                {editEmailError && (
                  <p className="text-red-400 text-[10px] font-bold italic tracking-wider pl-1">{editEmailError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Teléfono (WhatsApp)</Label>
                <Input
                  type="tel"
                  placeholder="+34 600 000 000"
                  value={editPhone}
                  onChange={(e) => {
                    setEditPhone(e.target.value);
                    if (editPhoneError) setEditPhoneError(""); 
                  }}
                  className={`bg-white/5 border-white/10 text-white focus:border-blue-500/50 transition-all font-bold h-12 ${editPhoneError ? 'border-red-500/50 bg-red-500/5' : ''}`}
                />
                {editPhoneError && (
                  <p className="text-red-400 text-[10px] font-bold italic tracking-wider pl-1">{editPhoneError}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Nivel de Combate</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditLevel("Iniciación")}
                    className={`h-14 border transition-all font-black text-[10px] tracking-widest uppercase rounded-xl ${
                      editLevel === "Iniciación" 
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]" 
                      : "bg-white/5 border-white/5 text-white/20 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    Iniciación
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditLevel("Media")}
                    className={`h-14 border transition-all font-black text-[10px] tracking-widest uppercase rounded-xl ${
                      editLevel === "Media" 
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                      : "bg-white/5 border-white/5 text-white/20 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    Media
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditLevel("Profesional")}
                    className={`h-14 border transition-all font-black text-[10px] tracking-widest uppercase rounded-xl ${
                      editLevel === "Profesional" 
                      ? "bg-purple-500/20 border-purple-500/40 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]" 
                      : "bg-white/5 border-white/5 text-white/20 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    Pro
                  </Button>
                </div>
              </div>
            </div>

            <DialogHeader className="pt-2">
              <Button
                onClick={handleSaveProfile}
                disabled={isUpdating || !!editPhoneError}
                className="w-full h-14 bg-white text-black hover:bg-blue-500 hover:text-white font-black tracking-widest uppercase rounded-xl shadow-xl transition-all disabled:opacity-20"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "GUARDAR CAMBIOS"}
              </Button>
            </DialogHeader>
          </div>
        </DialogContent>
      </Dialog>


      {/* Create Class Modal */}
      <Dialog open={isClassModalOpen} onOpenChange={setIsClassModalOpen}>
        <DialogContent 
          showCloseButton={false}
          className="bg-zinc-950 border-white/10 text-white max-w-md rounded-[2rem] overflow-hidden backdrop-blur-2xl p-0 focus:outline-none shadow-2xl"
        >
          <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
          
          <button 
            onClick={() => setIsClassModalOpen(false)}
            className="absolute right-6 top-6 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <DialogHeader className="p-8 pb-0 relative z-10">
            <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-emerald-400" /> Programar Clase
            </DialogTitle>
            <DialogDescription className="text-white/40 font-medium italic">
              Añade una nueva sesión al calendario de la comunidad.
            </DialogDescription>
          </DialogHeader>

          <div className="p-8 space-y-6 relative z-10">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Disciplina</Label>
                  <select
                    value={newClass.name}
                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl h-12 px-4 transition-all focus:border-emerald-500/50 font-bold text-sm appearance-none cursor-pointer"
                  >
                    <option value="Boxeo" className="bg-zinc-900">Boxeo</option>
                    <option value="K1" className="bg-zinc-900">K1</option>
                    <option value="Sparring" className="bg-zinc-900">Sparring</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Monitor</Label>
                  <div className="relative">
                    <Input
                      value={newClass.coach}
                      onChange={(e) => setNewClass({ ...newClass, coach: e.target.value })}
                      placeholder="Coach"
                      className={`bg-white/5 border-white/10 h-12 focus:border-emerald-500/50 transition-all font-bold ${!isCoachValid && newClass.coach !== "" ? "border-red-500/50 bg-red-500/5" : ""}`}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Fecha</Label>
                  <div className="relative">
                    <Input
                      ref={dateInputRef}
                      type="date"
                      min={localTodayISO}
                      value={newClass.date}
                      onChange={(e) => setNewClass({ ...newClass, date: e.target.value })}
                      className="bg-white/5 border-white/10 h-12 pl-10 focus:border-emerald-500/50 transition-all font-bold cursor-pointer"
                    />
                    <CalendarDays className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-500/40 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Horario</Label>
                  <Input
                    placeholder="18:00 - 19:30"
                    value={newClass.time}
                    onChange={(e) => setNewClass({ ...newClass, time: e.target.value })}
                    className={`bg-white/5 border-white/10 h-12 focus:border-emerald-500/50 transition-all font-bold ${(!isTimeFormatValid || !isTimeFuture) && newClass.time !== "" ? "border-red-500/50 bg-red-500/5" : ""}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Cupo Máximo</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={newClass.capacity}
                    onChange={(e) => setNewClass({ ...newClass, capacity: Number(e.target.value) })}
                    className="bg-white/5 border-white/10 h-12 pl-10 focus:border-emerald-500/50 transition-all font-bold"
                  />
                  <Users className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-500/40 pointer-events-none" />
                </div>
              </div>

              {isDuplicate && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-[11px] font-bold italic text-red-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Conflicto: Ya existe una clase a esta misma hora.</span>
                </div>
              )}
            </div>

            <DialogHeader className="pt-2">
              <Button
                onClick={handleCreateClass}
                disabled={isUpdating || !isNewClassFormValid}
                className="w-full h-14 bg-white text-black hover:bg-emerald-500 hover:text-white font-black tracking-widest uppercase rounded-xl shadow-xl transition-all disabled:opacity-20"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "PUBLICAR CLASE EN CALENDARIO"}
              </Button>
            </DialogHeader>
          </div>
        </DialogContent>
      </Dialog>


      {/* View Attendees Modal */}
      <Dialog open={isAttendeesModalOpen} onOpenChange={setIsAttendeesModalOpen}>
        <DialogContent className="bg-zinc-950 text-white border border-white/10 p-0 overflow-hidden sm:max-w-[450px]">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-bold">Listado de Alumnos</DialogTitle>
            <DialogDescription className="text-white/50">
              {selectedClassForAttendees?.name} ({selectedClassForAttendees?.time})
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto px-6 pb-6">
            {isFetchingAttendees ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            ) : attendeesList.length === 0 ? (
              <div className="text-center text-white/40 py-8 italic">
                Aún no hay ningún alumno apuntado a esta clase.
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {attendeesList.map(student => (
                  <div key={student.$id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-white/10">
                        <AvatarFallback className="bg-zinc-800 text-white font-bold">{student.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-white text-sm">{student.name}</p>
                        <p className="text-xs text-white/50">{student.email}</p>
                      </div>
                    </div>
                    <div>
                      <Badge variant="outline" className={`
                        ${student.level === 'Iniciación' ? 'border-amber-500/30 text-amber-500' : ''}
                        ${student.level === 'Media' ? 'border-blue-500/30 text-blue-400' : ''}
                        ${student.level === 'Profesional' ? 'border-red-500/30 text-red-500' : ''}
                        bg-black/40 shadow-inner px-2 py-0.5
                      `}>
                        <Signal className={`w-3 h-3 mr-1 `} />
                        {student.level || "N/A"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Nuevo Alumno Modal */}
      <Dialog open={isNewStudentModalOpen} onOpenChange={setIsNewStudentModalOpen}>
        <DialogContent 
          showCloseButton={false}
          className="bg-zinc-950 border-white/10 text-white max-w-md w-[95vw] rounded-[2rem] overflow-hidden backdrop-blur-2xl p-0 focus:outline-none shadow-2xl"
        >
          <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
          
          <button 
            onClick={() => setIsNewStudentModalOpen(false)}
            className="absolute right-6 top-6 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <DialogHeader className="p-8 pb-0 relative z-10">
            <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-emerald-400" /> Registrar Alumno
            </DialogTitle>
            <DialogDescription className="text-white/40 font-medium italic">
              Añade los datos básicos para enviarle su acceso a la plataforma.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateStudent} className="p-8 space-y-6 relative z-10">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Nombre</Label>
                  <Input
                    type="text"
                    required
                    maxLength={50}
                    placeholder="Paco"
                    value={newStudentForm.name}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                    className="bg-white/5 border-white/10 text-white focus:border-emerald-500/50 transition-all font-bold h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Apellidos</Label>
                  <Input
                    type="text"
                    required
                    maxLength={50}
                    placeholder="Fernández"
                    value={newStudentForm.lastName}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, lastName: e.target.value })}
                    className="bg-white/5 border-white/10 text-white focus:border-emerald-500/50 transition-all font-bold h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Correo Electrónico</Label>
                <Input
                  type="email"
                  required
                  placeholder="paco@email.com"
                  value={newStudentForm.email}
                  onChange={(e) => {
                      setNewStudentForm({ ...newStudentForm, email: e.target.value });
                      if (newStudentEmailError) setNewStudentEmailError("");
                  }}
                  className={`bg-white/5 border-white/10 text-white focus:border-emerald-500/50 transition-all font-bold h-12 ${newStudentEmailError ? 'border-red-500/50 bg-red-500/5' : ''}`}
                />
                {newStudentEmailError && <p className="text-red-400 text-[10px] font-bold italic tracking-wider pl-1">{newStudentEmailError}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Teléfono (WhatsApp)</Label>
                <Input
                  type="tel"
                  placeholder="600 000 000"
                  value={newStudentForm.phone}
                  onChange={(e) => {
                      setNewStudentForm({ ...newStudentForm, phone: e.target.value });
                      if (newStudentPhoneError) setNewStudentPhoneError("");
                  }}
                  className={`bg-white/5 border-white/10 text-white focus:border-emerald-500/50 transition-all font-bold h-12 ${newStudentPhoneError ? 'border-red-500/50 bg-red-500/5' : ''}`}
                />
                {newStudentPhoneError && <p className="text-red-400 text-[10px] font-bold italic tracking-wider pl-1">{newStudentPhoneError}</p>}
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Nivel de Combate</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setNewStudentForm({ ...newStudentForm, level: "Iniciación" })}
                    className={`h-14 border transition-all font-black text-[10px] tracking-widest uppercase rounded-xl ${
                      newStudentForm.level === "Iniciación" 
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-500 shadow-[0_0_15_rgba(245,158,11,0.1)]" 
                      : "bg-white/5 border-white/5 text-white/20 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    Iniciación
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setNewStudentForm({ ...newStudentForm, level: "Media" })}
                    className={`h-14 border transition-all font-black text-[10px] tracking-widest uppercase rounded-xl ${
                      newStudentForm.level === "Media" 
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                      : "bg-white/5 border-white/5 text-white/20 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    Media
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setNewStudentForm({ ...newStudentForm, level: "Profesional" })}
                    className={`h-14 border transition-all font-black text-[10px] tracking-widest uppercase rounded-xl ${
                      newStudentForm.level === "Profesional" 
                      ? "bg-purple-500/20 border-purple-500/40 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]" 
                      : "bg-white/5 border-white/5 text-white/20 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    Pro
                  </Button>
                </div>
              </div>
            </div>

            {newStudentFormError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-[11px] font-bold italic text-center">
                {newStudentFormError}
              </div>
            )}

            <DialogHeader className="pt-2">
              <Button 
                type="submit" 
                disabled={isUpdating || !!newStudentEmailError || !!newStudentPhoneError}
                className={`w-full h-14 font-black tracking-widest uppercase rounded-xl shadow-xl transition-all ${
                    !newStudentEmailError && !newStudentPhoneError
                    ? "bg-white text-black hover:bg-emerald-500 hover:text-white" 
                    : "bg-white/5 text-white/20 cursor-not-allowed border-white/5 opacity-50"
                }`}
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "REGISTRAR Y ENVIAR ACCESO"}
              </Button>
            </DialogHeader>
          </form>
        </DialogContent>
      </Dialog>

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
