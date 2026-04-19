import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check, Dumbbell, CreditCard, Calendar, Package, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Gym = {
  id: string;
  name: string;
  primary_color: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

const PRESET_PLANS = [
  { id: "mensual", name: "Mensual", price: 25000, duration_days: 30, color: "#00E676", benefits: ["Acceso ilimitado al gym", "Asesoría inicial"] },
  { id: "trimestral", name: "Trimestral", price: 65000, duration_days: 90, color: "#3b82f6", benefits: ["Acceso ilimitado", "10% descuento", "1 plan personalizado"] },
  { id: "anual", name: "Anual", price: 220000, duration_days: 365, color: "#8b5cf6", benefits: ["Acceso ilimitado", "20% descuento", "Plan + nutrición", "Invitado 2 veces/mes"] },
  { id: "estudiante", name: "Estudiante", price: 18000, duration_days: 30, color: "#f59e0b", benefits: ["Acceso L-V hasta 16h", "Carnet vigente"] },
];

const PRESET_CLASSES = [
  { id: "funcional", name: "Funcional", instructor: "Por asignar" },
  { id: "boxeo", name: "Boxeo", instructor: "Por asignar" },
  { id: "pilates", name: "Pilates", instructor: "Por asignar" },
  { id: "crossfit", name: "CrossFit", instructor: "Por asignar" },
  { id: "yoga", name: "Yoga", instructor: "Por asignar" },
  { id: "spinning", name: "Spinning", instructor: "Por asignar" },
  { id: "zumba", name: "Zumba", instructor: "Por asignar" },
  { id: "hiit", name: "HIIT", instructor: "Por asignar" },
];

const PRESET_INVENTORY = [
  { id: "mancuernas", name: "Set de mancuernas (5-30kg)", category: "pesas", quantity: 1 },
  { id: "barras", name: "Barras olímpicas", category: "pesas", quantity: 4 },
  { id: "discos", name: "Discos olímpicos (variados)", category: "pesas", quantity: 1 },
  { id: "bancos", name: "Bancos planos / inclinados", category: "maquinas", quantity: 4 },
  { id: "cintas", name: "Cintas para correr", category: "cardio", quantity: 3 },
  { id: "bicicletas", name: "Bicicletas estacionarias", category: "cardio", quantity: 4 },
  { id: "eliptica", name: "Elípticas", category: "cardio", quantity: 2 },
  { id: "kettlebells", name: "Kettlebells (varios pesos)", category: "funcional", quantity: 1 },
  { id: "trx", name: "TRX / Bandas elásticas", category: "funcional", quantity: 6 },
];

export default function SetupWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Step 1 - Gym info
  const [info, setInfo] = useState({ name: "", phone: "", email: "", address: "", primary_color: "#00E676" });

  // Step 2 - Plans (which presets to create + custom prices)
  const [selectedPlans, setSelectedPlans] = useState<Record<string, boolean>>({ mensual: true, trimestral: true, anual: true, estudiante: false });
  const [planPrices, setPlanPrices] = useState<Record<string, number>>(
    Object.fromEntries(PRESET_PLANS.map(p => [p.id, p.price]))
  );

  // Step 3 - Classes
  const [selectedClasses, setSelectedClasses] = useState<Record<string, boolean>>({ funcional: true, boxeo: true, pilates: true });

  // Step 4 - Inventory
  const [selectedInventory, setSelectedInventory] = useState<Record<string, boolean>>(
    Object.fromEntries(PRESET_INVENTORY.map(i => [i.id, true]))
  );

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("gyms")
        .select("id, name, primary_color, logo_url, phone, email, address, setup_completed")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        if (data.setup_completed) { navigate("/dashboard", { replace: true }); return; }
        setGym(data);
        setInfo({
          name: data.name ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
          primary_color: data.primary_color ?? "#00E676",
        });
      } else {
        navigate("/dashboard", { replace: true });
      }
      setLoading(false);
    })();
  }, [user, navigate]);

  const STEPS = [
    { title: "Info del gym", icon: Sparkles, desc: "Datos de contacto y branding" },
    { title: "Planes", icon: CreditCard, desc: "Membresías iniciales" },
    { title: "Clases", icon: Calendar, desc: "Disciplinas que ofrecés" },
    { title: "Equipamiento", icon: Package, desc: "Inventario base" },
  ];

  const next = () => setStep(s => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setStep(s => Math.max(0, s - 1));

  const finish = async () => {
    if (!gym) return;
    setSaving(true);
    try {
      // 1. Update gym info
      await supabase.from("gyms").update({
        name: info.name,
        phone: info.phone || null,
        email: info.email || null,
        address: info.address || null,
        primary_color: info.primary_color,
        setup_completed: true,
      }).eq("id", gym.id);

      // 2. Insert plans
      const plansToInsert = PRESET_PLANS.filter(p => selectedPlans[p.id]).map(p => ({
        gym_id: gym.id,
        name: p.name,
        price: planPrices[p.id] ?? p.price,
        duration_days: p.duration_days,
        currency: "CRC",
        color: p.color,
        benefits: p.benefits,
        is_active: true,
      }));
      if (plansToInsert.length) await supabase.from("plans").insert(plansToInsert);

      // 3. Insert classes
      const classesToInsert = PRESET_CLASSES.filter(c => selectedClasses[c.id]).map(c => ({
        gym_id: gym.id,
        name: c.name,
        instructor: c.instructor,
        max_capacity: 20,
        is_active: true,
      }));
      if (classesToInsert.length) await supabase.from("classes").insert(classesToInsert);

      // 4. Insert inventory
      const invToInsert = PRESET_INVENTORY.filter(i => selectedInventory[i.id]).map(i => ({
        gym_id: gym.id,
        name: i.name,
        category: i.category,
        quantity: i.quantity,
        min_stock: 0,
        unit_cost: 0,
      }));
      if (invToInsert.length) await supabase.from("inventory").insert(invToInsert);

      toast({ title: "¡Configuración completa! 🎉", description: "Tu gimnasio está listo para operar" });
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              <span className="font-display font-bold">Bienvenido a {gym?.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">Paso {step + 1} de {STEPS.length}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </header>

      {/* Stepper */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="grid grid-cols-4 gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <div
                key={s.title}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all",
                  active && "border-primary bg-primary/5",
                  done && "border-primary/40 bg-primary/5",
                  !active && !done && "border-border/50 opacity-60",
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center",
                  (active || done) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className="text-xs font-medium text-center hidden sm:block">{s.title}</span>
              </div>
            );
          })}
        </div>

        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <h2 className="text-xl font-display font-bold">{STEPS[step].title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{STEPS[step].desc}</p>
            </div>

            {/* STEP 1 - Info */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre del gimnasio *</Label>
                  <Input value={info.name} onChange={e => setInfo({ ...info, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Teléfono</Label>
                    <Input value={info.phone} onChange={e => setInfo({ ...info, phone: e.target.value })} placeholder="+506 8888-8888" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email de contacto</Label>
                    <Input type="email" value={info.email} onChange={e => setInfo({ ...info, email: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Dirección</Label>
                  <Textarea rows={2} value={info.address} onChange={e => setInfo({ ...info, address: e.target.value })} placeholder="Provincia, cantón, señas" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Color principal de la marca</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={info.primary_color}
                      onChange={e => setInfo({ ...info, primary_color: e.target.value })}
                      className="h-10 w-16 rounded border cursor-pointer"
                    />
                    <Input value={info.primary_color} onChange={e => setInfo({ ...info, primary_color: e.target.value })} className="font-mono" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 - Plans */}
            {step === 1 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Seleccioná las plantillas y ajustá el precio. Podés crear más planes después.</p>
                {PRESET_PLANS.map(p => (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      selectedPlans[p.id] ? "border-primary bg-primary/5" : "border-border/50 hover:border-border",
                    )}
                    onClick={() => setSelectedPlans({ ...selectedPlans, [p.id]: !selectedPlans[p.id] })}
                  >
                    <Checkbox checked={selectedPlans[p.id]} className="pointer-events-none" />
                    <div className="h-8 w-1 rounded-full" style={{ background: p.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{p.benefits.join(" · ")}</p>
                    </div>
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <span className="text-xs text-muted-foreground">₡</span>
                      <Input
                        type="number"
                        value={planPrices[p.id]}
                        onChange={e => setPlanPrices({ ...planPrices, [p.id]: Number(e.target.value) })}
                        className="w-24 h-8 text-sm"
                        disabled={!selectedPlans[p.id]}
                      />
                      <span className="text-xs text-muted-foreground">/{p.duration_days}d</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 3 - Classes */}
            {step === 2 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Marcá las disciplinas que ofrecés. Podrás configurar horarios e instructores luego.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {PRESET_CLASSES.map(c => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedClasses({ ...selectedClasses, [c.id]: !selectedClasses[c.id] })}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                        selectedClasses[c.id] ? "border-primary bg-primary/5" : "border-border/50 hover:border-border",
                      )}
                    >
                      <Checkbox checked={!!selectedClasses[c.id]} className="pointer-events-none" />
                      <span className="text-sm font-medium">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4 - Inventory */}
            {step === 3 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Equipamiento básico precargado. Vas a poder editar cantidades después.</p>
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {PRESET_INVENTORY.map(i => (
                    <div
                      key={i.id}
                      onClick={() => setSelectedInventory({ ...selectedInventory, [i.id]: !selectedInventory[i.id] })}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all",
                        selectedInventory[i.id] ? "border-primary bg-primary/5" : "border-border/50 hover:border-border",
                      )}
                    >
                      <Checkbox checked={!!selectedInventory[i.id]} className="pointer-events-none" />
                      <div className="flex-1">
                        <p className="text-sm">{i.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{i.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="ghost" size="sm" onClick={prev} disabled={step === 0 || saving} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Atrás
              </Button>
              <div className="flex gap-2">
                {step < STEPS.length - 1 ? (
                  <Button size="sm" onClick={next} disabled={step === 0 && !info.name} className="gap-1">
                    Siguiente <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="sm" onClick={finish} disabled={saving} className="gap-1">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {saving ? "Configurando..." : "Finalizar y entrar"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
