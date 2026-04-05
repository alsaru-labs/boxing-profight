"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Info, Loader2, AlertTriangle, AlertOctagon } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "success" | "info";
  isLoading?: boolean;
  showCancel?: boolean;
}

export function ConfirmModal({
  isOpen,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  variant = "info",
  isLoading = false,
  showCancel = true
}: ConfirmModalProps) {
  
  const icons = {
    danger: AlertOctagon,
    warning: AlertTriangle,
    success: CheckCircle2,
    info: Info
  };

  const colors = {
    danger: "text-red-500",
    warning: "text-amber-500",
    success: "text-emerald-500",
    info: "text-blue-500"
  };

  const glows = {
    danger: "shadow-[0_0_20px_rgba(239,68,68,0.2)]",
    warning: "shadow-[0_0_20px_rgba(245,158,11,0.2)]",
    success: "shadow-[0_0_20px_rgba(16,185,129,0.2)]",
    info: "shadow-[0_0_20px_rgba(59,130,246,0.2)]"
  };

  const Icon = icons[variant];
  const colorClass = colors[variant];
  const glowClass = glows[variant];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950/95 border-white/10 text-white sm:max-w-[400px] overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col items-center text-center p-4 space-y-6">
          <div className={`p-4 bg-white/5 rounded-2xl border border-white/10 ${glowClass}`}>
            <Icon className={`w-10 h-10 ${colorClass}`} />
          </div>
          
          <div className="space-y-2">
            <DialogTitle className="text-2xl font-black tracking-tight">{title}</DialogTitle>
            <DialogDescription className="text-white/40 font-medium leading-relaxed">
              {description}
            </DialogDescription>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full pt-4">
            {showCancel && (
              <Button 
                variant="ghost" 
                size="xl"
                onClick={() => onOpenChange(false)}
                className="flex-1 bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-all"
                disabled={isLoading}
              >
                {cancelText}
              </Button>
            )}
            <Button 
              onClick={async (e) => {
                  e.preventDefault();
                  await onConfirm();
              }}
              disabled={isLoading}
              size="xl"
              className={`flex-1 shadow-xl transition-all duration-300 ${
                variant === 'danger' ? 'bg-red-500 hover:bg-red-600 text-white' : 
                variant === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 
                'bg-white text-black hover:bg-neutral-200 shadow-white/5'
              } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span>Procesando...</span>
                </>
              ) : (
                <span>{confirmText}</span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
