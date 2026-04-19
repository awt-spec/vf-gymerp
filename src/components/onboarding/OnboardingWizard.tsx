import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Target, Dumbbell, Heart, Zap, Scale, TrendingUp,
  ChevronRight, ChevronLeft, Check, Flame, Clock,
  Calendar, Activity, Shield, Ruler
} from "lucide-react";

type Props = {
  memberId: string;
  onComplete: () => void;
};

const GOALS = [
  { id: "lose_weight", label: "Perder peso", icon: Scale, color: "text-orange-400" },
  { id: "gain_muscle", label: "Ganar músculo", icon: Dumbbell, color: "text-blue-400" },
  { id: "endurance", label: "Resistencia", icon: Heart, color: "text-red-400" },
  { id: "flexibility", label: "Flexibilidad", icon: Activity, color: "text-purple-400" },
  { id: "strength", label: "Fuerza pura", icon: Zap, color: "text-yellow-400" },
  { id: "tone", label: "Tonificar", icon: Flame, color: "text-pink-400" },
  { id: "health", label: "Salud general", icon: Shield, color: "text-green-400" },
  { id: "performance", label: "Rendimiento", icon: TrendingUp, color: "text-cyan-400" },
];

const EXPERIENCE = [
  { id: "beginner", label: "Principiante", desc: "Nunca o menos de 3 meses", icon: "🌱" },
  { id: "intermediate", label: "Intermedio", desc: "3 meses a 2 años", icon: "💪" },
  { id: "advanced", label: "Avanzado", desc: "Más de 2 años", icon: "🔥" },
];

const TRAINING_TYPES = [
  { id: "weights", label: "Pesas", icon: Dumbbell },
  { id: "cardio", label: "Cardio", icon: Heart },
  { id: "functional", label: "Funcional", icon: Zap },
  { id: "classes", label: "Clases grupales", icon: Calendar },
  { id: "crossfit", label: "CrossFit", icon: Flame },
  { id: "calisthenics", label: "Calistenia", icon: Activity },
];

const DAYS_OPTIONS = [2, 3, 4, 5, 6];

