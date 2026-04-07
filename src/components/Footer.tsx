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
                  href="https://wa.me/34685011715?text=Hola%20estoy%20interesado%20en%20reservar%20clases" 
                  target="_blank" 
                  className="w-12 h-12 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all"
                  aria-label="Contactar por WhatsApp"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-6 h-6"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </Link>
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
