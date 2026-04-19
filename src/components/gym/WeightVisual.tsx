import { PRESET_MACHINES } from "@/data/presetMachines";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

type EquipmentType = "barbell" | "dumbbell" | "cable" | "machine" | "bodyweight";

// Real plate dimensions (proportional to 20kg = 45cm diameter)
const PLATE_CONFIG: Record<number, { color: string; height: number; width: number; label: string }> = {
  25:   { color: "#dc2626", height: 68, width: 18, label: "25" },   // Red, largest
  20:   { color: "#dc2626", height: 62, width: 16, label: "20" },   // Red
  15:   { color: "#eab308", height: 54, width: 14, label: "15" },   // Yellow
  10:   { color: "#22c55e", height: 46, width: 12, label: "10" },   // Green
  5:    { color: "#3b82f6", height: 38, width: 10, label: "5" },    // Blue
  2.5:  { color: "#a855f7", height: 30, width: 8,  label: "2.5" },  // Purple
  1.25: { color: "#9ca3af", height: 24, width: 6,  label: "1.25" }, // Gray
};

function detectEquipment(machineName?: string): EquipmentType {
  if (!machineName) return "barbell";
  const preset = PRESET_MACHINES.find(m => m.name.toLowerCase() === machineName.toLowerCase());
  if (preset) {
    const name = preset.name.toLowerCase();
    if (name.includes("mancuerna") || name.includes("kettlebell")) return "dumbbell";
    if (name.includes("barra") || name.includes("rack") || name.includes("smith") || name.includes("press de banca")) return "barbell";
    if (name.includes("polea") || name.includes("cable") || name.includes("jalón")) return "cable";
    if (preset.category === "fuerza") return "machine";
    if (preset.category === "peso libre") return "barbell";
    if (preset.category === "accesorios") return "bodyweight";
    if (preset.category === "cardio") return "bodyweight";
  }
  const lower = machineName.toLowerCase();
  if (lower.includes("mancuerna")) return "dumbbell";
  if (lower.includes("barra") || lower.includes("rack")) return "barbell";
  if (lower.includes("polea") || lower.includes("cable") || lower.includes("jalón")) return "cable";
  return "machine";
}

function getPlates(totalWeight: number): number[] {
  const barWeight = 20;
  let perSide = (totalWeight - barWeight) / 2;
  if (perSide <= 0) return [];
  const available = [25, 20, 15, 10, 5, 2.5, 1.25];
  const plates: number[] = [];
  for (const plate of available) {
    while (perSide >= plate) { plates.push(plate); perSide -= plate; }
  }
  return plates;
}

const plateVariants = {
  initial: { scaleY: 0, opacity: 0 },
  animate: { scaleY: 1, opacity: 1, transition: { type: "spring", stiffness: 400, damping: 20 } },
  exit: { scaleY: 0, opacity: 0, transition: { duration: 0.15 } },
};

const stackVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 18 } },
  exit: { scale: 0.8, opacity: 0, transition: { duration: 0.15 } },
};

