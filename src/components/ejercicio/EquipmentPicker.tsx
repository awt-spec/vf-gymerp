import { useState } from "react";
import { PRESET_MACHINES, type PresetMachine } from "@/data/presetMachines";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "", label: "Todos" },
  { value: "cardio", label: "Cardio" },
  { value: "fuerza", label: "Fuerza" },
  { value: "peso libre", label: "Peso Libre" },
  { value: "accesorios", label: "Accesorios" },
];

type Props = {
  selected: string[];
  onToggle: (name: string) => void;
};

export default function EquipmentPicker({ selected, onToggle }: Props) {
  const [cat, setCat] = useState("");
  const [search, setSearch] = useState("");

  const filtered = PRESET_MACHINES.filter((m) => {
    if (cat && m.category !== cat) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar equipo..."
          className="pl-8 h-8 text-xs"
        />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((c) => (
          <Badge
            key={c.value}
            variant={cat === c.value ? "default" : "outline"}
            className="cursor-pointer text-[10px] px-2 py-0.5"
            onClick={() => setCat(c.value)}
          >
            {c.label}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[40vh] overflow-y-auto pr-1">
        {filtered.map((m) => {
          const isSelected = selected.includes(m.name);
          return (
            <button
              key={m.name}
              type="button"
              onClick={() => onToggle(m.name)}
              className={cn(
                "relative rounded-lg border-2 overflow-hidden transition-all group",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                isSelected
                  ? "border-primary ring-1 ring-primary/30 shadow-lg shadow-primary/10"
                  : "border-border/40 hover:border-primary/40"
              )}
            >
              <div className="aspect-square relative">
                <img
                  src={m.image}
                  alt={m.name}
                  className={cn(
                    "w-full h-full object-cover transition-all",
                    isSelected ? "brightness-90" : "group-hover:brightness-95"
                  )}
                  loading="lazy"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <div className="bg-primary rounded-full p-1">
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-1.5 bg-card/90 backdrop-blur-sm">
                <p className="text-[10px] font-medium leading-tight truncate">{m.name}</p>
              </div>
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] text-muted-foreground mr-1">Seleccionados:</span>
          {selected.map((s) => (
            <Badge
              key={s}
              variant="secondary"
              className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-destructive/20"
              onClick={() => onToggle(s)}
            >
              {s} ✕
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
