import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUpRight, Instagram, MapPin, MessageCircle, Facebook, Plus } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import heroDeadlift from "@/assets/hero-deadlift.jpeg";
import heroSquats from "@/assets/hero-squats.jpeg";
import heroBench from "@/assets/hero-bench.jpeg";
import heroMuscles from "@/assets/hero-muscles.jpeg";
import elevateLogo from "@/assets/elevate-logo.png";

/* ─────────── DATA ─────────── */

const DISCIPLINES = [
  {
    id: "01",
    name: "PILATES REFORMER",
    tagline: "Control. Precisión. Fuerza interna.",
    description:
      "Studio dedicado con máquinas Reformer profesionales. Mejorá postura, core y movilidad bajo guía experta.",
    image: heroSquats,
    schedule: "Lun 6pm · Mar 7pm · Jue 9am",
  },
  {
    id: "02",
    name: "BOXEO",
    tagline: "Cada round te transforma.",
    description:
      "Técnica, footwork y resistencia. Sesiones que combinan combinaciones reales con acondicionamiento de élite.",
    image: heroBench,
    schedule: "Lun 8:30am · Mié 6pm · Vie 6pm",
  },
  {
    id: "03",
    name: "FUNCIONAL",
    tagline: "Movimiento sin límites.",
    description:
      "Entrenamiento de cuerpo completo con kettlebells, TRX y peso libre. Construido para la vida real.",
    image: heroDeadlift,
    schedule: "Lun 7pm · Mar 9am · Vie 7am",
  },
  {
    id: "04",
    name: "MÁQUINAS",
    tagline: "Equipamiento profesional.",
    description:
      "Sala completa de musculación: peso libre, máquinas guiadas y zona cardio. Acceso libre como socio.",
    image: heroMuscles,
    schedule: "Lun a Vie · 5am — 10pm",
  },
];

const SCHEDULE = [
  { day: "LUN", slots: ["8:30 Boxeo", "6:00 Pilates", "7:00 Funcional"] },
  { day: "MAR", slots: ["7:00 Pilates", "9:00 Funcional"] },
  { day: "MIÉ", slots: ["9:00 GAP", "6:00 Boxeo"] },
  { day: "JUE", slots: ["9:00 Pilates", "6:00 Baile"] },
  { day: "VIE", slots: ["7:00 Funcional", "6:00 Boxeo"] },
];

const WHATSAPP_URL = "https://wa.me/50689636011";
const INSTAGRAM_URL = "https://www.instagram.com/elevate_lindora/";
const TIKTOK_URL = "https://www.tiktok.com/@elevate.lindora";
const FACEBOOK_URL = "https://facebook.com/elevatelindora";
const WAZE_URL = "https://ul.waze.com/ul?venue_id=180748388.1807483875.41361842&overview=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location";

/* ─────────── COMPONENT ─────────── */

