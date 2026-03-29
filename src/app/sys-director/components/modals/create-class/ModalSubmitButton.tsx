"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ModalSubmitButtonProps {
  label: string;
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
}

export function ModalSubmitButton({ label, onClick, disabled, isLoading }: ModalSubmitButtonProps) {
  return (
    <Button
      size="xl"
      onClick={onClick}
      disabled={disabled || isLoading}
      className="w-full bg-white text-black hover:bg-emerald-500 hover:text-white font-black tracking-widest uppercase rounded-xl shadow-xl transition-all disabled:opacity-20 text-[11px] h-14"
    >
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : label}
    </Button>
  );
}