export default function OnboardingWizard({ memberId, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<string[]>([]);
  const [experience, setExperience] = useState("beginner");
  const [trainingTypes, setTrainingTypes] = useState<string[]>([]);
  const [days, setDays] = useState(3);
  const [injuries, setInjuries] = useState("");
  const [measurements, setMeasurements] = useState({
    height_cm: "", weight_kg: "", target_weight_kg: "", body_fat_pct: "",
  });
  const [saving, setSaving] = useState(false);

  const toggleGoal = (id: string) => setGoals((p) => p.includes(id) ? p.filter((g) => g !== id) : [...p, id]);
  const toggleTraining = (id: string) => setTrainingTypes((p) => p.includes(id) ? p.filter((t) => t !== id) : [...p, id]);

  const STEPS = [
    { title: "¿Cuáles son tus metas?", subtitle: "Seleccioná una o más" },
    { title: "¿Cuál es tu nivel?", subtitle: "Sé honesto, esto nos ayuda a recomendarte mejor" },
    { title: "¿Qué tipo de entrenamiento te gusta?", subtitle: "Seleccioná los que prefieras" },
    { title: "¿Cuántos días podés entrenar?", subtitle: "Por semana" },
    { title: "Tus medidas", subtitle: "Opcional pero útil para seguir tu progreso" },
    { title: "¡Listo!", subtitle: "Tu perfil está configurado" },
  ];

  const canProceed = () => {
    if (step === 0) return goals.length > 0;
    if (step === 1) return !!experience;
    if (step === 2) return trainingTypes.length > 0;
    return true;
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("member_onboarding").insert({
        member_id: memberId,
        fitness_goals: goals,
        experience_level: experience,
        preferred_training: trainingTypes,
        available_days: days,
        injuries: injuries || null,
        height_cm: measurements.height_cm ? Number(measurements.height_cm) : null,
        weight_kg: measurements.weight_kg ? Number(measurements.weight_kg) : null,
        target_weight_kg: measurements.target_weight_kg ? Number(measurements.target_weight_kg) : null,
        body_fat_pct: measurements.body_fat_pct ? Number(measurements.body_fat_pct) : null,
        completed: true,
      });
      if (error) throw error;

      // Also save body measurements if provided
      if (measurements.weight_kg || measurements.body_fat_pct) {
        await supabase.from("body_measurements").insert({
          member_id: memberId,
          weight_kg: measurements.weight_kg ? Number(measurements.weight_kg) : null,
          body_fat_pct: measurements.body_fat_pct ? Number(measurements.body_fat_pct) : null,
        });
      }

      toast({ title: "¡Bienvenido! 🎉", description: "Tu perfil ha sido configurado" });
      onComplete();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getRecommendations = () => {
    const recs: string[] = [];
    if (goals.includes("lose_weight")) recs.push("Combiná cardio con pesas 3-4 veces por semana");
    if (goals.includes("gain_muscle")) recs.push("Enfocate en entrenamiento de fuerza progresivo");
    if (goals.includes("endurance")) recs.push("Incluí sesiones de cardio de 30-45 min");
    if (goals.includes("flexibility")) recs.push("Agregá 10 min de estiramientos post-entrenamiento");
    if (goals.includes("strength")) recs.push("Trabajá con rangos de 3-6 reps y descansos largos");
    if (days <= 3) recs.push("Con " + days + " días, priorizá Full Body o Upper/Lower");
    if (days >= 5) recs.push("Con " + days + " días, un Push/Pull/Legs es ideal");
    if (experience === "beginner") recs.push("Empezá con pesos ligeros y enfocate en la técnica");
    if (experience === "advanced") recs.push("Periodizá tu entrenamiento cada 4-6 semanas");
    return recs.length > 0 ? recs : ["Entrená consistentemente y descansá bien 💪"];
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Progress */}
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>

        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-display font-bold">{STEPS[step].title}</h1>
          <p className="text-sm text-muted-foreground">{STEPS[step].subtitle}</p>
        </div>

        {/* Step 0: Goals */}
        {step === 0 && (
          <div className="grid grid-cols-2 gap-2">
            {GOALS.map((g) => {
              const active = goals.includes(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => toggleGoal(g.id)}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left",
                    active ? "border-primary bg-primary/10 shadow-md shadow-primary/10" : "border-border/40 hover:border-primary/40"
                  )}
                >
                  <g.icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : g.color)} />
                  <span className="text-sm font-medium">{g.label}</span>
                  {active && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 1: Experience */}
        {step === 1 && (
          <div className="space-y-2">
            {EXPERIENCE.map((e) => (
              <button
                key={e.id}
                onClick={() => setExperience(e.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                  experience === e.id ? "border-primary bg-primary/10 shadow-md shadow-primary/10" : "border-border/40 hover:border-primary/40"
                )}
              >
                <span className="text-2xl">{e.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{e.label}</p>
                  <p className="text-xs text-muted-foreground">{e.desc}</p>
                </div>
                {experience === e.id && <Check className="h-4 w-4 text-primary ml-auto" />}
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Training types */}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-2">
            {TRAINING_TYPES.map((t) => {
              const active = trainingTypes.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTraining(t.id)}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left",
                    active ? "border-primary bg-primary/10 shadow-md shadow-primary/10" : "border-border/40 hover:border-primary/40"
                  )}
                >
                  <t.icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm font-medium">{t.label}</span>
                  {active && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 3: Days */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              {DAYS_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={cn(
                    "w-14 h-14 rounded-xl border-2 text-lg font-bold transition-all",
                    days === d ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "border-border/40 hover:border-primary/40"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {days} días por semana
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">¿Alguna lesión o condición? (opcional)</Label>
              <Textarea
                value={injuries}
                onChange={(e) => setInjuries(e.target.value)}
                placeholder="Ej: Tendinitis en hombro derecho, dolor lumbar..."
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
        )}

        {/* Step 4: Measurements */}
        {step === 4 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Ruler className="h-3 w-3" />Altura (cm)</Label>
                <Input
                  type="number"
                  value={measurements.height_cm}
                  onChange={(e) => setMeasurements({ ...measurements, height_cm: e.target.value })}
                  placeholder="170"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Scale className="h-3 w-3" />Peso actual (kg)</Label>
                <Input
                  type="number"
                  value={measurements.weight_kg}
                  onChange={(e) => setMeasurements({ ...measurements, weight_kg: e.target.value })}
                  placeholder="75"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Target className="h-3 w-3" />Peso meta (kg)</Label>
                <Input
                  type="number"
                  value={measurements.target_weight_kg}
                  onChange={(e) => setMeasurements({ ...measurements, target_weight_kg: e.target.value })}
                  placeholder="70"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">% Grasa corporal</Label>
                <Input
                  type="number"
                  value={measurements.body_fat_pct}
                  onChange={(e) => setMeasurements({ ...measurements, body_fat_pct: e.target.value })}
                  placeholder="20"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Estos datos son opcionales. Podés agregarlos después.
            </p>
          </div>
        )}

        {/* Step 5: Summary */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
              <h3 className="font-display font-semibold text-sm">Tu perfil</h3>
              <div className="flex flex-wrap gap-1.5">
                {goals.map((g) => (
                  <Badge key={g} className="text-[10px]">{GOALS.find((x) => x.id === g)?.label}</Badge>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{EXPERIENCE.find((e) => e.id === experience)?.icon} {EXPERIENCE.find((e) => e.id === experience)?.label}</span>
                <span>•</span>
                <span>{days} días/semana</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
              <h3 className="font-display font-semibold text-sm flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" />Recomendaciones
              </h3>
              {getRecommendations().map((r, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">•</span>{r}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" />Atrás
            </Button>
          ) : <div />}
          
          {step < 5 ? (
            <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Siguiente<ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleFinish} disabled={saving}>
              {saving ? "Guardando..." : "¡Empezar! 🚀"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
