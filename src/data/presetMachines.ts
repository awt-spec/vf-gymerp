import treadmill from "@/assets/machines/treadmill.jpg";
import bike from "@/assets/machines/bike.jpg";
import benchPress from "@/assets/machines/bench-press.jpg";
import cableMachine from "@/assets/machines/cable-machine.jpg";
import dumbbells from "@/assets/machines/dumbbells.jpg";
import elliptical from "@/assets/machines/elliptical.jpg";
import squatRack from "@/assets/machines/squat-rack.jpg";
import rowing from "@/assets/machines/rowing.jpg";
import legPress from "@/assets/machines/leg-press.jpg";
import smithMachine from "@/assets/machines/smith-machine.jpg";
import latPulldown from "@/assets/machines/lat-pulldown.jpg";
import legExtension from "@/assets/machines/leg-extension.jpg";
import pecDeck from "@/assets/machines/pec-deck.jpg";
import shoulderPress from "@/assets/machines/shoulder-press.jpg";
import kettlebells from "@/assets/machines/kettlebells.jpg";
import battleRopes from "@/assets/machines/battle-ropes.jpg";
import trx from "@/assets/machines/trx.jpg";
import medicineBalls from "@/assets/machines/medicine-balls.jpg";
import bands from "@/assets/machines/bands.jpg";
import stairmaster from "@/assets/machines/stairmaster.jpg";
import weightPlates from "@/assets/machines/weight-plates.jpg";
import barbell from "@/assets/machines/barbell.jpg";
import bench from "@/assets/machines/bench.jpg";
import ezBar from "@/assets/machines/ez-bar.jpg";
import plyoBox from "@/assets/machines/plyo-box.jpg";
import abMachine from "@/assets/machines/ab-machine.jpg";
import hipThrust from "@/assets/machines/hip-thrust.jpg";
import hackSquat from "@/assets/machines/hack-squat.jpg";
import foamRoller from "@/assets/machines/foam-roller.jpg";
import stabilityBall from "@/assets/machines/stability-ball.jpg";

export type PresetMachine = {
  name: string;
  category: string;
  image: string;
  needsWeight?: boolean;
};

export const PRESET_MACHINES: PresetMachine[] = [
  // Cardio
  { name: "Cinta de Correr", category: "cardio", image: treadmill },
  { name: "Bicicleta Estática", category: "cardio", image: bike },
  { name: "Elíptica", category: "cardio", image: elliptical },
  { name: "Máquina de Remo", category: "cardio", image: rowing },
  { name: "Escaladora", category: "cardio", image: stairmaster },
  // Fuerza - Máquinas
  { name: "Press de Banca", category: "fuerza", image: benchPress },
  { name: "Máquina de Poleas", category: "fuerza", image: cableMachine },
  { name: "Rack de Sentadillas", category: "fuerza", image: squatRack },
  { name: "Prensa de Piernas", category: "fuerza", image: legPress },
  { name: "Máquina Smith", category: "fuerza", image: smithMachine },
  { name: "Jalón al Pecho", category: "fuerza", image: latPulldown },
  { name: "Extensión de Piernas", category: "fuerza", image: legExtension },
  { name: "Pec Deck / Aperturas", category: "fuerza", image: pecDeck },
  { name: "Press de Hombros", category: "fuerza", image: shoulderPress },
  { name: "Máquina Abdominales", category: "fuerza", image: abMachine },
  { name: "Hip Thrust", category: "fuerza", image: hipThrust },
  { name: "Hack Squat", category: "fuerza", image: hackSquat },
  // Peso libre
  { name: "Mancuernas", category: "peso libre", image: dumbbells, needsWeight: true },
  { name: "Discos / Plates", category: "peso libre", image: weightPlates, needsWeight: true },
  { name: "Barra Olímpica", category: "peso libre", image: barbell, needsWeight: true },
  { name: "Barra EZ", category: "peso libre", image: ezBar, needsWeight: true },
  { name: "Kettlebells", category: "peso libre", image: kettlebells, needsWeight: true },
  { name: "Banco Ajustable", category: "peso libre", image: bench },
  // Funcional & Accesorios
  { name: "Balones Medicinales", category: "accesorios", image: medicineBalls, needsWeight: true },
  { name: "Cuerdas de Batalla", category: "accesorios", image: battleRopes },
  { name: "TRX / Suspensión", category: "accesorios", image: trx },
  { name: "Bandas Elásticas", category: "accesorios", image: bands },
  { name: "Cajón Pliométrico", category: "accesorios", image: plyoBox },
  { name: "Foam Roller", category: "accesorios", image: foamRoller },
  { name: "Pelota de Estabilidad", category: "accesorios", image: stabilityBall },
];
