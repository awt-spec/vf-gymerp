import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Dumbbell, Trophy, ChevronDown, Crown, Medal, Award } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BodyMap } from "@/components/BodyMap";
import { COMMON_EXERCISES, MUSCLE_GROUPS, BENCHMARKS, getRank, RANK_COLORS } from "@/lib/benchmarks";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const QUICK_EXERCISES = [
  { name: "Press Banca", icon: "🏋️" },
  { name: "Sentadilla", icon: "🦵" },
  { name: "Peso Muerto", icon: "💀" },
  { name: "Press Militar", icon: "🫡" },
  { name: "Curl Bíceps", icon: "💪" },
  { name: "Dominadas", icon: "🧗" },
  { name: "Fondos", icon: "⬇️" },
  { name: "Remo", icon: "🚣" },
];

export default function ProgresoSocio() {
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [allWorkouts, setAllWorkouts] = useState<any[]>([]);
  const [openWorkout, setOpenWorkout] = useState(false);
  const [openMeasure, setOpenMeasure] = useState(false);
  const [workoutForm, setWorkoutForm] = useState({
    exercise_name: "", muscle_group: "", sets: "3", reps: "10", weight_kg: "0", notes: "",
    workout_date: new Date().toISOString().split("T")[0],
  });
  const [measureForm, setMeasureForm] = useState({
    weight_kg: "", body_fat_pct: "", chest_cm: "", waist_cm: "", hips_cm: "",
    bicep_left_cm: "", bicep_right_cm: "", thigh_left_cm: "", thigh_right_cm: "",
    calf_cm: "", neck_cm: "", shoulders_cm: "",
    measurement_date: new Date().toISOString().split("T")[0],
  });
  const [showAllWorkouts, setShowAllWorkouts] = useState(false);
  const [activeTab, setActiveTab] = useState("workouts");

  useEffect(() => {
    supabase.from("members").select("id, first_name, last_name").eq("status", "active").then(({ data }) => setMembers(data ?? []));
    supabase.from("workout_logs").select("*").then(({ data }) => setAllWorkouts(data ?? []));
  }, []);

  useEffect(() => {
    if (!selectedMember) return;
    Promise.all([
      supabase.from("workout_logs").select("*").eq("member_id", selectedMember).order("workout_date", { ascending: false }),
      supabase.from("body_measurements").select("*").eq("member_id", selectedMember).order("measurement_date", { ascending: true }),
      supabase.from("achievements").select("*").eq("member_id", selectedMember).order("achieved_at", { ascending: false }),
    ]).then(([w, m, a]) => {
      setWorkouts(w.data ?? []);
      setMeasurements(m.data ?? []);
      setAchievements(a.data ?? []);
    });
  }, [selectedMember]);

  const muscleActivity = useMemo(() => {
    const last30 = workouts.filter(w => new Date(w.workout_date) >= new Date(Date.now() - 30 * 86400000));
    const counts: Record<string, number> = {};
    last30.forEach(w => { counts[w.muscle_group] = (counts[w.muscle_group] || 0) + (w.sets * w.reps); });
    return counts;
  }, [workouts]);

  const bestLifts = useMemo(() => {
    const bests: Record<string, number> = {};
    workouts.forEach(w => { if (!bests[w.exercise_name] || w.weight_kg > bests[w.exercise_name]) bests[w.exercise_name] = Number(w.weight_kg); });
    return bests;
  }, [workouts]);

  // Global ranking
  const globalRanking = useMemo(() => {
    const memberTotals: Record<string, { total: number; name: string }> = {};
    allWorkouts.forEach(w => {
      if (!memberTotals[w.member_id]) memberTotals[w.member_id] = { total: 0, name: "" };
      memberTotals[w.member_id].total += (w.sets * w.reps * Number(w.weight_kg || 1));
    });
    members.forEach(m => {
      if (memberTotals[m.id]) memberTotals[m.id].name = `${m.first_name} ${m.last_name}`;
    });
    return Object.entries(memberTotals)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [allWorkouts, members]);

  const myRankPosition = globalRanking.findIndex(r => r.id === selectedMember);
  const communityRanking = useMemo(() => {
    if (globalRanking.length === 0 || myRankPosition === -1) return null;
    const pct = myRankPosition / globalRanking.length;
    if (pct <= 0.1) return "oro";
    if (pct <= 0.3) return "plata";
    if (pct <= 0.6) return "bronce";
    return null;
  }, [globalRanking, myRankPosition]);

  const workoutsByDate = useMemo(() => {
    const groups: Record<string, any[]> = {};
    workouts.forEach(w => { const d = w.workout_date; if (!groups[d]) groups[d] = []; groups[d].push(w); });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [workouts]);

  const selectQuickExercise = (name: string) => {
    const mg = COMMON_EXERCISES[name] || "";
    setWorkoutForm({ ...workoutForm, exercise_name: name, muscle_group: mg });
  };

  const handleLogWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("workout_logs").insert({
      member_id: selectedMember, exercise_name: workoutForm.exercise_name,
      muscle_group: workoutForm.muscle_group, sets: Number(workoutForm.sets),
      reps: Number(workoutForm.reps), weight_kg: Number(workoutForm.weight_kg),
      notes: workoutForm.notes || null, workout_date: workoutForm.workout_date,
      logged_by: user?.id ?? "",
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Ejercicio registrado 💪" });
    setOpenWorkout(false);
    setWorkoutForm({ exercise_name: "", muscle_group: "", sets: "3", reps: "10", weight_kg: "0", notes: "", workout_date: new Date().toISOString().split("T")[0] });
    const { data } = await supabase.from("workout_logs").select("*").eq("member_id", selectedMember).order("workout_date", { ascending: false });
    setWorkouts(data ?? []);
    checkAndAwardAchievements(data ?? []);
  };

  const checkAndAwardAchievements = async (logs: any[]) => {
    const bests: Record<string, number> = {};
    logs.forEach(w => { if (!bests[w.exercise_name] || w.weight_kg > bests[w.exercise_name]) bests[w.exercise_name] = Number(w.weight_kg); });
    for (const bm of BENCHMARKS) {
      const best = bests[bm.exercise] ?? 0;
      const rank = getRank(best, bm);
      if (rank) {
        const existing = achievements.find(a => a.exercise_name === bm.exercise && a.rank === rank && a.category === "benchmark");
        if (!existing) {
          await supabase.from("achievements").insert({
            member_id: selectedMember, rank, category: "benchmark", exercise_name: bm.exercise,
            title: `${RANK_COLORS[rank].icon} ${bm.exercise} - ${rank.charAt(0).toUpperCase() + rank.slice(1)}`,
            description: `Alcanzó ${best}${bm.unit} en ${bm.exercise}`,
          } as any);
        }
      }
    }
    const { data: ach } = await supabase.from("achievements").select("*").eq("member_id", selectedMember);
    setAchievements(ach ?? []);
  };

  const handleLogMeasure = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { member_id: selectedMember, measurement_date: measureForm.measurement_date };
    Object.entries(measureForm).forEach(([k, v]) => { if (k !== "measurement_date" && v) payload[k] = Number(v); });
    const { error } = await supabase.from("body_measurements").insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Medidas registradas 📏" });
    setOpenMeasure(false);
    const { data } = await supabase.from("body_measurements").select("*").eq("member_id", selectedMember).order("measurement_date", { ascending: true });
    setMeasurements(data ?? []);
  };

  const measureChartData = useMemo(() =>
    measurements.map(m => ({
      date: format(new Date(m.measurement_date), "dd/MM", { locale: es }),
      Peso: m.weight_kg, Pecho: m.chest_cm, Cintura: m.waist_cm, Bícep: m.bicep_right_cm,
    })), [measurements]);

  const visibleWorkouts = showAllWorkouts ? workoutsByDate : workoutsByDate.slice(0, 3);

  const getRankIcon = (pos: number) => {
    if (pos === 0) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (pos === 1) return <Medal className="h-4 w-4 text-gray-400" />;
    if (pos === 2) return <Award className="h-4 w-4 text-amber-600" />;
    return <span className="text-[11px] font-bold text-muted-foreground w-4 text-center">{pos + 1}</span>;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-3xl font-display font-bold">Progreso de Socios</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Ejercicios, medidas, logros y ranking</p>
      </div>

      <Select value={selectedMember} onValueChange={setSelectedMember}>
        <SelectTrigger className="text-sm"><SelectValue placeholder="Seleccionar socio" /></SelectTrigger>
        <SelectContent>
          {members.map(m => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}
        </SelectContent>
      </Select>

      {!selectedMember ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Dumbbell className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">Seleccioná un socio para ver su progreso</p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="workouts" className="text-[10px] md:text-sm">💪 Ejercicios</TabsTrigger>
            <TabsTrigger value="bodymap" className="text-[10px] md:text-sm">🧍 Cuerpo</TabsTrigger>
            <TabsTrigger value="measurements" className="text-[10px] md:text-sm">📏 Medidas</TabsTrigger>
            <TabsTrigger value="ranks" className="text-[10px] md:text-sm">🏆 Rangos</TabsTrigger>
            <TabsTrigger value="ranking" className="text-[10px] md:text-sm">👑 Global</TabsTrigger>
          </TabsList>

          {/* ── WORKOUTS ── */}
          <TabsContent value="workouts" className="space-y-3 mt-3">
            <Button size="sm" className="w-full gap-1.5 text-xs" onClick={() => setOpenWorkout(true)}>
              <Plus className="h-3.5 w-3.5" />Registrar Ejercicio
            </Button>

            {/* Quick stats */}
            {workouts.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                <Card className="border-border/50"><CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{workoutsByDate.length}</p>
                  <p className="text-[10px] text-muted-foreground">Días entrenados</p>
                </CardContent></Card>
                <Card className="border-border/50"><CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{workouts.length}</p>
                  <p className="text-[10px] text-muted-foreground">Ejercicios</p>
                </CardContent></Card>
                <Card className="border-border/50"><CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{Math.round(workouts.reduce((s, w) => s + (w.sets * w.reps * Number(w.weight_kg || 0)), 0) / 1000)}k</p>
                  <p className="text-[10px] text-muted-foreground">Vol. total (kg)</p>
                </CardContent></Card>
              </div>
            )}

            {workoutsByDate.length === 0 ? (
              <div className="text-center text-muted-foreground text-xs py-8">Sin registros aún</div>
            ) : (
              <div className="space-y-3">
                {visibleWorkouts.map(([date, exercises]) => (
                  <div key={date}>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      {format(new Date(date), "EEEE dd MMM", { locale: es })}
                    </p>
                    <div className="space-y-1.5">
                      {exercises.map((w: any) => (
                        <div key={w.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border/50">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {w.weight_kg || 0}kg
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{w.exercise_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {w.sets}×{w.reps}
                              <Badge variant="secondary" className="text-[8px] ml-1.5 py-0">{w.muscle_group}</Badge>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {workoutsByDate.length > 3 && (
                  <Button variant="ghost" size="sm" className="w-full text-xs gap-1 text-muted-foreground" onClick={() => setShowAllWorkouts(!showAllWorkouts)}>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAllWorkouts ? "rotate-180" : ""}`} />
                    {showAllWorkouts ? "Ver menos" : `Ver todos (${workoutsByDate.length} días)`}
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── BODY MAP ── */}
          <TabsContent value="bodymap" className="space-y-3 mt-3">
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-2"><CardTitle className="font-display text-base">Mapa Muscular (30 días)</CardTitle></CardHeader>
              <CardContent><BodyMap muscleActivity={muscleActivity} /></CardContent>
            </Card>
            <div className="space-y-1.5">
              {MUSCLE_GROUPS.map(mg => {
                const val = muscleActivity[mg] || 0;
                const maxVal = Math.max(...Object.values(muscleActivity), 1);
                const pct = Math.round((val / maxVal) * 100);
                return (
                  <div key={mg} className="flex items-center gap-2 px-1">
                    <span className="text-[11px] w-20 shrink-0 truncate">{mg}</span>
                    <div className="flex-1 bg-muted/30 rounded-full h-2.5 overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-10 text-right">{val}</span>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ── MEASUREMENTS ── */}
          <TabsContent value="measurements" className="space-y-3 mt-3">
            <Button size="sm" className="w-full gap-1.5 text-xs" onClick={() => setOpenMeasure(true)}>
              <Plus className="h-3.5 w-3.5" />Registrar Medidas
            </Button>

            {measurements.length > 1 && (
              <Card className="border-border/50 bg-card/80">
                <CardContent className="pt-4 px-2">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={measureChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="Peso" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Pecho" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Cintura" stroke="#ef4444" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Bícep" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <div className="space-y-1.5">
              {measurements.length === 0 ? (
                <p className="text-center text-muted-foreground text-xs py-8">Sin medidas registradas</p>
              ) : [...measurements].reverse().slice(0, 10).map(m => (
                <div key={m.id} className="p-3 rounded-xl bg-card border border-border/50">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                    {format(new Date(m.measurement_date), "dd MMM yyyy", { locale: es })}
                  </p>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[11px]">
                    {m.weight_kg && <span>⚖️ {m.weight_kg} kg</span>}
                    {m.body_fat_pct && <span>📊 {m.body_fat_pct}%</span>}
                    {m.chest_cm && <span>📐 Pecho {m.chest_cm}</span>}
                    {m.waist_cm && <span>📏 Cintura {m.waist_cm}</span>}
                    {m.hips_cm && <span>🫧 Cadera {m.hips_cm}</span>}
                    {m.bicep_right_cm && <span>💪 Bícep {m.bicep_right_cm}</span>}
                    {m.shoulders_cm && <span>🤸 Hombros {m.shoulders_cm}</span>}
                    {m.thigh_right_cm && <span>🦵 Muslo {m.thigh_right_cm}</span>}
                    {m.calf_cm && <span>🦶 Pantorrilla {m.calf_cm}</span>}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── RANKS ── */}
          <TabsContent value="ranks" className="space-y-3 mt-3">
            {communityRanking && (
              <div className={`p-4 rounded-xl border-2 ${RANK_COLORS[communityRanking].border} bg-card/80 flex items-center gap-3`}>
                <span className="text-3xl">{RANK_COLORS[communityRanking].icon}</span>
                <div>
                  <p className={`font-display font-bold ${RANK_COLORS[communityRanking].text}`}>
                    Rango: {communityRanking.charAt(0).toUpperCase() + communityRanking.slice(1)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Puesto #{myRankPosition + 1} de {globalRanking.length}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {BENCHMARKS.map(bm => {
                const best = bestLifts[bm.exercise] ?? 0;
                const rank = getRank(best, bm);
                return (
                  <div key={bm.exercise} className={`p-3 rounded-xl border ${rank ? RANK_COLORS[rank].border + " " + RANK_COLORS[rank].bg : "border-border/50 bg-card"}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{bm.exercise}</span>
                      {rank ? (
                        <Badge className={`${RANK_COLORS[rank].bg} ${RANK_COLORS[rank].text} ${RANK_COLORS[rank].border} text-[10px]`}>
                          {RANK_COLORS[rank].icon} {rank.charAt(0).toUpperCase() + rank.slice(1)}
                        </Badge>
                      ) : <Badge variant="secondary" className="text-[10px]">Sin rango</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                      <span>Mejor: <strong className="text-foreground">{best}{bm.unit}</strong></span>
                      <span>·</span>
                      <span>🥉{bm.bronce} · 🥈{bm.plata} · 🥇{bm.oro}</span>
                    </div>
                    <div className="mt-1.5 bg-muted/30 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min((best / bm.oro) * 100, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {achievements.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Logros</p>
                {achievements.map(a => {
                  const rc = RANK_COLORS[a.rank as keyof typeof RANK_COLORS];
                  return (
                    <div key={a.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl ${rc?.bg || "bg-muted/20"}`}>
                      <span className="text-xl">{rc?.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${rc?.text}`}>{a.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{a.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── GLOBAL RANKING ── */}
          <TabsContent value="ranking" className="space-y-3 mt-3">
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="font-display text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" />Ranking Global</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {globalRanking.length === 0 ? (
                  <p className="text-center text-muted-foreground text-xs py-6">Sin datos de entrenamiento aún</p>
                ) : globalRanking.slice(0, 20).map((entry, i) => {
                  const isMe = entry.id === selectedMember;
                  return (
                    <div key={entry.id} className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${isMe ? "bg-primary/10 border border-primary/30" : "bg-card border border-border/50"}`}>
                      <div className="w-6 flex justify-center">{getRankIcon(i)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isMe ? "text-primary" : ""}`}>
                          {entry.name || "Socio"}
                          {isMe && <span className="text-[10px] ml-1">(tú)</span>}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">{Math.round(entry.total / 1000)}k</p>
                        <p className="text-[9px] text-muted-foreground">vol. total</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* ── Workout Dialog ── */}
      <Dialog open={openWorkout} onOpenChange={setOpenWorkout}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-base">Registrar Ejercicio</DialogTitle></DialogHeader>
          <form onSubmit={handleLogWorkout} className="space-y-3">
            <div>
              <Label className="text-[11px] text-muted-foreground mb-1.5 block">Rápido</Label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_EXERCISES.map(qe => (
                  <button key={qe.name} type="button"
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] border transition-all ${
                      workoutForm.exercise_name === qe.name ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 border-border/50 hover:bg-muted/50"
                    }`}
                    onClick={() => selectQuickExercise(qe.name)}>
                    {qe.icon} {qe.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-[11px]">O elegí del listado</Label>
                <Select value={workoutForm.exercise_name} onValueChange={v => {
                  const mg = COMMON_EXERCISES[v] || "";
                  setWorkoutForm({ ...workoutForm, exercise_name: v, muscle_group: mg });
                }}>
                  <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Ejercicio" /></SelectTrigger>
                  <SelectContent>{Object.keys(COMMON_EXERCISES).map(ex => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Grupo</Label>
                <Select value={workoutForm.muscle_group} onValueChange={v => setWorkoutForm({ ...workoutForm, muscle_group: v })}>
                  <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{MUSCLE_GROUPS.map(mg => <SelectItem key={mg} value={mg}>{mg}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Fecha</Label>
                <Input type="date" value={workoutForm.workout_date} onChange={e => setWorkoutForm({ ...workoutForm, workout_date: e.target.value })} className="text-sm h-9" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <Label className="text-[11px]">Series</Label>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <button type="button" className="w-7 h-7 rounded-lg bg-muted/50 text-sm font-bold" onClick={() => setWorkoutForm({ ...workoutForm, sets: String(Math.max(1, Number(workoutForm.sets) - 1)) })}>−</button>
                  <span className="text-lg font-bold w-8 text-center">{workoutForm.sets}</span>
                  <button type="button" className="w-7 h-7 rounded-lg bg-muted/50 text-sm font-bold" onClick={() => setWorkoutForm({ ...workoutForm, sets: String(Number(workoutForm.sets) + 1) })}>+</button>
                </div>
              </div>
              <div className="text-center">
                <Label className="text-[11px]">Reps</Label>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <button type="button" className="w-7 h-7 rounded-lg bg-muted/50 text-sm font-bold" onClick={() => setWorkoutForm({ ...workoutForm, reps: String(Math.max(1, Number(workoutForm.reps) - 1)) })}>−</button>
                  <span className="text-lg font-bold w-8 text-center">{workoutForm.reps}</span>
                  <button type="button" className="w-7 h-7 rounded-lg bg-muted/50 text-sm font-bold" onClick={() => setWorkoutForm({ ...workoutForm, reps: String(Number(workoutForm.reps) + 1) })}>+</button>
                </div>
              </div>
              <div className="text-center">
                <Label className="text-[11px]">Peso (kg)</Label>
                <Input type="number" step="0.5" value={workoutForm.weight_kg}
                  onChange={e => setWorkoutForm({ ...workoutForm, weight_kg: e.target.value })}
                  className="text-center text-sm h-9 mt-1" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={!workoutForm.exercise_name || !workoutForm.muscle_group}>
              Registrar 💪
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Measures Dialog ── */}
      <Dialog open={openMeasure} onOpenChange={setOpenMeasure}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-base">Registrar Medidas</DialogTitle></DialogHeader>
          <form onSubmit={handleLogMeasure} className="space-y-3">
            <div>
              <Label className="text-[11px]">Fecha</Label>
              <Input type="date" value={measureForm.measurement_date} onChange={e => setMeasureForm({ ...measureForm, measurement_date: e.target.value })} className="text-sm h-9" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["weight_kg", "⚖️ Peso (kg)"], ["body_fat_pct", "📊 Grasa (%)"],
                ["chest_cm", "📐 Pecho"], ["waist_cm", "📏 Cintura"],
                ["hips_cm", "🫧 Cadera"], ["shoulders_cm", "🤸 Hombros"],
                ["bicep_left_cm", "💪 Bícep Izq"], ["bicep_right_cm", "💪 Bícep Der"],
                ["thigh_left_cm", "🦵 Muslo Izq"], ["thigh_right_cm", "🦵 Muslo Der"],
                ["calf_cm", "🦶 Pantorrilla"], ["neck_cm", "🧣 Cuello"],
              ] as [string, string][]).map(([key, label]) => (
                <div key={key}>
                  <Label className="text-[10px]">{label}</Label>
                  <Input type="number" step="0.1" value={(measureForm as any)[key]}
                    onChange={e => setMeasureForm({ ...measureForm, [key]: e.target.value })}
                    className="text-sm h-9" placeholder="—" />
                </div>
              ))}
            </div>
            <Button type="submit" className="w-full">Guardar 📏</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
