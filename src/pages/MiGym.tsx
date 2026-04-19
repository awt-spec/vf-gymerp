import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Dumbbell, CalendarDays, TrendingUp, Check, Play, ChevronRight,
  Youtube, Trash2, Search, Timer, ChevronLeft, Flame, QrCode, CreditCard,
  Clock, Star, Zap, ArrowRight, X, Users, Loader2, ScanLine,
} from "lucide-react";
import { format, addDays, subDays, isToday, isSameDay, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { FOOD_DATABASE, MEAL_TYPES, FOOD_CATEGORIES, type FoodItem } from "@/data/foodDatabase";
import { WeightVisual } from "@/components/gym/WeightVisual";
import { BodyMap } from "@/components/BodyMap";
import { MemberQRCode } from "@/components/MemberQRCode";
import BarcodeFoodScanner, { type ScannedFood } from "@/components/nutrition/BarcodeFoodScanner";

// ── Effort config with colors ──
const EFFORT_LEVELS = [
  { value: 1, label: "Muy fácil", emoji: "😴", color: "bg-blue-500/20 border-blue-500/40 text-blue-400" },
  { value: 2, label: "Fácil", emoji: "😊", color: "bg-green-500/20 border-green-500/40 text-green-400" },
  { value: 3, label: "Normal", emoji: "💪", color: "bg-yellow-500/20 border-yellow-500/40 text-yellow-400" },
  { value: 4, label: "Duro", emoji: "🔥", color: "bg-orange-500/20 border-orange-500/40 text-orange-400" },
  { value: 5, label: "Máximo", emoji: "☠️", color: "bg-red-500/20 border-red-500/40 text-red-400" },
];

const SPLIT_LABELS: Record<string, string> = {
  push_pull_legs: "Push / Pull / Legs",
  upper_lower: "Upper / Lower",
  full_body: "Full Body",
  bro_split: "Bro Split",
  custom: "Personalizado",
};

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// ── Circular progress ring ──
function GoalRing({ current, goal, color, size = 56 }: { current: number; goal: number; color: string; size?: number }) {
  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="5" className="stroke-muted" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="5" stroke={color}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500" />
    </svg>
  );
}

