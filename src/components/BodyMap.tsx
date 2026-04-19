import { useMemo, useState } from "react";
import Model from "react-body-highlighter";
import type { IExerciseData, IMuscleStats } from "react-body-highlighter";
import { useTheme } from "next-themes";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

interface BodyMapProps {
  muscleActivity: Record<string, number>;
}

const MUSCLE_MAP: Record<string, string[]> = {
  Pecho: ["chest"],
  Espalda: ["upper-back", "trapezius", "lower-back"],
  Hombros: ["front-deltoids", "back-deltoids"],
  Bíceps: ["biceps"],
  Tríceps: ["triceps"],
  Antebrazos: ["forearm"],
  Abdomen: ["abs"],
  Core: ["abs", "obliques"],
  Oblicuos: ["obliques"],
  Cuádriceps: ["quadriceps"],
  Isquiotibiales: ["hamstring"],
  Glúteos: ["gluteal"],
  Pantorrillas: ["calves"],
  Aductores: ["adductor"],
  Abductores: ["abductors"],
  Piernas: ["quadriceps", "hamstring", "gluteal", "calves"],
  Trapecios: ["trapezius"],
  Dorsal: ["upper-back"],
  "Espalda Baja": ["lower-back"],
  Cuello: ["neck"],
};

function activityToData(muscleActivity: Record<string, number>): IExerciseData[] {
  const data: IExerciseData[] = [];
  Object.entries(muscleActivity).forEach(([name, volume]) => {
    const muscles = MUSCLE_MAP[name];
    if (!muscles || volume <= 0) return;
    for (let i = 0; i < Math.min(volume, 20); i++) {
      data.push({ name, muscles: muscles as any });
    }
  });
  return data;
}

const DARK_COLORS = ["#1a3a5c", "#1e4d7a", "#2563eb", "#3b82f6", "#60a5fa"];
const LIGHT_COLORS = ["#bfdbfe", "#93c5fd", "#3b82f6", "#2563eb", "#1d4ed8"];

const DARK_THEME = { bg: "#1e1e2e", body: "#2d3040", colors: DARK_COLORS };
const LIGHT_THEME = { bg: "#f1f5f9", body: "#cbd5e1", colors: LIGHT_COLORS };

const DARK_LEGEND = [
  { label: "Sin uso", color: "#2d3040" },
  { label: "Bajo", color: "#1a3a5c" },
  { label: "Medio", color: "#2563eb" },
  { label: "Alto", color: "#3b82f6" },
  { label: "Máximo", color: "#60a5fa" },
];
const LIGHT_LEGEND = [
  { label: "Sin uso", color: "#cbd5e1" },
  { label: "Bajo", color: "#bfdbfe" },
  { label: "Medio", color: "#3b82f6" },
  { label: "Alto", color: "#2563eb" },
  { label: "Máximo", color: "#1d4ed8" },
];

type ChartView = "body" | "bars" | "radar";

