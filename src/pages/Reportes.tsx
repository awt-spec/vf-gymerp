import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/StatCard";
import { useReports, DateRange } from "@/hooks/useReports";
import { formatCurrency } from "@/lib/currency";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, CartesianGrid,
} from "recharts";
import {
  Users, TrendingUp, TrendingDown, DollarSign, CalendarDays, Dumbbell,
  Clock, UserPlus, UserMinus, Activity, Target, Loader2, Download, ShoppingBag,
  Filter, Database, Search, X,
} from "lucide-react";
import { CustomReportBuilder } from "@/components/reportes/CustomReportBuilder";

const PIE_COLORS = ["hsl(var(--primary))", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#6366f1", "#ef4444"];

const RANGE_PRESETS = [
  { label: "7 días", from: subDays(new Date(), 7), to: new Date() },
  { label: "30 días", from: subDays(new Date(), 30), to: new Date() },
  { label: "Este mes", from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
  { label: "3 meses", from: subMonths(new Date(), 3), to: new Date() },
  { label: "6 meses", from: subMonths(new Date(), 6), to: new Date() },
  { label: "1 año", from: subMonths(new Date(), 12), to: new Date() },
];

const tooltipStyle = {
  fontSize: 11,
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
};

function exportCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// ─── Filter bar component ───
function FilterBar({ children, onClear, hasFilters }: { children: React.ReactNode; onClear: () => void; hasFilters: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button variant={hasFilters ? "default" : "outline"} size="sm" className="text-xs h-7 gap-1.5" onClick={() => setOpen(!open)}>
          <Filter className="h-3 w-3" />
          Filtros {hasFilters && <Badge variant="secondary" className="text-[9px] ml-1 px-1.5 py-0">Activos</Badge>}
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-destructive" onClick={onClear}>
            <X className="h-3 w-3" /> Limpiar
          </Button>
        )}
      </div>
      {open && (
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="p-3 flex flex-wrap gap-3 items-end">{children}</CardContent>
        </Card>
      )}
    </div>
  );
}



