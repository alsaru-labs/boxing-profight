"use client";

import { Users, CalendarDays, MessageCircle } from "lucide-react";
import { NavigationTabs } from "@/components/NavigationTabs";

export function AdminTabs() {
  const tabs = [
    { value: "general", label: "General", icon: Users },
    { value: "clases", label: "Clases", icon: CalendarDays },
    { value: "tablon", label: "Tablón", icon: MessageCircle },
  ];

  return <NavigationTabs tabs={tabs} className="mb-8" />;
}
