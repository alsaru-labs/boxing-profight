"use client";

import { X, CalendarDays, Users, AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";

interface CreateClassModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isUpdating: boolean;
  onSave: (newClass: any) => Promise<boolean>;
  classesList: any[];
}

export function CreateClassModal({ isOpen, onOpenChange, isUpdating, onSave, classesList }: CreateClassModalProps) {
  const [newClass, setNewClass] = useState({ name: "Boxeo", date: "", time: "18:00 - 19:30", coach: "Álex Pintor", capacity: 30 });
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNewClass({ name: "Boxeo", date: "", time: "18:00 - 19:30", coach: "Álex Pintor", capacity: 30 });
    }
  }, [isOpen]);

  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  const localTodayISO = new Date(Date.now() - tzOffset).toISOString().split('T')[0];

  const isDuplicate = classesList.some(cls =>
    cls.name === newClass.name &&
    cls.date.substring(0, 10) === newClass.date &&
    cls.time.trim() === newClass.time.trim()
  );

  const handleSubmit = async () => {
    const success = await onSave(newClass);
    if (success) onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        showCloseButton={false}
        className="bg-zinc-950 border-white/10 text-white max-w-md rounded-[2rem] overflow-hidden backdrop-blur-2xl p-0 focus:outline-none shadow-2xl"
      >
        <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
        
        <button 
          onClick={() => onOpenChange(false)}
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
                <Input
                  value={newClass.coach}
                  onChange={(e) => setNewClass({ ...newClass, coach: e.target.value })}
                  placeholder="Coach"
                  className="bg-white/5 border-white/10 h-12 focus:border-emerald-500/50 transition-all font-bold"
                />
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
                  className="bg-white/5 border-white/10 h-12 focus:border-emerald-500/50 transition-all font-bold"
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
              size="xl"
              onClick={handleSubmit}
              disabled={isUpdating || isDuplicate || !newClass.date || !newClass.time}
              className="w-full bg-white text-black hover:bg-emerald-500 hover:text-white font-black tracking-widest uppercase rounded-xl shadow-xl transition-all disabled:opacity-20"
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "PUBLICAR CLASE EN CALENDARIO"}
            </Button>
          </DialogHeader>
        </div>
      </DialogContent>
    </Dialog>
  );
}
