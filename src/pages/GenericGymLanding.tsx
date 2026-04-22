import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Dumbbell, Clock, Users, MapPin, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

type GymInfo = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export default function GenericGymLanding({ gym }: { gym: GymInfo }) {
  const navigate = useNavigate();
  const loginPath = `/`;
  const accent = gym.primary_color || "#6366f1";

  return (
    <div className="bg-slate-950 text-white min-h-screen overflow-x-hidden">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 h-14 md:h-16">
          <div className="flex items-center gap-3">
            {gym.logo_url ? (
              <img src={gym.logo_url} alt={gym.name} className="h-8 md:h-10 object-contain" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}20`, color: accent }}>
                  <Dumbbell className="h-4 w-4" />
                </div>
                <span className="text-lg font-black tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {gym.name}
                </span>
              </div>
            )}
          </div>
          <div className="hidden md:flex items-center gap-8 text-[13px] tracking-[0.2em] uppercase text-white/60">
            <a href="#servicios" className="hover:text-white transition-colors">Servicios</a>
            <a href="#contacto" className="hover:text-white transition-colors">Contacto</a>
          </div>
          <Button
            onClick={() => navigate(loginPath)}
            size="sm"
            className="text-[11px] tracking-[0.15em] uppercase rounded-none px-4 md:px-6 h-8 md:h-9 font-semibold"
            style={{ backgroundColor: accent, color: "#fff" }}
          >
            Ingresar
          </Button>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
        {/* Abstract pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(${accent} 1px, transparent 1px)`,
          backgroundSize: "40px 40px"
        }} />
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          {gym.logo_url && (
            <motion.img
              src={gym.logo_url}
              alt={gym.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="h-20 md:h-28 object-contain mx-auto mb-8"
            />
          )}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-[-0.04em] leading-[0.9] mb-6"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {gym.name.toUpperCase()}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-white/40 text-base md:text-lg mb-8 max-w-md mx-auto"
          >
            Tu gimnasio, tu estilo, tus resultados.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              size="lg"
              onClick={() => navigate(loginPath)}
              className="text-[11px] tracking-[0.2em] uppercase px-8 py-5 md:py-6 rounded-none font-bold group"
              style={{ backgroundColor: accent, color: "#fff" }}
            >
              Empezá hoy
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="h-5 w-5 text-white/20 animate-bounce" />
        </motion.div>
      </section>

      {/* STATS */}
      <section className="border-y border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-3 divide-x divide-white/5">
          {[
            { icon: Dumbbell, label: "Equipamiento" },
            { icon: Clock, label: "Horarios Flexibles" },
            { icon: Users, label: "Comunidad" },
          ].map((item, i) => (
            <motion.div key={item.label} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}
              className="py-8 md:py-12 text-center">
              <item.icon className="h-6 w-6 mx-auto mb-2" style={{ color: accent }} />
              <p className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-white/40">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="servicios" className="py-16 md:py-28 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp} className="mb-12 text-center">
            <p className="text-[11px] tracking-[0.3em] uppercase text-white/40 mb-2">Lo que ofrecemos</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-[-0.03em]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              NUESTROS SERVICIOS
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Entrenamiento Personal", desc: "Planes adaptados a tus objetivos con seguimiento profesional." },
              { title: "Clases Grupales", desc: "Variedad de clases para todos los niveles y gustos." },
              { title: "Nutrición", desc: "Asesoría nutricional para maximizar tus resultados." },
            ].map((svc, i) => (
              <motion.div key={svc.title} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i + 1} variants={fadeUp}
                className="border border-white/10 p-6 hover:border-white/20 transition-colors">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${accent}15`, color: accent }}>
                  <Dumbbell className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold mb-2">{svc.title}</h3>
                <p className="text-sm text-white/40">{svc.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-36 px-4 text-center" style={{ background: `linear-gradient(135deg, ${accent}15 0%, transparent 50%)` }}>
        <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
          className="text-3xl md:text-5xl font-black tracking-tight mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          ¿LISTO PARA<br />EMPEZAR?
        </motion.h2>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}>
          <Button size="lg" onClick={() => navigate(loginPath)}
            className="text-[11px] tracking-[0.2em] uppercase px-8 py-5 rounded-none font-bold"
            style={{ backgroundColor: accent, color: "#fff" }}>
            Ingresar al Sistema
          </Button>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer id="contacto" className="py-12 px-4 md:px-8 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div>
            {gym.logo_url ? (
              <img src={gym.logo_url} alt={gym.name} className="h-8 mb-3" />
            ) : (
              <p className="text-lg font-bold mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{gym.name}</p>
            )}
            {gym.address && (
              <p className="text-white/30 text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {gym.address}
              </p>
            )}
          </div>
          <div className="text-right">
            {gym.phone && <p className="text-white/30 text-xs mb-1">Tel: {gym.phone}</p>}
            {gym.email && <p className="text-white/30 text-xs">{gym.email}</p>}
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-[10px] text-white/20 tracking-widest uppercase">
            Powered by ERPGYM
          </p>
        </div>
      </footer>
    </div>
  );
}
