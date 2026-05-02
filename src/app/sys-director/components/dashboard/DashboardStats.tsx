"use client";

import { Users, CreditCard, Plus, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LITERALS } from "@/constants/literals";

interface DashboardStatsProps {
  totalStudents: number;
  monthlyRevenue: number;
  unpaidCount: number;
  onNewStudent: () => void;
  selectedMonth: string;
}

export function DashboardStats({ totalStudents, monthlyRevenue, unpaidCount, onNewStudent, selectedMonth }: DashboardStatsProps) {
  const [y, m] = selectedMonth.split('-').map(Number);
  const dateObj = new Date(y, m - 1, 2); // 2nd to avoid timezone shifts
  const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(dateObj);
  const monthLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-6 mb-3">
      <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-lg group hover:border-emerald-500/30 transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-3.5 pb-0.5">
          <CardTitle className="text-[10px] sm:text-sm font-black text-white/80 uppercase tracking-wider sm:tracking-widest whitespace-nowrap truncate mr-2">{LITERALS.DASHBOARD.ACTIVE_STUDENTS}</CardTitle>
          <Users className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        </CardHeader>
        <CardContent className="flex items-end justify-between p-3 sm:p-3.5 pt-1">
          <div>
            <div className="text-4xl sm:text-4xl font-black text-white leading-none">{totalStudents}</div>
          </div>
          <Button
            onClick={onNewStudent}
            className="bg-white text-black hover:bg-emerald-500 hover:text-white font-black rounded-lg h-8 w-8 sm:h-9 sm:w-auto sm:px-4 shadow-2xl transition-all hover:scale-[1.03] active:scale-95 text-[10px] sm:text-[11px] uppercase tracking-widest flex items-center justify-center gap-1.5 p-0 sm:p-2"
            title="Nuevo Alumno"
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Registrar</span>
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-lg group hover:border-blue-500/30 transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-3.5 pb-0.5">
          <CardTitle className="text-[10px] sm:text-sm font-black text-white/80 uppercase tracking-wider sm:tracking-widest whitespace-nowrap truncate mr-1">
            {LITERALS.DASHBOARD.MONTHLY_REVENUE(monthLabel)}
          </CardTitle>
          <CreditCard className="h-3.5 w-3.5 text-blue-400 shrink-0" />
        </CardHeader>
        <CardContent className="p-3 sm:p-3.5 pt-1">
          <div className="text-4xl sm:text-4xl font-black text-white leading-none">{monthlyRevenue}€</div>
          <p className={`text-[11px] sm:text-[11px] uppercase font-bold tracking-widest mt-1 ${unpaidCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {unpaidCount > 0 ? `${unpaidCount} ${LITERALS.DASHBOARD.PENDING_PAYMENT}` : LITERALS.DASHBOARD.ALL_UP_TO_DATE}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
