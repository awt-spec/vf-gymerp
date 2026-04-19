import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Shield, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Si entran a /admin con sesión que NO es super_admin (ej: admin de un gym),
  // cerramos esa sesión para que puedan loguearse como super_admin del ERP interno.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      const userRoles = (roles ?? []).map(r => r.role);
      const isSuperAdmin = userRoles.includes("super_admin" as any);
      if (isSuperAdmin) {
        navigate("/erp-dashboard", { replace: true });
      } else {
        await supabase.auth.signOut();
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      const userRoles = roles?.map(r => r.role) ?? [];
      const isSuperAdmin = userRoles.includes("super_admin" as any);

      if (!isSuperAdmin) {
        await supabase.auth.signOut();
        throw new Error("Este acceso es solo para super administradores del ERP. Si sos admin de un gimnasio, ingresá desde el login de tu gym.");
      }

      navigate("/erp-dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `linear-gradient(rgba(99,102,241,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.15) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />
      
      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 mb-5"
          >
            <Shield className="h-7 w-7 text-indigo-600" />
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            ERP<span className="text-indigo-600">GYM</span>
          </h1>
          <p className="text-slate-400 text-xs tracking-widest uppercase">Panel de Control</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="admin-email" className="text-slate-500 text-xs tracking-wider uppercase">Email</Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@erpgym.com"
              required
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-300 h-11 rounded-lg focus:border-indigo-400 focus:ring-indigo-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-password" className="text-slate-500 text-xs tracking-wider uppercase">Contraseña</Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-300 h-11 rounded-lg pr-10 focus:border-indigo-400 focus:ring-indigo-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm tracking-wide"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                Verificando...
              </span>
            ) : "Acceder"}
          </Button>
        </form>

        {/* Demo credentials */}
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-3 space-y-2 shadow-sm">
          <p className="text-[10px] text-slate-400 tracking-widest uppercase text-center mb-2">Cuentas Demo</p>
          {[
            { email: "superadmin@erpgym.com", password: "erpgym1234", label: "Super Admin ERP" },
          ].map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
              className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors border ${
                email === acc.email
                  ? "border-indigo-300 bg-indigo-50 text-slate-900"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span className="font-semibold text-indigo-600">{acc.label}:</span>{" "}
              {acc.email} / {acc.password}
            </button>
          ))}
        </div>

        <div className="mt-6 text-center space-y-3">
          <button
            onClick={() => navigate("/register-gym")}
            className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
          >
            Registrar nuevo gimnasio →
          </button>
          <div>
            <p className="text-[11px] text-slate-300">
              Los socios acceden desde la landing de su gimnasio
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[10px] text-slate-300 tracking-widest uppercase">ERP Gym Platform v1.0</p>
        </div>
      </motion.div>
    </div>
  );
}
