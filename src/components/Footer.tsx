import Link from "next/link";
import { Instagram as InstagramIcon, Mail as MailIcon, MapPin as MapPinIcon } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-white/5 bg-black pt-24 pb-12 px-6 md:px-12 lg:px-24 overflow-hidden relative">

      {/* Decorative Large Background Typography */}
      <div className="absolute -bottom-10 -right-20 pointer-events-none select-none opacity-[0.01]">
        <span className="text-[25vw] font-black leading-none uppercase tracking-tighter italic">PROFIGHT</span>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 md:gap-12 items-start">

          {/* Logo & Headline */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <h2 className="text-4xl font-black uppercase tracking-tighter leading-none italic">
              BOXING <br /> PROFIGHT
            </h2>
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.3em]">
              El templo del boxeo <br /> en Alcorcón
            </p>
          </div>

          {/* Contact & Info */}
          <div className="flex flex-col gap-8">
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Ubicación</div>
              <Link
                href="https://maps.google.com/?q=Calle+Zarza+26,Alcorcón"
                target="_blank"
                className="flex items-center gap-3 text-white/50 hover:text-white text-xs font-bold transition-colors group"
              >
                <MapPinIcon className="w-4 h-4 opacity-30 group-hover:opacity-100 transition-opacity" />
                <span>Calle Zarza 26, Alcorcón</span>
              </Link>
            </div>
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Contacto</div>
              <div className="flex items-center gap-3 text-white/50 text-xs font-bold whitespace-nowrap">
                <MailIcon className="w-4 h-4 opacity-30" />
                <span>boxingprofight@gmail.com</span>
              </div>
            </div>
          </div>

          {/* Legal Links */}
          <div className="flex flex-col gap-8 lg:items-end lg:text-right">
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Legal</div>
              <div className="flex flex-col gap-3">
                <Link href="/legal/aviso-legal" className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">Aviso Legal</Link>
                <Link href="/legal/privacidad" className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">Privacidad</Link>
                <Link href="/legal/terminos" className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">Términos</Link>
                <Link href="/legal/cookies" className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">Cookies</Link>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Line */}
        <div className="mt-24 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/10 italic">
            &copy; {currentYear} Boxing Profight — No pain no gain
          </div>

          <div className="flex items-center gap-8">
            <Link
              href="https://www.instagram.com/boxing_profight__/"
              target="_blank"
              className="text-white/20 hover:text-white transition-colors"
              aria-label="Instagram"
            >
              <InstagramIcon className="w-5 h-5" />
            </Link>
            <div className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 flex items-center gap-2">
              <span>Dev by</span>
              <Link href="https://alsaru.dev" target="_blank" className="text-white/40 hover:text-white transition-colors">alsaru.dev</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
