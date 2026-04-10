import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white rounded-xl px-4 focus:border-emerald-500/50 transition-all font-bold text-sm hover:bg-white/10 shadow-none">
          <SelectValue placeholder={`Seleccionar ${label}`} />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-xl shadow-2xl backdrop-blur-xl max-h-[300px]">
          {options.map((opt) => {
            const val = typeof opt === "string" ? opt : opt.value;
            const lab = typeof opt === "string" ? opt : opt.label;
            return (
              <SelectItem 
                key={val} 
                value={val}
                className="focus:bg-emerald-500/10 focus:text-emerald-400 font-bold py-3 transition-colors cursor-pointer"
              >
                {lab}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
