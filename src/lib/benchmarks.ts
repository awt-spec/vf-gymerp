export const MUSCLE_GROUPS = [
  "Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps",
  "Piernas", "Glúteos", "Abdomen", "Antebrazos", "Pantorrillas",
] as const;

export const COMMON_EXERCISES: Record<string, string> = {
  "Press Banca": "Pecho",
  "Press Inclinado": "Pecho",
  "Aperturas": "Pecho",
  "Fondos": "Pecho",
  "Dominadas": "Espalda",
  "Remo con Barra": "Espalda",
  "Jalón al Pecho": "Espalda",
  "Peso Muerto": "Espalda",
  "Press Militar": "Hombros",
  "Elevaciones Laterales": "Hombros",
  "Face Pull": "Hombros",
  "Curl con Barra": "Bíceps",
  "Curl Martillo": "Bíceps",
  "Curl Concentrado": "Bíceps",
  "Press Francés": "Tríceps",
  "Extensiones Tríceps": "Tríceps",
  "Sentadilla": "Piernas",
  "Prensa": "Piernas",
  "Extensión Cuádriceps": "Piernas",
  "Curl Femoral": "Piernas",
  "Zancadas": "Piernas",
  "Hip Thrust": "Glúteos",
  "Plancha": "Abdomen",
  "Crunch": "Abdomen",
  "Elevación de Piernas": "Abdomen",
  "Pantorrillas de Pie": "Pantorrillas",
  "Pantorrillas Sentado": "Pantorrillas",
};

// Benchmarks: weight in kg for 1RM equivalent
export interface Benchmark {
  exercise: string;
  bronce: number;
  plata: number;
  oro: number;
  unit: string;
}

export const BENCHMARKS: Benchmark[] = [
  { exercise: "Press Banca", bronce: 60, plata: 100, oro: 140, unit: "kg" },
  { exercise: "Sentadilla", bronce: 80, plata: 140, oro: 200, unit: "kg" },
  { exercise: "Peso Muerto", bronce: 100, plata: 180, oro: 250, unit: "kg" },
  { exercise: "Press Militar", bronce: 40, plata: 70, oro: 100, unit: "kg" },
  { exercise: "Dominadas", bronce: 5, plata: 12, oro: 20, unit: "reps" },
  { exercise: "Curl con Barra", bronce: 30, plata: 50, oro: 70, unit: "kg" },
  { exercise: "Hip Thrust", bronce: 60, plata: 120, oro: 180, unit: "kg" },
  { exercise: "Remo con Barra", bronce: 50, plata: 90, oro: 130, unit: "kg" },
];

export function getRank(value: number, benchmark: Benchmark): "bronce" | "plata" | "oro" | null {
  if (value >= benchmark.oro) return "oro";
  if (value >= benchmark.plata) return "plata";
  if (value >= benchmark.bronce) return "bronce";
  return null;
}

export const RANK_COLORS = {
  oro: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", icon: "🥇" },
  plata: { bg: "bg-gray-300/20", text: "text-gray-300", border: "border-gray-400/30", icon: "🥈" },
  bronce: { bg: "bg-amber-700/20", text: "text-amber-600", border: "border-amber-700/30", icon: "🥉" },
};