export function BodyMap({ muscleActivity }: BodyMapProps) {
  const { resolvedTheme } = useTheme();
  const [localLight, setLocalLight] = useState(false);
  const [chartView, setChartView] = useState<ChartView>("body");
  const [clickedMuscle, setClickedMuscle] = useState<IMuscleStats | null>(null);

  // Local theme override for the body map section
  const isLight = localLight || resolvedTheme === "light";
  const theme = isLight ? LIGHT_THEME : DARK_THEME;
  const legend = isLight ? LIGHT_LEGEND : DARK_LEGEND;

  const data = useMemo(() => activityToData(muscleActivity), [muscleActivity]);
  const maxVal = useMemo(() => Math.max(...Object.values(muscleActivity), 1), [muscleActivity]);

  const topMuscles = useMemo(() =>
    Object.entries(muscleActivity)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    [muscleActivity]
  );

  // Bar chart data
  const barData = useMemo(() =>
    topMuscles.map(([name, vol]) => ({
      name: name.length > 8 ? name.slice(0, 7) + "…" : name,
      fullName: name,
      volumen: vol,
      pct: Math.round((vol / maxVal) * 100),
    })),
    [topMuscles, maxVal]
  );

  // Radar chart data
  const radarData = useMemo(() => {
    const groups = ["Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps", "Cuádriceps", "Isquiotibiales", "Glúteos", "Core"];
    return groups.map(g => ({
      muscle: g.length > 6 ? g.slice(0, 5) + "…" : g,
      fullName: g,
      value: muscleActivity[g] || 0,
      max: maxVal,
    }));
  }, [muscleActivity, maxVal]);

  const handleMuscleClick = (data: IMuscleStats) => {
    setClickedMuscle(data);
    setTimeout(() => setClickedMuscle(null), 3000);
  };

  const textColor = isLight ? "#334155" : "#94a3b8";
  const accentColor = isLight ? "#2563eb" : "#3b82f6";

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-muted/50 p-0.5">
          {(["body", "bars", "radar"] as const).map(v => (
            <button
              key={v}
              onClick={() => setChartView(v)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                chartView === v
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "body" ? "Cuerpo" : v === "bars" ? "Barras" : "Radar"}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setLocalLight(!localLight)}
          title={isLight ? "Modo oscuro" : "Modo claro"}
        >
          {isLight ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Clicked muscle info */}
      {clickedMuscle && clickedMuscle.data.frequency > 0 && (
        <div className="text-center py-1 px-3 rounded-lg bg-primary/10 border border-primary/30 animate-in fade-in">
          <p className="text-xs font-semibold text-primary capitalize">{clickedMuscle.muscle.replace("-", " ")}</p>
          <p className="text-[10px] text-muted-foreground">
            {clickedMuscle.data.frequency}x trabajado · {clickedMuscle.data.exercises.join(", ")}
          </p>
        </div>
      )}

      {/* Body map view */}
      {chartView === "body" && (
        <>
          <div className="flex justify-center gap-2">
            <div className="flex-1 max-w-[180px]">
              <p className="text-[10px] text-center mb-1 font-display" style={{ color: textColor }}>Frontal</p>
              <div className="rhb-wrapper rounded-xl p-2 transition-colors" style={{ backgroundColor: theme.bg }}>
                <Model
                  data={data}
                  type="anterior"
                  bodyColor={theme.body}
                  highlightedColors={theme.colors}
                  style={{ width: "100%" }}
                  svgStyle={{ width: "100%", height: "auto" }}
                  onClick={handleMuscleClick}
                />
              </div>
            </div>
            <div className="flex-1 max-w-[180px]">
              <p className="text-[10px] text-center mb-1 font-display" style={{ color: textColor }}>Posterior</p>
              <div className="rhb-wrapper rounded-xl p-2 transition-colors" style={{ backgroundColor: theme.bg }}>
                <Model
                  data={data}
                  type="posterior"
                  bodyColor={theme.body}
                  highlightedColors={theme.colors}
                  style={{ width: "100%" }}
                  svgStyle={{ width: "100%", height: "auto" }}
                  onClick={handleMuscleClick}
                />
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="flex justify-center gap-3">
            {legend.map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm border border-border/30" style={{ backgroundColor: l.color }} />
                <span className="text-[9px] text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Bar chart view */}
      {chartView === "bars" && (
        <div className="rounded-xl p-3 transition-colors" style={{ backgroundColor: theme.bg }}>
          <ResponsiveContainer width="100%" height={Math.max(barData.length * 32, 120)}>
            <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis type="number" tick={{ fontSize: 9, fill: textColor }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: textColor }} axisLine={false} tickLine={false} width={65} />
              <Tooltip
                formatter={(v: number, _: any, props: any) => [v.toLocaleString(), props.payload.fullName]}
                contentStyle={{ fontSize: 11, background: isLight ? "#fff" : "hsl(var(--card))", border: `1px solid ${isLight ? "#e2e8f0" : "hsl(var(--border))"}`, borderRadius: 8, color: isLight ? "#1e293b" : "#e2e8f0" }}
                labelStyle={{ color: textColor }}
              />
              <Bar dataKey="volumen" radius={[0, 6, 6, 0]} fill={accentColor}>
                {barData.map((_, i) => {
                  const pct = barData[i].pct / 100;
                  const idx = Math.min(Math.floor(pct * theme.colors.length), theme.colors.length - 1);
                  return <rect key={i} fill={theme.colors[idx]} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Radar chart view */}
      {chartView === "radar" && (
        <div className="rounded-xl p-3 transition-colors" style={{ backgroundColor: theme.bg }}>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData} outerRadius="70%">
              <PolarGrid stroke={isLight ? "#cbd5e1" : "#374151"} />
              <PolarAngleAxis dataKey="muscle" tick={{ fontSize: 9, fill: textColor }} />
              <Radar
                name="Volumen"
                dataKey="value"
                stroke={accentColor}
                fill={accentColor}
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Tooltip
                formatter={(v: number, _: any, props: any) => [v.toLocaleString(), props.payload.fullName]}
                contentStyle={{ fontSize: 11, background: isLight ? "#fff" : "hsl(var(--card))", border: `1px solid ${isLight ? "#e2e8f0" : "hsl(var(--border))"}`, borderRadius: 8, color: isLight ? "#1e293b" : "#e2e8f0" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top muscles chips */}
      {topMuscles.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {topMuscles.slice(0, 8).map(([name, vol]) => {
            const pct = Math.round((vol / maxVal) * 100);
            const colorIdx = Math.min(Math.floor((pct / 100) * theme.colors.length), theme.colors.length - 1);
            return (
              <div
                key={name}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-colors"
                style={{
                  backgroundColor: `${theme.colors[colorIdx]}22`,
                  color: theme.colors[colorIdx],
                  border: `1px solid ${theme.colors[colorIdx]}44`,
                }}
              >
                <span className="font-medium">{name}</span>
                <span className="opacity-70">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
