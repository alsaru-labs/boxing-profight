"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, ShieldCheck, Wallet, ChevronLeft, Calendar, ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { LITERALS } from "@/constants/literals";
import Navbar from "@/components/Navbar";
import { getAllRevenueRecords } from "../actions";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

import { useAdmin } from "@/contexts/AdminContext";

export default function AccountingPage() {
    const router = useRouter();
    const { 
        revenueRecords, 
        loadRevenueHistory, 
        loading: adminLoading 
    } = useAdmin();

    const [loading, setLoading] = useState(true);
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    const [availableMonths, setAvailableMonths] = useState<string[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [selectedMonth, setSelectedMonth] = useState<string>("");
    const [currentRevenue, setCurrentRevenue] = useState<number | null>(null);

    const { user, profile, loading: authLoading } = useAuth();

    useEffect(() => {
        if (authLoading) return;
        if (!user || profile?.role !== "admin") {
            router.push("/perfil");
            return;
        }

        const init = async () => {
            await loadRevenueHistory();
            setLoading(false);
        };
        init();
    }, [authLoading, user, profile, router, loadRevenueHistory]);

    useEffect(() => {
        if (revenueRecords.length > 0) {
            const years = new Set<string>();
            revenueRecords.forEach((rec: any) => {
                const [year] = rec.month.split("-");
                years.add(year);
            });
            const sortedYears = Array.from(years).sort((a,b) => b.localeCompare(a));
            setAvailableYears(sortedYears);
            
            if (sortedYears.length > 0 && !selectedYear) {
                setSelectedYear(sortedYears[0]);
            }
        }
    }, [revenueRecords, selectedYear]);

    useEffect(() => {
        if (!selectedYear) {
            setAvailableMonths([]);
            return;
        }

        const months = revenueRecords
            .filter(rec => rec.month.startsWith(selectedYear))
            .map(rec => rec.month.split("-")[1])
            .sort((a, b) => b.localeCompare(a));
        
        setAvailableMonths(months);
        if (months.length > 0) {
            setSelectedMonth(months[0]);
        } else {
            setSelectedMonth("");
        }
    }, [selectedYear, revenueRecords]);

    useEffect(() => {
        if (selectedYear && selectedMonth) {
            const target = `${selectedYear}-${selectedMonth}`;
            const record = revenueRecords.find(rec => rec.month === target);
            setCurrentRevenue(record ? record.amount : 0);
        } else {
            setCurrentRevenue(null);
        }
    }, [selectedYear, selectedMonth, revenueRecords]);

    const getMonthName = (monthNum: string) => {
        if (!monthNum) return "";
        const date = new Date(2000, parseInt(monthNum) - 1, 1);
        return date.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center">
                <ShieldCheck className="w-16 h-16 text-white/20 mb-4" />
                <Loader2 className="w-10 h-10 text-white animate-spin" />
                <p className="text-white/50 mt-4 font-medium">Cargando historial contable...</p>
            </div>
        );
    }

    return (
        <div className="dark min-h-screen bg-black text-white font-sans flex flex-col relative w-full overflow-x-hidden">
            <Navbar isHome={false} />

            <main className="flex-1 w-full max-w-[1400px] mx-auto pt-4 md:pt-6 lg:pt-8 px-4 md:px-8 lg:px-12 pb-12 z-10">
                <Tabs defaultValue="mensual" className="w-full">
                    {/* Replaced AdminTabs with local specialized tabs */}
                    <div className="mb-4">
                        <TabsList className="bg-zinc-900/50 p-1 rounded-2xl border border-white/5 w-full max-w-[200px] mx-auto sm:max-w-none !h-auto flex flex-row gap-1">
                            <TabsTrigger 
                                value="mensual" 
                                className="flex-1 rounded-xl px-2 sm:px-8 py-2.5 data-[state=active]:bg-white data-[state=active]:text-black font-black transition-all flex items-center justify-center gap-2 text-[10px] sm:text-sm whitespace-nowrap uppercase tracking-tighter sm:tracking-normal"
                            >
                                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>{LITERALS.DASHBOARD.ACCOUNTING.TABS.MONTHLY}</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="mensual" className="space-y-8 mt-12 focus-visible:outline-none">
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-8">
                            <div>
                                <h1 className="text-4xl font-black tracking-tighter uppercase italic">{LITERALS.DASHBOARD.ACCOUNTING.TITLE}</h1>
                                <p className="text-white/50 text-sm mt-2 font-medium">{LITERALS.DASHBOARD.ACCOUNTING.SUBTITLE}</p>
                            </div>
                            <Button 
                                variant="outline" 
                                onClick={() => router.push("/sys-director")}
                                className="w-fit border-white/10 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold uppercase tracking-widest px-6"
                            >
                                <ChevronLeft className="w-4 h-4 mr-2" />
                                {LITERALS.DASHBOARD.ACCOUNTING.GO_BACK}
                            </Button>
                        </div>

                        {/* Filters & Results Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Filter Card */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl backdrop-blur-sm shadow-2xl">
                                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-red-500" />
                                        Seleccionar Periodo
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        <div className="relative group">
                                            <label className="text-[10px] uppercase font-black tracking-widest text-white/40 mb-2 block">
                                                {LITERALS.DASHBOARD.ACCOUNTING.SELECT_YEAR}
                                            </label>
                                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Año" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableYears.map(y => (
                                                        <SelectItem key={y} value={y}>{y}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="relative group">
                                            <label className="text-[10px] uppercase font-black tracking-widest text-white/40 mb-2 block">
                                                {LITERALS.DASHBOARD.ACCOUNTING.SELECT_MONTH}
                                            </label>
                                            <Select 
                                                value={selectedMonth} 
                                                onValueChange={setSelectedMonth}
                                                disabled={!selectedYear}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Mes" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableMonths.map(m => (
                                                        <SelectItem key={m} value={m}>{getMonthName(m)}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Result Display Card */}
                            <div className="lg:col-span-2">
                                <div className="h-full bg-zinc-900/30 border border-white/5 rounded-3xl p-10 flex flex-col items-center justify-center text-center relative overflow-hidden group min-h-[300px]">
                                    {/* Aesthetic Background element */}
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Wallet className="w-64 h-64 -mr-16 -mt-16" />
                                    </div>

                                    {currentRevenue !== null ? (
                                        <div className="relative z-10">
                                            <span className="text-[12px] uppercase font-black tracking-[0.2em] text-red-500 mb-4 block animate-in fade-in slide-in-from-bottom-2">
                                                {LITERALS.DASHBOARD.ACCOUNTING.TOTAL_REVENUE}
                                            </span>
                                            <div className="flex items-baseline justify-center gap-2 mb-2 animate-in zoom-in duration-500">
                                                <span className="text-7xl md:text-9xl font-black tracking-tighter tabular-nums drop-shadow-2xl text-white">
                                                    {currentRevenue}
                                                </span>
                                                <span className="text-4xl font-bold text-white/30 ml-2">€</span>
                                            </div>
                                            <p className="text-white/40 font-medium uppercase tracking-[0.3em] text-sm mt-4">
                                                {getMonthName(selectedMonth)} <span className="text-red-500/50">•</span> {selectedYear}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 text-white/30 animate-pulse">
                                            <Calendar className="w-16 h-16 mb-2" />
                                            <p className="font-bold text-lg uppercase tracking-tight">{LITERALS.DASHBOARD.ACCOUNTING.NO_DATA}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Recent History List */}
                        {revenueRecords.length > 0 && (
                            <div className="mt-12 space-y-4">
                                <h2 className="text-xl font-bold uppercase tracking-tight text-white/60 pl-2">Registros Recientes</h2>
                                <div className="rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-zinc-900/80">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-white/40">Periodo</th>
                                                <th className="px-6 py-4 text-[10px] uppercase font-black tracking-widest text-white/40 text-right">Cantidad</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 bg-zinc-950/50">
                                            {revenueRecords.slice(0, 6).map((rec) => (
                                                <tr key={rec.$id} className="hover:bg-white/5 transition-colors cursor-default group">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-1.5 h-6 bg-red-600 transition-all group-hover:h-8"></div>
                                                            <span className="font-black uppercase tracking-tighter text-lg text-white/90">
                                                                {getMonthName(rec.month.split("-")[1])} <span className="text-white/30 text-sm italic font-medium ml-1">{rec.month.split("-")[0]}</span>
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-right font-black tabular-nums text-2xl group-hover:text-red-500 transition-colors">
                                                        {rec.amount} <span className="text-white/10 text-xs font-bold">EUR</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="p-4 bg-zinc-900/40 text-center text-[10px] uppercase font-bold tracking-widest text-white/30 flex items-center justify-center gap-2">
                                        <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                        Mostrando historial acumulado
                                        <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </main>

            {/* Background design elements */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-red-600/10 blur-[150px] rounded-full -z-10 select-none pointer-events-none opacity-50"></div>
            <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/5 blur-[120px] rounded-full -z-10 select-none pointer-events-none opacity-50"></div>
        </div>
    );
}
