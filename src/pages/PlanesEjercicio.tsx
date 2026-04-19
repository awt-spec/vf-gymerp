import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGym } from "@/hooks/useGym";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Dumbbell, Search, ChevronLeft, ChevronRight, Trash2, Play, Calendar, User, Eye, X } from "lucide-react";
import EquipmentPicker from "@/components/ejercicio/EquipmentPicker";
import ExerciseBuilder, { type Exercise } from "@/components/ejercicio/ExerciseBuilder";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GymAiAssistant from "@/components/GymAiAssistant";

const SPLIT_TYPES = [
  { value: "push_pull_legs", label: "Push / Pull / Legs", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  { value: "upper_lower", label: "Upper / Lower", color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  { value: "full_body", label: "Full Body", color: "bg-green-500/10 text-green-600 border-green-200" },
  { value: "bro_split", label: "Bro Split", color: "bg-orange-500/10 text-orange-600 border-orange-200" },
  { value: "custom", label: "Personalizado", color: "bg-muted text-foreground border-border" },
];

const DAY_LABELS: Record<string, string[]> = {
  push_pull_legs: ["Push", "Pull", "Legs"],
  upper_lower: ["Upper", "Lower"],
  full_body: ["Full Body"],
  bro_split: ["Pecho", "Espalda", "Piernas", "Hombros", "Brazos"],
  custom: [],
};

// Exercise templates
const TEMPLATES = [
  {
    name: "PPL Principiante",
    split_type: "push_pull_legs",
    days: [
      { label: "Push", exercises: [
        { name: "Press banca", sets: "4", reps: "8", rest: "90s", machine: "Banca plana", video_url: "", notes: "" },
        { name: "Press inclinado mancuernas", sets: "3", reps: "10", rest: "60s", machine: "Banca inclinada", video_url: "", notes: "" },
        { name: "Aperturas", sets: "3", reps: "12", rest: "60s", machine: "Máquina pec deck", video_url: "", notes: "" },
        { name: "Press militar", sets: "3", reps: "10", rest: "60s", machine: "Barra", video_url: "", notes: "" },
        { name: "Tricep pushdown", sets: "3", reps: "12", rest: "45s", machine: "Polea", video_url: "", notes: "" },
      ]},
      { label: "Pull", exercises: [
        { name: "Dominadas", sets: "4", reps: "8", rest: "90s", machine: "", video_url: "", notes: "" },
        { name: "Remo con barra", sets: "3", reps: "10", rest: "60s", machine: "Barra", video_url: "", notes: "" },
        { name: "Jalón al pecho", sets: "3", reps: "12", rest: "60s", machine: "Polea alta", video_url: "", notes: "" },
        { name: "Curl bíceps", sets: "3", reps: "12", rest: "45s", machine: "Mancuernas", video_url: "", notes: "" },
        { name: "Face pulls", sets: "3", reps: "15", rest: "45s", machine: "Polea", video_url: "", notes: "" },
      ]},
      { label: "Legs", exercises: [
        { name: "Sentadilla", sets: "4", reps: "8", rest: "120s", machine: "Rack", video_url: "", notes: "" },
        { name: "Prensa", sets: "3", reps: "10", rest: "90s", machine: "Prensa 45°", video_url: "", notes: "" },
        { name: "Extensión de cuádriceps", sets: "3", reps: "12", rest: "60s", machine: "Máquina extensiones", video_url: "", notes: "" },
        { name: "Curl femoral", sets: "3", reps: "12", rest: "60s", machine: "Máquina curl", video_url: "", notes: "" },
        { name: "Elevación de pantorrillas", sets: "4", reps: "15", rest: "45s", machine: "", video_url: "", notes: "" },
      ]},
    ],
  },
  {
    name: "Upper/Lower Intermedio",
    split_type: "upper_lower",
    days: [
      { label: "Upper", exercises: [
        { name: "Press banca", sets: "4", reps: "6", rest: "120s", machine: "Banca plana", video_url: "", notes: "" },
        { name: "Remo con barra", sets: "4", reps: "8", rest: "90s", machine: "Barra", video_url: "", notes: "" },
        { name: "Press militar", sets: "3", reps: "10", rest: "60s", machine: "Barra", video_url: "", notes: "" },
        { name: "Dominadas", sets: "3", reps: "10", rest: "60s", machine: "", video_url: "", notes: "" },
        { name: "Curl y Tríceps", sets: "3", reps: "12", rest: "45s", machine: "Mancuernas", video_url: "", notes: "" },
      ]},
      { label: "Lower", exercises: [
        { name: "Sentadilla", sets: "4", reps: "6", rest: "120s", machine: "Rack", video_url: "", notes: "" },
        { name: "Peso muerto rumano", sets: "3", reps: "8", rest: "90s", machine: "Barra", video_url: "", notes: "" },
        { name: "Prensa", sets: "3", reps: "10", rest: "90s", machine: "Prensa 45°", video_url: "", notes: "" },
        { name: "Zancadas", sets: "3", reps: "10", rest: "60s", machine: "Mancuernas", video_url: "", notes: "" },
        { name: "Pantorrillas", sets: "4", reps: "15", rest: "45s", machine: "", video_url: "", notes: "" },
      ]},
    ],
  },
  {
    name: "Full Body Básico",
    split_type: "full_body",
    days: [
      { label: "Full Body", exercises: [
        { name: "Sentadilla", sets: "3", reps: "8", rest: "120s", machine: "Rack", video_url: "", notes: "" },
        { name: "Press banca", sets: "3", reps: "8", rest: "90s", machine: "Banca plana", video_url: "", notes: "" },
        { name: "Remo con barra", sets: "3", reps: "10", rest: "60s", machine: "Barra", video_url: "", notes: "" },
        { name: "Press hombros", sets: "3", reps: "10", rest: "60s", machine: "Mancuernas", video_url: "", notes: "" },
        { name: "Curl bíceps", sets: "2", reps: "12", rest: "45s", machine: "Mancuernas", video_url: "", notes: "" },
        { name: "Tríceps", sets: "2", reps: "12", rest: "45s", machine: "Polea", video_url: "", notes: "" },
      ]},
    ],
  },
];

export default function PlanesEjercicio() {
  const { user } = useAuth();
  const { gymId } = useGym();
  const [plans, setPlans] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [viewPlan, setViewPlan] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ member_id: "", title: "", description: "", start_date: "", end_date: "", split_type: "push_pull_legs", day_label: "" });
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<string>("members");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showAllUnassigned, setShowAllUnassigned] = useState(false);

  const fetchData = async () => {
    if (!gymId) { setPlans([]); setMembers([]); return; }
    const [plansRes, membersRes] = await Promise.all([
      supabase.from("exercise_plans").select("*, members(first_name, last_name)").eq("gym_id", gymId).order("created_at", { ascending: false }),
      supabase.from("members").select("id, first_name, last_name").eq("gym_id", gymId).eq("status", "active").order("first_name"),
    ]);
    setPlans(plansRes.data ?? []);
    setMembers(membersRes.data ?? []);
  };

  useEffect(() => { fetchData(); }, [gymId]);

  // Group plans by member
  const memberPlans = useMemo(() => {
    const map = new Map<string, { member: any; plans: any[] }>();
    plans.forEach(p => {
      const key = p.member_id;
      if (!map.has(key)) {
        map.set(key, { member: p.members, plans: [] });
      }
      map.get(key)!.plans.push(p);
    });
    return Array.from(map.entries()).filter(([, v]) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return `${v.member?.first_name} ${v.member?.last_name}`.toLowerCase().includes(q) ||
        v.plans.some(p => p.title?.toLowerCase().includes(q));
    });
  }, [plans, search]);

  const toggleEquipment = (name: string) => {
    setSelectedEquipment((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);
  };

  const resetForm = () => {
    setForm({ member_id: "", title: "", description: "", start_date: "", end_date: "", split_type: "push_pull_legs", day_label: "" });
    setSelectedEquipment([]);
    setExercises([]);
    setStep(0);
  };

  const handleCreate = async () => {
    if (!form.member_id || !form.title) { toast({ title: "Completá socio y título", variant: "destructive" }); return; }
    const { error } = await supabase.from("exercise_plans").insert({
      member_id: form.member_id, coach_id: user?.id, title: form.title, description: form.description,
      split_type: form.split_type, day_label: form.day_label || null,
      exercises: exercises.filter((ex) => ex.name.trim()),
      gym_id: gymId,
      start_date: form.start_date || undefined, end_date: form.end_date || undefined,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Plan de ejercicio creado ✅" });
    setOpen(false); resetForm(); fetchData();
  };

  const useTemplate = (template: typeof TEMPLATES[0], dayIndex: number) => {
    const day = template.days[dayIndex];
    setForm({ ...form, split_type: template.split_type, day_label: day.label, title: `${template.name} - ${day.label}` });
    setExercises(day.exercises);
    setStep(2);
  };

  const deletePlan = async (id: string) => {
    await supabase.from("exercise_plans").delete().eq("id", id);
    toast({ title: "Plan eliminado" }); setViewPlan(null); fetchData();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("exercise_plans").update({ is_active: !current }).eq("id", id);
    fetchData();
  };

  const dayLabels = DAY_LABELS[form.split_type] || [];
  const STEPS = ["Info", "Equipos", "Ejercicios"];
  const splitInfo = (val: string) => SPLIT_TYPES.find(s => s.value === val);

  const activePlans = plans.filter(p => p.is_active).length;
  const membersWithoutPlan = members.filter(m => !plans.some(p => p.member_id === m.id)).length;
  const avgExercises = plans.length > 0 ? Math.round(plans.reduce((s, p) => s + ((p.exercises as any[])?.length || 0), 0) / plans.length) : 0;

  const quickCreateForMember = (memberId: string) => {
    setForm({ ...form, member_id: memberId, title: "", description: "" });
    setStep(0);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-3xl font-display font-bold">Planes de Ejercicio</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Rutinas personalizadas por socio</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" />Nuevo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Crear Plan — {STEPS[step]}</DialogTitle></DialogHeader>
            <div className="flex items-center gap-1 mb-2">
              {STEPS.map((s, i) => (
                <div key={s} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`h-1.5 rounded-full w-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
                  <span className={`text-[9px] ${i <= step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
                </div>
              ))}
            </div>

            {step === 0 && (
              <div className="space-y-3">
                {/* Template shortcuts */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">⚡ Plantillas rápidas</Label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {TEMPLATES.map(t => (
                      <div key={t.name} className="rounded-xl border border-border/50 p-2.5 hover:border-primary/50 transition-colors">
                        <p className="text-xs font-semibold mb-1.5">{t.name}</p>
                        <div className="flex gap-1 flex-wrap">
                          {t.days.map((d, di) => (
                            <button key={d.label} type="button" onClick={() => useTemplate(t, di)}
                              className="text-[10px] px-2 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
                              {d.label} ({d.exercises.length})
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border/30 pt-3 space-y-3">
                  <div className="space-y-1.5">
                    <Label>Socio</Label>
                    <Select value={form.member_id} onValueChange={(v) => setForm({ ...form, member_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar socio" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo de split</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {SPLIT_TYPES.map(s => (
                        <button key={s.value} type="button" onClick={() => setForm({ ...form, split_type: s.value, day_label: "" })}
                          className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${form.split_type === s.value ? "ring-2 ring-primary " + s.color : "border-border/50 hover:border-primary/50 text-muted-foreground"}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {dayLabels.length > 0 && (
                    <div className="space-y-1.5">
                      <Label>Día</Label>
                      <div className="flex gap-1.5 flex-wrap">
                        {dayLabels.map(d => (
                          <button key={d} type="button" onClick={() => setForm({ ...form, day_label: d })}
                            className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${form.day_label === d ? "bg-primary text-primary-foreground border-primary" : "border-border/50 hover:border-primary/50"}`}>
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {form.split_type === "custom" && (
                    <div className="space-y-1"><Label className="text-xs">Nombre del día</Label><Input value={form.day_label} onChange={(e) => setForm({ ...form, day_label: e.target.value })} placeholder="Ej: Día A" /></div>
                  )}
                  <div className="space-y-1.5"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Push - Pecho y Tríceps" /></div>
                  <div className="space-y-1.5"><Label>Descripción</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Objetivos..." /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Inicio</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs">Fin</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
                  </div>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Seleccioná los equipos que usará el socio</p>
                <EquipmentPicker selected={selectedEquipment} onToggle={toggleEquipment} />
              </div>
            )}
            {step === 2 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{exercises.length} ejercicios</p>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setExercises([...exercises, { name: "", sets: "3", reps: "12", rest: "60s", machine: "", video_url: "", notes: "" }])}>
                    <Plus className="mr-1 h-3 w-3" />Agregar
                  </Button>
                </div>
                <ExerciseBuilder exercises={exercises} onChange={setExercises} />
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ChevronLeft className="mr-1 h-3.5 w-3.5" />Atrás</Button>
              {step < 2 ? (
                <Button type="button" size="sm" onClick={() => setStep(step + 1)} disabled={step === 0 && (!form.member_id || !form.title)}>Siguiente<ChevronRight className="ml-1 h-3.5 w-3.5" /></Button>
              ) : (
                <Button size="sm" onClick={handleCreate}>Crear Plan ✅</Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="border-border/50"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total planes</p><p className="text-2xl font-display font-bold mt-0.5">{plans.length}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Activos</p><p className="text-2xl font-display font-bold mt-0.5 text-primary">{activePlans}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Socios con plan</p><p className="text-2xl font-display font-bold mt-0.5">{memberPlans.length}<span className="text-xs text-muted-foreground font-normal">/{members.length}</span></p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sin plan</p><p className="text-2xl font-display font-bold mt-0.5 text-orange-500">{membersWithoutPlan}</p></CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por socio o título..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
      </div>

      {/* Socios sin plan — quick create */}
      {membersWithoutPlan > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Socios sin plan asignado</p>
              <button onClick={() => setShowAllUnassigned(true)} className="text-[10px] px-2 py-0.5 rounded-full bg-background border border-border hover:border-primary hover:text-primary transition-colors font-medium">
                Ver los {membersWithoutPlan} →
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {members.filter(m => !plans.some(p => p.member_id === m.id)).slice(0, 12).map(m => (
                <button key={m.id} onClick={() => quickCreateForMember(m.id)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-background hover:border-primary hover:bg-primary/10 transition-colors flex items-center gap-1">
                  <Plus className="h-3 w-3" />{m.first_name} {m.last_name}
                </button>
              ))}
              {membersWithoutPlan > 12 && (
                <button onClick={() => setShowAllUnassigned(true)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 transition-colors font-medium">
                  +{membersWithoutPlan - 12} más
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All unassigned members dialog */}
      <Dialog open={showAllUnassigned} onOpenChange={setShowAllUnassigned}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <User className="h-4 w-4" />
              Socios sin plan de ejercicio
              <Badge variant="outline" className="ml-1">{membersWithoutPlan}</Badge>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Hacé clic en un socio para crear su plan rápidamente.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {members.filter(m => !plans.some(p => p.member_id === m.id)).map(m => (
              <button key={m.id}
                onClick={() => { quickCreateForMember(m.id); setShowAllUnassigned(false); }}
                className="text-left text-xs px-3 py-2.5 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition-colors flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Plus className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{m.first_name} {m.last_name}</p>
                  <p className="text-[10px] text-muted-foreground">Crear plan</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabs: By Member vs Templates */}
      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="members" className="text-xs">Por Socio</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">Plantillas</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-3 space-y-3">
          {memberPlans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin planes creados</p>
            </div>
          ) : memberPlans.map(([memberId, { member, plans: mPlans }]) => (
            <Card key={memberId} className="border-border/50 overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-3 p-3 bg-muted/20 border-b border-border/30">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{member?.first_name} {member?.last_name}</h3>
                    <p className="text-[10px] text-muted-foreground">{mPlans.length} plan{mPlans.length !== 1 ? "es" : ""} · {mPlans.filter(p => p.is_active).length} activo{mPlans.filter(p => p.is_active).length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="grid gap-2 p-3 sm:grid-cols-2">
                  {mPlans.map(plan => {
                    const exerciseList = plan.exercises as Exercise[];
                    const split = splitInfo(plan.split_type);
                    return (
                      <div key={plan.id} onClick={() => setViewPlan(plan)}
                        className="rounded-xl border border-border/50 p-3 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{plan.title}</h4>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {split && split.value !== "custom" && <Badge className={`text-[8px] border py-0 ${split.color}`}>{split.label}</Badge>}
                              {plan.day_label && <Badge variant="outline" className="text-[8px] py-0">{plan.day_label}</Badge>}
                            </div>
                          </div>
                          <Badge variant={plan.is_active ? "default" : "secondary"} className="text-[8px] shrink-0">
                            {plan.is_active ? "✓" : "—"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5"><Dumbbell className="h-2.5 w-2.5" />{exerciseList?.length || 0}</span>
                          {plan.start_date && <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />{format(new Date(plan.start_date), "dd MMM", { locale: es })}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="templates" className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">Plantillas predefinidas — seleccioná un día para crear un plan rápido</p>
          {TEMPLATES.map(t => (
            <Card key={t.name} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Dumbbell className="h-4 w-4 text-primary" /></div>
                  <div>
                    <h3 className="font-semibold text-sm">{t.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{splitInfo(t.split_type)?.label} · {t.days.length} día{t.days.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {t.days.map((d, di) => (
                    <div key={d.label} className="rounded-xl border border-border/50 p-2.5">
                      <p className="font-medium text-xs mb-1.5">{d.label}</p>
                      <div className="space-y-0.5 mb-2">
                        {d.exercises.slice(0, 3).map((ex, ei) => (
                          <p key={ei} className="text-[10px] text-muted-foreground truncate">• {ex.name} — {ex.sets}×{ex.reps}</p>
                        ))}
                        {d.exercises.length > 3 && <p className="text-[10px] text-muted-foreground">+{d.exercises.length - 3} más</p>}
                      </div>
                      <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => { useTemplate(t, di); setOpen(true); }}>
                        Usar plantilla
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Plan detail modal */}
      <Dialog open={!!viewPlan} onOpenChange={(v) => { if (!v) setViewPlan(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {viewPlan && (() => {
            const exerciseList = viewPlan.exercises as Exercise[];
            const split = splitInfo(viewPlan.split_type);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="font-display">{viewPlan.title}</DialogTitle>
                    <Badge variant={viewPlan.is_active ? "default" : "secondary"} className="text-[9px] cursor-pointer"
                      onClick={() => { toggleActive(viewPlan.id, viewPlan.is_active); setViewPlan({ ...viewPlan, is_active: !viewPlan.is_active }); }}>
                      {viewPlan.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />{viewPlan.members?.first_name} {viewPlan.members?.last_name}
                    {split && <Badge className={`text-[8px] border ${split.color}`}>{split.label}</Badge>}
                    {viewPlan.day_label && <Badge variant="outline" className="text-[8px]">{viewPlan.day_label}</Badge>}
                  </div>
                </DialogHeader>
                {viewPlan.description && <p className="text-xs text-muted-foreground">{viewPlan.description}</p>}
                {viewPlan.start_date && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(viewPlan.start_date), "dd MMM yyyy", { locale: es })}
                    {viewPlan.end_date && <> → {format(new Date(viewPlan.end_date), "dd MMM yyyy", { locale: es })}</>}
                  </div>
                )}
                <div className="space-y-2">
                  {exerciseList?.map((ex, i) => (
                    <div key={i} className="rounded-xl border border-border/50 p-3 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{ex.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary" className="font-mono text-[10px]">{ex.sets}×{ex.reps}</Badge>
                          {ex.rest && <span className="text-[10px] text-muted-foreground">⏱ {ex.rest}</span>}
                          {ex.machine && <span className="text-[10px] text-muted-foreground">📍 {ex.machine}</span>}
                        </div>
                        {ex.notes && <p className="text-[10px] text-muted-foreground mt-1">{ex.notes}</p>}
                        {ex.video_url && (
                          <a href={ex.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary mt-1 hover:underline">
                            <Play className="h-2.5 w-2.5" /> Ver video
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-2 border-t border-border/30">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive gap-1" onClick={() => deletePlan(viewPlan.id)}>
                    <Trash2 className="h-3 w-3" /> Eliminar
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
      <GymAiAssistant
        module="ejercicio"
        moduleLabel="Planes Ejercicio"
        context={{
          total_plans: plans.length,
          active_plans: plans.filter((p: any) => p.is_active).length,
          total_members: members.length,
          members_with_plan: new Set(plans.map((p: any) => p.member_id)).size,
          splits: plans.reduce((acc: any, p: any) => { acc[p.split_type || "custom"] = (acc[p.split_type || "custom"] || 0) + 1; return acc; }, {}),
        }}
      />
    </div>
  );
}
