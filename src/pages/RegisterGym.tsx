import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Building2, Dumbbell, Mail, Lock, User, Phone } from "lucide-react";

export default function RegisterGym() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    gym_name: "",
    slug: "",
    email: "",
    password: "",
    full_name: "",
    phone: "",
  });

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.gym_name || !form.slug) {
      toast({ title: "Error", description: "Completá los campos del gimnasio", variant: "destructive" });
      return;
    }
    setStep(2);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.full_name },
          emailRedirectTo: window.location.origin,
        },
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("No se pudo crear el usuario");

      // Sign in immediately
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (signInError) {
        toast({
          title: "Cuenta creada",
          description: "Confirmá tu email para iniciar sesión.",
        });
        navigate("/admin");
        return;
      }

      // 2. Assign admin role
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" as any });

      // 3. Create gym
      const { data: gymData, error: gymError } = await supabase
        .from("gyms")
        .insert({
          name: form.gym_name,
          slug: form.slug,
          owner_user_id: userId,
          email: form.email,
          phone: form.phone || null,
        })
        .select("id")
        .single();

      if (gymError) throw gymError;

      // 4. Add owner as staff
      await supabase.from("gym_staff").insert({
        gym_id: gymData.id,
        user_id: userId,
      });

      toast({
        title: "¡Gimnasio registrado! 🎉",
        description: `${form.gym_name} está listo. Tenés 14 días de prueba gratis.`,
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
            Empezá con 14 días gratis. Sin tarjeta de crédito.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 justify-center">
          <div className={`h-2 w-16 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-2 w-16 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
        </div>

        {step === 1 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Paso 1: Tu Gimnasio
              </CardTitle>
              <CardDescription>Información básica de tu negocio</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep1} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del Gimnasio *</Label>
                  <Input
                    value={form.gym_name}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        gym_name: e.target.value,
                        slug: generateSlug(e.target.value),
                      });
                    }}
                    placeholder="Elevate Fitness"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL del Gimnasio *</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">erp.gym/</span>
                    <Input
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: generateSlug(e.target.value) })}
                      placeholder="elevate-fitness"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">Siguiente →</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <User className="h-4 w-4" />
                Paso 2: Tu Cuenta de Admin
              </CardTitle>
              <CardDescription>Creá tu cuenta de administrador</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Nombre Completo *</Label>
                  <Input
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="Juan Pérez"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="admin@tugimnasio.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />Contraseña *</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Teléfono</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+506 8888-8888"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                    ← Atrás
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? "Registrando..." : "Crear Gimnasio"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <button
            onClick={() => navigate("/admin")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ¿Ya tenés cuenta? Iniciá sesión
          </button>
        </div>
      </div>
    </div>
  );
}
