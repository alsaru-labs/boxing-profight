import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden font-sans p-6">
            {/* Background Elements */}
            <div className="absolute inset-0 z-0 opacity-80 mix-blend-screen pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] max-w-3xl h-[80%] bg-gradient-to-tr from-red-900/30 via-zinc-900/40 to-black rounded-full blur-[120px]" />
            </div>

            <div className="z-10 flex flex-col items-center text-center max-w-2xl">
                {/* Glow behind the logo */}
                <div className="relative mb-8 group">
                    <div className="absolute inset-0 bg-red-600/20 blur-3xl rounded-full scale-150 animate-pulse" />
                    <div className="w-40 h-40 md:w-56 md:h-56 relative animate-[spin_10s_linear_infinite]">
                        <Image
                            src="/logo_boxing_profight.webp"
                            alt="PROFIGHT Boxeo 404"
                            fill
                            className="rounded-full object-cover border-4 border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)]"
                        />
                    </div>
                </div>

                <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-4 drop-shadow-2xl">
                    404
                </h1>

                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white/90">
                    ¡Golpe al aire!
                </h2>

                <p className="text-lg md:text-xl text-white/50 mb-10 max-w-md mx-auto leading-relaxed">
                    Parece que has intentado esquivar nuestro código, pero esta página está fuera del ring. Vuelve a tu esquina.
                </p>

                <Link
                    href="/"
                    className="inline-flex items-center justify-center bg-white/10 text-white backdrop-blur-lg hover:bg-white/20 border border-white/20 rounded-full transition-all duration-300 font-bold px-10 py-4 text-xl shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] group"
                >
                    <Home className="mr-3 w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                    Volver al Tatami
                </Link>
            </div>

            {/* Decorative text bottom */}
            <div className="absolute bottom-8 text-white/10 font-bold text-6xl md:text-9xl whitespace-nowrap overflow-hidden tracking-tighter select-none pointer-events-none w-full text-center">
                KNOCKOUT ERROR
            </div>
        </div>
    );
}
