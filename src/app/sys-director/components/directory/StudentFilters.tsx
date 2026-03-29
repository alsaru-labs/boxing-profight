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
  filterLevel: string;
  setFilterLevel: (value: string) => void;
  sortConfig: any;
  setSortConfig: (config: any) => void;
  setVisibleCount: (count: number | ((prev: number) => number)) => void;
}

export function StudentFilters({
  searchTerm,
  setSearchTerm,
  filterPayment,
  setFilterPayment,
  filterLevel,
  setFilterLevel,
  sortConfig,
  setSortConfig,
  setVisibleCount
}: StudentFiltersProps) {
  return (
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

        <div className="flex w-full sm:w-auto gap-3">
          {/* Filter Payment */}
          <div className="flex-1 sm:w-40 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Pago</span>
            <Select value={filterPayment} onValueChange={setFilterPayment}>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder={LITERALS.DASHBOARD.FILTER_ALL_PAYMENTS} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">{LITERALS.DASHBOARD.FILTER_ALL_PAYMENTS}</SelectItem>
                <SelectItem value="pagado">{LITERALS.DASHBOARD.FILTER_PAID}</SelectItem>
                <SelectItem value="pendiente">{LITERALS.DASHBOARD.FILTER_PENDING}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Level */}
          <div className="flex-1 sm:w-40 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Nivel</span>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Todos los Niveles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Niveles</SelectItem>
                <SelectItem value="Iniciación">Iniciación</SelectItem>
                <SelectItem value="Media">Media</SelectItem>
                <SelectItem value="Profesional">Profesional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reset Filters */}
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
  );
}
