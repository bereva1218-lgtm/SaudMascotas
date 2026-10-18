import { Link } from "react-router-dom";
import { greetingFor } from "@/lib/dates";
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ClipboardList,
  FileText,
  HeartPulse,
  PawPrint,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    eyebrow: "Todos los días",
    title: "Registro diario",
    description: "Anota apetito, energía, ánimo, sueño y movilidad en menos de un minuto.",
    tone: "bg-[#e9f5ef] text-[#2f9b70]",
  },
  {
    icon: Bell,
    eyebrow: "A tiempo",
    title: "Alertas claras",
    description: "Recibe señales útiles cuando un cambio merece tu atención.",
    tone: "bg-[#fff3dc] text-[#ce8a26]",
  },
  {
    icon: FileText,
    eyebrow: "Con perspectiva",
    title: "Reportes",
    description: "Descubre tendencias y comparte la evolución con tu veterinario.",
    tone: "bg-[#eeeafd] text-[#7464cc]",
  },
  {
    icon: PawPrint,
    eyebrow: "En un solo lugar",
    title: "Mis mascotas",
    description: "Centraliza perfiles, cuidados y la historia de cada compañero.",
    tone: "bg-[#fde9e8] text-[#d66c63]",
  },
];

const LandingPage = () => (
  <main className="min-h-screen overflow-hidden bg-[#fbfcfa] text-[#18251f]">
    <div className="absolute inset-x-0 top-0 -z-0 h-[720px] bg-[radial-gradient(circle_at_82%_16%,rgba(207,230,216,0.58),transparent_30%),radial-gradient(circle_at_15%_4%,rgba(241,235,217,0.72),transparent_26%)]" />

    <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
      <Link to="/" className="flex items-center gap-2.5" aria-label="MyPet inicio">
        <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#2f9b70] text-white shadow-[0_8px_20px_rgba(47,155,112,0.2)]">
          <PawPrint className="h-5 w-5" />
        </span>
        <span className="font-display text-[1.45rem] font-extrabold tracking-[-0.03em]">MyPet</span>
      </Link>

      <div className="hidden items-center gap-8 text-sm font-semibold text-[#617069] md:flex">
        <a href="#funciones" className="transition-colors hover:text-[#2f9b70]">Funciones</a>
        <a href="#como-funciona" className="transition-colors hover:text-[#2f9b70]">Cómo funciona</a>
        <a href="#confianza" className="transition-colors hover:text-[#2f9b70]">Por qué MyPet</a>
      </div>

      <div className="flex items-center gap-3">
        <Link to="/login" className="hidden text-sm font-bold text-[#405049] transition-colors hover:text-[#2f9b70] sm:inline-flex">
          Iniciar sesión
        </Link>
        <Link
          to="/register"
          className="inline-flex h-10 items-center rounded-full bg-[#18251f] px-5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
        >
          Crear cuenta
        </Link>
      </div>
    </nav>

    <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-6 pb-20 pt-12 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:pb-28 lg:pt-16">
      <div className="max-w-xl">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-[#e7f3ed] px-4 py-2 text-sm font-bold text-[#2f9b70]">
          <Sparkles className="h-4 w-4" />
          La salud de tu mascota, más cerca
        </div>
        <h1 className="font-display text-[3.7rem] font-extrabold leading-[0.98] tracking-[-0.06em] text-[#18251f] sm:text-[5.3rem]">
          Cuida mejor.
          <span className="block text-[#2f9b70]">Vive más.</span>
        </h1>
        <p className="mt-7 max-w-lg text-lg leading-8 text-[#617069] sm:text-xl">
          MyPet reúne el seguimiento diario, las alertas y los reportes de tu compañero en un espacio simple y humano.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link to="/register" className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-[#2f9b70] px-7 py-3.5 font-bold text-white shadow-[0_12px_25px_rgba(47,155,112,0.22)] transition-transform hover:-translate-y-0.5">
            Empieza gratis <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#funciones" className="inline-flex h-13 items-center justify-center rounded-full border border-[#dbe5df] bg-white/70 px-7 py-3.5 font-bold text-[#405049] transition-colors hover:border-[#2f9b70] hover:text-[#2f9b70]">
            Conoce MyPet
          </a>
        </div>
        <div className="mt-9 flex items-center gap-3 text-sm text-[#718078]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#dff3e6] text-[#2f9b70]"><Check className="h-4 w-4" /></span>
          Pensado para cuidar con tranquilidad
        </div>
      </div>

      <div className="relative mx-auto h-[530px] w-full max-w-[570px] lg:h-[590px]">
        <div className="absolute right-0 top-10 h-[480px] w-[480px] rounded-full bg-[#e8f2e8] opacity-80 blur-[1px] sm:h-[560px] sm:w-[560px]" />
        <div className="absolute left-0 top-24 z-20 hidden w-52 rounded-2xl border border-white bg-white/95 p-4 shadow-[0_18px_45px_rgba(34,53,43,0.14)] sm:block">
          <div className="flex items-center gap-2 text-xs font-bold text-[#617069]"><span className="h-2 w-2 rounded-full bg-[#2f9b70]" /> Todo en orden</div>
          <p className="mt-2 font-display text-lg font-bold">Luna está estable</p>
          <div className="mt-3 h-1.5 rounded-full bg-[#e9f1eb]"><div className="h-1.5 w-4/5 rounded-full bg-[#2f9b70]" /></div>
        </div>
        <div className="absolute right-0 top-0 z-10 h-[530px] w-[270px] rounded-[42px] border-[8px] border-[#18251f] bg-[#2f9b70] p-2 shadow-[0_28px_55px_rgba(29,52,40,0.26)] sm:right-8 sm:h-[570px] sm:w-[292px]">
          <div className="relative h-full overflow-hidden rounded-[31px] bg-[#f7fbf7]">
            <div className="flex items-center justify-between bg-[#2f9b70] px-5 pb-5 pt-4 text-white">
              <div><p className="text-[10px] opacity-75">{greetingFor()}</p><p className="font-display text-lg font-bold">Hola, Andrea</p></div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20"><Bell className="h-4 w-4" /></span>
            </div>
            <div className="space-y-3 px-4 py-4">
              <div className="flex items-center justify-between"><p className="font-display text-sm font-bold">Mis mascotas</p><span className="text-[10px] font-bold text-[#2f9b70]">Ver todas</span></div>
              <div className="flex gap-2"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7dfc7] text-xl">🐶</span><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dcecf0] text-xl">🐱</span><span className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#2f9b70] bg-[#e7f3ed] text-xl">🐰</span></div>
              <div className="rounded-2xl bg-white p-4 shadow-[0_5px_18px_rgba(34,53,43,0.07)]"><div className="flex items-center gap-2 text-[#2f9b70]"><HeartPulse className="h-4 w-4" /><p className="text-xs font-bold">Resumen de salud</p></div><p className="mt-2 font-display text-base font-bold">Todo en equilibrio</p><div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-xl bg-[#edf7f0] p-2 text-center"><p className="text-[9px] text-[#789087]">Ánimo</p><p className="font-display font-bold text-[#2f9b70]">5/5</p></div><div className="rounded-xl bg-[#fff7e9] p-2 text-center"><p className="text-[9px] text-[#789087]">Sueño</p><p className="font-display font-bold text-[#ce8a26]">4/5</p></div><div className="rounded-xl bg-[#f1edff] p-2 text-center"><p className="text-[9px] text-[#789087]">Agua</p><p className="font-display font-bold text-[#7464cc]">5/5</p></div></div></div>
              <div className="rounded-2xl bg-[#18251f] p-4 text-white"><div className="flex items-center justify-between"><p className="text-xs font-bold">Registro diario</p><Activity className="h-4 w-4 text-[#9bddb5]" /></div><p className="mt-1 text-[10px] text-white/60">Lleva el ritmo de su bienestar.</p><div className="mt-3 flex items-center justify-between text-[10px] font-bold"><span className="text-[#9bddb5]">6 indicadores</span><span className="rounded-full bg-white/10 px-2 py-1">Hoy</span></div></div>
              <div className="flex items-center gap-2 rounded-2xl bg-[#fff3dc] p-3 text-[#9d6c25]"><CalendarDays className="h-4 w-4" /><p className="text-[10px] font-bold">Cita veterinaria mañana</p></div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 flex justify-around border-t border-[#e8eee9] bg-white px-2 py-3 text-[#94a39a]"><HeartPulse className="h-4 w-4 text-[#2f9b70]" /><CalendarDays className="h-4 w-4" /><ClipboardList className="h-4 w-4" /><PawPrint className="h-4 w-4" /></div>
          </div>
        </div>
        <div className="absolute bottom-12 right-0 z-20 hidden w-56 rounded-2xl border border-white bg-white/95 p-4 shadow-[0_18px_45px_rgba(34,53,43,0.14)] sm:block"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dff3e6] text-[#2f9b70]"><ShieldCheck className="h-4 w-4" /></span><div><p className="text-[10px] text-[#718078]">Reporte semanal</p><p className="text-sm font-bold">Progreso saludable</p></div></div></div>
      </div>
    </section>

    <section id="funciones" className="relative bg-white px-6 py-20 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#2f9b70]">Una mirada completa</p><h2 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">Todo lo que necesitas para cuidar mejor.</h2></div><div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{features.map(({ icon: Icon, eyebrow, title, description, tone }) => <article key={title} className="rounded-[24px] border border-[#e8eee9] bg-[#fbfcfa] p-6 transition-transform hover:-translate-y-1"><span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></span><p className="mt-7 text-xs font-extrabold uppercase tracking-[0.12em] text-[#8a9a91]">{eyebrow}</p><h3 className="mt-2 font-display text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-[#718078]">{description}</p></article>)}</div></div>
    </section>

    <section id="como-funciona" className="bg-[#eef6ef] px-6 py-20 lg:px-10 lg:py-24"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div><p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#2f9b70]">Así de simple</p><h2 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">Un hábito pequeño.<br />Una gran diferencia.</h2><p className="mt-5 max-w-md leading-7 text-[#617069]">Registra lo que ves, entiende los cambios y disfruta más tiempo de calidad con tu mascota.</p></div><div className="grid gap-4 sm:grid-cols-3">{[["01", "Crea su perfil", "Añade la información esencial de tu compañero."], ["02", "Registra su día", "Cuéntanos cómo se siente con seis indicadores."], ["03", "Conoce su evolución", "MyPet convierte los datos en claridad para ti."]].map(([number, title, text]) => <div key={number} className="rounded-[24px] bg-white p-5 shadow-[0_8px_24px_rgba(53,91,64,0.07)]"><span className="font-display text-3xl font-extrabold text-[#acd8bc]">{number}</span><h3 className="mt-8 font-display text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#718078]">{text}</p></div>)}</div></div></section>

    <section id="confianza" className="px-6 py-20 text-center lg:px-10 lg:py-24"><div className="mx-auto max-w-3xl"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e7f3ed] text-[#2f9b70]"><ShieldCheck className="h-7 w-7" /></span><h2 className="mt-6 font-display text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">Cuidar con información también es amar.</h2><p className="mx-auto mt-5 max-w-xl leading-7 text-[#718078]">Empieza a construir una historia de salud más clara para quien siempre está a tu lado.</p><Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#2f9b70] px-7 py-3.5 font-bold text-white shadow-[0_12px_25px_rgba(47,155,112,0.2)]">Crear mi cuenta <ArrowRight className="h-4 w-4" /></Link></div></section>

    <footer className="border-t border-[#e8eee9] px-6 py-7 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-sm text-[#8a9a91] sm:flex-row"><span className="font-display font-extrabold text-[#405049]">MyPet</span><span>Tu compañero de confianza para su bienestar.</span></div></footer>
  </main>
);

export default LandingPage;
