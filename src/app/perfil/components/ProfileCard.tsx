"use client";

import { Mail, Phone, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ProfileCardProps {
  user: any;
  profileInfo: any;
  initials: string;
}

export function ProfileCard({ user, profileInfo, initials }: ProfileCardProps) {
  return (
    <Card className="bg-white/5 border-white/10 overflow-hidden h-full">
      <CardHeader className="flex flex-col items-center pt-8 pb-4">
        <div className="mb-4">
          <Avatar className="w-32 h-32 border-2 border-white/10 shadow-2xl">
            <AvatarFallback className="bg-zinc-800 text-3xl font-bold">{initials}</AvatarFallback>
          </Avatar>
        </div>
        <CardTitle 
          className="text-3xl font-black tracking-tighter text-white truncate w-full text-center px-4"
          title={profileInfo?.name ? `${profileInfo.name} ${profileInfo.last_name || ""}` : user?.name}
        >
          {profileInfo?.name ? `${profileInfo.name} ${profileInfo.last_name || ""}` : (user?.name || "Cargando...")}
        </CardTitle>

        <CardDescription className="text-white/40 font-medium">
          Desde {user?.$createdAt ? new Date(user.$createdAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : "---"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="bg-white/10 p-2 rounded-lg"><Mail className="w-5 h-5 text-emerald-400" /></div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">Email</span>
              <span className="text-sm font-medium truncate" title={user?.email}>{user?.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="bg-white/10 p-2 rounded-lg"><Phone className="w-5 h-5 text-emerald-400" /></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">Teléfono</span>
              <span className="text-sm font-medium">{profileInfo?.phone || "No registrado"}</span>
            </div>
          </div>
        </div>

        {/* Subscription Status inside profile card */}
        <div className="pt-6 border-t border-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Estado de Membresía</span>
            {profileInfo?.is_paid ? (
              <Badge className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase">
                <CheckCircle2 className="w-3.5 h-3.5" /> PAGADO
              </Badge>
            ) : (
              <Badge className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)] px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase">
                <AlertCircle className="w-3.5 h-3.5" /> PENDIENTE
              </Badge>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black">55€</span>
            <span className="text-white/40 text-xs italic">/ mes</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
