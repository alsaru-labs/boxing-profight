import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-12 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Volver al inicio
        </Link>

        <div className="flex items-center gap-4 mb-4">
          <ShieldCheck className="w-12 h-12 text-white" strokeWidth={1} />
          <h1 className="text-5xl font-black uppercase tracking-tighter italic">Privacidad</h1>
        </div>
        <p className="text-white/40 mb-12 uppercase tracking-widest text-sm font-medium">Protección de datos personales (RGPD)</p>

        <div className="space-y-12 text-white/70 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-tight">1. RESPONSABLE DEL TRATAMIENTO</h2>
            <p>
              El responsable del tratamiento de sus datos es Boxing Profight, con los datos de contacto especificados en el Aviso Legal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-tight">2. FINALIDAD Y DATOS RECOGIDOS</h2>
            <p>
              En Boxing Profight recogemos única y exclusivamente los datos necesarios para la gestión del club: <strong className="text-white">nombre, apellidos, correo electrónico y número de teléfono</strong>.
            </p>
            <p className="mt-4">
              Estos datos se utilizan estrictamente para su registro en la plataforma y para el envío de notificaciones importantes sobre el servicio. <strong className="text-white">No enviamos newsletters ni utilizamos sus datos para fines promocionales.</strong>
            </p>
            <p className="mt-4">
              Para prestar el servicio, utilizamos las siguientes infraestructuras tecnológicas:
            </p>
            <ul className="mt-4 space-y-4">
              <li className="p-4 border border-white/10 bg-white/5">
                <span className="text-white font-bold block mb-1 uppercase text-xs tracking-widest italic">Appwrite</span>
                Gestión de base de datos segura y autenticación de usuarios.
              </li>
              <li className="p-4 border border-white/10 bg-white/5">
                <span className="text-white font-bold block mb-1 uppercase text-xs tracking-widest italic">Vercel</span>
                Alojamiento y despliegue de la aplicación web, garantizando alta disponibilidad y seguridad perimetral.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-tight">3. LEGITIMACIÓN</h2>
            <p>
              La base legal para el tratamiento es la ejecución del contrato de prestación de servicios deportivos y el consentimiento explícito prestado al aceptar estos términos durante su registro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-tight">4. DERECHOS ARCO</h2>
            <p>
              Usted tiene derecho a acceder, rectificar y suprimir los datos, así como otros derechos adicionales (limitación y portabilidad), escribiendo a
              <span className="text-white italic"> alexpintor@hotmail.es</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
