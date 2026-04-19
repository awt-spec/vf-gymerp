import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Sparkles, IdCard, Mail, Dumbbell, Shield } from "lucide-react";
import elevateLogo from "@/assets/elevate-logo.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type LoginProps = {
  gymId?: string;
  gymSlug?: string;
  gymName?: string;
  gymLogoUrl?: string | null;
  gymColor?: string | null;
};

const DEMO_ACCOUNTS = [
  { email: "admin@gym.com", password: "admin1234", role: "Admin" },
  { email: "coach@gym.com", password: "coach1234", role: "Coach" },
  { email: "recepcion@gym.com", password: "recep1234", role: "Recepcionista" },
  { email: "usuario@gym.com", password: "user1234", role: "Socio" },
];

export default function Login({ gymId, gymSlug, gymName, gymLogoUrl, gymColor }: LoginProps = {}) {
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS[0].password);
  const [cedula, setCedula] = useState("");
  const [cedulaPassword, setCedulaPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginMode, setLoginMode] = useState<string>("email");
  const navigate = useNavigate();

  const persistSelectedGym = () => {
    if (gymId) {
      localStorage.setItem("current_gym_id", gymId);
      return;
    }

    localStorage.removeItem("current_gym_id");
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: "Cuenta creada", description: "Revisa tu email para confirmar tu cuenta." });
      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        persistSelectedGym();
        // If owner of a gym that hasn't completed setup, send to wizard
        if (signInData.user && gymId) {
          const { data: gymRow } = await supabase
            .from("gyms")
            .select("setup_completed, owner_user_id")
            .eq("id", gymId)
            .maybeSingle();
          if (gymRow && gymRow.owner_user_id === signInData.user.id && !gymRow.setup_completed) {
            navigate("/setup");
            return;
          }
        }
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCedulaLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Look up the member's email by cedula
      const { data: member, error: lookupError } = await supabase
        .from("members")
        .select("email")
        .eq("cedula", cedula)
        .single();

      if (lookupError || !member?.email) {
        throw new Error("No se encontró un socio con esa cédula");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: member.email,
        password: cedulaPassword || cedula, // default password is cedula
      });
      if (error) throw error;
      persistSelectedGym();
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoNewMember = async () => {
    setLoading(true);
    try {
      const ts = Date.now();
      const demoEmail = `demo.socio.${ts}@gym.com`;
      const demoPw = "demo1234";
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: demoEmail,
        password: demoPw,
        options: { data: { full_name: "Socio Demo" } },
      });
      if (signUpError) throw signUpError;
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPw });
      if (signInError) {
        toast({ title: "Cuenta demo creada", description: "Confirmá tu email para iniciar sesión." });
        setLoading(false);
        return;
      }
      const userId = signUpData.user?.id;
      if (userId) {
        await supabase.from("user_roles").insert({ user_id: userId, role: "member" as any });
        const { data: memberData } = await supabase.from("members").insert({
          first_name: "Socio", last_name: "Demo", email: demoEmail,
          auth_user_id: userId, status: "active",
        }).select("id").single();
        if (memberData) { navigate(`/onboarding?member=${memberData.id}`); return; }
      }
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            {gymLogoUrl ? (
              <img src={gymLogoUrl} alt={gymName || "Gym"} className="h-12 object-contain" />
            ) : gymName && gymName !== "Elevate Lindora" ? (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${gymColor || '#6366f1'}15`, color: gymColor || '#6366f1' }}>
                  <Dumbbell className="h-5 w-5" />
                </div>
                <span className="text-xl font-black tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{gymName}</span>
              </div>
            ) : (
              <img src={elevateLogo} alt="Elevate Lindora" className="h-12 object-contain invert dark:invert-0" />
            )}
          </div>
          <CardTitle className="text-xl font-display text-foreground">{gymName ? `Bienvenido a ${gymName}` : "Bienvenido"}</CardTitle>
          <CardDescription>Inicia sesión para acceder al sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={loginMode} onValueChange={setLoginMode}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="gap-1.5 text-xs"><Mail className="h-3.5 w-3.5" />Email</TabsTrigger>
              <TabsTrigger value="cedula" className="gap-1.5 text-xs"><IdCard className="h-3.5 w-3.5" />Cédula</TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4 mt-4">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@gym.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Cargando..." : isSignUp ? "Crear cuenta" : "Iniciar sesión"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="cedula" className="space-y-4 mt-4">
              <form onSubmit={handleCedulaLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cedula">Número de Cédula</Label>
                  <Input id="cedula" value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="Ej: 123456789" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cedula-pw">Contraseña</Label>
                  <Input id="cedula-pw" type="password" value={cedulaPassword} onChange={(e) => setCedulaPassword(e.target.value)} placeholder="Tu cédula si es primera vez" />
                  <p className="text-[10px] text-muted-foreground">Primera vez? Tu contraseña es tu número de cédula</p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Cargando..." : "Iniciar sesión"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {gymSlug === "elevate-lindora" && (
            <Button
              type="button"
              className="w-full bg-foreground text-background hover:bg-foreground/90"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const { error } = await supabase.auth.signInWithPassword({
                    email: "admin@gym.com",
                    password: "admin1234",
                  });
                  if (error) throw error;
                  persistSelectedGym();
                  navigate("/dashboard");
                } catch (err: any) {
                  toast({ title: "Error", description: err.message, variant: "destructive" });
                } finally {
                  setLoading(false);
                }
              }}
            >
              <Shield className="mr-2 h-4 w-4" />
              Acceso Admin Elevate
            </Button>
          )}

          <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={handleDemoNewMember}>
            <Sparkles className="mr-2 h-4 w-4" />
            Probar como socio nuevo (Demo)
          </Button>

          <div className="rounded-md bg-muted/50 border border-border/50 p-3 space-y-2">
            <p className="text-xs font-semibold text-center">Cuentas Demo:</p>
            {DEMO_ACCOUNTS.map((acc) => (
              <button key={acc.email} type="button"
                onClick={() => { setEmail(acc.email); setPassword(acc.password); setLoginMode("email"); }}
                className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors border ${
                  email === acc.email && loginMode === "email" ? "border-foreground/30 bg-foreground/5 text-foreground" : "border-border/50 text-muted-foreground hover:bg-muted"
                }`}>
                <span className="font-semibold">{acc.role}:</span> {acc.email} / {acc.password}
              </button>
            ))}
          </div>

          {loginMode === "email" && (
            <div className="text-center">
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
