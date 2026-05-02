'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LITERALS } from "@/constants/literals";

interface StudentFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterPayment: string;
  setFilterPayment: (value: string) => void;
  sortConfig: any;
  setSortConfig: (config: any) => void;
  setVisibleCount: (count: number | ((prev: number) => number)) => void;
  filterMethod: string;
  setFilterMethod: (value: string) => void;
  totalResults: number;
}

export function StudentFilters({
  searchTerm,
  setSearchTerm,
  filterPayment,
  setFilterPayment,
  sortConfig,
  setSortConfig,
  setVisibleCount,
  filterMethod,
  setFilterMethod,
  totalResults
}: StudentFiltersProps) {
  return (
    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-4 gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">{LITERALS.DASHBOARD.STUDENTS_DIRECTORY}</h2>
        <div className="flex items-center gap-1.5 ml-0.5">
          <div className="h-1 w-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/60">
            {totalResults} {totalResults === 1 ? 'Alumno' : 'Alumnos'}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-3 items-center">
        {/* Search */}
        <div className="w-full sm:w-64 space-y-1 group/search">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Buscar</span>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-white/20 group-focus-within/search:text-emerald-500 transition-colors duration-300" />
            </div>
            <Input
              type="text"
              placeholder="Alumno o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 bg-white/5 border-white/10 text-white focus-visible:ring-emerald-500/20 focus-visible:ring-offset-0 focus:border-emerald-500/40 w-full h-10 transition-all duration-300 rounded-xl placeholder:text-white/20 font-medium shadow-inner"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/20 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <div className="absolute -bottom-[1px] left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-focus-within/search:opacity-100 transition-opacity duration-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex w-full sm:w-auto gap-2 sm:gap-3">
          {/* Filter Payment */}
          <div className="flex-1 sm:w-40 space-y-1 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Pago</span>
            <Select value={filterPayment} onValueChange={setFilterPayment}>
              <SelectTrigger className="w-full h-10 px-3">
                <SelectValue placeholder={LITERALS.DASHBOARD.FILTER_ALL_PAYMENTS} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">{LITERALS.DASHBOARD.FILTER_ALL_PAYMENTS}</SelectItem>
                <SelectItem value="Pagado">Pagado</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Method */}
          <div className="flex-1 sm:w-40 space-y-1 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Método</span>
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger className="w-full h-10 px-3">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Bizum">Bizum</SelectItem>
                <SelectItem value="Tarjeta">Tarjeta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reset Filters */}
        {/* Reset Filters */}
        <Button
          variant="ghost"
          onClick={() => {
            setSearchTerm("");
            setFilterPayment("Todos");
            setFilterMethod("Todos");
            setSortConfig(null);
            setVisibleCount(30);
          }}
          className={`h-10 text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center transition-all duration-500 overflow-hidden ${
            (searchTerm !== "" || filterPayment !== "Todos" || filterMethod !== "Todos" || sortConfig !== null)
              ? "max-w-[180px] opacity-100 pointer-events-auto px-3 ml-1"
              : "max-w-0 opacity-0 pointer-events-none px-0 border-0 ml-0"
          }`}
        >
          <X className="w-4 h-4 mr-1.5 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Limpiar Filtros</span>
        </Button>
      </div>
    </div>
  );
}
