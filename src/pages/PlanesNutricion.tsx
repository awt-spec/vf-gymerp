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
import { Plus, Apple, Trash2, Search, Flame, Clock, User, UtensilsCrossed, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import GymAiAssistant from "@/components/GymAiAssistant";

type Meal = { name: string; time: string; foods: string; calories: string };

const MEAL_PRESETS = [
  { name: "Desayuno", time: "07:00", icon: "🌅" },
  { name: "Media Mañana", time: "10:00", icon: "☀️" },
  { name: "Almuerzo", time: "12:30", icon: "🍽️" },
  { name: "Merienda", time: "15:30", icon: "🥤" },
  { name: "Cena", time: "19:00", icon: "🌙" },
  { name: "Pre-entreno", time: "16:00", icon: "⚡" },
  { name: "Post-entreno", time: "18:00", icon: "💪" },
];

const NUTRITION_TEMPLATES = [
  {
    name: "Volumen 3000 kcal",
    daily_calories: 3000,
    meals: [
      { name: "Desayuno", time: "07:00", foods: "4 huevos revueltos, 2 tostadas integrales, 1 banano, avena con leche", calories: "650" },
      { name: "Media Mañana", time: "10:00", foods: "Batido de proteína con avena y mantequilla de maní", calories: "450" },
      { name: "Almuerzo", time: "12:30", foods: "200g pechuga de pollo, arroz integral, ensalada con aguacate", calories: "700" },
      { name: "Pre-entreno", time: "16:00", foods: "Banano, puñado de almendras, galletas de arroz", calories: "300" },
      { name: "Post-entreno", time: "18:00", foods: "Batido de proteína con leche, fruta", calories: "400" },
      { name: "Cena", time: "19:30", foods: "200g salmón, camote al horno, vegetales salteados", calories: "500" },
    ],
  },
  {
    name: "Definición 1800 kcal",
    daily_calories: 1800,
    meals: [
      { name: "Desayuno", time: "07:00", foods: "3 claras + 1 huevo, tostada integral, café negro", calories: "300" },
      { name: "Media Mañana", time: "10:00", foods: "Yogurt griego con berries", calories: "200" },
      { name: "Almuerzo", time: "12:30", foods: "150g pollo a la plancha, ensalada grande, quinoa", calories: "450" },
      { name: "Merienda", time: "15:30", foods: "Proteína whey con agua, manzana", calories: "200" },
      { name: "Cena", time: "19:00", foods: "150g pescado, vegetales al vapor, aceite de oliva", calories: "400" },
      { name: "Post-entreno", time: "18:00", foods: "Batido de proteína con agua", calories: "250" },
    ],
  },
  {
    name: "Mantenimiento 2200 kcal",
    daily_calories: 2200,
    meals: [
      { name: "Desayuno", time: "07:00", foods: "Avena con leche, banano, nueces, miel", calories: "450" },
      { name: "Almuerzo", time: "12:30", foods: "180g carne magra, arroz, frijoles, ensalada", calories: "600" },
      { name: "Merienda", time: "15:30", foods: "Pan integral con aguacate y huevo", calories: "350" },
      { name: "Cena", time: "19:00", foods: "150g pollo, pasta integral, vegetales", calories: "500" },
      { name: "Snack", time: "21:00", foods: "Yogurt con granola", calories: "300" },
    ],
  },
];

export default function PlanesNutricion() {
  const { user } = useAuth();
  const { gymId } = useGym();
  const [plans, setPlans] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [viewPlan, setViewPlan] = useState<any>(null);
  const [form, setForm] = useState({ member_id: "", title: "", description: "", daily_calories: "", start_date: "", end_date: "" });
  const [meals, setMeals] = useState<Meal[]>([{ name: "Desayuno", time: "07:00", foods: "", calories: "" }]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<string>("members");
  const [showAllUnassigned, setShowAllUnassigned] = useState(false);

  const fetchData = async () => {
    if (!gymId) { setPlans([]); setMembers([]); return; }
    const [plansRes, membersRes] = await Promise.all([
      supabase.from("nutrition_plans").select("*, members(first_name, last_name)").eq("gym_id", gymId).order("created_at", { ascending: false }),
      supabase.from("members").select("id, first_name, last_name").eq("gym_id", gymId).eq("status", "active").order("first_name"),
    ]);
    setPlans(plansRes.data ?? []);
    setMembers(membersRes.data ?? []);
  };

  useEffect(() => { fetchData(); }, [gymId]);

  const memberPlans = useMemo(() => {
    const map = new Map<string, { member: any; plans: any[] }>();
    plans.forEach(p => {
      const key = p.member_id;
      if (!map.has(key)) map.set(key, { member: p.members, plans: [] });
      map.get(key)!.plans.push(p);
    });
    return Array.from(map.entries()).filter(([, v]) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return `${v.member?.first_name} ${v.member?.last_name}`.toLowerCase().includes(q) ||
        v.plans.some(p => p.title?.toLowerCase().includes(q));
    });
  }, [plans, search]);

  const totalCalories = useMemo(() => meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0), [meals]);

  const addMeal = (preset?: typeof MEAL_PRESETS[0]) => {
    setMeals([...meals, { name: preset?.name || "", time: preset?.time || "12:00", foods: "", calories: "" }]);
  };
  const removeMeal = (i: number) => setMeals(meals.filter((_, idx) => idx !== i));
  const updateMeal = (i: number, field: keyof Meal, value: string) => {
    const updated = [...meals]; updated[i] = { ...updated[i], [field]: value }; setMeals(updated);
  };

  const useTemplate = (template: typeof NUTRITION_TEMPLATES[0]) => {
    setForm({ ...form, title: template.name, daily_calories: String(template.daily_calories) });
    setMeals(template.meals);
    setOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("nutrition_plans").insert({
      member_id: form.member_id, coach_id: user?.id, title: form.title, description: form.description,
      meals: meals.filter(m => m.name.trim()), daily_calories: form.daily_calories ? Number(form.daily_calories) : null,
      gym_id: gymId,
      start_date: form.start_date || undefined, end_date: form.end_date || undefined,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Plan nutricional creado ✅" });
    setOpen(false);
    setForm({ member_id: "", title: "", description: "", daily_calories: "", start_date: "", end_date: "" });
    setMeals([{ name: "Desayuno", time: "07:00", foods: "", calories: "" }]);
    fetchData();
  };

  const deletePlan = async (id: string) => {
    await supabase.from("nutrition_plans").delete().eq("id", id);
    toast({ title: "Plan eliminado" }); setViewPlan(null); fetchData();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("nutrition_plans").update({ is_active: !current }).eq("id", id);
    fetchData();
  };

  const activePlans = plans.filter(p => p.is_active).length;
  const membersWithoutPlan = members.filter(m => !plans.some(p => p.member_id === m.id)).length;
  const avgCalories = plans.length > 0 ? Math.round(plans.reduce((s, p) => s + (p.daily_calories || 0), 0) / plans.length) : 0;

  const quickCreateForMember = (memberId: string) => {
    setForm({ member_id: memberId, title: "", description: "", daily_calories: "", start_date: "", end_date: "" });
    setMeals([{ name: "Desayuno", time: "07:00", foods: "", calories: "" }]);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-3xl font-display font-bold">Planes Nutricionales</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Planes de comidas personalizados</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" />Nuevo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Crear Plan Nutricional</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Socio</Label>
                <Select value={form.member_id} onValueChange={(v) => setForm({ ...form, member_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent className="max-h-60">{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Ej: Plan de volumen" /></div>
              <div className="space-y-1.5"><Label>Descripción</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Objetivos..." /></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1"><Label className="text-xs">Kcal/día</Label><Input type="number" value={form.daily_calories} onChange={(e) => setForm({ ...form, daily_calories: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">Inicio</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">Fin</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-display">Comidas</Label>
                  {totalCalories > 0 && <Badge variant="outline" className="text-[10px]"><Flame className="h-3 w-3 mr-0.5" />{totalCalories} kcal</Badge>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {MEAL_PRESETS.filter(p => !meals.some(m => m.name === p.name)).map(preset => (
                    <button key={preset.name} type="button" onClick={() => addMeal(preset)}
                      className="text-[10px] px-2 py-1 rounded-full border border-border/50 hover:border-primary hover:bg-primary/10 transition-colors">
                      {preset.icon} {preset.name}
                    </button>
                  ))}
                </div>
                {meals.map((meal, i) => (
                  <div key={i} className="rounded-xl border border-border/50 bg-card overflow-hidden">
                    <div className="flex items-center gap-2 p-2.5 bg-muted/20">
                      <span className="text-sm">{MEAL_PRESETS.find(p => p.name === meal.name)?.icon || "🍽️"}</span>
                      <Input value={meal.name} onChange={(e) => updateMeal(i, "name", e.target.value)} placeholder="Comida" className="flex-1 h-7 text-xs font-medium border-0 bg-transparent p-0 focus-visible:ring-0" />
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <Input type="time" value={meal.time} onChange={(e) => updateMeal(i, "time", e.target.value)} className="w-20 h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0" />
                      </div>
                      <Input value={meal.calories} onChange={(e) => updateMeal(i, "calories", e.target.value)} placeholder="kcal" className="w-14 h-7 text-xs text-center border border-border/50 rounded" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeMeal(i)} className="text-destructive h-7 w-7 shrink-0"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                    <div className="px-2.5 pb-2.5">
                      <Textarea value={meal.foods} onChange={(e) => updateMeal(i, "foods", e.target.value)} placeholder="Alimentos y porciones..." className="min-h-[45px] text-xs border-0 bg-transparent p-0 focus-visible:ring-0 resize-none" />
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => addMeal()}>
                  <Plus className="mr-1 h-3 w-3" />Agregar comida
                </Button>
              </div>
              <Button type="submit" className="w-full">Crear Plan</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="border-border/50"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total planes</p><p className="text-2xl font-display font-bold mt-0.5">{plans.length}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Activos</p><p className="text-2xl font-display font-bold mt-0.5 text-accent">{activePlans}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Socios con plan</p><p className="text-2xl font-display font-bold mt-0.5">{memberPlans.length}<span className="text-xs text-muted-foreground font-normal">/{members.length}</span></p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sin plan</p><p className="text-2xl font-display font-bold mt-0.5 text-orange-500">{membersWithoutPlan}</p></CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por socio o título..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
      </div>

      {/* Socios sin plan — quick create */}
      {membersWithoutPlan > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Socios sin plan nutricional</p>
              <button onClick={() => setShowAllUnassigned(true)} className="text-[10px] px-2 py-0.5 rounded-full bg-background border border-border hover:border-accent hover:text-accent transition-colors font-medium">
                Ver los {membersWithoutPlan} →
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {members.filter(m => !plans.some(p => p.member_id === m.id)).slice(0, 12).map(m => (
                <button key={m.id} onClick={() => quickCreateForMember(m.id)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-background hover:border-accent hover:bg-accent/10 transition-colors flex items-center gap-1">
                  <Plus className="h-3 w-3" />{m.first_name} {m.last_name}
                </button>
              ))}
              {membersWithoutPlan > 12 && (
                <button onClick={() => setShowAllUnassigned(true)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-accent/40 bg-accent/5 text-accent hover:bg-accent/10 transition-colors font-medium">
                  +{membersWithoutPlan - 12} más
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All unassigned dialog */}
      <Dialog open={showAllUnassigned} onOpenChange={setShowAllUnassigned}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <User className="h-4 w-4" />
              Socios sin plan nutricional
              <Badge variant="outline" className="ml-1">{membersWithoutPlan}</Badge>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Hacé clic en un socio para crear su plan rápidamente.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {members.filter(m => !plans.some(p => p.member_id === m.id)).map(m => (
              <button key={m.id}
                onClick={() => { quickCreateForMember(m.id); setShowAllUnassigned(false); }}
                className="text-left text-xs px-3 py-2.5 rounded-lg border border-border bg-card hover:border-accent hover:bg-accent/5 transition-colors flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Plus className="h-3.5 w-3.5 text-accent" />
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

      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="members" className="text-xs">Por Socio</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">Plantillas</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-3 space-y-3">
          {memberPlans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin planes creados</p>
            </div>
          ) : memberPlans.map(([memberId, { member, plans: mPlans }]) => (
            <Card key={memberId} className="border-border/50 overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-3 p-3 bg-muted/20 border-b border-border/30">
                  <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                    <Apple className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{member?.first_name} {member?.last_name}</h3>
                    <p className="text-[10px] text-muted-foreground">{mPlans.length} plan{mPlans.length !== 1 ? "es" : ""}</p>
                  </div>
                </div>
                <div className="grid gap-2 p-3 sm:grid-cols-2">
                  {mPlans.map(plan => {
                    const mealList = plan.meals as any[];
                    const totalMealCals = mealList?.reduce((s: number, m: any) => s + (Number(m.calories) || 0), 0) || 0;
                    return (
                      <div key={plan.id} onClick={() => setViewPlan(plan)}
                        className="rounded-xl border border-border/50 p-3 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{plan.title}</h4>
                          <Badge variant={plan.is_active ? "default" : "secondary"} className="text-[8px] shrink-0">{plan.is_active ? "✓" : "—"}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5"><UtensilsCrossed className="h-2.5 w-2.5" />{mealList?.length || 0} comidas</span>
                          {(plan.daily_calories || totalMealCals > 0) && <span className="flex items-center gap-0.5"><Flame className="h-2.5 w-2.5" />{plan.daily_calories || totalMealCals} kcal</span>}
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
          <p className="text-xs text-muted-foreground">Plantillas nutricionales — seleccioná una para crear un plan rápido</p>
          {NUTRITION_TEMPLATES.map(t => (
            <Card key={t.name} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><Apple className="h-4 w-4 text-accent" /></div>
                    <div>
                      <h3 className="font-semibold text-sm">{t.name}</h3>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Flame className="h-2.5 w-2.5" />{t.daily_calories} kcal · {t.meals.length} comidas</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => useTemplate(t)}>Usar</Button>
                </div>
                <div className="space-y-1">
                  {t.meals.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span>{MEAL_PRESETS.find(p => p.name === m.name)?.icon || "🍽️"}</span>
                      <span className="font-medium w-24 shrink-0">{m.name}</span>
                      <span className="text-muted-foreground truncate flex-1">{m.foods}</span>
                      <Badge variant="outline" className="text-[8px] shrink-0">{m.calories}</Badge>
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
            const mealList = viewPlan.meals as any[];
            const totalMealCals = mealList?.reduce((s: number, m: any) => s + (Number(m.calories) || 0), 0) || 0;
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
                    {(viewPlan.daily_calories || totalMealCals > 0) && (
                      <Badge variant="outline" className="text-[9px] gap-0.5"><Flame className="h-2.5 w-2.5" />{viewPlan.daily_calories || totalMealCals} kcal</Badge>
                    )}
                  </div>
                </DialogHeader>
                {viewPlan.description && <p className="text-xs text-muted-foreground">{viewPlan.description}</p>}
                <div className="space-y-2">
                  {mealList?.map((meal: any, i: number) => {
                    const icon = MEAL_PRESETS.find(p => p.name === (meal.name || meal.meal))?.icon || "🍽️";
                    return (
                      <div key={i} className="rounded-xl border border-border/50 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{icon}</span>
                            <div>
                              <p className="font-medium text-sm">{meal.name || meal.meal}</p>
                              {meal.time && <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{meal.time}</p>}
                            </div>
                          </div>
                          {meal.calories && <Badge variant="outline" className="text-[10px]">{meal.calories} kcal</Badge>}
                        </div>
                        {meal.foods && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{meal.foods}</p>}
                      </div>
                    );
                  })}
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
        module="nutricion"
        moduleLabel="Planes Nutrición"
        context={{
          total_plans: plans.length,
          active_plans: plans.filter((p: any) => p.is_active).length,
          total_members: members.length,
          members_with_plan: new Set(plans.map((p: any) => p.member_id)).size,
          avg_calories: plans.length ? Math.round(plans.reduce((s: number, p: any) => s + Number(p.daily_calories || 0), 0) / plans.length) : 0,
        }}
      />
    </div>
  );
}
