import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function MiGymDatosCorporales() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: member } = await supabase
        .from("members").select("id").eq("auth_user_id", user.id).maybeSingle();
      if (member) {
        const { data } = await supabase
          .from("inbody_results").select("*")
          .eq("member_id", member.id)
          .order("measurement_date", { ascending: false });
        setList(data || []);
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center p-8"><div className="text-primary animate-pulse">Cargando...</div></div>;

  const latest = list[0];
  const chartData = [...list].reverse().map(r => ({
    date: format(new Date(r.measurement_date), "dd MMM", { locale: es }),
    peso: r.weight_kg ? Number(r.weight_kg) : null,
    grasa: r.body_fat_pct ? Number(r.body_fat_pct) : null,
    musculo: r.muscle_mass_kg ? Number(r.muscle_mass_kg) : null,
  }));

  const trend = (current: number, prev: number, lowerIsBetter = false) => {
    if (prev == null || current == null) return { icon: Minus, color: "text-muted-foreground", diff: "" };
    const d = current - prev;
    if (Math.abs(d) < 0.05) return { icon: Minus, color: "text-muted-foreground", diff: d.toFixed(1) };
    const good = lowerIsBetter ? d < 0 : d > 0;
    return {
      icon: d > 0 ? TrendingUp : TrendingDown,
      color: good ? "text-primary" : "text-destructive",
      diff: `${d > 0 ? "+" : ""}${d.toFixed(1)}`,
    };
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-cyan-400" />
        <h1 className="text-xl font-display font-bold text-foreground">Datos Corporales</h1>
      </div>

      {!latest ? (
        <Card className="border-border/50">
          <CardContent className="pt-8 pb-8 text-center space-y-2">
            <Activity className="w-10 h-10 text-muted-foreground/50 mx-auto" />
            <p className="text-base font-medium text-foreground">Sin datos de composición corporal</p>
            <p className="text-sm text-muted-foreground">Solicita tu medición InBody en recepción</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Última medición */}
          <Card className="border-cyan-500/30 bg-cyan-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Última medición (InBody)</CardTitle>
              <p className="text-xs text-muted-foreground">
                {format(new Date(latest.measurement_date), "dd 'de' MMMM yyyy", { locale: es })}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Peso", value: latest.weight_kg ? `${latest.weight_kg} kg` : null, emoji: "⚖️" },
                  { label: "Masa Muscular", value: latest.muscle_mass_kg ? `${latest.muscle_mass_kg} kg` : null, emoji: "💪" },
                  { label: "% Grasa", value: latest.body_fat_pct ? `${latest.body_fat_pct}%` : null, emoji: "📊" },
                  { label: "Grasa Visceral", value: latest.visceral_fat_level ? `Nivel ${latest.visceral_fat_level}` : null, emoji: "🫀" },
                  { label: "IMC", value: latest.bmi ? Number(latest.bmi).toFixed(1) : null, emoji: "📏" },
                  { label: "Edad Metabólica", value: latest.metabolic_age ? `${latest.metabolic_age} años` : null, emoji: "⚡" },
                ].map(({ label, value, emoji }) => (
                  <div key={label} className="rounded-lg border border-border/50 bg-background/50 p-2">
                    <p className="text-[10px] text-muted-foreground">{emoji} {label}</p>
                    <p className="text-sm font-semibold text-foreground">{value || "—"}</p>
                  </div>
                ))}
              </div>
              {latest.notes && (
                <p className="mt-3 text-xs text-muted-foreground italic border-t border-border/50 pt-2">{latest.notes}</p>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de progreso */}
          {chartData.length > 1 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Progreso</CardTitle>
                <p className="text-xs text-muted-foreground">Peso (kg) y % grasa corporal en el tiempo</p>
              </CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Peso kg" />
                      <Line type="monotone" dataKey="grasa" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3 }} name="% Grasa" />
                      <Line type="monotone" dataKey="musculo" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Músculo kg" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Historial detallado */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historial</CardTitle>
              <p className="text-xs text-muted-foreground">{list.length} mediciones registradas</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {list.map((r, i) => {
                const prev = list[i + 1];
                const tWeight = trend(Number(r.weight_kg), Number(prev?.weight_kg), true);
                const tFat = trend(Number(r.body_fat_pct), Number(prev?.body_fat_pct), true);
                const tMuscle = trend(Number(r.muscle_mass_kg), Number(prev?.muscle_mass_kg), false);
                return (
                  <div key={r.id} className="rounded-lg border border-border/50 bg-background/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">
                        {format(new Date(r.measurement_date), "dd MMM yyyy", { locale: es })}
                      </p>
                      {i === 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">Más reciente</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <Metric label="Peso" value={r.weight_kg ? `${r.weight_kg} kg` : "—"} t={prev ? tWeight : null} />
                      <Metric label="% Grasa" value={r.body_fat_pct ? `${r.body_fat_pct}%` : "—"} t={prev ? tFat : null} />
                      <Metric label="Músculo" value={r.muscle_mass_kg ? `${r.muscle_mass_kg} kg` : "—"} t={prev ? tMuscle : null} />
                    </div>
                    {r.notes && <p className="text-[11px] text-muted-foreground italic">{r.notes}</p>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, t }: { label: string; value: string; t: any }) {
  const Icon = t?.icon;
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
      {t && Icon && t.diff && (
        <p className={`text-[10px] flex items-center gap-0.5 ${t.color}`}>
          <Icon className="w-3 h-3" /> {t.diff}
        </p>
      )}
    </div>
  );
}