// ── Rest Timer (improved) ──
function RestTimer({ seconds, onFinish }: { seconds: number; onFinish: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(seconds);
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [seconds]);

  useEffect(() => { if (remaining === 0) onFinish(); }, [remaining, onFinish]);

  const pct = ((seconds - remaining) / seconds) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="flex flex-col items-center py-8 space-y-4">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" strokeWidth="4" className="stroke-muted/30" />
          <circle cx="50" cy="50" r="42" fill="none" strokeWidth="6" className="stroke-primary"
            strokeDasharray={`${pct * 2.64} ${264 - pct * 2.64}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold font-display text-foreground">{mins}:{secs.toString().padStart(2, "0")}</span>
          <span className="text-xs text-muted-foreground mt-1">Descansando...</span>
        </div>
      </div>
      <Button variant="outline" size="lg" className="gap-2 rounded-full px-6" onClick={onFinish}>
        Saltar descanso <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ── Date strip ──
function DateStrip({ selectedDate, onChange }: { selectedDate: Date; onChange: (d: Date) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(subDays(selectedDate, 1))} className="p-1 text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="flex gap-1 flex-1 justify-center">
        {days.map(day => {
          const active = isSameDay(day, selectedDate);
          const today = isToday(day);
          return (
            <button key={day.toISOString()} onClick={() => onChange(day)}
              className={`flex flex-col items-center px-2 py-1.5 rounded-lg transition-all min-w-[38px] ${
                active ? "bg-primary text-primary-foreground" :
                today ? "bg-primary/10 text-primary" :
                "text-muted-foreground hover:bg-muted"
              }`}>
              <span className="text-[9px] uppercase">{format(day, "EEE", { locale: es }).slice(0, 2)}</span>
              <span className="text-sm font-bold">{format(day, "d")}</span>
            </button>
          );
        })}
      </div>
      <button onClick={() => {
        const next = addDays(selectedDate, 1);
        if (next <= new Date()) onChange(next);
      }} className="p-1 text-muted-foreground hover:text-foreground">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

type PlanExercise = { name: string; sets: string; reps: string; rest: string; machine?: string };
type SetData = { reps: string; weight: string; effort: number; done: boolean };
type ExerciseSession = {
  exercise: PlanExercise; exIdx: number; totalSets: number;
  sets: SetData[]; currentSet: number; allDone: boolean;
};

function youtubeSearchUrl(name: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " ejercicio tutorial forma correcta")}`;
}

function parseRestSeconds(rest: string): number {
  const n = parseInt(rest);
  if (!n) return 60;
  if (rest.includes("min")) return n * 60;
  return n;
}

export default function MiGym() {
  const { user } = useAuth();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");
  const [loading, setLoading] = useState(true);

  const [subscription, setSubscription] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [exercisePlans, setExercisePlans] = useState<any[]>([]);

  // Guided session state
  const [sessionPlan, setSessionPlan] = useState<any>(null);
  const [exerciseSession, setExerciseSession] = useState<ExerciseSession | null>(null);
  const [resting, setResting] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<number[]>([]);
  const [sessionDone, setSessionDone] = useState(false);

  // Nutrition state
  const [mealLogs, setMealLogs] = useState<any[]>([]);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [foodSearch, setFoodSearch] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [mealType, setMealType] = useState("almuerzo");
  const [portionGrams, setPortionGrams] = useState("100");
  const [foodCategory, setFoodCategory] = useState<string>("all");
  const [nutritionDate, setNutritionDate] = useState(new Date());

  // Classes
  const [classSchedules, setClassSchedules] = useState<any[]>([]);
  const [classBookings, setClassBookings] = useState<any[]>([]);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);

  const [homeDate, setHomeDate] = useState(new Date());
  const [promotions, setPromotions] = useState<any[]>([]);
  const [interstitialAd, setInterstitialAd] = useState<any>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [nutritionGoals, setNutritionGoals] = useState(() => {
    try {
      const saved = localStorage.getItem("gym_nutrition_goals");
      return saved ? JSON.parse(saved) : { calories: 2200, protein: 160, carbs: 250, fat: 65 };
    } catch { return { calories: 2200, protein: 160, carbs: 250, fat: 65 }; }
  });
  const [editingGoals, setEditingGoals] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: member } = await supabase
        .from("members").select("id, first_name, last_name")
        .eq("auth_user_id", user.id).single();
      if (!member) { setLoading(false); return; }
      setMemberId(member.id);
      setMemberName(`${member.first_name} ${member.last_name}`);

      const [subRes, payRes, workoutRes, achRes, plansRes, mealsRes, schedRes, bookRes, promoRes] = await Promise.all([
        supabase.from("subscriptions").select("*, plans(name, price, currency, duration_days)").eq("member_id", member.id).eq("status", "active").limit(1).single(),
        supabase.from("payments").select("*").eq("member_id", member.id).order("payment_date", { ascending: false }).limit(10),
        supabase.from("workout_logs").select("*").eq("member_id", member.id).order("workout_date", { ascending: false }).limit(100),
        supabase.from("achievements").select("*").eq("member_id", member.id).order("achieved_at", { ascending: false }).limit(5),
        supabase.from("exercise_plans").select("*").eq("member_id", member.id).eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("meal_logs").select("*").eq("member_id", member.id).order("meal_date", { ascending: false }).order("created_at", { ascending: false }).limit(200),
        supabase.from("class_schedules").select("*, classes(name, instructor, max_capacity, is_active, description)").order("day_of_week").order("start_time"),
        supabase.from("class_bookings").select("*, class_schedules(start_time, end_time, day_of_week, classes(name, instructor))").eq("member_id", member.id).eq("status", "booked").limit(10),
        supabase.from("promotion_targets").select("*, promotions(*)").eq("member_id", member.id).eq("seen", false),
      ]);

      setSubscription(subRes.data);
      setPaymentHistory(payRes.data || []);
      setRecentWorkouts(workoutRes.data || []);
      setAchievements(achRes.data || []);
      setExercisePlans(plansRes.data || []);
      setMealLogs(mealsRes.data || []);
      setClassSchedules((schedRes.data || []).filter((s: any) => s.classes?.is_active));
      setClassBookings(bookRes.data || []);
      const allPromos = (promoRes.data || []).filter((pt: any) => pt.promotions?.is_active);
      const interstitials = allPromos.filter((pt: any) => pt.promotions?.display_type === "interstitial");
      const banners = allPromos.filter((pt: any) => pt.promotions?.display_type !== "interstitial");
      setPromotions(banners);
      if (interstitials.length > 0) setInterstitialAd(interstitials[0]);
      setLoading(false);
    };
    load();
  }, [user]);

  // ── Derived data ──
  const splitGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    exercisePlans.forEach(p => { const k = p.split_type || "custom"; if (!groups[k]) groups[k] = []; groups[k].push(p); });
    return groups;
  }, [exercisePlans]);

  const muscleActivity = useMemo(() => {
    const activity: Record<string, number> = {};
    const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
    const recent = recentWorkouts.filter(w => w.workout_date >= sevenDaysAgo);
    recent.forEach(w => {
      const group = w.muscle_group || guessMuscleGroup(w.exercise_name);
      const volume = (w.sets || 1) * (w.reps || 1) * (w.weight_kg || 1);
      activity[group] = (activity[group] || 0) + volume;
    });
    return activity;
  }, [recentWorkouts]);

  const workoutDays = useMemo(() => {
    const days: Record<string, any[]> = {};
    recentWorkouts.forEach(w => { const k = w.workout_date; if (!days[k]) days[k] = []; days[k].push(w); });
    return Object.entries(days).sort(([a], [b]) => b.localeCompare(a)).map(([date, exercises]) => ({ date, exercises }));
  }, [recentWorkouts]);

  const suggestedNext = useMemo(() => {
    if (exercisePlans.length === 0) return null;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (recentWorkouts.some(w => w.workout_date === todayStr)) return null;
    const lastDay = workoutDays[0];
    if (!lastDay) return exercisePlans[0];
    const lastExNames = lastDay.exercises.map((e: any) => e.exercise_name);
    const lastIdx = exercisePlans.findIndex(p => (p.exercises as PlanExercise[]).some(e => lastExNames.includes(e.name)));
    return exercisePlans[(lastIdx + 1) % exercisePlans.length] || exercisePlans[0];
  }, [exercisePlans, recentWorkouts, workoutDays]);

  // Nutrition derived
  const nutDateStr = format(nutritionDate, "yyyy-MM-dd");
  const dateMeals = useMemo(() => mealLogs.filter(m => m.meal_date === nutDateStr), [mealLogs, nutDateStr]);
  const dateTotals = useMemo(() => dateMeals.reduce((a, m) => ({
    calories: a.calories + Number(m.calories || 0),
    protein: a.protein + Number(m.protein_g || 0),
    carbs: a.carbs + Number(m.carbs_g || 0),
    fat: a.fat + Number(m.fat_g || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [dateMeals]);

  const homeDateStr = format(homeDate, "yyyy-MM-dd");
  const homeWorkouts = useMemo(() => recentWorkouts.filter(w => w.workout_date === homeDateStr), [recentWorkouts, homeDateStr]);
  const homeMeals = useMemo(() => mealLogs.filter(m => m.meal_date === homeDateStr), [mealLogs, homeDateStr]);
  const homeMealTotals = useMemo(() => homeMeals.reduce((a, m) => ({
    cal: a.cal + Number(m.calories || 0), p: a.p + Number(m.protein_g || 0),
    c: a.c + Number(m.carbs_g || 0), f: a.f + Number(m.fat_g || 0),
  }), { cal: 0, p: 0, c: 0, f: 0 }), [homeMeals]);

  const filteredFoods = useMemo(() => {
    let list = FOOD_DATABASE;
    if (foodCategory !== "all") list = list.filter(f => f.category === foodCategory);
    if (foodSearch.trim()) { const q = foodSearch.toLowerCase(); list = list.filter(f => f.name.toLowerCase().includes(q)); }
    return list;
  }, [foodSearch, foodCategory]);

  const portionMultiplier = (parseFloat(portionGrams) || 100) / 100;
  const calculated = selectedFood ? {
    calories: Math.round(selectedFood.calories * portionMultiplier),
    protein: Math.round(selectedFood.protein * portionMultiplier * 10) / 10,
    carbs: Math.round(selectedFood.carbs * portionMultiplier * 10) / 10,
    fat: Math.round(selectedFood.fat * portionMultiplier * 10) / 10,
    fiber: Math.round(selectedFood.fiber * portionMultiplier * 10) / 10,
  } : null;

  // ── Session management ──
  const startSession = (plan: any) => {
    setSessionPlan(plan); setCompletedExercises([]); setSessionDone(false); startExercise(plan, 0);
  };

  const startExercise = (plan: any, exIdx: number) => {
    const exercises = plan.exercises as PlanExercise[];
    const ex = exercises[exIdx];
    const totalSets = parseInt(ex.sets) || 3;
    const sets: SetData[] = Array.from({ length: totalSets }, () => ({ reps: ex.reps || "10", weight: "", effort: 3, done: false }));
    setExerciseSession({ exercise: ex, exIdx, totalSets, sets, currentSet: 0, allDone: false });
    setResting(false);
  };

  const updateCurrentSet = (field: keyof SetData, value: any) => {
    if (!exerciseSession) return;
    const newSets = [...exerciseSession.sets];
    newSets[exerciseSession.currentSet] = { ...newSets[exerciseSession.currentSet], [field]: value };
    setExerciseSession({ ...exerciseSession, sets: newSets });
  };

  const completeSet = () => {
    if (!exerciseSession) return;
    const newSets = [...exerciseSession.sets];
    newSets[exerciseSession.currentSet] = { ...newSets[exerciseSession.currentSet], done: true };
    const nextSet = exerciseSession.currentSet + 1;
    const allSetsDone = nextSet >= exerciseSession.totalSets;
    setExerciseSession({ ...exerciseSession, sets: newSets, currentSet: allSetsDone ? exerciseSession.currentSet : nextSet, allDone: allSetsDone });
    if (!allSetsDone) setResting(true);
  };

  const onRestFinish = useCallback(() => setResting(false), []);

  const saveExerciseAndNext = async () => {
    if (!exerciseSession || !memberId || !user || !sessionPlan) return;
    const { exercise, sets } = exerciseSession;
    const totalReps = sets.reduce((s, set) => s + (parseInt(set.reps) || 0), 0);
    const avgWeight = sets.reduce((s, set) => s + (parseFloat(set.weight) || 0), 0) / sets.length;
    const avgEffort = Math.round(sets.reduce((s, set) => s + set.effort, 0) / sets.length);
    const rpe = avgEffort * 2;

    const { error } = await supabase.from("workout_logs").insert({
      member_id: memberId, logged_by: user.id, exercise_name: exercise.name,
      muscle_group: guessMuscleGroup(exercise.name), sets: sets.length,
      reps: Math.round(totalReps / sets.length), weight_kg: Math.round(avgWeight * 10) / 10,
      rpe, machine: exercise.machine || null,
    });

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    const newCompleted = [...completedExercises, exerciseSession.exIdx];
    setCompletedExercises(newCompleted);
    const allExercises = sessionPlan.exercises as PlanExercise[];
    const nextExIdx = exerciseSession.exIdx + 1;

    if (nextExIdx < allExercises.length) {
      toast({ title: `✅ ${exercise.name} completado` });
      startExercise(sessionPlan, nextExIdx);
    } else {
      setSessionDone(true); setExerciseSession(null);
      toast({ title: "🎉 ¡Rutina completada!" });
      const { data } = await supabase.from("workout_logs").select("*").eq("member_id", memberId).order("workout_date", { ascending: false }).limit(100);
      setRecentWorkouts(data || []);
    }
  };

  const endSession = () => { setSessionPlan(null); setExerciseSession(null); setSessionDone(false); setCompletedExercises([]); };

  // ── Nutrition ──
  const addMealLog = async () => {
    if (!selectedFood || !memberId || !user) return;
    const { error } = await supabase.from("meal_logs").insert({
      member_id: memberId, logged_by: user.id, meal_type: mealType,
      food_name: selectedFood.name, portion_grams: parseFloat(portionGrams) || 100,
      calories: calculated!.calories, protein_g: calculated!.protein,
      carbs_g: calculated!.carbs, fat_g: calculated!.fat, fiber_g: calculated!.fiber,
      meal_date: nutDateStr,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${selectedFood.name} registrado ✅` });
    setSelectedFood(null); setFoodSearch(""); setShowAddMeal(false);
    const { data } = await supabase.from("meal_logs").select("*").eq("member_id", memberId).order("meal_date", { ascending: false }).order("created_at", { ascending: false }).limit(200);
    setMealLogs(data || []);
  };

  const deleteMeal = async (id: string) => {
    await supabase.from("meal_logs").delete().eq("id", id);
    setMealLogs(prev => prev.filter(m => m.id !== id));
  };

  const handleScannedFood = async (scanned: ScannedFood, grams: number) => {
    if (!memberId || !user) return;
    const mult = grams / 100;
    const { error } = await supabase.from("meal_logs").insert({
      member_id: memberId,
      logged_by: user.id,
      meal_type: mealType,
      food_name: scanned.name,
      portion_grams: grams,
      calories: Math.round(scanned.calories * mult),
      protein_g: Math.round(scanned.protein * mult * 10) / 10,
      carbs_g: Math.round(scanned.carbs * mult * 10) / 10,
      fat_g: Math.round(scanned.fat * mult * 10) / 10,
      fiber_g: Math.round(scanned.fiber * mult * 10) / 10,
      meal_date: nutDateStr,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${scanned.name} registrado ✅`, description: `${Math.round(scanned.calories * mult)} kcal · ${grams}g` });
    const { data } = await supabase.from("meal_logs").select("*").eq("member_id", memberId).order("meal_date", { ascending: false }).order("created_at", { ascending: false }).limit(200);
    setMealLogs(data || []);
  };

  // ── Classes ──
  const bookClass = async (scheduleId: string) => {
    if (!memberId) return;
    setBookingLoading(scheduleId);
    const todayDate = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("class_bookings").insert({
      member_id: memberId, class_schedule_id: scheduleId, booking_date: todayDate, status: "booked" as const,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      toast({ title: "¡Reservado! ✅" });
      const { data } = await supabase.from("class_bookings").select("*, class_schedules(start_time, end_time, day_of_week, classes(name, instructor))").eq("member_id", memberId).eq("status", "booked").limit(10);
      setClassBookings(data || []);
    }
    setBookingLoading(null);
  };

  const cancelBooking = async (bookingId: string) => {
    await supabase.from("class_bookings").update({ status: "cancelled" as const }).eq("id", bookingId);
    setClassBookings(prev => prev.filter(b => b.id !== bookingId));
    toast({ title: "Reserva cancelada" });
  };

  if (loading) return <div className="flex items-center justify-center p-8"><div className="text-primary animate-pulse text-lg font-display">💪 Cargando...</div></div>;
  if (!memberId) return <div className="p-4 text-center text-muted-foreground">Tu cuenta no está vinculada a un socio del gym.</div>;

  const allExercises = sessionPlan ? (sessionPlan.exercises as PlanExercise[]) : [];
  const inSession = !!sessionPlan && !sessionDone;
  const bookedScheduleIds = classBookings.map(b => b.class_schedule_id);
  const today = new Date().getDay();

  // Group class schedules by day
  const classesByDay: Record<number, any[]> = {};
  classSchedules.forEach(s => { if (!classesByDay[s.day_of_week]) classesByDay[s.day_of_week] = []; classesByDay[s.day_of_week].push(s); });

  // Subscription progress
  const subDaysLeft = subscription ? Math.max(0, differenceInDays(new Date(subscription.end_date), new Date())) : 0;
  const subTotalDays = subscription ? (subscription.plans?.duration_days || 30) : 30;
  const subProgress = subscription ? Math.round(((subTotalDays - subDaysLeft) / subTotalDays) * 100) : 0;

  const dismissInterstitial = async () => {
    if (interstitialAd) {
      await supabase.from("promotion_targets").update({ seen: true, seen_at: new Date().toISOString() }).eq("id", interstitialAd.id);
      setInterstitialAd(null);
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-20">
      {/* Interstitial Ad Overlay */}
      {interstitialAd && interstitialAd.promotions && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4" onClick={dismissInterstitial}>
          <div className="relative w-full max-w-sm animate-in fade-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            {interstitialAd.promotions.image_url && (
              <img src={interstitialAd.promotions.image_url} alt={interstitialAd.promotions.title} className="w-full rounded-2xl object-cover max-h-[50vh]" />
            )}
            <div className={`${interstitialAd.promotions.image_url ? "mt-4" : ""} text-center space-y-2`}>
              <Badge className="bg-foreground/10 text-foreground text-[10px]">📢 Anuncio</Badge>
              <h2 className="text-xl font-display font-bold text-foreground">{interstitialAd.promotions.title}</h2>
              <p className="text-sm text-muted-foreground">{interstitialAd.promotions.message}</p>
            </div>
            <Button className="w-full mt-6 gap-2" onClick={dismissInterstitial}>
              <X className="w-4 h-4" /> Cerrar
            </Button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">¡Hola, {memberName.split(" ")[0]}! 💪</h1>
          <p className="text-xs text-muted-foreground">Tu portal de gimnasio</p>
        </div>
        {memberId && <MemberQRCode memberId={memberId} memberName={memberName} />}
      </div>

      <Tabs defaultValue="inicio" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-11">
          <TabsTrigger value="inicio" className="text-xs gap-1 px-1"><Star className="w-3.5 h-3.5" /><span className="hidden sm:inline">Inicio</span></TabsTrigger>
          <TabsTrigger value="ejercicios" className="text-xs gap-1 px-1"><Dumbbell className="w-3.5 h-3.5" /><span className="hidden sm:inline">Rutina</span></TabsTrigger>
          <TabsTrigger value="nutricion" className="text-xs gap-1 px-1"><Flame className="w-3.5 h-3.5" /><span className="hidden sm:inline">Comida</span></TabsTrigger>
          <TabsTrigger value="clases" className="text-xs gap-1 px-1"><CalendarDays className="w-3.5 h-3.5" /><span className="hidden sm:inline">Clases</span></TabsTrigger>
          <TabsTrigger value="pagos" className="text-xs gap-1 px-1"><CreditCard className="w-3.5 h-3.5" /><span className="hidden sm:inline">Plan</span></TabsTrigger>
        </TabsList>

        <TabsContent value="inicio" className="space-y-3 mt-3">
          {/* Promotions / Ads */}
          {promotions.length > 0 && (
            <div className="space-y-2">
              {promotions.map((pt) => {
                const promo = pt.promotions;
                if (!promo) return null;
                return (
                  <Card key={pt.id} className="border-primary/30 overflow-hidden relative">
                    {promo.image_url && (
                      <img src={promo.image_url} alt={promo.title} className="w-full h-36 object-cover" />
                    )}
                    <CardContent className={`${promo.image_url ? "pt-3" : "pt-4"} pb-3`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <Badge className="bg-primary/20 text-primary text-[9px] mb-1">📢 Anuncio</Badge>
                          <h3 className="text-sm font-bold text-foreground">{promo.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{promo.message}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={async () => {
                          await supabase.from("promotion_targets").update({ seen: true, seen_at: new Date().toISOString() }).eq("id", pt.id);
                          setPromotions(prev => prev.filter(p => p.id !== pt.id));
                        }}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <DateStrip selectedDate={homeDate} onChange={setHomeDate} />
          <p className="text-sm font-display font-semibold text-foreground text-center">
            {isToday(homeDate) ? "Hoy" : format(homeDate, "EEEE d 'de' MMMM", { locale: es })}
          </p>

          {subscription && isToday(homeDate) && (
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/20 text-primary text-[10px]">✨ {subscription.plans?.name}</Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{subDaysLeft} días restantes</span>
                </div>
                <Progress value={subProgress} className="h-1.5" />
              </CardContent>
            </Card>
          )}

          {isToday(homeDate) && suggestedNext && homeWorkouts.length === 0 && (
            <Card className="border-primary/40 bg-primary/5 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => startSession(suggestedNext)}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center"><Play className="w-6 h-6 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-primary uppercase tracking-wider font-medium">Hoy te toca</p>
                    <p className="text-base font-display font-bold text-foreground truncate">{suggestedNext.title}</p>
                    {suggestedNext.day_label && <Badge variant="outline" className="text-[9px] h-4 bg-primary/10 mt-0.5">{suggestedNext.day_label}</Badge>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-primary" />
                </div>
              </CardContent>
            </Card>
          )}

          {homeWorkouts.length > 0 && (
            <Card className="border-border/50">
              <CardContent className="pt-3 pb-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Entrenamiento</span>
                  <Badge variant="outline" className="text-[9px] ml-auto">{homeWorkouts.length} ejercicios</Badge>
                </div>
                <div className="space-y-1">
                  {homeWorkouts.map((w: any, idx: number) => (
                    <div key={w.id} className="flex items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground w-3 text-right">{idx + 1}.</span>
                      <span className="font-medium flex-1 truncate text-foreground">{w.exercise_name}</span>
                      <span className="text-muted-foreground shrink-0">{w.sets}×{w.reps}</span>
                      {w.weight_kg > 0 && <span className="text-foreground font-semibold shrink-0">{w.weight_kg}kg</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {homeMeals.length > 0 && (
            <Card className="border-border/50">
              <CardContent className="pt-3 pb-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-semibold text-foreground">Nutrición</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{homeMealTotals.cal} kcal</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: "Kcal", val: homeMealTotals.cal, goal: nutritionGoals.calories, color: "bg-primary" },
                    { label: "Prot", val: homeMealTotals.p, goal: nutritionGoals.protein, color: "bg-blue-500" },
                    { label: "Carbs", val: homeMealTotals.c, goal: nutritionGoals.carbs, color: "bg-yellow-500" },
                    { label: "Grasa", val: homeMealTotals.f, goal: nutritionGoals.fat, color: "bg-orange-500" },
                  ].map(({ label, val, goal, color }) => (
                    <div key={label}>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, (val / goal) * 100)}%` }} />
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{Math.round(val)}/{goal}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {homeWorkouts.length === 0 && homeMeals.length === 0 && !(isToday(homeDate) && suggestedNext) && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">Sin actividad este día</p>
            </div>
          )}

          {isToday(homeDate) && (
            <div className="grid grid-cols-2 gap-2">
              <Card className="border-border/50"><CardContent className="pt-3 pb-3 text-center">
                <Dumbbell className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{workoutDays.length}</p>
                <p className="text-[10px] text-muted-foreground">Días entrenados</p>
              </CardContent></Card>
              <Card className="border-border/50"><CardContent className="pt-3 pb-3 text-center">
                <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{achievements.length}</p>
                <p className="text-[10px] text-muted-foreground">Logros</p>
              </CardContent></Card>
            </div>
          )}

          {isToday(homeDate) && achievements.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2 pt-3"><CardTitle className="text-sm">Últimos logros</CardTitle></CardHeader>
              <CardContent className="space-y-2 pb-3">
                {achievements.map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <span className="text-lg">{a.rank === "oro" ? "🥇" : a.rank === "plata" ? "🥈" : "🥉"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{a.title}</p>
                      <p className="text-[10px] text-muted-foreground">{a.category}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ──── EJERCICIOS ──── */}
        <TabsContent value="ejercicios" className="space-y-3 mt-3">
          {/* Active session: set by set */}
          {inSession && exerciseSession && !resting && !exerciseSession.allDone && (() => {
            const { exercise, currentSet, totalSets, sets } = exerciseSession;
            const currentData = sets[currentSet];
            const weight = parseFloat(currentData.weight) || 0;
            return (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">{sessionPlan.title}</p>
                    <p className="text-[10px] text-muted-foreground">Ejercicio {exerciseSession.exIdx + 1} de {allExercises.length}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-destructive h-7" onClick={endSession}>Salir</Button>
                </div>

                {/* Progress bar */}
                <div className="flex gap-1">
                  {allExercises.map((_, i) => (
                    <div key={i} className={`h-2 flex-1 rounded-full transition-all ${
                      completedExercises.includes(i) ? "bg-primary" :
                      i === exerciseSession.exIdx ? "bg-primary/50 animate-pulse" : "bg-muted"
                    }`} />
                  ))}
                </div>

                {/* Exercise name */}
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-display font-bold text-foreground">{exercise.name}</h2>
                  {exercise.machine && (
                    <p className="text-sm text-muted-foreground">📍 {exercise.machine}</p>
                  )}
                  <a href={youtubeSearchUrl(exercise.name)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                    <Youtube className="w-3.5 h-3.5" /> ¿Cómo se hace?
                  </a>
                </div>

                {/* Set indicators */}
                <div className="flex items-center justify-center gap-3">
                  {sets.map((s, i) => (
                    <button key={i} className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                      s.done ? "bg-primary border-primary text-primary-foreground" :
                      i === currentSet ? "border-primary text-primary ring-4 ring-primary/20 scale-110" :
                      "border-muted text-muted-foreground"
                    }`}>{s.done ? <Check className="w-5 h-5" /> : i + 1}</button>
                  ))}
                </div>
                <p className="text-center text-sm text-muted-foreground font-medium">Serie {currentSet + 1} de {totalSets}</p>

                {/* Input card */}
                <Card className="border-primary/20 overflow-hidden">
                  <CardContent className="pt-5 pb-5 space-y-5">
                    {/* Weight */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Peso (kg)</Label>
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl text-xl font-bold shrink-0"
                          onClick={() => updateCurrentSet("weight", String(Math.max(0, weight - 2.5)))}>−</Button>
                        <Input type="number" inputMode="decimal" value={currentData.weight}
                          onChange={(e) => updateCurrentSet("weight", e.target.value)}
                          placeholder="0" className="h-14 text-center text-3xl font-bold rounded-xl" />
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl text-xl font-bold shrink-0"
                          onClick={() => updateCurrentSet("weight", String(weight + 2.5))}>+</Button>
                      </div>
                      {weight > 0 && <WeightVisual weight={weight} machineName={exercise.machine} />}
                    </div>

                    {/* Reps */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Repeticiones</Label>
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl text-xl font-bold shrink-0"
                          onClick={() => updateCurrentSet("reps", String(Math.max(1, (parseInt(currentData.reps) || 10) - 1)))}>−</Button>
                        <Input type="number" inputMode="numeric" value={currentData.reps}
                          onChange={(e) => updateCurrentSet("reps", e.target.value)}
                          className="h-14 text-center text-3xl font-bold rounded-xl" />
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl text-xl font-bold shrink-0"
                          onClick={() => updateCurrentSet("reps", String((parseInt(currentData.reps) || 10) + 1))}>+</Button>
                      </div>
                    </div>

                    {/* Effort - horizontal pill selector */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">¿Cómo se sintió?</Label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {EFFORT_LEVELS.map(({ value, label, emoji, color }) => (
                          <button key={value} onClick={() => updateCurrentSet("effort", value)}
                            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all ${
                              currentData.effort === value
                                ? `${color} scale-105 shadow-sm`
                                : "border-border/50 hover:border-muted-foreground/30"
                            }`}>
                            <span className="text-xl">{emoji}</span>
                            <span className="text-[8px] font-medium leading-tight">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Complete button */}
                    <Button size="lg" className="w-full gap-2 text-base font-bold h-14 rounded-xl" onClick={completeSet}>
                      <Check className="w-5 h-5" />
                      {currentSet < totalSets - 1 ? `¡Listo! Serie ${currentSet + 1}` : "¡Última serie!"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* Rest timer */}
          {inSession && resting && exerciseSession && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-display font-bold text-foreground">{exerciseSession.exercise.name}</p>
                <Badge variant="outline" className="text-xs">Serie {exerciseSession.currentSet + 1}/{exerciseSession.totalSets}</Badge>
              </div>
              <RestTimer seconds={parseRestSeconds(exerciseSession.exercise.rest)} onFinish={onRestFinish} />
            </div>
          )}

          {/* Exercise completed summary */}
          {inSession && exerciseSession?.allDone && !resting && (
            <div className="space-y-3">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="py-6 text-center space-y-4">
                  <p className="text-3xl">✅</p>
                  <p className="text-lg font-display font-bold text-foreground">{exerciseSession.exercise.name}</p>
                  <div className="flex justify-center gap-4">
                    {exerciseSession.sets.map((s, i) => (
                      <div key={i} className="text-center bg-muted/30 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-muted-foreground">S{i + 1}</p>
                        <p className="text-sm font-bold text-foreground">{s.weight || 0}kg</p>
                        <p className="text-[10px] text-muted-foreground">×{s.reps}</p>
                        <span className="text-base">{EFFORT_LEVELS.find(e => e.value === s.effort)?.emoji}</span>
                      </div>
                    ))}
                  </div>
                  <Button size="lg" className="w-full gap-2 rounded-xl" onClick={saveExerciseAndNext}>
                    {exerciseSession.exIdx < allExercises.length - 1 ? (
                      <>Siguiente ejercicio <ChevronRight className="w-4 h-4" /></>
                    ) : <>Finalizar rutina 🎉</>}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Session complete celebration */}
          {sessionDone && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="py-8 text-center space-y-4">
                <p className="text-5xl">🎉</p>
                <p className="text-2xl font-display font-bold text-primary">¡Rutina completada!</p>
                <p className="text-sm text-muted-foreground">{sessionPlan?.title} — {allExercises.length} ejercicios</p>
                <Button size="lg" className="rounded-xl" onClick={endSession}>Volver al menú</Button>
              </CardContent>
            </Card>
          )}

          {/* Plan selector */}
          {!inSession && !sessionDone && exercisePlans.length > 0 && (
            <div className="space-y-3">
              {suggestedNext && (
                <Card className="border-primary/40 bg-primary/5 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => startSession(suggestedNext)}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center"><Play className="w-6 h-6 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-primary uppercase tracking-wider font-medium">Hoy te toca</p>
                        <p className="text-base font-display font-bold text-foreground truncate">{suggestedNext.title}</p>
                        <div className="flex gap-1.5 mt-0.5">
                          {suggestedNext.day_label && <Badge variant="outline" className="text-[9px] h-4 bg-primary/10">{suggestedNext.day_label}</Badge>}
                          <span className="text-[10px] text-muted-foreground">{(suggestedNext.exercises as any[])?.length} ejercicios</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              )}
              {Object.entries(splitGroups).map(([splitType, plans]) => (
                <div key={splitType} className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{SPLIT_LABELS[splitType] || splitType}</p>
                  {plans.map(plan => (
                    <Card key={plan.id} className="border-border/50 cursor-pointer hover:border-primary/40 active:scale-[0.98] transition-all" onClick={() => startSession(plan)}>
                      <CardContent className="py-3 flex items-center gap-3">
                        <Dumbbell className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{plan.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {plan.day_label && <Badge variant="outline" className="text-[9px] h-4 bg-primary/10">{plan.day_label}</Badge>}
                            <span className="text-[10px] text-muted-foreground">{(plan.exercises as any[])?.length} ejercicios</span>
                          </div>
                        </div>
                        <Play className="w-4 h-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          )}

          {!inSession && !sessionDone && exercisePlans.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Tu coach aún no ha asignado rutinas</p>
            </div>
          )}

          {/* Muscle heatmap */}
          {!inSession && !sessionDone && Object.keys(muscleActivity).length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Músculos trabajados (7 días)
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3"><BodyMap muscleActivity={muscleActivity} /></CardContent>
            </Card>
          )}

          {/* History */}
          {!inSession && !sessionDone && workoutDays.length > 0 && (
            <div className="space-y-2 border-t border-border/30 pt-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Historial</p>
              {workoutDays.slice(0, 10).map(({ date, exercises }) => (
                <Card key={date} className="border-border/50">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-xs font-semibold text-foreground">{format(new Date(date + "T12:00:00"), "EEE dd MMM", { locale: es })}</span>
                    </div>
                    <div className="space-y-1">
                      {exercises.map((w: any, idx: number) => (
                        <div key={w.id} className="flex items-center gap-2 text-[11px]">
                          <span className="text-muted-foreground w-3 text-right">{idx + 1}.</span>
                          <span className="font-medium flex-1 truncate text-foreground">{w.exercise_name}</span>
                          <span className="text-muted-foreground shrink-0">{w.sets}×{w.reps}</span>
                          {w.weight_kg > 0 && <span className="text-foreground font-semibold shrink-0">{w.weight_kg}kg</span>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ──── NUTRICIÓN ──── */}
        <TabsContent value="nutricion" className="space-y-3 mt-3">
          <DateStrip selectedDate={nutritionDate} onChange={setNutritionDate} />

          {/* QR Scanner button */}
          <button
            onClick={() => setScannerOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/30 hover:border-primary/50 hover:from-primary/15 active:scale-[0.98] transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <ScanLine className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">Escanear código de barras</p>
              <p className="text-[10px] text-muted-foreground">Registrá un alimento al instante</p>
            </div>
            <ChevronRight className="w-4 h-4 text-primary" />
          </button>

          {/* Goals ring progress */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-foreground">
                  {isToday(nutritionDate) ? "📊 Hoy" : format(nutritionDate, "EEE dd MMM", { locale: es })}
                </p>
                <button onClick={() => setEditingGoals(!editingGoals)} className="text-[10px] text-primary hover:underline">
                  {editingGoals ? "✓ Listo" : "⚙️ Metas"}
                </button>
              </div>

              {editingGoals ? (
                <div className="space-y-2">
                  {[
                    { key: "calories", label: "Calorías", unit: "kcal" },
                    { key: "protein", label: "Proteína", unit: "g" },
                    { key: "carbs", label: "Carbos", unit: "g" },
                    { key: "fat", label: "Grasa", unit: "g" },
                  ].map(({ key, label, unit }) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16">{label}</span>
                      <Input type="number" className="h-8 text-xs flex-1"
                        value={nutritionGoals[key]}
                        onChange={(e) => {
                          const newGoals = { ...nutritionGoals, [key]: parseInt(e.target.value) || 0 };
                          setNutritionGoals(newGoals);
                          localStorage.setItem("gym_nutrition_goals", JSON.stringify(newGoals));
                        }} />
                      <span className="text-[10px] text-muted-foreground w-8">{unit}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: "Calorías", current: dateTotals.calories, goal: nutritionGoals.calories, color: "hsl(var(--primary))", unit: "kcal" },
                    { label: "Proteína", current: dateTotals.protein, goal: nutritionGoals.protein, color: "#60a5fa", unit: "g" },
                    { label: "Carbos", current: dateTotals.carbs, goal: nutritionGoals.carbs, color: "#facc15", unit: "g" },
                    { label: "Grasa", current: dateTotals.fat, goal: nutritionGoals.fat, color: "#fb923c", unit: "g" },
                  ].map(({ label, current, goal, color, unit }) => (
                    <div key={label} className="flex flex-col items-center">
                      <div className="relative">
                        <GoalRing current={current} goal={goal} color={color} size={52} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-foreground">{Math.round(current)}</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-0.5">/{goal}{unit}</p>
                      <p className="text-[9px] font-medium text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add meal */}
          {!showAddMeal ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">¿Qué comiste?</p>
              <div className="grid grid-cols-3 gap-2">
                {MEAL_TYPES.slice(0, 6).map(t => (
                  <button key={t.value}
                    onClick={() => { setMealType(t.value); setShowAddMeal(true); }}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border/50 hover:border-primary/40 active:scale-95 transition-all bg-card">
                    <span className="text-xl">{t.label.split(" ")[0]}</span>
                    <span className="text-[10px] text-muted-foreground">{t.label.split(" ").slice(1).join(" ")}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <Card className="border-primary/20">
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs bg-primary/10">
                    {MEAL_TYPES.find(t => t.value === mealType)?.label}
                  </Badge>
                  <button onClick={() => { setShowAddMeal(false); setSelectedFood(null); setFoodSearch(""); }}
                    className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input value={foodSearch}
                    onChange={(e) => { setFoodSearch(e.target.value); setSelectedFood(null); }}
                    placeholder="Buscar alimento..." className="h-10 text-sm pl-9 rounded-xl" autoFocus />
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button onClick={() => setFoodCategory("all")}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors ${foodCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    Todos
                  </button>
                  {FOOD_CATEGORIES.map(c => (
                    <button key={c} onClick={() => setFoodCategory(c)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors ${foodCategory === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {c}
                    </button>
                  ))}
                </div>

                {!selectedFood && (
                  <div className="max-h-52 overflow-y-auto space-y-0.5 rounded-xl border border-border/30">
                    {filteredFoods.slice(0, 25).map((food) => (
                      <button key={food.name}
                        onClick={() => { setSelectedFood(food); setFoodSearch(food.name); }}
                        className="w-full text-left flex items-center justify-between px-3 py-3 hover:bg-muted/50 active:bg-muted transition-colors border-b border-border/20 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{food.name}</p>
                          <p className="text-[10px] text-muted-foreground">P:{food.protein}g · C:{food.carbs}g · G:{food.fat}g</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="text-sm font-bold text-foreground">{food.calories}</span>
                          <span className="text-[9px] text-muted-foreground ml-0.5">kcal</span>
                        </div>
                      </button>
                    ))}
                    {filteredFoods.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No se encontró 😕</p>}
                  </div>
                )}

                {selectedFood && calculated && (
                  <div className="space-y-3">
                    <div className="bg-muted/10 rounded-xl p-4 text-center space-y-3 border border-border/30">
                      <p className="text-base font-bold text-foreground">{selectedFood.name}</p>
                      <div className="flex items-center justify-center gap-3">
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl"
                          onClick={() => setPortionGrams(String(Math.max(25, (parseFloat(portionGrams) || 100) - 25)))}>−</Button>
                        <div className="text-center">
                          <Input type="number" value={portionGrams} onChange={(e) => setPortionGrams(e.target.value)}
                            className="h-12 w-20 text-center text-2xl font-bold rounded-xl" />
                          <p className="text-[10px] text-muted-foreground">gramos</p>
                        </div>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl"
                          onClick={() => setPortionGrams(String((parseFloat(portionGrams) || 100) + 25))}>+</Button>
                      </div>
                      <div className="grid grid-cols-4 gap-3 text-center mt-2">
                        <div className="bg-card rounded-lg p-2">
                          <p className="text-lg font-bold text-foreground">{calculated.calories}</p>
                          <p className="text-[9px] text-muted-foreground">kcal</p>
                        </div>
                        <div className="bg-card rounded-lg p-2">
                          <p className="text-lg font-bold text-blue-400">{calculated.protein}g</p>
                          <p className="text-[9px] text-muted-foreground">Prot</p>
                        </div>
                        <div className="bg-card rounded-lg p-2">
                          <p className="text-lg font-bold text-yellow-400">{calculated.carbs}g</p>
                          <p className="text-[9px] text-muted-foreground">Carbs</p>
                        </div>
                        <div className="bg-card rounded-lg p-2">
                          <p className="text-lg font-bold text-orange-400">{calculated.fat}g</p>
                          <p className="text-[9px] text-muted-foreground">Grasa</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setSelectedFood(null); setFoodSearch(""); }}>Cambiar</Button>
                      <Button className="flex-1 gap-1 rounded-xl" onClick={addMealLog}>
                        <Check className="w-4 h-4" /> Agregar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Meals grouped by type */}
          {dateMeals.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Comidas {isToday(nutritionDate) ? "de hoy" : format(nutritionDate, "dd MMM", { locale: es })}
              </p>
              {(() => {
                const grouped: Record<string, any[]> = {};
                dateMeals.forEach(m => {
                  const type = m.meal_type || "otro";
                  if (!grouped[type]) grouped[type] = [];
                  grouped[type].push(m);
                });
                return Object.entries(grouped).map(([type, meals]) => (
                  <Card key={type} className="border-border/50">
                    <CardContent className="py-3 space-y-1.5">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                        {MEAL_TYPES.find(t => t.value === type)?.label || "🍽️ Otro"}
                      </p>
                      {meals.map(m => (
                        <div key={m.id} className="flex items-center gap-2 py-1.5 border-t border-border/20 first:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{m.food_name}</p>
                            <p className="text-[10px] text-muted-foreground">{m.portion_grams}g · {m.calories}kcal · P:{m.protein_g}g</p>
                          </div>
                          <button onClick={() => deleteMeal(m.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ));
              })()}
            </div>
          )}

          {dateMeals.length === 0 && !showAddMeal && (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-2xl mb-1">🍽️</p>
              <p className="text-xs">Sin comidas registradas</p>
            </div>
          )}
        </TabsContent>

        {/* ──── CLASES ──── */}
        <TabsContent value="clases" className="space-y-4 mt-3">
          {/* My reservations */}
          {classBookings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                <Check className="w-3 h-3" /> Mis reservas
              </p>
              {classBookings.map(b => (
                <Card key={b.id} className="border-primary/30 bg-primary/5">
                  <CardContent className="py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                      <CalendarDays className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{b.class_schedules?.classes?.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {b.class_schedules?.classes?.instructor} · {b.class_schedules?.start_time?.slice(0, 5)} - {b.class_schedules?.end_time?.slice(0, 5)}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-destructive h-8" onClick={() => cancelBooking(b.id)}>
                      <X className="w-3 h-3 mr-1" /> Cancelar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Available classes by day - scrollable */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Horario semanal</p>
          <div className="space-y-3">
            {Object.entries(classesByDay).sort(([a], [b]) => {
              const da = ((Number(a) - today) + 7) % 7;
              const db = ((Number(b) - today) + 7) % 7;
              return da - db;
            }).map(([day, classes]) => (
              <div key={day} className="space-y-1.5">
                <div className="flex items-center gap-2 sticky top-0 bg-background py-1 z-10">
                  <p className="text-sm font-semibold text-foreground">{DAY_NAMES[Number(day)]}</p>
                  {Number(day) === today && <Badge className="text-[8px] h-4 bg-primary/20 text-primary">Hoy</Badge>}
                </div>
                {classes.map(s => {
                  const isBooked = bookedScheduleIds.includes(s.id);
                  return (
                    <Card key={s.id} className={`border-border/50 ${isBooked ? "opacity-60" : ""}`}>
                      <CardContent className="py-3 flex items-center gap-3">
                        <div className="flex flex-col items-center shrink-0 w-14 bg-muted/30 rounded-lg py-1.5">
                          <span className="text-xs font-bold text-foreground">{s.start_time?.slice(0, 5)}</span>
                          <span className="text-[9px] text-muted-foreground">{s.end_time?.slice(0, 5)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{s.classes?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{s.classes?.instructor}</p>
                          {s.classes?.description && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{s.classes.description}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Users className="w-3 h-3" /> {s.classes?.max_capacity}
                          </div>
                          {isBooked ? (
                            <Badge className="text-[9px] bg-primary/20 text-primary">Reservado</Badge>
                          ) : (
                            <Button size="sm" className="h-7 text-xs rounded-lg" onClick={() => bookClass(s.id)} disabled={!!bookingLoading}>
                              {bookingLoading === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Reservar"}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ))}
          </div>

          {classSchedules.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay clases disponibles</p>
            </div>
          )}
        </TabsContent>

        {/* ──── PAGOS / PLAN ──── */}
        <TabsContent value="pagos" className="space-y-4 mt-3">
          {subscription ? (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden">
              <CardContent className="pt-5 pb-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-primary uppercase tracking-widest font-medium">Tu plan</p>
                    <h3 className="text-xl font-display font-bold text-foreground mt-1">{subscription.plans?.name}</h3>
                  </div>
                  <Badge className="bg-primary/20 text-primary text-xs">Activo ✨</Badge>
                </div>

                <div className="bg-card/50 rounded-xl p-4 space-y-3 border border-border/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Precio</span>
                    <span className="text-lg font-bold text-foreground">
                      {new Intl.NumberFormat("es-CR", { style: "currency", currency: subscription.plans?.currency || "CRC" }).format(subscription.plans?.price || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Periodo</span>
                    <span className="text-sm text-foreground">
                      {format(new Date(subscription.start_date), "dd MMM", { locale: es })} — {format(new Date(subscription.end_date), "dd MMM yyyy", { locale: es })}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progreso del periodo</span>
                      <span className="font-medium text-foreground">{subDaysLeft} días restantes</span>
                    </div>
                    <Progress value={subProgress} className="h-2" />
                  </div>
                </div>

                {/* QR for quick ID */}
                <div className="flex items-center gap-3 bg-card/50 rounded-xl p-3 border border-border/30">
                  <QrCode className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground">Tu código de socio</p>
                    <p className="text-[10px] text-muted-foreground">Mostralo en la entrada para check-in rápido</p>
                  </div>
                  <MemberQRCode memberId={memberId!} memberName={memberName} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardContent className="py-8 text-center space-y-3">
                <CreditCard className="w-10 h-10 mx-auto text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">Sin membresía activa</p>
                <p className="text-xs text-muted-foreground">Consulta en recepción para activar tu plan</p>
              </CardContent>
            </Card>
          )}

          {/* Payment history */}
          {paymentHistory.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historial de pagos</p>
              {paymentHistory.map(p => (
                <Card key={p.id} className="border-border/50">
                  <CardContent className="py-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      p.status === "paid" ? "bg-green-500/10" : "bg-yellow-500/10"
                    }`}>
                      {p.status === "paid" ? <Check className="w-4 h-4 text-green-400" /> : <Clock className="w-4 h-4 text-yellow-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {new Intl.NumberFormat("es-CR", { style: "currency", currency: p.currency || "CRC" }).format(p.amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(p.payment_date), "dd MMM yyyy", { locale: es })} · {p.payment_method}
                      </p>
                    </div>
                    <Badge className={`text-[9px] ${p.status === "paid" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                      {p.status === "paid" ? "Pagado" : "Pendiente"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <BarcodeFoodScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onConfirm={handleScannedFood}
      />
    </div>
  );
}

function guessMuscleGroup(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("press banca") || n.includes("pecho") || n.includes("pec")) return "Pecho";
  if (n.includes("sentadilla") || n.includes("squat") || n.includes("pierna") || n.includes("leg")) return "Piernas";
  if (n.includes("jalón") || n.includes("remo") || n.includes("espalda") || n.includes("pulldown")) return "Espalda";
  if (n.includes("hombro") || n.includes("shoulder") || n.includes("press militar")) return "Hombros";
  if (n.includes("curl") || n.includes("bícep")) return "Bíceps";
  if (n.includes("trícep") || n.includes("extensión")) return "Tríceps";
  if (n.includes("abdom") || n.includes("core") || n.includes("plank")) return "Core";
  if (n.includes("glúteo") || n.includes("hip thrust")) return "Glúteos";
  return "General";
}
