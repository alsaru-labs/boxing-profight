import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AvisoLegalPage() {
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

        <h1 className="text-5xl font-black uppercase tracking-tighter mb-4 italic">Aviso Legal</h1>
        <p className="text-white/40 mb-12 uppercase tracking-widest text-sm font-medium">Información societaria y de contacto</p>

        <div className="space-y-12 text-white/70 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-tight">1. DATOS IDENTIFICATIVOS</h2>
            <p>
              En cumplimiento con el deber de información recogido en artículo 10 de la Ley 34/2002, de 11 de julio,
              de Servicios de la Sociedad de la Información y del Comercio Electrónico (LSSI-CE), se reflejan los siguientes datos:
            </p>
            <ul className="mt-4 space-y-2 list-disc list-inside">
              <li><span className="text-white font-medium italic">Titular:</span> [NOMBRE_FISICO_O_EMPRESA]</li>
              <li><span className="text-white font-medium italic">CIF/NIF:</span> [NIF_PROVISIONAL]</li>
              <li><span className="text-white font-medium italic">Domicilio:</span> [DIRECCION_GIMNASIO]</li>
              <li><span className="text-white font-medium italic">Correo electrónico:</span> boxingprofight@gmail.com</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-tight">2. USUARIOS</h2>
            <p>
              El acceso y/o uso de este portal de Boxing Profight atribuye la condición de USUARIO, que acepta, desde dicho acceso
              y/o uso, las Condiciones Generales de Uso aquí reflejadas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-tight">3. USO DEL PORTAL</h2>
            <p>
              Nuestra aplicación proporciona el acceso a multitud de informaciones, servicios o datos (en adelante, "los contenidos")
              en Internet pertenecientes a Boxing Profight o a sus licenciantes a los que el USUARIO pueda tener acceso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-tight">4. PROPIEDAD INTELECTUAL E INDUSTRIAL</h2>
            <p>
              Boxing Profight por sí o como cesionaria, es titular de todos los derechos de propiedad intelectual e industrial de su
              página web, así como de los elementos contenidos en la misma (a título enunciativo, imágenes, sonido, audio, vídeo,
              software o textos; marcas o logotipos, combinaciones de colores, estructura y diseño, selección de materiales usados,
              programas de ordenador necesarios para su funcionamiento, acceso y uso, etc.).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
