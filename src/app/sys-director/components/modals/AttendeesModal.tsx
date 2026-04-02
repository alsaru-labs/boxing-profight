"use client";

import { Loader2, Signal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { databases, DATABASE_ID, COLLECTION_BOOKINGS, COLLECTION_PROFILES } from "@/lib/appwrite";
import { Query } from "appwrite";

import { useAdmin } from "@/contexts/AdminContext";

interface AttendeesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClass: any;
}

export function AttendeesModal({ isOpen, onOpenChange, selectedClass }: AttendeesModalProps) {
  const { bookingsList, studentsList } = useAdmin();

  // 🌪️ Zero-Fetch transformation: Filter bookings locally
  const attendees = isOpen && selectedClass ? bookingsList
    .filter(b => b.class_id === selectedClass.$id)
    .map(booking => {
        const student = studentsList.find(s => s.$id === booking.student_id);
        return student || { 
            $id: booking.student_id, 
            name: "Alumno (Inactivo)", 
            email: "N/A", 
            level: "N/A", 
            is_active: false 
        };
    }) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 text-white border border-white/10 p-0 overflow-hidden sm:max-w-[450px]">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold">Listado de Alumnos</DialogTitle>
          <DialogDescription className="text-white/50">
            {selectedClass?.name} ({selectedClass?.time})
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto px-6 pb-6">
          {attendees.length === 0 ? (
            <div className="text-center text-white/40 py-8 italic">
              Aún no hay ningún alumno apuntado a esta clase.
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {attendees.map(student => (
                <div key={student.$id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-white/10">
                      <AvatarFallback className="bg-zinc-800 text-white font-bold">{student.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-white text-sm flex items-center gap-1.5">
                        {student.name}
                        {(student.status === 'Baja' || student.is_active === false) && (
                          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[8px] h-4 font-black px-1.5 uppercase tracking-tighter">Baja</Badge>
                        )}
                      </p>
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
                      <Signal className="w-3 h-3 mr-1" />
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
  );
}
