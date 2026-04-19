import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LEVELS = [
  { id: 3, label: "Básico", desc: "Registro simple" },
  { id: 2, label: "Intermedio", desc: "Análisis y control" },
  { id: 1, label: "Experto", desc: "Financiero completo" },
] as const;

interface Props {
  level: number;
  onChange: (l: number) => void;
}

export function LevelSelector({ level, onChange }: Props) {
  return (
    <div className="flex gap-1.5">
      {LEVELS.map(l => (
        <button
          key={l.id}
          onClick={() => onChange(l.id)}
          className={cn(
            "flex-1 rounded-lg border px-2 py-1.5 text-left transition-all",
            level === l.id
              ? "border-primary bg-primary/10 shadow-sm shadow-primary/20"
              : "border-border/50 bg-card/50 hover:bg-card"
          )}
        >
          <div className="flex items-center gap-1.5">
            <Badge variant={level === l.id ? "default" : "secondary"} className="text-[9px] px-1.5 py-0">
              Nv.{l.id}
            </Badge>
            <span className="text-xs font-semibold">{l.label}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{l.desc}</p>
        </button>
      ))}
    </div>
  );
}
