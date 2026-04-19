import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { useGym } from "@/hooks/useGym";
import { Users, CreditCard, ScanLine, CalendarDays, Bell, TrendingUp, UserPlus, AlertTriangle, ArrowUpRight, Clock, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, subDays, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";

import { GymBrand } from "@/components/GymBrand";

const tooltipStyle = { fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 };
const PIE_COLORS = ["hsl(var(--foreground))", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb"];

export default function Dashboard() {
  const { isMember, isAdmin, isCoach, isReceptionist, isSuperAdmin, loading: roleLoading, roles } = useRole();
  const { gym, gymId, loading: gymLoading } = useGym();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ members: 0, revenue: 0, checkIns: 0, classes: 0, newMembers: 0, pendingPayments: 0 });
  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);
  const [expiringSubs, setExpiringSubs] = useState<any[]>([]);
  const [revenueByDay, setRevenueByDay] = useState<any[]>([]);
  const [checkInsByDay, setCheckInsByDay] = useState<any[]>([]);
  const [topPlans, setTopPlans] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && roles.length > 0 && isMember && !isAdmin && !isCoach && !isReceptionist) {
      navigate("/mi-gym", { replace: true });
    }
  }, [roleLoading, isAdmin, isCoach, isMember, isReceptionist, roles, navigate]);

  useEffect(() => {
    if (roleLoading || gymLoading) return;
    if (isMember && !isAdmin && !isCoach && !isReceptionist) return;
    // Wait for a gymId unless super_admin (global view allowed)
    if (!gymId && !isSuperAdmin) {
      setDataLoading(false);
      return;
    }

    const applyTenant = (q: any) => (gymId ? q.eq("gym_id", gymId) : q);

    const fetchStats = async () => {
      setDataLoading(true);
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const monthStart = startOfMonth(today).toISOString();
      const monthEnd = endOfMonth(today).toISOString();
      const last7 = subDays(today, 7).toISOString();
      const last30 = subDays(today, 30).toISOString();

      const [membersRes, paymentsRes, checkInsRes, classesRes, recentRes, expiringRes, newMembersRes, pendingRes, recentPaysRes, allCheckInsRes] = await Promise.all([
        applyTenant(supabase.from("members").select("id", { count: "exact", head: true }).eq("status", "active")),
        applyTenant(supabase.from("payments").select("amount, payment_date").eq("status", "paid")),
        applyTenant(supabase.from("check_ins").select("id", { count: "exact", head: true }).gte("check_in_time", todayStr + "T00:00:00")),
        applyTenant(supabase.from("classes").select("id", { count: "exact", head: true }).eq("is_active", true)),
        applyTenant(supabase.from("check_ins").select("*, members(first_name, last_name)").order("check_in_time", { ascending: false }).limit(8)),
        applyTenant(supabase.from("subscriptions").select("*, members(first_name, last_name, email, phone), plans(name, price)")
          .eq("status", "active").order("end_date").limit(50)),
        applyTenant(supabase.from("members").select("id", { count: "exact", head: true }).gte("created_at", last30)),
        applyTenant(supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending")),
        applyTenant(supabase.from("payments").select("*, members(first_name, last_name)").eq("status", "paid").order("payment_date", { ascending: false }).limit(5)),
        applyTenant(supabase.from("check_ins").select("check_in_time").gte("check_in_time", last7)),
      ]);

      const allPayments = paymentsRes.data ?? [];
      const revenue = allPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      const monthRevenue = allPayments.filter((p: any) => p.payment_date >= monthStart.split("T")[0] && p.payment_date <= monthEnd.split("T")[0]).reduce((sum: number, p: any) => sum + Number(p.amount), 0);

      const revDays: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = format(subDays(today, i), "yyyy-MM-dd");
        revDays[d] = 0;
      }
      allPayments.forEach((p: any) => { if (revDays[p.payment_date] !== undefined) revDays[p.payment_date] += Number(p.amount); });
      setRevenueByDay(Object.entries(revDays).map(([date, amount]) => ({ day: format(new Date(date + "T12:00:00"), "EEE", { locale: es }), amount })));

      const ciDays: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = format(subDays(today, i), "yyyy-MM-dd");
        ciDays[d] = 0;
      }
      (allCheckInsRes.data ?? []).forEach((ci: any) => {
        const d = ci.check_in_time.split("T")[0];
        if (ciDays[d] !== undefined) ciDays[d]++;
      });
      setCheckInsByDay(Object.entries(ciDays).map(([date, count]) => ({ day: format(new Date(date + "T12:00:00"), "EEE", { locale: es }), count })));

      const allSubs = expiringRes.data ?? [];
      const expiring = allSubs.filter((s: any) => {
        const daysLeft = differenceInDays(new Date(s.end_date), today);
        return daysLeft >= 0 && daysLeft <= 7;
      });

      const planCount: Record<string, { name: string; count: number }> = {};
      allSubs.forEach((s: any) => {
        const name = s.plans?.name || "Sin plan";
        if (!planCount[name]) planCount[name] = { name, count: 0 };
        planCount[name].count++;
      });
      setTopPlans(Object.values(planCount).sort((a, b) => b.count - a.count).slice(0, 5));

      setStats({
        members: membersRes.count ?? 0,
        revenue: monthRevenue || revenue,
        checkIns: checkInsRes.count ?? 0,
        classes: classesRes.count ?? 0,
        newMembers: newMembersRes.count ?? 0,
        pendingPayments: pendingRes.count ?? 0,
      });
      setRecentCheckIns(recentRes.data ?? []);
      setExpiringSubs(expiring);
      setRecentPayments(recentPaysRes.data ?? []);
      setDataLoading(false);
    };

    fetchStats();
  }, [roleLoading, gymLoading, gymId, isMember, isAdmin, isCoach, isReceptionist, isSuperAdmin]);

  if (roleLoading || gymLoading || (isMember && !isAdmin && !isCoach && !isReceptionist)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse">
          <GymBrand
            gymName={gym?.name}
            gymLogoUrl={gym?.logo_url}
            gymColor={gym?.primary_color}
            size="lg"
            showName={Boolean(gym?.name && !gym?.logo_url)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCardInline title="Socios Activos" value={stats.members} icon={Users} />
        <StatCardInline title="Ingresos Mes" value={formatCurrency(stats.revenue)} icon={CreditCard} accent />
        <StatCardInline title="Check-ins Hoy" value={stats.checkIns} icon={ScanLine} />
        <StatCardInline title="Clases Activas" value={stats.classes} icon={CalendarDays} />
        <StatCardInline title="Nuevos (30d)" value={stats.newMembers} icon={UserPlus} />
        <StatCardInline title="Pagos Pendientes" value={stats.pendingPayments} icon={AlertTriangle} warn={stats.pendingPayments > 0} />
      </div>

      {/* Alerts */}
      {expiringSubs.length > 0 && (
        <Card className="border-foreground/20 bg-foreground/[0.03]">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-display flex items-center gap-2 text-foreground uppercase tracking-wider">
              <Bell className="h-3.5 w-3.5" /> Vencimientos próximos
              <Badge className="bg-foreground/10 text-foreground text-[10px] ml-auto">{expiringSubs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {expiringSubs.slice(0, 6).map(s => {
              const daysLeft = differenceInDays(new Date(s.end_date), new Date());
              return (
                <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.members?.first_name} {s.members?.last_name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.plans?.name} · {format(new Date(s.end_date), "dd MMM", { locale: es })}</p>
                  </div>
                  <Badge className={`text-[10px] shrink-0 ${daysLeft <= 2 ? "bg-destructive/20 text-destructive" : "bg-foreground/10 text-foreground/70"}`}>
                    {daysLeft <= 0 ? "Hoy" : `${daysLeft}d`}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-display uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" /> Ingresos (últimos 7 días)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenueByDay}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="amount" stroke="hsl(var(--foreground))" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Check-ins Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-display uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Activity className="h-3.5 w-3.5" /> Check-ins (últimos 7 días)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={checkInsByDay}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Check-ins */}
        <Card className="border-border/50 lg:col-span-1">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-display uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" /> Últimos Check-ins
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {recentCheckIns.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Sin check-ins recientes</p>
            ) : (
              <div className="space-y-1.5">
                {recentCheckIns.slice(0, 6).map((ci) => (
                  <div key={ci.id} className="flex items-center justify-between py-2 px-2.5 rounded-md hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-bold text-foreground">
                        {ci.members?.first_name?.[0]}{ci.members?.last_name?.[0]}
                      </div>
                      <span className="text-sm font-medium">{ci.members?.first_name} {ci.members?.last_name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(ci.check_in_time), "HH:mm")}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="border-border/50 lg:col-span-1">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-display uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5" /> Últimos Pagos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {recentPayments.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Sin pagos recientes</p>
            ) : (
              <div className="space-y-1.5">
                {recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 px-2.5 rounded-md hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-bold text-foreground">
                        {p.members?.first_name?.[0]}{p.members?.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.members?.first_name} {p.members?.last_name}</p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(p.payment_date), "dd MMM", { locale: es })}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Plans */}
        <Card className="border-border/50 lg:col-span-1">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-display uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ArrowUpRight className="h-3.5 w-3.5" /> Planes Populares
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {topPlans.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Sin datos de planes</p>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={topPlans} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={50} strokeWidth={2} stroke="hsl(var(--card))">
                      {topPlans.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-1">
                  {topPlans.map((plan, i) => (
                    <div key={plan.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-muted-foreground">{plan.name}</span>
                      </div>
                      <span className="font-bold">{plan.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

/* Inline stat card for dashboard */
function StatCardInline({ title, value, icon: Icon, accent, warn }: { title: string; value: string | number; icon: any; accent?: boolean; warn?: boolean }) {
  return (
    <Card className={`border-border/50 ${warn ? "border-destructive/30" : ""}`}>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${warn ? "bg-destructive/10" : accent ? "bg-foreground/10" : "bg-muted"}`}>
            <Icon className={`h-4 w-4 ${warn ? "text-destructive" : "text-foreground"}`} />
          </div>
        </div>
        <p className={`text-lg md:text-2xl font-display font-bold tracking-tight ${warn ? "text-destructive" : "text-foreground"}`}>{value}</p>
        <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{title}</p>
      </CardContent>
    </Card>
  );
}
