import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Play, Link as LinkIcon, ChevronDown, ChevronUp } from "lucide-react";
import { PRESET_MACHINES } from "@/data/presetMachines";
import { useState } from "react";

export type Exercise = {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  machine: string;
  video_url?: string;
  notes?: string;
};

type Props = {
  exercises: Exercise[];
  onChange: (exercises: Exercise[]) => void;
};

const COMMON_EXERCISES: Record<string, string[]> = {
  "Press de Banca": ["Press banca plano", "Press banca inclinado", "Press banca declinado"],
  "Rack de Sentadillas": ["Sentadilla trasera", "Sentadilla frontal", "Buenos días"],
  "Máquina de Poleas": ["Cruces de polea", "Tríceps polea", "Bíceps polea", "Face pull"],
  "Jalón al Pecho": ["Jalón frontal", "Jalón tras nuca", "Jalón agarre estrecho"],
  "Prensa de Piernas": ["Prensa 45°", "Prensa horizontal"],
  "Extensión de Piernas": ["Extensión cuádriceps", "Curl femoral"],
  "Pec Deck / Aperturas": ["Aperturas máquina", "Rear delt fly"],
  "Press de Hombros": ["Press militar máquina", "Press Arnold"],
  "Mancuernas": ["Curl bíceps", "Press mancuernas", "Elevaciones laterales", "Peso muerto rumano"],
  "Barra Olímpica": ["Peso muerto", "Remo con barra", "Press militar", "Curl barra"],
  "Hip Thrust": ["Hip thrust barra", "Hip thrust banda"],
  "Hack Squat": ["Hack squat", "Hack squat invertido"],
  "Máquina Smith": ["Sentadilla Smith", "Press Smith inclinado"],
};

export default function ExerciseBuilder({ exercises, onChange }: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const update = (i: number, field: keyof Exercise, value: string) => {
    const copy = [...exercises];
    copy[i] = { ...copy[i], [field]: value };
    onChange(copy);
  };

  const remove = (i: number) => onChange(exercises.filter((_, idx) => idx !== i));

  const addFromSuggestion = (machine: string, exName: string) => {
    onChange([...exercises, { name: exName, sets: "3", reps: "12", rest: "60s", machine, video_url: "", notes: "" }]);
  };

  const increment = (i: number, field: "sets" | "reps", delta: number) => {
    const current = parseInt(exercises[i][field]) || 0;
    update(i, field, String(Math.max(1, current + delta)));
  };

  const moveExercise = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= exercises.length) return;
    const copy = [...exercises];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
    setExpandedIdx(j);
  };

  const machinesWithExercises = Object.keys(COMMON_EXERCISES);

  return (
    <div className="space-y-3">
      {exercises.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed border-border/50 rounded-xl">
          <p className="text-xs text-muted-foreground">Agregá ejercicios desde las sugerencias abajo o manualmente</p>
        </div>
      )}

      {exercises.map((ex, i) => {
        const machineImg = PRESET_MACHINES.find((m) => m.name === ex.machine)?.image;
        const isExpanded = expandedIdx === i;
        return (
          <div key={i} className="rounded-xl border border-border/50 bg-card overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-2 p-2.5 cursor-pointer" onClick={() => setExpandedIdx(isExpanded ? null : i)}>
              <span className="text-[10px] font-bold text-muted-foreground w-5 text-center shrink-0">{i + 1}</span>
              {machineImg && <img src={machineImg} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{ex.name || "Sin nombre"}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="secondary" className="text-[9px] font-mono">{ex.sets}×{ex.reps}</Badge>
                  {ex.rest && <Badge variant="outline" className="text-[9px]">⏱ {ex.rest}</Badge>}
                  {ex.video_url && <Play className="h-3 w-3 text-primary" />}
                </div>
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
            </div>

            {/* Expanded details */}
            {isExpanded && (
              <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
                <Input value={ex.name} onChange={(e) => update(i, "name", e.target.value)} placeholder="Nombre del ejercicio" className="h-8 text-sm" />
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => increment(i, "sets", -1)} className="h-7 w-7 rounded-lg bg-muted text-xs font-bold hover:bg-muted/80">−</button>
                    <span className="text-sm font-bold w-6 text-center">{ex.sets}</span>
                    <button type="button" onClick={() => increment(i, "sets", 1)} className="h-7 w-7 rounded-lg bg-muted text-xs font-bold hover:bg-muted/80">+</button>
                    <span className="text-[10px] text-muted-foreground ml-0.5">sets</span>
                  </div>
                  <span className="text-muted-foreground">×</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => increment(i, "reps", -1)} className="h-7 w-7 rounded-lg bg-muted text-xs font-bold hover:bg-muted/80">−</button>
                    <span className="text-sm font-bold w-6 text-center">{ex.reps}</span>
                    <button type="button" onClick={() => increment(i, "reps", 1)} className="h-7 w-7 rounded-lg bg-muted text-xs font-bold hover:bg-muted/80">+</button>
                    <span className="text-[10px] text-muted-foreground ml-0.5">reps</span>
                  </div>
                  <Input value={ex.rest} onChange={(e) => update(i, "rest", e.target.value)} className="h-7 text-[10px] w-16" placeholder="Desc." />
                </div>

                {/* Video URL */}
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Input value={ex.video_url || ""} onChange={(e) => update(i, "video_url", e.target.value)} placeholder="URL del video (YouTube, Instagram...)" className="h-7 text-xs flex-1" />
                </div>
                {ex.video_url && (
                  <a href={ex.video_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline flex items-center gap-1">
                    <Play className="h-3 w-3" /> Ver video demostrativo
                  </a>
                )}

                {/* Notes */}
                <Input value={ex.notes || ""} onChange={(e) => update(i, "notes", e.target.value)} placeholder="Notas (tempo, técnica...)" className="h-7 text-xs" />

                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => moveExercise(i, -1)} disabled={i === 0}>↑</Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => moveExercise(i, 1)} disabled={i === exercises.length - 1}>↓</Button>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive gap-1" onClick={() => remove(i)}>
                    <Trash2 className="h-3 w-3" /> Quitar
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Quick-add suggestions */}
      <div className="space-y-2 pt-2 border-t border-border/30">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Agregar ejercicios rápido</Label>
        {machinesWithExercises.map((machine) => {
          const suggestions = COMMON_EXERCISES[machine];
          if (!suggestions) return null;
          const machineImg = PRESET_MACHINES.find((m) => m.name === machine)?.image;
          return (
            <div key={machine} className="space-y-1">
              <div className="flex items-center gap-1.5">
                {machineImg && <img src={machineImg} alt="" className="w-5 h-5 rounded object-cover" />}
                <span className="text-[11px] font-medium text-muted-foreground">{machine}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {suggestions.map((s) => {
                  const alreadyAdded = exercises.some((e) => e.name === s && e.machine === machine);
                  return (
                    <button key={s} type="button" disabled={alreadyAdded} onClick={() => addFromSuggestion(machine, s)}
                      className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                        alreadyAdded ? "border-primary/30 bg-primary/10 text-primary opacity-60" : "border-border/50 hover:border-primary hover:bg-primary/10 text-foreground"
                      }`}>
                      {alreadyAdded ? "✓ " : "+ "}{s}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