function PlateElement({ plate, side, index }: { plate: number; side: "l" | "r"; index: number }) {
  const cfg = PLATE_CONFIG[plate];
  if (!cfg) return null;
  return (
    <motion.div
      key={`${side}-${index}-${plate}`}
      variants={plateVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      className="rounded-sm flex items-center justify-center shadow-md relative overflow-hidden"
      style={{
        width: cfg.width,
        height: cfg.height,
        backgroundColor: cfg.color,
        originY: 0.5,
      }}
    >
      {/* Metallic shine */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-black/10 rounded-sm" />
      <span className="text-[7px] font-black text-white drop-shadow-md relative z-10 rotate-90">
        {cfg.label}
      </span>
    </motion.div>
  );
}

export function WeightVisual({ weight, machineName }: { weight: number; machineName?: string }) {
  const type = detectEquipment(machineName);
  const plates = useMemo(() => type === "barbell" ? getPlates(weight) : [], [weight, type]);

  if (weight <= 0) return null;

  // ── Dumbbell ──
  if (type === "dumbbell") {
    const scale = Math.min(1.3, 0.6 + weight * 0.015);
    return (
      <motion.div
        className="flex flex-col items-center gap-1.5 py-3"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        key={`db-${weight}`}
      >
        <motion.div
          className="flex items-center"
          animate={{ scale }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {/* Left plate stack */}
          <div className="flex gap-[1px]">
            {Array.from({ length: Math.min(3, Math.ceil(weight / 10)) }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 400 }}
                className="rounded-sm bg-muted-foreground/50 border border-muted-foreground/30"
                style={{ width: 8, height: 28 + weight * 0.3 }}
              />
            ))}
          </div>
          {/* Grip */}
          <div className="w-1.5 h-5 bg-muted-foreground/30 rounded-sm" />
          <div className="w-14 h-3.5 bg-gradient-to-b from-muted-foreground/40 to-muted-foreground/20 rounded-full mx-0.5" />
          <div className="w-1.5 h-5 bg-muted-foreground/30 rounded-sm" />
          {/* Right plate stack */}
          <div className="flex gap-[1px]">
            {Array.from({ length: Math.min(3, Math.ceil(weight / 10)) }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 400 }}
                className="rounded-sm bg-muted-foreground/50 border border-muted-foreground/30"
                style={{ width: 8, height: 28 + weight * 0.3 }}
              />
            ))}
          </div>
        </motion.div>
        <motion.span
          className="text-xs text-muted-foreground font-semibold"
          key={weight}
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {weight}kg · Mancuerna
        </motion.span>
      </motion.div>
    );
  }

  // ── Cable / Pulley ──
  if (type === "cable") {
    const totalStackPlates = 20;
    const selectedPlates = Math.min(totalStackPlates, Math.round(weight / 5));
    const displayPlates = Math.min(12, totalStackPlates);
    const displaySelected = Math.min(displayPlates, selectedPlates);
    return (
      <div className="flex flex-col items-center gap-1.5 py-3">
        <div className="flex flex-col items-center">
          {/* Pulley wheel */}
          <motion.div
            className="w-9 h-9 rounded-full border-2 border-muted-foreground/40 flex items-center justify-center mb-1"
            animate={{ rotate: weight * 5 }}
            transition={{ type: "spring", stiffness: 100 }}
          >
            <div className="w-3 h-3 rounded-full bg-muted-foreground/40" />
          </motion.div>
          <div className="w-0.5 h-5 bg-muted-foreground/30" />
          {/* Weight stack */}
          <div className="flex flex-col gap-[2px] bg-muted-foreground/5 p-1 rounded-md border border-border/50">
            {Array.from({ length: displayPlates }).map((_, i) => {
              const isSelected = i < displaySelected;
              return (
                <motion.div
                  key={i}
                  className="relative"
                  animate={{
                    backgroundColor: isSelected ? "hsl(var(--primary))" : "hsl(var(--muted))",
                    scale: isSelected ? 1 : 0.95,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 25, delay: i * 0.02 }}
                >
                  <div className={`w-14 h-3 rounded-[2px] transition-all ${
                    isSelected ? "bg-primary/80 border border-primary shadow-sm shadow-primary/20" : "bg-muted border border-border/50"
                  }`} />
                  {i === displaySelected - 1 && (
                    <motion.div
                      className="absolute right-[-10px] top-0 w-2.5 h-3 bg-red-500 rounded-r-sm shadow-sm"
                      layoutId="cable-pin"
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
        <motion.span
          className="text-xs text-muted-foreground font-semibold"
          key={weight}
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {weight}kg · Polea
        </motion.span>
      </div>
    );
  }

  // ── Machine ──
  if (type === "machine") {
    const maxWeight = 150;
    const pct = Math.min(100, (weight / maxWeight) * 100);
    const filledBars = Math.round(pct / 10);
    return (
      <div className="flex flex-col items-center gap-1.5 py-3">
        <div className="flex flex-col items-center">
          <div className="w-16 h-3 bg-muted-foreground/20 rounded-t-md border border-b-0 border-muted-foreground/30" />
          <div className="flex flex-col gap-[2px] border-x border-muted-foreground/20 px-1 py-0.5 bg-muted-foreground/5">
            {Array.from({ length: 10 }).map((_, i) => {
              const isSelected = i < filledBars;
              return (
                <motion.div
                  key={i}
                  className={`w-12 h-3 rounded-[2px] flex items-center justify-center ${
                    isSelected ? "bg-primary/70 shadow-sm shadow-primary/20" : "bg-muted"
                  }`}
                  animate={{ scale: isSelected ? 1 : 0.92, opacity: isSelected ? 1 : 0.5 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25, delay: i * 0.02 }}
                >
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground/70" />}
                </motion.div>
              );
            })}
          </div>
          <div className="w-16 h-2 bg-muted-foreground/20 rounded-b-md border border-t-0 border-muted-foreground/30" />
        </div>
        <motion.span
          className="text-xs text-muted-foreground font-semibold"
          key={weight}
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {weight}kg · Máquina
        </motion.span>
      </div>
    );
  }

  // ── Bodyweight ──
  if (type === "bodyweight") {
    return (
      <div className="flex flex-col items-center gap-1 py-3">
        <span className="text-2xl">🏋️</span>
        <span className="text-xs text-muted-foreground font-semibold">{weight}kg</span>
      </div>
    );
  }

  // ── Barbell (default) — with animated proportional plates ──
  return (
    <div className="py-3 space-y-2">
      <div className="flex items-center justify-center gap-[2px]">
        {/* Left collar */}
        <div className="w-2 h-6 bg-muted-foreground/40 rounded-l-sm" />
        {/* Left plates (largest inside, smallest outside) */}
        <div className="flex items-center gap-[2px]">
          <AnimatePresence mode="popLayout">
            {[...plates].reverse().map((p, i) => (
              <PlateElement key={`l-${i}-${p}`} plate={p} side="l" index={i} />
            ))}
          </AnimatePresence>
        </div>
        {/* Left inner collar */}
        <div className="w-1.5 h-4 bg-muted-foreground/30 rounded-sm" />
        {/* Bar */}
        <div className="relative">
          <div className="w-20 h-3 bg-gradient-to-b from-muted-foreground/40 to-muted-foreground/20 rounded-full" />
          <motion.span
            className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground whitespace-nowrap font-medium"
            key={weight}
            initial={{ y: 3, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            Barra 20kg
          </motion.span>
        </div>
        {/* Right inner collar */}
        <div className="w-1.5 h-4 bg-muted-foreground/30 rounded-sm" />
        {/* Right plates */}
        <div className="flex items-center gap-[2px]">
          <AnimatePresence mode="popLayout">
            {plates.map((p, i) => (
              <PlateElement key={`r-${i}-${p}`} plate={p} side="r" index={i} />
            ))}
          </AnimatePresence>
        </div>
        {/* Right collar */}
        <div className="w-2 h-6 bg-muted-foreground/40 rounded-r-sm" />
      </div>
      <motion.p
        className="text-center text-[10px] text-muted-foreground font-medium"
        key={plates.join("-")}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {plates.length > 0
          ? `${plates.map(p => p + "kg").join(" + ")} por lado`
          : "Solo barra (20kg)"}
      </motion.p>
    </div>
  );
}
