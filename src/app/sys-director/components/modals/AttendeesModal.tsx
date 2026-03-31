"use client";

import { Loader2, Signal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { databases, DATABASE_ID, COLLECTION_BOOKINGS, COLLECTION_PROFILES } from "@/lib/appwrite";
import { Query } from "appwrite";

interface AttendeesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClass: any;
  allStudents: any[];
}

export function AttendeesModal({ isOpen, onOpenChange, selectedClass, allStudents }: AttendeesModalProps) {
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAttendees = async () => {
      if (!selectedClass || !isOpen) return;
      try {
        setLoading(true);
        const bookingsData = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_BOOKINGS,
          [Query.equal("class_id", selectedClass.$id), Query.limit(100)]
        );

        const studentIds = bookingsData.documents.map(b => b.student_id);
        
        // Find students we already have in the provided list
        const foundStudents = allStudents.filter(student => studentIds.includes(student.$id));
        const foundIds = foundStudents.map(s => s.$id);
        const missingIds = studentIds.filter(id => !foundIds.includes(id));

        // If some students (likely inactives) are not in the main list, fetch them individually
        let extraStudents: any[] = [];
        if (missingIds.length > 0) {
          const fetchPromises = missingIds.map(id => 
            databases.getDocument(DATABASE_ID, COLLECTION_PROFILES, id)
              .catch(() => null)
          );
          const results = await Promise.all(fetchPromises);
          extraStudents = results.filter(r => r !== null);
        }

        setAttendees([...foundStudents, ...extraStudents]);
      } catch (error) {
        console.error("Error fetching attendees:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendees();
  }, [selectedClass, isOpen, allStudents]);

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
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : attendees.length === 0 ? (
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
