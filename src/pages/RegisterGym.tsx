import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Building2, Dumbbell, Mail, Lock, User, Phone, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGym } from "@/hooks/useGym";

export default function RegisterGym() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { refreshGyms, setGymId } = useGym();
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // Auth form
  const [auth, setAuth] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
  });

  // Gym form
  const [gym, setGym] = useState({
    name: "",
    slug: "",
    phone: "",
  });

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: auth.email,
        password: auth.password,
      });
      if (error) throw error;
      toast({ title: "Sesión iniciada", description: "Ahora completá los datos del gimnasio." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: auth.email,
        password: auth.password,
        options: {
          data: { full_name: auth.full_name },
          emailRedirectTo: window.location.origin + "/register-gym",
        },
      });
      if (signUpError) throw signUpError;

      // Try to sign in immediately (works if email confirm is disabled)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: auth.email,
        password: auth.password,
      });
      if (signInError) {
        toast({
          title: "Cuenta creada",
          description: "Confirmá tu email y volvé a iniciar sesión para crear el gimnasio.",
        });
        return;
      }

      // Save profile data
      if (auth.phone || auth.full_name) {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u) {
          await supabase.from("profiles").upsert({
            id: u.id,
            full_name: auth.full_name,
            phone: auth.phone || null,
          });
        }
      }
      toast({ title: "Cuenta creada", description: "Ahora completá los datos del gimnasio." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGym = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!gym.name || !gym.slug) {
      toast({ title: "Error", description: "Completá los campos requeridos", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Ensure admin role (idempotent)
      await supabase.from("user_roles").insert({ user_id: user.id, role: "admin" as any });

      // Create gym
      const { data: gymData, error: gymErr } = await supabase
        .from("gyms")
        .insert({
          name: gym.name,
          slug: gym.slug,
          owner_user_id: user.id,
          email: user.email,
          phone: gym.phone || null,
        })
        .select("id")
        .single();
      if (gymErr) throw gymErr;

      // Add as staff
      await supabase.from("gym_staff").insert({ gym_id: gymData.id, user_id: user.id });

      // Default features
      const defaultFeatures = [
        "socios", "planes", "pagos", "contabilidad", "inventario",
        "clases", "tienda", "nutricion", "ejercicio", "acceso", "reportes", "mercadeo",
      ];
      await supabase.from("gym_features").insert(
        defaultFeatures.map(f => ({ gym_id: gymData.id, feature_name: f, enabled: true }))
      );

      // Trial subscription
      await supabase.from("gym_subscriptions").insert({
        gym_id: gymData.id,
        plan_type: "basic",
        monthly_amount: 0,
        currency: "USD",
        status: "active",
      });

      toast({ title: "¡Gimnasio creado! 🎉", description: `${gym.name} está listo.` });

      await refreshGyms();
      setGymId(gymData.id);
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-2">
            <Dumbbell className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold">Registrá tu Gimnasio</h1>
          <p className="text-muted-foreground text-sm">
            {user ? "Completá los datos de tu gimnasio." : "Iniciá sesión o creá tu cuenta para empezar."}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 justify-center">
          <div className={`h-2 w-16 rounded-full ${user ? "bg-primary" : "bg-primary"}`} />
          <div className={`h-2 w-16 rounded-full ${user ? "bg-primary" : "bg-muted"}`} />
        </div>

        {!user && !authLoading && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <User className="h-4 w-4" />
                Paso 1: Tu cuenta
              </CardTitle>
              <CardDescription>El usuario que inicie sesión será el dueño del gimnasio</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as "login" | "signup")}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                  <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email</Label>
                      <Input type="email" required value={auth.email}
                        onChange={(e) => setAuth({ ...auth, email: e.target.value })}
                        placeholder="tu@email.com" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />Contraseña</Label>
                      <Input type="password" required value={auth.password}
                        onChange={(e) => setAuth({ ...auth, password: e.target.value })} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Ingresando..." : "Iniciar sesión"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Nombre completo *</Label>
                      <Input required value={auth.full_name}
                        onChange={(e) => setAuth({ ...auth, full_name: e.target.value })}
                        placeholder="Juan Pérez" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email *</Label>
                      <Input type="email" required value={auth.email}
                        onChange={(e) => setAuth({ ...auth, email: e.target.value })}
                        placeholder="admin@tugimnasio.com" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />Contraseña *</Label>
                      <Input type="password" required minLength={6} value={auth.password}
                        onChange={(e) => setAuth({ ...auth, password: e.target.value })}
                        placeholder="Mínimo 6 caracteres" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Teléfono</Label>
                      <Input value={auth.phone}
                        onChange={(e) => setAuth({ ...auth, phone: e.target.value })}
                        placeholder="+506 8888-8888" />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creando..." : "Crear cuenta"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {user && (
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Paso 2: Tu gimnasio
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Sesión: <span className="text-foreground">{user.email}</span>
                  </CardDescription>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5">
                  <LogOut className="h-3.5 w-3.5" /> Salir
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateGym} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del gimnasio *</Label>
                  <Input
                    value={gym.name}
                    onChange={(e) => setGym({ ...gym, name: e.target.value, slug: generateSlug(e.target.value) })}
                    placeholder="Elevate Fitness"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL del gimnasio *</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">erp.gym/</span>
                    <Input
                      value={gym.slug}
                      onChange={(e) => setGym({ ...gym, slug: generateSlug(e.target.value) })}
                      placeholder="elevate-fitness"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Teléfono del gimnasio</Label>
                  <Input
                    value={gym.phone}
                    onChange={(e) => setGym({ ...gym, phone: e.target.value })}
                    placeholder="+506 8888-8888"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creando..." : "Crear gimnasio"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <button
            onClick={() => navigate("/")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