export default function Landing({ gymSlug = "elevate" }: { gymSlug?: string }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const loginPath = `/`;

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  return (
    <div className="bg-black text-white min-h-screen overflow-x-hidden font-sans antialiased selection:bg-white selection:text-black">
      {/* ───── NAV ───── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/70 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between px-5 md:px-10 h-14 md:h-16">
          <img src={elevateLogo} alt="Elevate" className="h-7 md:h-8 object-contain" />

          <div className="hidden md:flex items-center gap-10 text-[11px] tracking-[0.25em] uppercase text-white/70 font-medium">
            <a href="#disciplinas" className="hover:text-white transition-colors">Disciplinas</a>
            <a href="#horarios" className="hover:text-white transition-colors">Horarios</a>
            <a href="#contacto" className="hover:text-white transition-colors">Contacto</a>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate(loginPath)}
              size="sm"
              className="bg-white text-black hover:bg-white/90 text-[10px] md:text-[11px] tracking-[0.2em] uppercase rounded-full px-5 md:px-6 h-9 font-bold"
            >
              Ingresar
            </Button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-white/80"
              aria-label="Menu"
            >
              <div className="space-y-[5px]">
                <span className={`block w-5 h-0.5 bg-current transition-transform duration-300 ${mobileMenuOpen ? "rotate-45 translate-y-[7px]" : ""}`} />
                <span className={`block w-5 h-0.5 bg-current transition-opacity duration-300 ${mobileMenuOpen ? "opacity-0" : ""}`} />
                <span className={`block w-5 h-0.5 bg-current transition-transform duration-300 ${mobileMenuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
              </div>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="md:hidden bg-black border-t border-white/5 px-5 pb-6"
          >
            <div className="flex flex-col gap-1 pt-3">
              {[["#disciplinas", "Disciplinas"], ["#horarios", "Horarios"], ["#contacto", "Contacto"]].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between text-2xl font-black tracking-tight uppercase py-3 border-b border-white/5"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {label}
                  <ArrowUpRight className="h-5 w-5 text-white/40" />
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </nav>

      {/* ───── HERO ───── */}
      <section ref={heroRef} className="relative min-h-[100svh] flex items-end pb-16 md:pb-24 overflow-hidden">
        <motion.div style={{ y: heroY, scale: heroScale }} className="absolute inset-0">
          <video
            src="/videos/elevate-hero.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster={heroSquats}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/50" />
        </motion.div>

        {/* Top hero label */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="absolute top-24 md:top-28 left-5 md:left-10 right-5 md:right-10 flex items-center justify-between text-[10px] tracking-[0.35em] uppercase text-white/50 z-10"
        >
          <span>Elevate · Lindora · CR</span>
          <span className="hidden md:inline">EST. 2024</span>
        </motion.div>

        <div className="relative z-10 px-5 md:px-10 lg:px-14 w-full max-w-[1600px] mx-auto">
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[11px] md:text-xs tracking-[0.4em] uppercase text-white/60 mb-4 md:mb-6 font-medium"
          >
            Just train.
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="font-black tracking-[-0.05em] leading-[0.82] mb-6 md:mb-8"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(3.5rem, 14vw, 11rem)" }}
          >
            ELEVATE
            <br />
            <span className="italic font-light text-white/40" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              your limits.
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="flex flex-col sm:flex-row gap-3 max-w-md"
          >
            <Button
              size="lg"
              onClick={() => navigate(loginPath)}
              className="bg-white text-black hover:bg-white/90 text-[11px] tracking-[0.2em] uppercase px-8 h-[58px] rounded-[999px] font-bold group flex-1 shadow-lg shadow-white/10"
            >
              Empezá hoy
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.open(WHATSAPP_URL, "_blank")}
              className="border-2 border-white/40 text-white bg-transparent hover:bg-white hover:text-black text-[11px] tracking-[0.2em] uppercase px-8 h-[58px] rounded-[999px] font-bold flex-1"
            >
              Probar gratis
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ───── MARQUEE TICKER ───── */}
      <section className="bg-white text-black py-5 md:py-6 overflow-hidden border-y border-white/10">
        <div className="flex whitespace-nowrap animate-[scroll_30s_linear_infinite]">
          {[...Array(2)].map((_, dup) => (
            <div key={dup} className="flex items-center gap-8 md:gap-14 px-6 md:px-8 text-2xl md:text-4xl font-black tracking-[-0.02em]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {["PILATES REFORMER", "BOXEO", "FUNCIONAL", "MÁQUINAS", "PILATES REFORMER", "BOXEO", "FUNCIONAL", "MÁQUINAS"].map((w, i) => (
                <span key={`${dup}-${i}`} className="flex items-center gap-8 md:gap-14">
                  {w}
                  <span className="text-black/30">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
        <style>{`@keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </section>

      {/* ───── DISCIPLINES — Editorial Spread ───── */}
      <section id="disciplinas" className="py-20 md:py-32 px-5 md:px-10 lg:px-14">
        <div className="max-w-[1600px] mx-auto">
          {/* Section header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-10 mb-14 md:mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-[11px] tracking-[0.4em] uppercase text-white/40 mb-4 font-medium">
                — Disciplinas / 04
              </p>
              <h2
                className="font-black tracking-[-0.04em] leading-[0.88]"
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(2.5rem, 7vw, 6rem)" }}
              >
                ENCONTRÁ
                <br />
                <span className="italic font-light text-white/40">tu disciplina.</span>
              </h2>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-white/50 text-sm md:text-base max-w-sm leading-relaxed"
            >
              Cuatro caminos. Una sola misión: que salgas del studio mejor que como entraste.
            </motion.p>
          </div>

          {/* Discipline list — editorial vertical */}
          <div className="border-t border-white/10">
            {DISCIPLINES.map((d, i) => (
              <motion.article
                key={d.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="group relative grid grid-cols-12 gap-4 md:gap-6 py-8 md:py-12 border-b border-white/10 hover:bg-white/[0.02] transition-colors duration-500 cursor-pointer"
              >
                {/* Number */}
                <div className="col-span-2 md:col-span-1 flex items-start">
                  <span className="text-[11px] md:text-xs tracking-[0.2em] text-white/30 font-mono pt-2">
                    {d.id}
                  </span>
                </div>

                {/* Name + tagline */}
                <div className="col-span-10 md:col-span-5">
                  <h3
                    className="font-black tracking-[-0.04em] leading-[0.9] mb-2 md:mb-3 group-hover:translate-x-2 transition-transform duration-500"
                    style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.75rem, 4.5vw, 3.75rem)" }}
                  >
                    {d.name}
                  </h3>
                  <p className="text-white/50 text-sm md:text-base italic" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {d.tagline}
                  </p>
                </div>

                {/* Description + schedule */}
                <div className="col-span-12 md:col-span-4 flex flex-col gap-3 md:pt-3">
                  <p className="text-white/60 text-sm leading-relaxed">{d.description}</p>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-white/30 font-medium">
                    {d.schedule}
                  </p>
                </div>

                {/* Image preview — desktop hover */}
                <div className="col-span-12 md:col-span-2 relative aspect-square md:aspect-auto overflow-hidden">
                  <img
                    src={d.image}
                    alt={d.name}
                    className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute top-2 right-2 md:top-3 md:right-3 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ───── BIG STATEMENT ───── */}
      <section className="relative py-32 md:py-48 px-5 md:px-10 overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroDeadlift} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-black/30" />
        </div>
        <div className="relative z-10 max-w-[1600px] mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="font-black tracking-[-0.05em] leading-[0.85] max-w-5xl"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(2.5rem, 9vw, 8rem)" }}
          >
            NO HAY
            <br />
            <span className="italic font-light text-white/40">atajos.</span>
            <br />
            SOLO TRABAJO.
          </motion.h2>
        </div>
      </section>

      {/* ───── SCHEDULE ───── */}
      <section id="horarios" className="py-20 md:py-32 px-5 md:px-10 lg:px-14 bg-white text-black">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 md:mb-16">
            <div>
              <p className="text-[11px] tracking-[0.4em] uppercase text-black/40 mb-4 font-medium">
                — Semana / 05
              </p>
              <h2
                className="font-black tracking-[-0.04em] leading-[0.88]"
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(2.5rem, 7vw, 6rem)" }}
              >
                HORARIOS
              </h2>
            </div>
            <p className="text-black/60 text-sm max-w-xs">
              Reservá por WhatsApp. Cupos limitados por clase.
            </p>
          </div>

          {/* Mobile: stacked cards with pill chips */}
          <div className="md:hidden space-y-3">
            {SCHEDULE.map((row, i) => (
              <motion.div
                key={row.day}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="bg-black text-white rounded-3xl p-5 flex items-start gap-4"
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white text-black flex flex-col items-center justify-center">
                  <span
                    className="text-xl font-black leading-none"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {row.day}
                  </span>
                </div>
                <div className="flex-1 flex flex-wrap gap-1.5 pt-1">
                  {row.slots.map((s) => (
                    <span
                      key={s}
                      className="text-[11px] font-medium bg-white/10 text-white/90 px-3 py-1.5 rounded-full whitespace-nowrap"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desktop: grid layout */}
          <div className="hidden md:grid md:grid-cols-5 gap-px bg-black/10 border border-black/10">
            {SCHEDULE.map((row, i) => (
              <motion.div
                key={row.day}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="bg-white p-6 md:p-8 min-h-[180px] flex flex-col"
              >
                <span
                  className="text-3xl md:text-4xl font-black tracking-tight mb-4"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {row.day}
                </span>
                <div className="space-y-2 flex-1">
                  {row.slots.map((s) => (
                    <p key={s} className="text-xs md:text-sm text-black/70 leading-snug">
                      {s}
                    </p>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section className="relative py-32 md:py-48 px-5 md:px-10 overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBench} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/80" />
        </div>
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-[11px] tracking-[0.4em] uppercase text-white/40 mb-6 font-medium"
          >
            — Tu próximo paso
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="font-black tracking-[-0.05em] leading-[0.85] mb-10"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(2.5rem, 8vw, 6.5rem)" }}
          >
            READY TO
            <br />
            <span className="italic font-light text-white/50">elevate?</span>
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              size="lg"
              onClick={() => window.open(WHATSAPP_URL, "_blank")}
              className="bg-white text-black hover:bg-white/90 text-[11px] tracking-[0.2em] uppercase px-10 h-14 rounded-full font-bold"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Hablar por WhatsApp
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate(loginPath)}
              className="border-white/30 text-white bg-transparent hover:bg-white hover:text-black text-[11px] tracking-[0.2em] uppercase px-10 h-14 rounded-full font-bold"
            >
              Soy socio · Ingresar
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer id="contacto" className="bg-black border-t border-white/10 px-5 md:px-10 lg:px-14 py-16 md:py-20">
        <div className="max-w-[1600px] mx-auto">
          {/* Big footer wordmark */}
          <div className="mb-12 md:mb-16">
            <h3
              className="font-black tracking-[-0.05em] leading-[0.85]"
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(3rem, 14vw, 12rem)" }}
            >
              ELEVATE.
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8 pb-12 border-b border-white/10">
            <div>
              <h4 className="text-[10px] tracking-[0.3em] uppercase text-white/40 mb-4 font-medium">Studio</h4>
              <p className="text-white/70 text-sm leading-relaxed">
                Gimnasio Elevate Lindora<br />
                Santa Ana, Costa Rica
              </p>
              <a
                href={WAZE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-white/10 hover:bg-white text-white hover:text-black text-xs font-semibold tracking-wide transition-colors"
              >
                <MapPin className="h-3.5 w-3.5" /> Abrir en Waze
              </a>
            </div>
            <div>
              <h4 className="text-[10px] tracking-[0.3em] uppercase text-white/40 mb-4 font-medium">Contacto</h4>
              <div className="space-y-3">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors">
                  <MessageCircle className="h-3.5 w-3.5" /> +506 8963 6011
                </a>
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors">
                  <Instagram className="h-3.5 w-3.5" /> @elevate_lindora
                </a>
                <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.69a8.16 8.16 0 0 0 4.77 1.52V6.78a4.85 4.85 0 0 1-1.84-.09Z"/>
                  </svg>
                  @elevate.lindora
                </a>
                <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors">
                  <Facebook className="h-3.5 w-3.5" /> Elevate Lindora
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-[10px] tracking-[0.3em] uppercase text-white/40 mb-4 font-medium">Disciplinas</h4>
              <div className="space-y-2">
                {["Pilates Reformer", "Boxeo", "Funcional", "Máquinas", "GAP", "Baile"].map((c) => (
                  <p key={c} className="text-white/60 text-sm">{c}</p>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[10px] tracking-[0.3em] uppercase text-white/40 mb-4 font-medium">Acceso</h4>
              <button
                onClick={() => navigate(loginPath)}
                className="group flex items-center gap-2 text-white text-sm hover:gap-3 transition-all"
              >
                Ingresar al portal
                <ArrowUpRight className="h-4 w-4 group-hover:rotate-45 transition-transform" />
              </button>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] tracking-[0.25em] uppercase text-white/30">
              © {new Date().getFullYear()} Elevate Lindora · All rights reserved
            </p>
            <p className="text-[10px] tracking-[0.25em] uppercase text-white/30">
              Just train.
            </p>
          </div>
        </div>
      </footer>

      {/* ───── FLOATING WHATSAPP BUTTON ───── */}
      <motion.a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chatear por WhatsApp"
        initial={{ opacity: 0, scale: 0, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-5 md:bottom-8 md:right-8 z-50 flex items-center gap-3 bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-2xl shadow-[#25D366]/30 rounded-full pl-4 pr-5 md:pl-5 md:pr-6 py-3.5 md:py-4 font-semibold text-sm tracking-wide transition-colors"
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30 pointer-events-none" />
        <MessageCircle className="h-5 w-5 md:h-6 md:w-6 relative z-10 fill-current" />
        <span className="relative z-10 hidden sm:inline">WhatsApp</span>
      </motion.a>
    </div>
  );
}
