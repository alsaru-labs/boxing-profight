"use client";

import { AlertCircle } from "lucide-react";

interface StatusAlertProps {
  show: boolean;
  message: string;
  variant?: "danger" | "warning" | "info";
}

export function StatusAlert({ show, message, variant = "danger" }: StatusAlertProps) {
  if (!show) return null;

  return (
    <div className={`
      border p-3 rounded-xl text-[11px] font-bold italic flex items-center gap-2
      ${variant === "danger" ? "bg-red-500/10 border-red-500/20 text-red-500" : ""}
      ${variant === "warning" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : ""}
      ${variant === "info" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : ""}
    `}>
      <AlertCircle className="w-4 h-4" />
      <span>{message}</span>
    </div>
  );
}
