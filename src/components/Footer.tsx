import Link from "next/link";
import { Instagram, Mail, MapPin } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-white/10 bg-black pt-24 pb-12 px-6 md:px-12 lg:px-24 overflow-hidden relative">
      
      {/* Decorative Large Background Typography */}
      <div className="absolute -bottom-10 -right-20 pointer-events-none select-none opacity-[0.02]">
        <span className="text-[25vw] font-black leading-none uppercase tracking-tighter">PROFIGHT</span>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-12 items-start">
          
          {/* Logo & Headline */}
          <div className="flex flex-col gap-6">
            <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">
              BOXING <br /> PROFIGHT
            </h2>
            <p className="text-white/30 text-xs font-bold uppercase tracking-[0.2em]">
              El templo del boxeo <br /> en Alcorcón
            </p>
          </div>

          {/* Social & Contact */}
          <div className="flex flex-col gap-10">
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Social Network</div>
              <div className="flex items-center gap-4">
                <Link 
                  href="https://www.instagram.com/boxing_profight__/" 
                  target="_blank" 
                  className="w-12 h-12 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all"
                  aria-label="Instagram de Boxing Profight"
                >
                  <Instagram className="w-6 h-6" />
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Contact & Info</div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 text-white/50 text-xs font-bold transition-colors cursor-default">
                  <Mail className="w-4 h-4 opacity-30" />
                  <span>boxingprofight@gmail.com</span>
                </div>
                <Link 
                  href="https://maps.google.com/?q=Calle+Zarza+26,Alcorcón" 
                  target="_blank" 
                  className="flex items-center gap-3 text-white/50 hover:text-white text-xs font-bold transition-colors"
                >
                  <MapPin className="w-4 h-4 opacity-30" />
                  <span>Calle Zarza 26, Alcorcón</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Legal & Credits */}
          <div className="flex flex-col gap-10 lg:items-end lg:text-right">
             <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Legal</div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-white/40">
                &copy; {currentYear} Boxing Profight
              </div>
            </div>

            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 flex items-center gap-2">
              <span>Development</span>
              <Link 
                href="https://alsaru.dev" 
                target="_blank" 
                className="text-white/50 hover:text-white transition-colors"
              >
                alsaru.dev
              </Link>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}
