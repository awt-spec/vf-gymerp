import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Dumbbell, Apple, Search, ChevronRight, Loader2 } from "lucide-react";

type Props = { gymId: string };

type MemberRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  status: string;
  exerciseCount: number;
  nutritionCount: number;
};

export default function GymMembersPlansPanel({ gymId }: Props) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [memberPlans, setMemberPlans] = useState<{ exercise: any[]; nutrition: any[] }>({ exercise: [], nutrition: [] });
  const [loadingPlans, setLoadingPlans] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [mRes, eRes, nRes] = await Promise.all([
        supabase.from("members").select("id, first_name, last_name, email, status").eq("gym_id", gymId).order("first_name"),
        supabase.from("exercise_plans").select("member_id").eq("gym_id", gymId),
        supabase.from("nutrition_plans").select("member_id").eq("gym_id", gymId),
      ]);
      const exCount: Record<string, number> = {};
      const nutCount: Record<string, number> = {};
      (eRes.data || []).forEach((p: any) => { exCount[p.member_id] = (exCount[p.member_id] || 0) + 1; });
      (nRes.data || []).forEach((p: any) => { nutCount[p.member_id] = (nutCount[p.member_id] || 0) + 1; });
      const rows: MemberRow[] = (mRes.data || []).map((m: any) => ({
        ...m,
        exerciseCount: exCount[m.id] || 0,
        nutritionCount: nutCount[m.id] || 0,
      }));
      setMembers(rows);
      setLoading(false);
    })();
  }, [gymId]);

  const filtered = members.filter(m => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q);
  });

  const totalExercise = members.reduce((s, m) => s + m.exerciseCount, 0);
  const totalNutrition = members.reduce((s, m) => s + m.nutritionCount, 0);

  const openMember = async (m: MemberRow) => {
    setSelected(m);
    setLoadingPlans(true);
    const [eRes, nRes] = await Promise.all([
      supabase.from("exercise_plans").select("*").eq("member_id", m.id).order("created_at", { ascending: false }),
      supabase.from("nutrition_plans").select("*").eq("member_id", m.id).order("created_at", { ascending: false }),
    ]);
    setMemberPlans({ exercise: eRes.data || [], nutrition: nRes.data || [] });
    setLoadingPlans(false);
  };

  return (
    <Card className="bg-white border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 flex items-center gap-2">
          <Users className="h-3.5 w-3.5" /> Socios y sus planes
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <span><Dumbbell className="h-3 w-3 inline mr-1 text-blue-500" />{totalExercise} ej.</span>
          <span><Apple className="h-3 w-3 inline mr-1 text-emerald-500" />{totalNutrition} nut.</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : selected ? (
        <div className="space-y-3">
          <button
            onClick={() => setSelected(null)}
            className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            ← Volver a la lista
          </button>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm font-bold">{selected.first_name} {selected.last_name}</p>
            {selected.email && <p className="text-[10px] text-slate-400">{selected.email}</p>}
          </div>

          <Tabs defaultValue="exercise" className="w-full">
            <TabsList className="grid grid-cols-2 h-8">
              <TabsTrigger value="exercise" className="text-[11px] gap-1">
                <Dumbbell className="h-3 w-3" /> Ejercicio ({memberPlans.exercise.length})
              </TabsTrigger>
              <TabsTrigger value="nutrition" className="text-[11px] gap-1">
                <Apple className="h-3 w-3" /> Nutrición ({memberPlans.nutrition.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="exercise" className="space-y-2 mt-2">
              {loadingPlans ? (
                <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
              ) : memberPlans.exercise.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">Sin planes de ejercicio asignados</p>
              ) : memberPlans.exercise.map((p: any) => (
                <div key={p.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold">{p.title}</p>
                    <Badge variant="outline" className={`text-[9px] ${p.is_active ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-slate-400 bg-slate-50 border-slate-200"}`}>
                      {p.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {p.split_type} · {p.day_label || "—"} · {(p.exercises as any[])?.length || 0} ejercicios
                  </p>
                  {p.description && <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{p.description}</p>}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="nutrition" className="space-y-2 mt-2">
              {loadingPlans ? (
                <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
              ) : memberPlans.nutrition.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">Sin planes nutricionales asignados</p>
              ) : memberPlans.nutrition.map((p: any) => (
                <div key={p.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold">{p.title}</p>
                    <Badge variant="outline" className={`text-[9px] ${p.is_active ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-slate-400 bg-slate-50 border-slate-200"}`}>
                      {p.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {p.daily_calories ? `${p.daily_calories} kcal · ` : ""}
                    {(p.meals as any[])?.length || 0} comidas
                  </p>
                  {p.description && <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{p.description}</p>}
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative mb-2">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar socio..."
              className="pl-8 h-8 text-xs"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-6">
              {members.length === 0 ? "Sin socios registrados" : "Sin coincidencias"}
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-1">
              {filtered.map(m => (
                <button
                  key={m.id}
                  onClick={() => openMember(m)}
                  className="w-full flex items-center justify-between gap-2 p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{m.first_name} {m.last_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[9px] px-1.5 py-0 rounded ${m.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                        {m.status}
                      </span>
                      {m.email && <span className="text-[9px] text-slate-400 truncate">{m.email}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {m.exerciseCount > 0 && (
                      <span className="text-[10px] flex items-center gap-0.5 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        <Dumbbell className="h-2.5 w-2.5" />{m.exerciseCount}
                      </span>
                    )}
                    {m.nutritionCount > 0 && (
                      <span className="text-[10px] flex items-center gap-0.5 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        <Apple className="h-2.5 w-2.5" />{m.nutritionCount}
                      </span>
                    )}
                    {m.exerciseCount === 0 && m.nutritionCount === 0 && (
                      <span className="text-[10px] text-slate-300">sin planes</span>
                    )}
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
