# 🥊 Boxing Profight

Plataforma integral para la gestión de reservas de clases de boxeo, perfiles de estudiantes y administración del gimnasio. Diseñada con una arquitectura "Zero-Waste", sincronización en tiempo real y una estética brutalista premium.

## 🚀 Despliegue

La aplicación se encuentra desplegada en **Vercel** y está disponible en producción bajo el dominio principal.
🔗 **[boxingprofight.es](https://boxingprofight.es)**

---

## 🌟 Características Principales

### Para Estudiantes
- **Agenda Personal y Reservas:** Sistema de reservas de clases en tiempo real, validación visual de cupos ("available slots") y prevención de reservas duplicadas (verificación `server-side`).
- **Progressive Web App (PWA):** Experiencia nativa en iOS y Android con prompt de instalación inteligente y no intrusivo para una accesibilidad móvil óptima.
- **Recuperación de Contraseña Segura:** Flujo de recuperación de credenciales mediante tokens temporales y notificaciones por correo electrónico automáticas.

### Para Administradores
- **Dashboard de Gestión:** Panel centralizado para administrar clases, controlar la capacidad y gestionar los períodos de gracia de asistencia.
- **Sistema de Anuncios y Notificaciones:** Envío granular de notificaciones push multiplataforma y sincronización de estado instantáneo.
- **Gestión de Invitaciones:** Servicio de correo automatizado para el registro de nuevos miembros y validación de usuarios.

### Arquitectura y Experiencia (UX/UI)
- **Estética Brutalista Premium:** Interfaz minimalista enfocada en la conversión, animaciones fluidas y un diseño libre de elementos visuales innecesarios (sin insignias reduntantes, enfocado en el contenido).
- **Sincronización Inmediata ("Real-Time"):** Actualizaciones instantáneas en la UI gracias a una sólida arquitectura reactiva y el patrón de invalidación atómica para los estados informativos.
- **Notificaciones Push Multidispositivo:** Avisos instantáneos al dispositivo móvil o escritorio del usuario usando robustos Service Workers.

---

## 💻 Stack Tecnológico y Detalles Técnicos

### Frontend / Core
- **Framework:** [Next.js 16](https://nextjs.org/) (App Router), aprovechando componentes de servidor inter-rutas de alta velocidad.
- **Lenguaje:** TypeScript.
- **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/) acompañado de piezas robustas de UI integradas vía [`shadcn/ui`](https://ui.shadcn.com/) y `@base-ui/react`.
- **Animaciones:** [Framer Motion](https://www.framer.com/motion/) y utilidades personalizadas (`tw-animate-css`).
- **Fechas e Iconografía:** Utilización de `date-fns`, `react-day-picker` y `lucide-react`.

### Backend / Bases de Datos
- **BaaS (Backend as a Service):** [Appwrite](https://appwrite.io/) manejado a través de los SDKs oficiales (`appwrite`, `node-appwrite`) como base de datos y orquestador maestro, con una optimización estricta para resolver consultas N+1.
- **Caching & Estado ("Zero-Waste"):** Estrategia rigurosa de caché del servidor usando `unstable_cache` con purga/revalidación atómica (`revalidatePath` / `revalidateTag`) para eludir llamados a la red redundantes y aliviar la base de datos de manera proactiva.
- **Server Actions:** Operaciones de mutación de estado seguras en el servidor para prevenciones de dualidad (ej., protección ante reservas en paralelo y mutaciones de correos).

### Pagos e Infraestructura Logística
- **Hosting y CI/CD:** [Vercel](https://vercel.com) como entorno principal de despliegue y detección base de domains para multientornos de staging y producción.
- **Correos Electrónicos:** Motor automatizado centralizado transaccional a través del remitente de verificación `no-reply@boxingprofight.es`.
- **Notificaciones Push:** Suscripción, cifrado y envíos garantizados por un sólido uso del protocolo Web Push (`web-push`).