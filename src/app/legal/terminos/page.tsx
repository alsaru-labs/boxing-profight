import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Gavel } from 'lucide-react';

export default function TerminosPage() {
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
          <Gavel className="w-12 h-12 text-white" strokeWidth={1} />
          <h1 className="text-5xl font-black uppercase tracking-tighter italic">Términos</h1>
        </div>
        <p className="text-white/40 mb-12 uppercase tracking-widest text-sm font-medium">Condiciones de uso y reglamento interno</p>

        <div className="space-y-12 text-white/70 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-tight">1. RESERVAS Y CANCELACIONES</h2>
            <p>
              El sistema de reservas permite asegurar su plaza en las clases de Boxeo y K1. Las cancelaciones deben realizarse con un mínimo de 
              <span className="text-white italic font-bold"> 2 horas de antelación</span>. La no asistencia sin cancelación previa podrá ser penalizada según el reglamento del centro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-tight">2. PAGOS Y REEMBOLSOS</h2>
            <p>
              Las cuotas mensuales deben abonarse en los primeros 5 días de cada mes. 
              <span className="text-white font-bold italic"> No se realizarán reembolsos</span> por ausencias personales, vacaciones o falta de uso de las instalaciones una vez abonada la cuota.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-tight">3. DERECHOS DE IMAGEN</h2>
            <p>
              Al aceptar estos términos, el usuario autoriza a Boxing Profight a la toma de fotografías o vídeos durante los entrenamientos y eventos para su posterior 
              uso en redes sociales y materiales promocionales del propio gimnasio, siempre respetando el honor y la dignidad de la persona.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-tight">4. RESPONSABILIDAD</h2>
            <p>
              La práctica de deportes de contacto conlleva riesgos inherentes. El usuario declara estar en condiciones físicas óptimas y asume la responsabilidad 
              de seguir las instrucciones de los entrenadores para minimizar riesgos de lesiones.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
