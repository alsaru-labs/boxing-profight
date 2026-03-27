"use client";

import { User, Calendar, Settings } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ProfileTabs() {
  return (
    <TabsList className="bg-zinc-900/50 p-1 rounded-2xl border border-white/5 w-full max-w-[500px] mx-auto sm:max-w-none !h-auto flex flex-row gap-1">
      <TabsTrigger value="resumen" className="flex-1 rounded-xl px-2 sm:px-8 py-3.5 data-[state=active]:bg-white data-[state=active]:text-black font-black transition-all flex items-center justify-center gap-2 text-[10px] sm:text-sm whitespace-nowrap uppercase tracking-tighter sm:tracking-normal">
        <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span>Resumen</span>
      </TabsTrigger>
      <TabsTrigger value="clases" className="flex-1 rounded-xl px-2 sm:px-8 py-3.5 data-[state=active]:bg-white data-[state=active]:text-black font-black transition-all flex items-center justify-center gap-2 text-[10px] sm:text-sm whitespace-nowrap uppercase tracking-tighter sm:tracking-normal">
        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span>Clases</span>
      </TabsTrigger>
      <TabsTrigger value="ajustes" className="flex-1 rounded-xl px-2 sm:px-8 py-3.5 data-[state=active]:bg-white data-[state=active]:text-black font-black transition-all flex items-center justify-center gap-2 text-[10px] sm:text-sm whitespace-nowrap uppercase tracking-tighter sm:tracking-normal">
        <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span>Ajustes</span>
      </TabsTrigger>
    </TabsList>
  );
}
