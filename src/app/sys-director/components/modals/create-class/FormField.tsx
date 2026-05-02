"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LucideIcon } from "lucide-react";

interface FormFieldProps {
  label: string;
  value: string | number;
  onChange: (value: any) => void;
  type?: string;
  placeholder?: string;
  icon?: LucideIcon;
  min?: string;
  max?: string | number;
  className?: string;
}

export function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  icon: Icon,
  min,
  max,
  className = ""
}: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">
        {label}
      </Label>
      <div className="relative">
        <Input
          type={type}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
          placeholder={placeholder}
          className={`w-full max-w-full min-w-0 bg-white/5 border-white/10 h-12 focus:border-emerald-500/50 transition-all font-bold ${Icon ? "pl-10" : ""}`}
        />
        {Icon && (
          <Icon className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-500/40 pointer-events-none" />
        )}
      </div>
    </div>
  );
}
