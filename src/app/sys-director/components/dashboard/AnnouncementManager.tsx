"use client";

import { MessageCircle, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LITERALS } from "@/constants/literals";
import { useState } from "react";
import { publishAnnouncementAction, deleteAnnouncement } from "../../actions";

interface AnnouncementManagerProps {
  announcements: any[];
  setAnnouncements: (val: any) => void;
  showAlert: (title: string, msg: string, v: any) => void;
  showConfirm: (t: string, d: string, c: () => void, v: any) => void;
}

export function AnnouncementManager({ announcements, setAnnouncements, showAlert, showConfirm }: AnnouncementManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "", type: "info" });

  const handlePublish = () => {
    if (!newAnnouncement.title || !newAnnouncement.content) return;
    showConfirm(
      "Confirmar Publicación",
      "¿Estás seguro de que quieres publicar este anuncio?",
      async () => {
        setIsCreating(true);
        try {
          const res = await publishAnnouncementAction({
            title: newAnnouncement.title,
            content: newAnnouncement.content,
            type: newAnnouncement.type
          });
          if (res.success && res.data) {
            setAnnouncements([res.data, ...announcements]);
            setNewAnnouncement({ title: "", content: "", type: "info" });
            showAlert("Éxito", "Anuncio publicado.", "success");
          } else {
            showAlert("Error", "No se pudo publicar.", "danger");
          }
          setAnnouncements([res, ...announcements]);
          setNewAnnouncement({ title: "", content: "", type: "info" });
          showAlert("Éxito", "Anuncio publicado.", "success");
        } catch (e) {
          showAlert("Error", "No se pudo publicar.", "danger");
        } finally {
          setIsCreating(false);
        }
      },
      "warning"
    );
  };

  const handleDelete = (id: string) => {
    showConfirm(
      "Borrar Anuncio",
      "¿Seguro que quieres borrar este anuncio?",
      async () => {
        try {
          const result = await deleteAnnouncement(id);
          if (result.success) {
            setAnnouncements(announcements.filter(a => a.$id !== id));
            showAlert("Éxito", "Anuncio eliminado.", "success");
          } else {
            showAlert("Error", result.error || "No se pudo borrar.", "danger");
          }
        } catch (e) {
          showAlert("Error", "No se pudo borrar.", "danger");
        }
      },
      "danger"
    );
  };

  return (
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
            <Select 
              value={newAnnouncement.type} 
              onValueChange={(val) => setNewAnnouncement({ ...newAnnouncement, type: val })}
            >
              <SelectTrigger className="w-full bg-black/40 border-white/10 rounded-md p-2 text-sm text-white focus:ring-emerald-500 font-bold h-11">
                <SelectValue placeholder="Importancia" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-xl shadow-2xl backdrop-blur-xl">
                <SelectItem value="info" className="focus:bg-blue-500/10 focus:text-blue-400 font-bold py-3 transition-colors cursor-pointer">Info (Azul)</SelectItem>
                <SelectItem value="warning" className="focus:bg-amber-500/10 focus:text-amber-400 font-bold py-3 transition-colors cursor-pointer">Aviso (Ambar)</SelectItem>
                <SelectItem value="success" className="focus:bg-emerald-500/10 focus:text-emerald-400 font-bold py-3 transition-colors cursor-pointer">Éxito (Verde)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handlePublish}
            disabled={isCreating || !newAnnouncement.title || !newAnnouncement.content}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar Anuncio"}
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
                    onClick={() => handleDelete(a.$id)}
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
  );
}
