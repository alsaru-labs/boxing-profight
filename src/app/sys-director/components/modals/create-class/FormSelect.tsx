"use client";

import { Label } from "@/components/ui/label";

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[] | { value: string; label: string }[];
  className?: string;
}

export function FormSelect({ label, value, onChange, options, className = "" }: FormSelectProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">
        {label}
      </Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 text-white rounded-xl h-12 px-4 transition-all focus:border-emerald-500/50 font-bold text-sm appearance-none cursor-pointer"
      >
        {options.map((opt) => {
          const val = typeof opt === "string" ? opt : opt.value;
          const lab = typeof opt === "string" ? opt : opt.label;
          return (
            <option key={val} value={val} className="bg-zinc-900">
              {lab}
            </option>
          );
        })}
      </select>
    </div>
  );
}
