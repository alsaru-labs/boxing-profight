import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Cookie } from 'lucide-react';

export default function CookiesPage() {
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
          <Cookie className="w-12 h-12 text-white" strokeWidth={1} />
          <h1 className="text-5xl font-black uppercase tracking-tighter italic">Cookies</h1>
        </div>
        <p className="text-white/40 mb-12 uppercase tracking-widest text-sm font-medium">Información sobre el uso de cookies</p>

        <div className="space-y-12 text-white/70 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-tight">1. ¿QUÉ SON LAS COOKIES?</h2>
            <p>
              Una cookie es un pequeño fichero de texto que se almacena en su navegador cuando visita casi cualquier página web. Su utilidad es que la web sea capaz de recordar su visita cuando vuelva a navegar por esa página.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-tight">2. USO DE COOKIES EN ESTA APP</h2>
            <p>
              Siguiendo las directrices de la Agencia Española de Protección de Datos, procedemos a detallar el uso de cookies de esta aplicación:
            </p>
            <div className="mt-4 p-6 border border-white/10 bg-white/5">
              <span className="text-white font-bold block mb-2 uppercase text-xs tracking-widest italic">Cookies Técnicas (Estrictamente Necesarias)</span>
              <p>
                Esta aplicación **SOLO** utiliza cookies técnicas de sesión nativas proporcionadas por nuestro proveedor de autenticación (Appwrite). Estas cookies son esenciales para:
              </p>
              <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
                <li>Mantener su sesión iniciada mientras navega.</li>
                <li>Identificarle de forma única para gestionar sus reservas.</li>
                <li>Garantizar la seguridad de sus datos y acceso.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-tight">3. EXENCIÓN DE CONSENTIMIENTO</h2>
            <p>
              Al tratarse exclusivamente de cookies técnicas necesarias para la prestación del servicio solicitado (autenticación y acceso), **están exentas del deber de consentimiento** y no requieren de un banner publicitario de aceptación, de acuerdo con el artículo 22.2 de la LSSI-CE.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white uppercase mb-4 tracking-tight">4. DESACTIVACIÓN DE COOKIES</h2>
            <p>
              En cualquier momento podrá ejercer su derecho de desactivación o eliminación de cookies de este sitio web. Estas acciones se realizan de forma diferente en función del navegador que esté usando. Tenga en cuenta que si desactiva las cookies técnicas, la aplicación dejará de funcionar correctamente.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
