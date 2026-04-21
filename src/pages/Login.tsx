import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { IdCard, Mail, Dumbbell } from "lucide-react";
import elevateLogo from "@/assets/elevate-logo.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type LoginProps = {
  gymId?: string;
  gymSlug?: string;
  gymName?: string;
  gymLogoUrl?: string | null;
  gymColor?: string | null;
};

export default function Login({ gymId, gymSlug, gymName, gymLogoUrl, gymColor }: LoginProps = {}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    const trimmed = cedula.trim();
    if (!trimmed) {
      toast({ title: "Error", description: "Credenciales incorrectas", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: member, error: lookupError } = await supabase
        .from("members")
        .select("email")
        .eq("cedula", trimmed)
        .maybeSingle();

      if (lookupError || !member?.email) {
        throw new Error("Credenciales incorrectas");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: member.email,
        password: cedulaPassword || trimmed,
      });
      if (error) throw new Error("Credenciales incorrectas");
      persistSelectedGym();
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Credenciales incorrectas", variant: "destructive" });
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
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required />
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
