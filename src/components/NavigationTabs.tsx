"use client";

import { LucideIcon } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TabItem {
  value: string;
  label: string;
  icon?: LucideIcon;
}

interface NavigationTabsProps {
  tabs: TabItem[];
  className?: string;
}

export function NavigationTabs({ tabs, className = "" }: NavigationTabsProps) {
  return (
    <TabsList className={`bg-zinc-900/50 p-1 rounded-2xl border border-white/5 w-full max-w-[600px] mx-auto sm:max-w-none !h-auto flex flex-row gap-1 ${className}`}>
      {tabs.map((tab) => (
        <TabsTrigger 
          key={tab.value}
          value={tab.value} 
          className="flex-1 rounded-xl px-2 sm:px-8 py-3.5 data-[state=active]:bg-white data-[state=active]:text-black font-black transition-all flex items-center justify-center gap-2 text-[10px] sm:text-sm whitespace-nowrap uppercase tracking-tighter sm:tracking-normal"
        >
          {tab.icon && <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          <span>{tab.label}</span>
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
