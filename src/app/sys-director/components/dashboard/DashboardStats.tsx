"use client";

import { Users, CreditCard, Plus } from "lucide-react";
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
            onClick={onNewStudent}
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
            {LITERALS.DASHBOARD.MONTHLY_REVENUE(monthLabel)}
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
  );
}
