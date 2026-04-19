import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Dumbbell, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function RootLanding() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const lastGymSlug = typeof window !== "undefined" ? localStorage.getItem("last_gym_slug") : null;

  // If already logged in, send the user straight to the right dashboard
  useEffect(() => {
    if (authLoading || !session) return;
    let cancelled = false;
    (async () => {
      setRedirecting(true);
      try {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        if (cancelled) return;
        const userRoles = (roles ?? []).map(r => r.role);
        if (userRoles.includes("super_admin" as any)) {
          navigate("/erp-dashboard", { replace: true });
        } else if (
          userRoles.includes("admin" as any) ||
          userRoles.includes("coach" as any) ||
          userRoles.includes("receptionist" as any)
        ) {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/mi-gym", { replace: true });
        }
      } catch {
        if (!cancelled) setRedirecting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, session, navigate]);

  const goToGymLogin = () => {
    if (lastGymSlug) {
      navigate(`/gym/${lastGymSlug}/login`);
    } else {
      navigate("/gym-select");
    }
  };

  if (authLoading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `linear-gradient(rgba(99,102,241,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.15) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl relative z-10"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-2 font-display">
            ERP<span className="text-indigo-600">GYM</span>
          </h1>
          <p className="text-slate-500 text-sm">¿Cómo querés entrar?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* ERP Admin */}
          <button
            onClick={() => navigate("/admin")}
            className="group text-left p-6 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all flex flex-col h-full min-h-[200px]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <Shield className="h-6 w-6 text-indigo-600" />
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1 font-display">Admin ERP</h2>
            <p className="text-xs text-slate-500 leading-relaxed flex-1">
              Acceso para super admins y administradores de la plataforma.
            </p>
          </button>

          {/* Gym login — botón directo */}
          <button
            onClick={goToGymLogin}
            className="group text-left p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all flex flex-col h-full min-h-[200px]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <Dumbbell className="h-6 w-6 text-emerald-600" />
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1 font-display">Mi Gimnasio</h2>
            <p className="text-xs text-slate-500 leading-relaxed flex-1">
              {lastGymSlug
                ? `Volver al login de ${lastGymSlug}.`
                : "Ingresá al login de tu gimnasio."}
            </p>
          </button>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate("/register-gym")}
            className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
          >
            Registrar nuevo gimnasio →
          </button>
        </div>
      </motion.div>
    </div>
  );
}