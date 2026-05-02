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
  const formatName = (name: string) => {
    if (!name) return "";
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const fullName = profileInfo?.name 
    ? formatName(`${profileInfo.name} ${profileInfo.last_name || ""}`)
    : formatName(user?.name || "");

  return (
    <Card className="bg-white/5 border-white/10 overflow-hidden h-full">
      <CardHeader className="flex flex-col items-center pt-8 pb-4">
        <div className="mb-4">
          <Avatar className="w-32 h-32 border-2 border-white/10 shadow-2xl">
            <AvatarFallback className="bg-zinc-800 text-3xl font-bold">{initials}</AvatarFallback>
          </Avatar>
        </div>
        <CardTitle 
          className="text-2xl md:text-3xl font-black tracking-tighter text-white w-full text-center px-4 break-words leading-tight"
          title={fullName}
        >
          {fullName || "Cargando..."}
        </CardTitle>

        <CardDescription className="text-white/40 font-medium">
          Desde {user?.$createdAt ? new Date(user.$createdAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : "---"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Subscription Status - Main Info at Top */}
        <div className="pb-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Membresía Activa</span>
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
            <span className="text-3xl font-black">55€</span>
            <span className="text-white/40 text-xs italic font-medium">/ cuota mensual</span>
          </div>
        </div>

        {/* Contact Details */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/5 transition-colors group">
            <div className="bg-white/5 p-2 rounded-lg group-hover:bg-emerald-500/10 transition-colors"><Phone className="w-5 h-5 text-emerald-400" /></div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">Teléfono</span>
              <span className="text-sm font-bold">{profileInfo?.phone || "No registrado"}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/5 transition-colors group">
            <div className="bg-white/5 p-2 rounded-lg group-hover:bg-emerald-500/10 transition-colors">
              <div className="w-5 h-5 flex items-center justify-center font-black text-[8px] text-emerald-400 border border-emerald-500/30 rounded-full">@</div>
            </div>
            <div className="flex flex-col min-w-0 flex-1 text-left">
              <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">Email Principal</span>
              <span className="text-sm font-bold truncate" title={user?.email}>{user?.email}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
