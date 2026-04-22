import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Mail, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

type Mode = "login" | "forgot";

async function redirectByRole(userId: string, navigate: (p: string, o?: any) => void) {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const userRoles = (roles ?? []).map((r) => r.role) as string[];

  if (userRoles.includes("super_admin")) {
    navigate("/erp-dashboard", { replace: true });
    return;
  }

  // Owner / staff de un gym → /dashboard (con su gym contextual)
  const { data: ownedGyms } = await supabase
    .from("gyms")
    .select("id")
    .eq("owner_user_id", userId)
    .limit(1);

  if (ownedGyms && ownedGyms.length > 0) {
    localStorage.setItem("current_gym_id", ownedGyms[0].id);
    navigate("/dashboard", { replace: true });
    return;
  }

  if (
    userRoles.includes("admin") ||
    userRoles.includes("coach") ||
    userRoles.includes("receptionist")
  ) {
    navigate("/dashboard", { replace: true });
    return;
  }

  navigate("/mi-gym", { replace: true });
}

export default function RootLanding() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading || !session) return;
    let cancelled = false;
    (async () => {
      setRedirecting(true);
      try {
        await redirectByRole(session.user.id, navigate);
      } catch {
        if (!cancelled) setRedirecting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, session, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) await redirectByRole(data.user.id, navigate);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Credenciales incorrectas",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err: any) {
      toast({
        title: "Error con Google",
        description: err.message,
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: "Revisá tu correo",
        description: "Te enviamos un enlace para restablecer la contraseña.",
      });
      setMode("login");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
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
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.15) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold tracking-tight text-slate-900 mb-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            ERP<span className="text-indigo-600">GYM</span>
          </h1>
          <p className="text-slate-400 text-xs tracking-widest uppercase">
            {mode === "forgot" ? "Recuperar contraseña" : "Iniciar sesión"}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          {mode === "login" ? (
            <>
              <Button
                type="button"
                onClick={handleGoogle}
                disabled={submitting}
                variant="outline"
                className="w-full h-11 gap-2 border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
                  />
                </svg>
                Continuar con Google
              </Button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                  <span className="bg-white px-2 text-slate-400">o con email</span>
                </div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-500 text-xs tracking-wider uppercase">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    className="bg-white border-slate-200 text-slate-900 h-11 rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-slate-500 text-xs tracking-wider uppercase"
                    >
                      Contraseña
                    </Label>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-[11px] text-indigo-500 hover:text-indigo-700"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="bg-white border-slate-200 text-slate-900 h-11 rounded-lg pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Ingresando...
                    </span>
                  ) : (
                    "Iniciar sesión"
                  )}
                </Button>
              </form>
            </>
          ) : (
            <form onSubmit={handleForgot} className="space-y-4">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="h-3 w-3" /> Volver
              </button>
              <div className="space-y-1.5">
                <Label
                  htmlFor="forgot-email"
                  className="text-slate-500 text-xs tracking-wider uppercase"
                >
                  Email
                </Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="bg-white border-slate-200 text-slate-900 h-11 rounded-lg"
                />
                <p className="text-[11px] text-slate-400">
                  Te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Enviar enlace
                  </span>
                )}
              </Button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/register-gym")}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            Registrar nuevo gimnasio →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