export default function Reportes() {
  const [rangeIdx, setRangeIdx] = useState(1);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const useCustomRange = customFrom && customTo;

  const range: DateRange = useCustomRange
    ? { from: new Date(customFrom), to: new Date(customTo) }
    : { from: RANGE_PRESETS[rangeIdx].from, to: RANGE_PRESETS[rangeIdx].to };

  const data = useReports(range);

  // ─── Tab-specific filters ───
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [expenseCategory, setExpenseCategory] = useState("all");
  const [memberStatus, setMemberStatus] = useState("all");
  const [memberSearch, setMemberSearch] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("all");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [shopCategory, setShopCategory] = useState("all");



  // ─── Filtered data ───
  const filteredCheckIns = useMemo(() => {
    if (!attendanceSearch) return data.checkIns;
    const q = attendanceSearch.toLowerCase();
    return data.checkIns.filter(c => {
      const name = `${c.members?.first_name || ""} ${c.members?.last_name || ""}`.toLowerCase();
      return name.includes(q);
    });
  }, [data.checkIns, attendanceSearch]);

  const filteredPayments = useMemo(() => {
    let p = data.payments;
    if (paymentStatus !== "all") p = p.filter(x => x.status === paymentStatus);
    if (paymentMethod !== "all") p = p.filter(x => x.payment_method === paymentMethod);
    return p;
  }, [data.payments, paymentStatus, paymentMethod]);

  const filteredExpenses = useMemo(() => {
    if (expenseCategory === "all") return data.expenses;
    return data.expenses.filter(e => e.category === expenseCategory);
  }, [data.expenses, expenseCategory]);

  const filteredMembers = useMemo(() => {
    let m = data.members;
    if (memberStatus !== "all") m = m.filter(x => x.status === memberStatus);
    if (memberSearch) {
      const q = memberSearch.toLowerCase();
      m = m.filter(x => `${x.first_name} ${x.last_name}`.toLowerCase().includes(q));
    }
    return m;
  }, [data.members, memberStatus, memberSearch]);

  const filteredWorkouts = useMemo(() => {
    let w = data.workouts;
    if (muscleGroup !== "all") w = w.filter(x => x.muscle_group === muscleGroup);
    if (exerciseSearch) {
      const q = exerciseSearch.toLowerCase();
      w = w.filter(x => x.exercise_name.toLowerCase().includes(q));
    }
    return w;
  }, [data.workouts, muscleGroup, exerciseSearch]);

  const filteredShopSales = useMemo(() => {
    if (shopCategory === "all") return data.shopSales;
    return data.shopSales.filter(s => s.shop_products?.category === shopCategory);
  }, [data.shopSales, shopCategory]);

  // Derived filtered metrics
  const fTotalRevenue = useMemo(() => filteredPayments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0), [filteredPayments]);
  const fTotalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + Number(e.amount), 0), [filteredExpenses]);
  const fPending = useMemo(() => filteredPayments.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0), [filteredPayments]);
  const fShopTotal = useMemo(() => filteredShopSales.reduce((s, sale) => s + Number(sale.total_amount), 0), [filteredShopSales]);

  // Unique values for filter dropdowns
  const expenseCategories = useMemo(() => [...new Set(data.expenses.map(e => e.category))], [data.expenses]);
  const muscleGroups = useMemo(() => [...new Set(data.workouts.map(w => w.muscle_group))], [data.workouts]);
  const shopCategories = useMemo(() => [...new Set(data.shopSales.map(s => s.shop_products?.category).filter(Boolean))], [data.shopSales]);

  // ─── Export helpers ───
  const exportAttendance = () => {
    exportCSV("asistencia.csv", ["Fecha", "Socio", "Hora Entrada"],
      filteredCheckIns.map(c => [c.check_in_time.split("T")[0], `${c.members?.first_name || ""} ${c.members?.last_name || ""}`, c.check_in_time.split("T")[1]?.slice(0, 5) || ""]));
  };
  const exportFinancial = () => {
    const payRows = filteredPayments.map(p => [p.payment_date, `${p.members?.first_name || ""} ${p.members?.last_name || ""}`, p.amount, p.payment_method, p.status, "Ingreso"]);
    const expRows = filteredExpenses.map(e => [e.expense_date, e.description, e.amount, e.payment_method, "pagado", "Gasto"]);
    exportCSV("financiero.csv", ["Fecha", "Descripción", "Monto", "Método", "Estado", "Tipo"], [...payRows, ...expRows].map(r => r.map(String)));
  };
  const exportMembers = () => {
    exportCSV("membresias.csv", ["Nombre", "Email", "Teléfono", "Estado", "Registrado"],
      filteredMembers.map(m => [m.first_name + " " + m.last_name, m.email || "", m.phone || "", m.status, m.created_at.split("T")[0]]));
  };
  const exportPerformance = () => {
    exportCSV("rendimiento.csv", ["Fecha", "Ejercicio", "Grupo Muscular", "Series", "Reps", "Peso (kg)"],
      filteredWorkouts.map(w => [w.workout_date, w.exercise_name, w.muscle_group, String(w.sets), String(w.reps), String(w.weight_kg || 0)]));
  };



  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-3xl font-display font-bold">Reportes</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Análisis detallado del gimnasio</p>
      </div>

      {/* Date range: presets + custom */}
      <div className="space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {RANGE_PRESETS.map((p, i) => (
            <Button
              key={p.label}
              size="sm"
              variant={!useCustomRange && rangeIdx === i ? "default" : "outline"}
              className="text-xs h-7"
              onClick={() => { setRangeIdx(i); setCustomFrom(""); setCustomTo(""); }}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs text-muted-foreground">Personalizado:</span>
          <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-7 text-xs w-[130px]" />
          <span className="text-xs text-muted-foreground">a</span>
          <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-7 text-xs w-[130px]" />
          {useCustomRange && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setCustomFrom(""); setCustomTo(""); }}>
              <X className="h-3 w-3" /> Quitar
            </Button>
          )}
        </div>
      </div>

      {data.loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs defaultValue="attendance">
          <TabsList className="w-full grid grid-cols-6 text-[10px]">
            <TabsTrigger value="attendance" className="text-[10px]">Asistencia</TabsTrigger>
            <TabsTrigger value="financial" className="text-[10px]">Financiero</TabsTrigger>
            <TabsTrigger value="members" className="text-[10px]">Membresías</TabsTrigger>
            <TabsTrigger value="performance" className="text-[10px]">Deporte</TabsTrigger>
            <TabsTrigger value="shop" className="text-[10px]">Tienda</TabsTrigger>
            <TabsTrigger value="custom" className="text-[10px] gap-1"><Database className="h-3 w-3" />Extractor</TabsTrigger>
          </TabsList>

          {/* ═══ ATTENDANCE TAB ═══ */}
          <TabsContent value="attendance" className="space-y-4 mt-3">
            <FilterBar hasFilters={!!attendanceSearch} onClear={() => setAttendanceSearch("")}>
              <div className="space-y-1">
                <Label className="text-[10px]">Buscar socio</Label>
                <div className="relative">
                  <Search className="h-3 w-3 absolute left-2 top-2 text-muted-foreground" />
                  <Input placeholder="Nombre..." value={attendanceSearch} onChange={e => setAttendanceSearch(e.target.value)} className="h-7 text-xs pl-7 w-[180px]" />
                </div>
              </div>
            </FilterBar>

            <div className="grid grid-cols-3 gap-2">
              <StatCard title="Total Visitas" value={filteredCheckIns.length.toLocaleString()} icon={CalendarDays} />
              <StatCard title="Promedio/día" value={(data.attendanceByDay.length > 0 ? (filteredCheckIns.length / data.attendanceByDay.length).toFixed(1) : "0")} icon={Users} />
              <StatCard title="Socios Activos" value={data.activeMembers.toString()} icon={Activity} />
            </div>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-7" onClick={exportAttendance}>
              <Download className="h-3 w-3" /> Exportar CSV
            </Button>

            <WidgetVisitsDay data={data.attendanceByDay} />
            <div className="grid grid-cols-2 gap-2">
              <WidgetPeakHours data={data.peakHours} />
              <WidgetWeekday data={data.attendanceByWeekday} />
            </div>
            {data.topVisitors.length > 0 && <WidgetTopVisitors data={data.topVisitors} />}
          </TabsContent>

          {/* ═══ FINANCIAL TAB ═══ */}
          <TabsContent value="financial" className="space-y-4 mt-3">
            <FilterBar
              hasFilters={paymentStatus !== "all" || paymentMethod !== "all" || expenseCategory !== "all"}
              onClear={() => { setPaymentStatus("all"); setPaymentMethod("all"); setExpenseCategory("all"); }}
            >
              <div className="space-y-1">
                <Label className="text-[10px]">Estado pago</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="paid">Pagado</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="overdue">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Método pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Categoría gasto</Label>
                <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                  <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {expenseCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </FilterBar>

            <div className="grid grid-cols-3 gap-2">
              <StatCard title="Ingresos" value={formatCurrency(fTotalRevenue)} icon={TrendingUp} />
              <StatCard title="Gastos" value={formatCurrency(fTotalExpenses)} icon={TrendingDown} />
              <StatCard title="Balance" value={formatCurrency(fTotalRevenue - fTotalExpenses)} icon={DollarSign} />
            </div>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-7" onClick={exportFinancial}>
              <Download className="h-3 w-3" /> Exportar CSV
            </Button>

            {fPending > 0 && (
              <div className="p-2.5 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span>Pagos pendientes: <strong>{formatCurrency(fPending)}</strong></span>
              </div>
            )}

            <WidgetRevenueMonth data={data.revenueByMonth} />
            <div className="grid grid-cols-2 gap-2">
              <WidgetExpensesCat data={data.expensesByCategory} />
              <WidgetRevenueMethod data={data.revenueByMethod} />
            </div>
          </TabsContent>

          {/* ═══ MEMBERSHIPS TAB ═══ */}
          <TabsContent value="members" className="space-y-4 mt-3">
            <FilterBar
              hasFilters={memberStatus !== "all" || !!memberSearch}
              onClear={() => { setMemberStatus("all"); setMemberSearch(""); }}
            >
              <div className="space-y-1">
                <Label className="text-[10px]">Estado</Label>
                <Select value={memberStatus} onValueChange={setMemberStatus}>
                  <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                    <SelectItem value="suspended">Suspendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Buscar</Label>
                <div className="relative">
                  <Search className="h-3 w-3 absolute left-2 top-2 text-muted-foreground" />
                  <Input placeholder="Nombre..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} className="h-7 text-xs pl-7 w-[160px]" />
                </div>
              </div>
            </FilterBar>

            <div className="grid grid-cols-3 gap-2">
              <StatCard title="Activos" value={filteredMembers.filter(m => m.status === "active").length.toString()} icon={Users} />
              <StatCard title="Inactivos" value={filteredMembers.filter(m => m.status === "inactive").length.toString()} icon={UserMinus} />
              <StatCard title="Total" value={filteredMembers.length.toString()} icon={UserPlus} />
            </div>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-7" onClick={exportMembers}>
              <Download className="h-3 w-3" /> Exportar CSV
            </Button>

            <WidgetRetention active={data.activeMembers} total={data.members.length} />
            {data.membersByMonth.length > 0 && <WidgetNewMembers data={data.membersByMonth} />}
            {data.subscriptionsByPlan.length > 0 && <WidgetSubsPlan data={data.subscriptionsByPlan} />}
          </TabsContent>

          {/* ═══ PERFORMANCE TAB ═══ */}
          <TabsContent value="performance" className="space-y-4 mt-3">
            <FilterBar
              hasFilters={muscleGroup !== "all" || !!exerciseSearch}
              onClear={() => { setMuscleGroup("all"); setExerciseSearch(""); }}
            >
              <div className="space-y-1">
                <Label className="text-[10px]">Grupo muscular</Label>
                <Select value={muscleGroup} onValueChange={setMuscleGroup}>
                  <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {muscleGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Buscar ejercicio</Label>
                <div className="relative">
                  <Search className="h-3 w-3 absolute left-2 top-2 text-muted-foreground" />
                  <Input placeholder="Ejercicio..." value={exerciseSearch} onChange={e => setExerciseSearch(e.target.value)} className="h-7 text-xs pl-7 w-[160px]" />
                </div>
              </div>
            </FilterBar>

            <div className="grid grid-cols-3 gap-2">
              <StatCard title="Sesiones" value={filteredWorkouts.length.toLocaleString()} icon={Dumbbell} />
              <StatCard title="Vol. Total" value={`${(filteredWorkouts.reduce((s, w) => s + (w.sets || 1) * (w.reps || 1) * (w.weight_kg || 0), 0) / 1000).toFixed(0)}k kg`} icon={Activity} />
              <StatCard title="Ejercicios" value={[...new Set(filteredWorkouts.map(w => w.exercise_name))].length.toString()} icon={Target} />
            </div>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-7" onClick={exportPerformance}>
              <Download className="h-3 w-3" /> Exportar CSV
            </Button>

            {data.workoutsByDay.length > 0 && <WidgetWorkoutsDay data={data.workoutsByDay} />}
            <div className="grid grid-cols-2 gap-2">
              <WidgetTopExercises data={data.topExercises} />
              <WidgetMuscleVol data={data.muscleGroupVolume} />
            </div>
          </TabsContent>

          {/* ═══ SHOP TAB ═══ */}
          <TabsContent value="shop" className="space-y-4 mt-3">
            <FilterBar hasFilters={shopCategory !== "all"} onClear={() => setShopCategory("all")}>
              <div className="space-y-1">
                <Label className="text-[10px]">Categoría</Label>
                <Select value={shopCategory} onValueChange={setShopCategory}>
                  <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {shopCategories.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </FilterBar>

            <div className="grid grid-cols-2 gap-2">
              <StatCard title="Ventas" value={filteredShopSales.length} icon={ShoppingBag} />
              <StatCard title="Ingresos tienda" value={formatCurrency(fShopTotal)} icon={DollarSign} />
            </div>

            {data.shopSalesByProduct.length > 0 && <WidgetShopProducts data={data.shopSalesByProduct} />}
            {data.shopSalesByCategory.length > 0 && <WidgetShopCategories data={data.shopSalesByCategory} />}
            {filteredShopSales.length === 0 && (
              <p className="text-muted-foreground text-xs text-center py-8">Sin ventas de tienda en este período</p>
            )}
          </TabsContent>

          {/* ═══ CUSTOM EXTRACTOR TAB ═══ */}
          <TabsContent value="custom" className="space-y-4 mt-3">
            <CustomReportBuilder
              payments={data.payments}
              expenses={data.expenses}
              checkIns={data.checkIns}
              members={data.members}
              workouts={data.workouts}
              shopSales={data.shopSales}
              subscriptions={data.activeSubscriptions}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ─── Reusable Widget Components ───

function WidgetVisitsDay({ data }: { data: any[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-xs font-display">Visitas por día</CardTitle></CardHeader>
      <CardContent className="px-1 pb-2">
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 8 }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(data.length / 8))} />
            <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function WidgetPeakHours({ data }: { data: any[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Horas pico</CardTitle></CardHeader>
      <CardContent className="px-1 pb-2">
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data}>
            <XAxis dataKey="hour" tick={{ fontSize: 8 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 8 }} axisLine={false} tickLine={false} width={20} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="visitas" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function WidgetWeekday({ data }: { data: any[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-[10px] text-muted-foreground">Por día de semana</CardTitle></CardHeader>
      <CardContent className="px-1 pb-2">
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data}>
            <XAxis dataKey="day" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 8 }} axisLine={false} tickLine={false} width={20} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="visitas" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function WidgetTopVisitors({ data }: { data: { name: string; count: number }[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-xs font-display">Socios más frecuentes</CardTitle></CardHeader>
      <CardContent className="px-3 pb-2 space-y-1.5">
        {data.map((v, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-4">{i + 1}.</span>
              <span className="text-xs truncate">{v.name}</span>
            </div>
            <Badge variant="secondary" className="text-[10px]">{v.count} visitas</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function WidgetRevenueMonth({ data }: { data: any[] }) {
  if (data.length === 0) return null;
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-xs font-display">Ingresos por mes</CardTitle></CardHeader>
      <CardContent className="px-1 pb-2">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={data}>
            <XAxis dataKey="month" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 8 }} axisLine={false} tickLine={false} width={40} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
            <Bar dataKey="ingresos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function WidgetExpensesCat({ data }: { data: { name: string; value: number }[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-[10px] text-muted-foreground">Gastos por categoría</CardTitle></CardHeader>
      <CardContent className="px-1 pb-2">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-0.5 px-2">
          {data.slice(0, 5).map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="truncate">{d.name}</span>
              </div>
              <span className="font-semibold">{formatCurrency(d.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WidgetRevenueMethod({ data }: { data: { name: string; value: number }[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-[10px] text-muted-foreground">Ingresos por método</CardTitle></CardHeader>
      <CardContent className="px-1 pb-2">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-0.5 px-2">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span>{d.name}</span>
              </div>
              <span className="font-semibold">{formatCurrency(d.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WidgetRetention({ active, total }: { active: number; total: number }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-display font-semibold">Tasa de retención</span>
          <Badge variant="default" className="text-xs">{total > 0 ? Math.round((active / total) * 100) : 0}%</Badge>
        </div>
        <div className="h-2 bg-muted rounded-full">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${total > 0 ? (active / total) * 100 : 0}%` }} />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
          <span>{active} activos</span>
          <span>{total} total</span>
        </div>
      </CardContent>
    </Card>
  );
}

function WidgetNewMembers({ data }: { data: any[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-xs font-display">Registros por mes</CardTitle></CardHeader>
      <CardContent className="px-1 pb-2">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data}>
            <XAxis dataKey="month" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 8 }} axisLine={false} tickLine={false} width={25} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="registros" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function WidgetSubsPlan({ data }: { data: { name: string; value: number }[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-xs font-display">Suscripciones por plan</CardTitle></CardHeader>
      <CardContent className="px-1 pb-2">
        <ResponsiveContainer width="100%" height={150}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-0.5 px-2">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span>{d.name}</span>
              </div>
              <span className="font-semibold">{d.value} socios</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WidgetWorkoutsDay({ data }: { data: any[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-xs font-display">Actividad diaria</CardTitle></CardHeader>
      <CardContent className="px-1 pb-2">
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={data}>
            <XAxis dataKey="date" tick={{ fontSize: 8 }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(data.length / 6))} />
            <YAxis tick={{ fontSize: 8 }} axisLine={false} tickLine={false} width={25} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="registros" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function WidgetTopExercises({ data }: { data: { name: string; count: number }[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-[10px] text-muted-foreground">Top Ejercicios</CardTitle></CardHeader>
      <CardContent className="px-3 pb-2 space-y-1">
        {data.map((ex, i) => (
          <div key={ex.name} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-muted-foreground w-3">{i + 1}.</span>
              <span className="text-[10px] truncate max-w-[100px]">{ex.name}</span>
            </div>
            <Badge variant="secondary" className="text-[9px]">{ex.count}x</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function WidgetMuscleVol({ data }: { data: { name: string; value: number }[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-[10px] text-muted-foreground">Vol. por grupo</CardTitle></CardHeader>
      <CardContent className="px-1 pb-2">
        <ResponsiveContainer width="100%" height={Math.max(data.length * 24, 100)}>
          <BarChart data={data} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 8 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={70} />
            <Tooltip formatter={(v: number) => `${v.toLocaleString()} kg`} contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function WidgetShopProducts({ data }: { data: { name: string; count: number; revenue: number }[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-xs font-display">Productos más vendidos</CardTitle></CardHeader>
      <CardContent className="px-3 pb-2 space-y-1.5">
        {data.slice(0, 10).map((p, i) => (
          <div key={p.name} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground w-4">{i + 1}.</span>
              <span className="text-xs truncate">{p.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[9px]">{p.count} uds</Badge>
              <span className="text-xs font-semibold text-primary">{formatCurrency(p.revenue)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function WidgetShopCategories({ data }: { data: { name: string; value: number }[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-xs font-display">Ventas por categoría</CardTitle></CardHeader>
      <CardContent className="px-1 pb-2">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-0.5 px-2">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="capitalize">{d.name}</span>
              </div>
              <span className="font-semibold">{formatCurrency(d.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
