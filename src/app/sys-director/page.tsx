"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Users, CreditCard, CalendarX, MoreVertical, LogOut, BicepsFlexed, ShieldCheck, Loader2, Home, MessageCircle, Signal, CalendarDays, Search, ArrowUpDown, Filter, X, ChevronDown, History as HistoryIcon, Plus, UserCog, Trash2, CheckCircle2 } from "lucide-react";
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
  const [editLevel, setEditLevel] = useState("Iniciación");
  const [editPhoneError, setEditPhoneError] = useState("");

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
  const [newStudentForm, setNewStudentForm] = useState({ name: "", email: "", phone: "", level: "Iniciación" });
  const [newStudentFormError, setNewStudentFormError] = useState("");

  // Table Fitler & Sort States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPayment, setFilterPayment] = useState("todos"); // "todos", "pagado", "pendiente"
  const [filterLevel, setFilterLevel] = useState("todos"); // "todos", "Iniciación", "Media", "Profesional"
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [visibleCount, setVisibleCount] = useState(30);

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

      const allStudents = profilesData.documents.filter((s: any) => s.role !== "admin");
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

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewStudentFormError("");

    if (!newStudentForm.name || !newStudentForm.email) {
      setNewStudentFormError("Nombre y correo son requeridos.");
      return;
    }

    if (newStudentForm.name.length > 50) {
      setNewStudentFormError("El nombre no puede superar los 50 caracteres.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newStudentForm.email)) {
      setNewStudentFormError("Por favor, introduce un correo electrónico válido.");
      return;
    }

    const phoneRegex = /^(\+34|0034|34)?[6789]\d{8}$/;
    if (newStudentForm.phone.trim() !== "" && !phoneRegex.test(newStudentForm.phone.trim())) {
      setNewStudentFormError("Por favor, introduce un teléfono válido (ej: 600123456).");
      return;
    }

    try {
      setIsUpdating(true);
      const uniqueRef = ID.unique();
      const newProfile = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_PROFILES,
        uniqueRef,
        {
          user_id: uniqueRef, // Fulfill required db schema constraint for manual creation
          name: newStudentForm.name,
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
      setNewStudentForm({ name: "", email: "", phone: "", level: "Iniciación" });
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

  // Filter and Sort Processing
  const processedStudents = [...studentsList]
    .filter((student) => {
      // Search term
      const matchesSearch =
        (student.name?.toLowerCase().includes(searchTerm.toLowerCase()) || "") ||
        (student.email?.toLowerCase().includes(searchTerm.toLowerCase()) || "");

      // Payment filter
      const matchesPayment =
        filterPayment === "todos" ? true :
          filterPayment === "pagado" ? student.is_paid === true :
            student.is_paid === false;

      // Level filter
      const matchesLevel =
        filterLevel === "todos" ? true :
          (student.level || "Iniciación") === filterLevel;

      return matchesSearch && matchesPayment && matchesLevel;
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;

      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle nulls/undefined for level
      if (sortConfig.key === "level") {
        aValue = a.level || "Iniciación";
        bValue = b.level || "Iniciación";
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const slicedStudents = processedStudents.slice(0, visibleCount);

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
    newStudentForm.name.length <= 50 &&
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

        {/* Students Table Section */}
        <div className="space-y-4">
          {/* Table Header & Controls */}
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold tracking-tight">{LITERALS.DASHBOARD.STUDENTS_DIRECTORY}</h2>

            <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-3 items-center">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/50" />
                <Input
                  type="text"
                  placeholder="Buscar alumno o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-white focus-visible:ring-emerald-500 w-full rounded-md"
                />
              </div>

              {/* Filter Payment */}
              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className="bg-zinc-900 border border-white/10 text-white text-sm rounded-md focus:ring-emerald-500 block p-2 w-full sm:w-auto h-10"
              >
                <option value="todos">{LITERALS.DASHBOARD.FILTER_ALL_PAYMENTS}</option>
                <option value="pagado">{LITERALS.DASHBOARD.FILTER_PAID}</option>
                <option value="pendiente">{LITERALS.DASHBOARD.FILTER_PENDING}</option>
              </select>

              {/* Filter Level */}
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="bg-zinc-900 border border-white/10 text-white text-sm rounded-md focus:ring-emerald-500 block p-2 w-full sm:w-auto h-10"
              >
                <option value="todos">Todos los Niveles</option>
                <option value="Iniciación">Iniciación</option>
                <option value="Media">Media</option>
                <option value="Profesional">Profesional</option>
              </select>

              {/* Reset Filters / Sorting Button */}
              {(searchTerm !== "" || filterPayment !== "todos" || filterLevel !== "todos" || sortConfig !== null) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterPayment("todos");
                    setFilterLevel("todos");
                    setSortConfig(null);
                    setVisibleCount(30);
                  }}
                  className="h-10 text-red-400 hover:text-red-300 hover:bg-red-500/10 whitespace-nowrap px-3"
                >
                  <X className="w-4 h-4 mr-1.5" />
                  Limpiar Filtros
                </Button>
              )}
            </div>
          </div>

          <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-lg shadow-2xl overflow-hidden">
            <div className="max-h-[700px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader className="bg-black/60 sticky top-0 z-10 backdrop-blur-md border-b border-white/10">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/70 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">Alumno <ArrowUpDown className="w-3 h-3 text-white/30" /></div>
                  </TableHead>
                  <TableHead className="text-white/70 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('is_paid')}>
                    <div className="flex items-center gap-1">Estado de Pago <ArrowUpDown className="w-3 h-3 text-white/30" /></div>
                  </TableHead>
                  <TableHead className="text-white/70">Contacto</TableHead>
                  <TableHead className="text-white/70 cursor-pointer hover:text-white transition-colors hidden sm:table-cell" onClick={() => handleSort('$createdAt')}>
                    <div className="flex items-center gap-1">Alta <ArrowUpDown className="w-3 h-3 text-white/30" /></div>
                  </TableHead>
                  <TableHead className="text-right text-white/70"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slicedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-white/50">
                      No hay alumnos registrados todavía en la Base de Datos.
                    </TableCell>
                  </TableRow>
                ) : (
                  slicedStudents.map((student) => (
                    <TableRow key={student.$id} className="border-white/10 hover:bg-white/5 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="text-white font-medium">{student.name || "Usuario Desconocido"}</p>
                            <p className="text-white/50 text-xs">{student.email}</p>
                          </div>
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
                        </div>
                      </TableCell>

                      {/* Contacto (WhatsApp & Phone) */}
                      <TableCell>
                        {student.phone ? (
                          <a
                            href={`https://wa.me/${student.phone.replace(/\+/g, '').replace(/\s/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-white/70 hover:text-[#25D366] transition-colors group"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              className="w-4 h-4 text-[#25D366] group-hover:scale-110 transition-transform fill-current"
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            <span className="text-sm font-medium hidden sm:inline">{student.phone}</span>
                          </a>
                        ) : (
                          <span className="text-white/30 text-xs italic hidden sm:inline">No indicado</span>
                        )}
                      </TableCell>

                      {/* Fecha de Alta (Antigüedad) */}
                      <TableCell className="text-white/50 text-xs font-medium hidden sm:table-cell">
                        {new Date(student.$createdAt).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-9 w-9 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10 outline-none focus:ring-2 focus:ring-emerald-500/50">
                            <span className="sr-only">Abrir menú</span>
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900/95 backdrop-blur-xl border-white/10 text-white min-w-[200px] p-2 rounded-2xl shadow-2xl shadow-black/50">
                            <DropdownMenuGroup className="p-1">
                              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-white/30 px-2 py-1.5">Gestión de Alumno</DropdownMenuLabel>
                              <DropdownMenuItem
                                className="group flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-white/70 focus:bg-white/10 focus:text-white cursor-pointer transition-colors"
                                onClick={() => handleActionClick(student)}
                                disabled={isUpdating}
                              >
                                {student.is_paid ? (
                                  <>
                                    <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400"><CreditCard className="w-3.5 h-3.5" /></div>
                                    <span>Marcar pendiente</span>
                                  </>
                                ) : (
                                  <>
                                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /></div>
                                    <span>Registrar Pago</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-white/70 focus:bg-white/10 focus:text-white cursor-pointer transition-colors"
                                onClick={() => handleOpenEditModal(student)}
                                disabled={isUpdating}
                              >
                                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400"><UserCog className="w-3.5 h-3.5" /></div>
                                <span>Editar Perfil</span>
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator className="bg-white/5 my-1" />
                            <DropdownMenuGroup className="p-1">
                              <DropdownMenuItem 
                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer transition-colors"
                                onClick={() => {
                                  showConfirm(
                                    "Dar de baja",
                                    `¿Seguro que quieres eliminar a ${student.name}? Esta acción es irreversible.`,
                                    async () => {
                                      try {
                                        await databases.deleteDocument(DATABASE_ID, COLLECTION_PROFILES, student.$id);
                                        setStudentsList(prev => prev.filter(s => s.$id !== student.$id));
                                        showAlert("Éxito", "Alumno eliminado correctamente.", "success");
                                      } catch (err) {
                                        showAlert("Error", "No se ha podido eliminar al alumno.", "danger");
                                      }
                                    },
                                    "danger"
                                  );
                                }}
                              >
                                <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500"><Trash2 className="w-3.5 h-3.5" /></div>
                                <span>Dar de baja</span>
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

            {visibleCount < processedStudents.length && (
              <div className="w-full flex justify-center py-4 border-t border-white/10 bg-white/5">
                <Button
                  variant="ghost"
                  onClick={() => setVisibleCount(prev => prev + 30)}
                  className="text-white hover:bg-white/10 flex items-center gap-2"
                >
                  <ChevronDown className="w-4 h-4" />
                  Cargar más alumnos ({processedStudents.length - visibleCount} restantes)
                </Button>
              </div>
            )}
          </Card>
        </div>
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
            <Button
              variant="ghost" 
              onClick={() => setIsPaymentModalOpen(false)} 
              className="bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white font-medium"
            >
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
            <Button 
              variant="ghost" 
              onClick={() => setIsEditModalOpen(false)} 
              className="bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white font-medium"
            >
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

      {/* Create Class Modal */}
      <Dialog open={isClassModalOpen} onOpenChange={setIsClassModalOpen}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Programar Nueva Clase</DialogTitle>
            <DialogDescription className="text-white/50">
              Añade una sesión al calendario. Los alumnos podrán apuntarse hasta cubrir el cupo de plazas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-white/80">Disciplina</Label>
                <select
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  className="bg-black border border-white/20 text-white rounded-md p-2 text-sm focus:ring-emerald-500 w-full"
                >
                  <option value="Boxeo">Boxeo</option>
                  <option value="K1">K1</option>
                  <option value="Sparring">Sparring</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label className="text-white/80">Monitor</Label>
                <Input
                  value={newClass.coach}
                  onChange={(e) => setNewClass({ ...newClass, coach: e.target.value })}
                  className={`bg-black text-white focus-visible:ring-emerald-500 ${!isCoachValid && newClass.coach !== "" ? "border-red-500" : "border-white/20"}`}
                />
                {!isCoachValid && newClass.coach !== "" && (
                  <span className="text-xs text-red-500">No puede estar vacío ni contener números.</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-white/80">Fecha (Día)</Label>
                <div className="relative">
                  <Input
                    ref={dateInputRef}
                    type="date"
                    min={localTodayISO}
                    value={newClass.date}
                    onChange={(e) => setNewClass({ ...newClass, date: e.target.value })}
                    className={`bg-black text-white focus-visible:ring-emerald-500 pl-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full cursor-pointer ${!isDateValid && newClass.date !== "" ? "border-red-500" : "border-white/20"}`}
                  />
                  <CalendarDays
                    className="absolute left-3 top-2.5 h-5 w-5 text-emerald-500 pointer-events-none"
                  />
                </div>
                {!isDateValid && newClass.date !== "" && (
                  <span className="text-xs text-red-500">La fecha no puede ser en el pasado.</span>
                )}
              </div>
              <div className="grid gap-2">
                <Label className="text-white/80">Franja Horaria</Label>
                <Input
                  placeholder="Ej: 18:00 - 19:30"
                  value={newClass.time}
                  onChange={(e) => setNewClass({ ...newClass, time: e.target.value })}
                  className={`bg-black text-white focus-visible:ring-emerald-500 ${(!isTimeFormatValid || !isTimeFuture) && newClass.time !== "" ? "border-red-500" : "border-white/20"}`}
                />
                {!isTimeFormatValid && newClass.time !== "" && (
                  <span className="text-xs text-red-500">Formato inválido. Usa formato: 18:00 - 19:30</span>
                )}
                {isTimeFormatValid && !isTimeFuture && newClass.date === localTodayISO && (
                  <span className="text-xs text-red-500">Esa hora ya ha pasado hoy.</span>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-white/80">Límite de Plazas (Aforo max)</Label>
              <Input
                type="number"
                value={newClass.capacity}
                onChange={(e) => setNewClass({ ...newClass, capacity: Number(e.target.value) })}
                className="bg-black border-white/20 text-white focus-visible:ring-emerald-500"
              />
            </div>

            {isDuplicate && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-md text-red-500 text-sm mt-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Ya existe una clase de <strong>{newClass.name}</strong> a esa misma hora y día.</span>
              </div>
            )}

          </div>
          <DialogFooter className="mt-4 border-t border-white/10 pt-4">
            <Button 
              variant="ghost" 
              onClick={() => setIsClassModalOpen(false)} 
              className="bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white font-medium"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateClass}
              disabled={isUpdating || !isNewClassFormValid}
              className="bg-emerald-500 text-white hover:bg-emerald-600"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Publicar Clase
            </Button>
          </DialogFooter>
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
        <DialogContent className="bg-zinc-950 border border-white/10 text-white max-w-md w-[95vw] shadow-2xl p-6 sm:p-8">
          <DialogTitle className="text-2xl font-bold tracking-tight">Registrar Nuevo Alumno</DialogTitle>
          <p className="text-white/50 text-sm mb-4">
            Añade los datos básicos. (Más adelante implementaremos el envío de invitación para crear su contraseña).
          </p>
          <form onSubmit={handleCreateStudent} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">Nombre y Apellidos</label>
              <Input
                type="text"
                required
                maxLength={50}
                placeholder="Paco Fernández"
                value={newStudentForm.name}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white focus:border-white focus:ring-1 focus:ring-white h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">Correo Electrónico (ID de acceso)</label>
              <Input
                type="email"
                required
                placeholder="paco@email.com"
                value={newStudentForm.email}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                className="bg-white/5 border-white/10 text-white focus:border-white focus:ring-1 focus:ring-white h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">Teléfono (WhatsApp)</label>
              <Input
                type="text"
                placeholder="600123456"
                value={newStudentForm.phone}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, phone: e.target.value })}
                className="bg-white/5 border-white/10 text-white focus:border-white focus:ring-1 focus:ring-white h-12"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-1 block">Nivel de Experiencia Inicial</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewStudentForm({ ...newStudentForm, level: "Iniciación" })}
                  className={newStudentForm.level === "Iniciación" ? "bg-white/20 hover:bg-white/30 text-white border-0" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}
                >
                  Iniciación
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewStudentForm({ ...newStudentForm, level: "Media" })}
                  className={newStudentForm.level === "Media" ? "bg-amber-500 hover:bg-amber-600 text-white border-0" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}
                >
                  Media
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewStudentForm({ ...newStudentForm, level: "Profesional" })}
                  className={newStudentForm.level === "Profesional" ? "bg-purple-500 hover:bg-purple-600 text-white border-0" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}
                >
                  Profesional
                </Button>
              </div>
            </div>

            {newStudentFormError && (
              <p className="text-sm font-medium text-red-500 bg-red-500/10 p-3 rounded-md border border-red-500/20">
                {newStudentFormError}
              </p>
            )}

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white font-medium"
                onClick={() => setIsNewStudentModalOpen(false)}
                disabled={isUpdating}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-white text-black hover:bg-neutral-200 disabled:opacity-50"
                disabled={isUpdating || !isNewStudentFormValid}
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Registrar Alumno
              </Button>
            </div>
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
