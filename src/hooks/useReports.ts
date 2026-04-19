import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/hooks/useGym";
import { startOfMonth, endOfMonth, format, subMonths, subDays, eachDayOfInterval, startOfWeek, endOfWeek, getDay, getHours } from "date-fns";

export interface DateRange { from: Date; to: Date }

export function useReports(range: DateRange) {
  const { gymId } = useGym();
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [shopSales, setShopSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fromStr = format(range.from, "yyyy-MM-dd");
  const toStr = format(range.to, "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    if (!gymId) { setLoading(false); return; }
    setLoading(true);
    const t = (q: any) => q.eq("gym_id", gymId);
    const [ciRes, payRes, expRes, memRes, wkRes, subRes, salesRes] = await Promise.all([
      t(supabase.from("check_ins").select("*, members(first_name, last_name)")).gte("check_in_time", `${fromStr}T00:00:00`).lte("check_in_time", `${toStr}T23:59:59`).order("check_in_time", { ascending: false }),
      t(supabase.from("payments").select("*, members(first_name, last_name)")).gte("payment_date", fromStr).lte("payment_date", toStr).order("payment_date", { ascending: false }),
      t(supabase.from("expenses").select("*")).gte("expense_date", fromStr).lte("expense_date", toStr).order("expense_date", { ascending: false }),
      t(supabase.from("members").select("*")),
      t(supabase.from("workout_logs").select("*")).gte("workout_date", fromStr).lte("workout_date", toStr),
      t(supabase.from("subscriptions").select("*, plans(name, price), members(first_name, last_name)")),
      t(supabase.from("shop_sales").select("*, shop_products(name, category), members(first_name, last_name)")).gte("sale_date", fromStr).lte("sale_date", toStr).order("sale_date", { ascending: false }),
    ]);
    setCheckIns(ciRes.data ?? []);
    setPayments(payRes.data ?? []);
    setExpenses(expRes.data ?? []);
    setMembers(memRes.data ?? []);
    setWorkouts(wkRes.data ?? []);
    setSubscriptions(subRes.data ?? []);
    setShopSales(salesRes.data ?? []);
    setLoading(false);
  }, [fromStr, toStr, gymId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── ATTENDANCE ───
  const attendanceByDay = useMemo(() => {
    const days = eachDayOfInterval({ start: range.from, end: range.to });
    return days.map(d => {
      const ds = format(d, "yyyy-MM-dd");
      return { date: ds, label: format(d, "dd/MM"), count: checkIns.filter(c => c.check_in_time.startsWith(ds)).length };
    });
  }, [checkIns, range]);

  const peakHours = useMemo(() => {
    const hours: Record<number, number> = {};
    checkIns.forEach(c => { const h = getHours(new Date(c.check_in_time)); hours[h] = (hours[h] || 0) + 1; });
    return Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, visitas: hours[i] || 0 })).filter(h => h.visitas > 0 || (h.hour >= "6:00" && h.hour <= "22:00"));
  }, [checkIns]);

  const attendanceByWeekday = useMemo(() => {
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const counts: Record<number, number> = {};
    checkIns.forEach(c => { const d = getDay(new Date(c.check_in_time)); counts[d] = (counts[d] || 0) + 1; });
    return days.map((name, i) => ({ day: name, visitas: counts[i] || 0 }));
  }, [checkIns]);

  const topVisitors = useMemo(() => {
    const freq: Record<string, { name: string; count: number }> = {};
    checkIns.forEach(c => {
      const id = c.member_id;
      if (!freq[id]) freq[id] = { name: `${c.members?.first_name || ""} ${c.members?.last_name || ""}`, count: 0 };
      freq[id].count++;
    });
    return Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [checkIns]);

  // ─── FINANCIAL ───
  const totalRevenue = useMemo(() => payments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0), [payments]);
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  const revenueByMonth = useMemo(() => {
    const months: Record<string, number> = {};
    payments.filter(p => p.status === "paid").forEach(p => {
      const m = p.payment_date.substring(0, 7);
      months[m] = (months[m] || 0) + Number(p.amount);
    });
    return Object.entries(months).sort().map(([m, v]) => ({ month: m, ingresos: v }));
  }, [payments]);

  const expensesByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + Number(e.amount); });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const revenueByMethod = useMemo(() => {
    const methods: Record<string, number> = {};
    const labels: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia" };
    payments.filter(p => p.status === "paid").forEach(p => {
      const m = labels[p.payment_method] || p.payment_method;
      methods[m] = (methods[m] || 0) + Number(p.amount);
    });
    return Object.entries(methods).map(([name, value]) => ({ name, value }));
  }, [payments]);

  const pendingAmount = useMemo(() => payments.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0), [payments]);

  // ─── MEMBERSHIPS ───
  const activeMembers = useMemo(() => members.filter(m => m.status === "active").length, [members]);
  const inactiveMembers = useMemo(() => members.filter(m => m.status === "inactive").length, [members]);

  const newMembersInRange = useMemo(() => members.filter(m => m.created_at >= `${fromStr}T00:00:00` && m.created_at <= `${toStr}T23:59:59`).length, [members, fromStr, toStr]);

  const membersByMonth = useMemo(() => {
    const months: Record<string, number> = {};
    members.forEach(m => {
      const mo = m.created_at.substring(0, 7);
      months[mo] = (months[mo] || 0) + 1;
    });
    return Object.entries(months).sort().map(([month, count]) => ({ month, registros: count }));
  }, [members]);

  const activeSubscriptions = useMemo(() => subscriptions.filter(s => s.status === "active"), [subscriptions]);

  const subscriptionsByPlan = useMemo(() => {
    const plans: Record<string, number> = {};
    activeSubscriptions.forEach(s => {
      const name = s.plans?.name || "Sin plan";
      plans[name] = (plans[name] || 0) + 1;
    });
    return Object.entries(plans).map(([name, value]) => ({ name, value }));
  }, [activeSubscriptions]);

  // ─── PERFORMANCE ───
  const topExercises = useMemo(() => {
    const ex: Record<string, number> = {};
    workouts.forEach(w => { ex[w.exercise_name] = (ex[w.exercise_name] || 0) + 1; });
    return Object.entries(ex).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
  }, [workouts]);

  const muscleGroupVolume = useMemo(() => {
    const groups: Record<string, number> = {};
    workouts.forEach(w => {
      const vol = (w.sets || 1) * (w.reps || 1) * (w.weight_kg || 1);
      groups[w.muscle_group] = (groups[w.muscle_group] || 0) + vol;
    });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [workouts]);

  const workoutsByDay = useMemo(() => {
    const days: Record<string, number> = {};
    workouts.forEach(w => { days[w.workout_date] = (days[w.workout_date] || 0) + 1; });
    return Object.entries(days).sort().map(([date, count]) => ({ date, registros: count }));
  }, [workouts]);

  const totalVolume = useMemo(() => workouts.reduce((s, w) => s + (w.sets || 1) * (w.reps || 1) * (w.weight_kg || 0), 0), [workouts]);

  // ─── SHOP SALES ───
  const shopSalesTotal = useMemo(() => shopSales.reduce((s, sale) => s + Number(sale.total_amount), 0), [shopSales]);

  const shopSalesByProduct = useMemo(() => {
    const products: Record<string, { name: string; count: number; revenue: number }> = {};
    shopSales.forEach(s => {
      const name = s.shop_products?.name || "Producto";
      if (!products[name]) products[name] = { name, count: 0, revenue: 0 };
      products[name].count += s.quantity || 1;
      products[name].revenue += Number(s.total_amount);
    });
    return Object.values(products).sort((a, b) => b.revenue - a.revenue);
  }, [shopSales]);

  const shopSalesByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    shopSales.forEach(s => {
      const cat = s.shop_products?.category || "otros";
      cats[cat] = (cats[cat] || 0) + Number(s.total_amount);
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [shopSales]);

  return {
    loading, checkIns, payments, expenses, members, workouts, shopSales,
    // Attendance
    attendanceByDay, peakHours, attendanceByWeekday, topVisitors, totalVisits: checkIns.length,
    // Financial
    totalRevenue, totalExpenses, revenueByMonth, expensesByCategory, revenueByMethod, pendingAmount,
    // Memberships
    activeMembers, inactiveMembers, newMembersInRange, membersByMonth, subscriptionsByPlan, activeSubscriptions,
    // Performance
    topExercises, muscleGroupVolume, workoutsByDay, totalVolume, totalWorkouts: workouts.length,
    // Shop
    shopSalesTotal, shopSalesByProduct, shopSalesByCategory,
  };
}
