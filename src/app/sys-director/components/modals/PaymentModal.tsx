"use client";

import { X, CreditCard, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface PaymentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  student: any;
  isUpdating: boolean;
  onConfirm: (studentId: string, status: boolean, method: string, amount: string) => Promise<boolean>;
}

export function PaymentModal({ isOpen, onOpenChange, student, isUpdating, onConfirm }: PaymentModalProps) {
  const [amount, setAmount] = useState("55");
  const [method, setMethod] = useState("Efectivo");

  useEffect(() => {
    if (isOpen) {
      setAmount("55");
      setMethod("Efectivo");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        showCloseButton={false}
        className="bg-zinc-950 border-white/10 text-white max-w-md rounded-[2rem] overflow-hidden backdrop-blur-2xl p-0 focus:outline-none shadow-2xl max-h-[96vh] flex flex-col"
      >
        <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
        
        <button 
          onClick={() => onOpenChange(false)}
          className="absolute right-6 top-6 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <DialogHeader className="p-8 pb-0 relative z-10">
          <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" /> Registrar Pago
          </DialogTitle>
          <DialogDescription className="text-white/40 font-medium">
            Confirmar mensualidad de <strong className="text-white">{student?.name}</strong>. Rellena los detalles.
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-6 relative z-10 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-[10px] font-black uppercase tracking-widest text-white/40">Cantidad Recibida (€)</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-white/5 border-white/10 h-12 pl-10 focus:border-emerald-500/50 transition-all font-bold text-lg"
                  placeholder="55"
                />
                <div className="absolute left-3.5 top-3.5 text-white/20 font-bold">€</div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Método de Pago</Label>
              <div className="grid grid-cols-3 gap-2">
                {["Efectivo", "Bizum", "Tarjeta"].map((m) => (
                  <Button
                    key={m}
                    variant="ghost"
                    size="xl"
                    onClick={() => setMethod(m)}
                    className={`border transition-all font-black text-[10px] tracking-widest uppercase rounded-xl ${
                      method === m 
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                      : "bg-white/5 border-white/5 text-white/20 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogHeader className="pt-2">
            <Button
              size="xl"
              onClick={async () => {
                const success = await onConfirm(student?.$id, true, method, amount);
                if (success) onOpenChange(false);
              }}
              disabled={isUpdating}
              className="w-full bg-white text-black hover:bg-emerald-500 hover:text-white font-black tracking-widest uppercase rounded-xl shadow-xl transition-all disabled:opacity-20"
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "CONFIRMAR INGRESO"}
            </Button>
          </DialogHeader>
        </div>
      </DialogContent>
    </Dialog>
  );
}
