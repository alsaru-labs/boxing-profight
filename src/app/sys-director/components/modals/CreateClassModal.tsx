"use client";

import { X, Calendar, Users, AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";

// Sub-components
import { FormField } from "./create-class/FormField";
import { FormSelect } from "./create-class/FormSelect";
import { StatusAlert } from "./create-class/StatusAlert";
import { ModalSubmitButton } from "./create-class/ModalSubmitButton";

interface CreateClassModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isUpdating: boolean;
  onSave: (newClass: any) => Promise<any>;
  classesList: any[];
}

const TIME_SLOTS = [
  "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00",
  "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00", 
  "17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00", "21:00 - 22:00"
];

const getSmartDefaultTime = () => {
    const now = new Date();
    const targetHour = now.getHours() + 1;
    return TIME_SLOTS.find(slot => {
      const slotHour = parseInt(slot.split(':')[0]);
      return slotHour >= targetHour;
    }) || "18:00 - 19:00";
};

export function CreateClassModal({ isOpen, onOpenChange, isUpdating, onSave, classesList }: CreateClassModalProps) {
  const [newClass, setNewClass] = useState({ 
    name: "Boxeo", 
    date: "", 
    time: "18:00 - 19:00", 
    coach: "Álex Pintor", 
    capacity: 30 
  });
  const [isSuccess, setIsSuccess] = useState(false);

  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  const localTodayISO = new Date(Date.now() - tzOffset).toISOString().split('T')[0];
  const now = new Date();
  const currentHour = now.getHours();

  useEffect(() => {
    if (isOpen) {
      const smartDefault = getSmartDefaultTime();
      setNewClass(prev => ({ ...prev, date: localTodayISO, time: smartDefault }));
    }
  }, [isOpen, localTodayISO]);

  const isDuplicate = classesList.some(cls =>
    cls.date.substring(0, 10) === newClass.date &&
    cls.time.trim() === newClass.time.trim()
  );

  const selectedStartHour = parseInt(newClass.time.split(':')[0]);
  const isPastTime = newClass.date === localTodayISO && selectedStartHour <= currentHour;

  const handleSubmit = async () => {
    if (isUpdating) return;
    const res = await onSave(newClass);
    if (res?.success) {
      setIsSuccess(true);
      onOpenChange(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        showCloseButton={false}
        className="bg-zinc-950 border-white/10 text-white max-w-md rounded-[2rem] overflow-hidden backdrop-blur-2xl p-0 focus:outline-none shadow-2xl max-h-[96vh] flex flex-col"
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
            <Calendar className="w-6 h-6 text-emerald-400" /> Programar Clase
          </DialogTitle>
          <DialogDescription className="text-white/40 font-medium italic">
            Añade una nueva sesión al calendario de la comunidad.
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-6 relative z-10 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormSelect
                label="Disciplina"
                value={newClass.name}
                onChange={(val) => setNewClass({ ...newClass, name: val })}
                options={["Boxeo", "K1", "Sparring"]}
              />
              <FormField
                label="Monitor"
                value={newClass.coach}
                onChange={(val) => setNewClass({ ...newClass, coach: val })}
                placeholder="Coach"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Fecha"
                type="date"
                min={localTodayISO}
                value={newClass.date}
                onChange={(val) => setNewClass({ ...newClass, date: val })}
                icon={Calendar}
              />
              <FormSelect
                label="Horario"
                value={newClass.time}
                onChange={(val) => setNewClass({ ...newClass, time: val })}
                options={TIME_SLOTS}
              />
            </div>

            <FormField
              label="Cupo Máximo"
              type="number"
              min="0"
              max={40}
              value={newClass.capacity}
              onChange={(val) => setNewClass({ ...newClass, capacity: val })}
              icon={Users}
            />

            <StatusAlert 
              show={isDuplicate && !isUpdating && !isSuccess} 
              message="Conflicto: Ya existe una clase a esta misma hora." 
            />
            <StatusAlert 
              show={!isDuplicate && isPastTime} 
              message="Error: No puedes programar clases en el pasado." 
            />
            <StatusAlert 
              show={newClass.capacity > 40} 
              message={`Atención: El cupo máximo permitido es de 40 personas (has puesto ${newClass.capacity}).`} 
              variant="warning"
            />
            <StatusAlert 
              show={newClass.capacity < 0} 
              message="Error: El cupo no puede ser un número negativo." 
              variant="danger"
            />
          </div>

          <div className="pt-2">
            <ModalSubmitButton
              label="PUBLICAR CLASE EN CALENDARIO"
              onClick={handleSubmit}
              disabled={
                isDuplicate || 
                isPastTime || 
                !newClass.date || 
                !newClass.time || 
                newClass.capacity > 40 || 
                newClass.capacity < 0 ||
                isNaN(newClass.capacity)
              }
              isLoading={isUpdating}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
