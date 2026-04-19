import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, TrendingDown, DollarSign, Users, Target, Receipt,
  AlertTriangle, Vault, BarChart3, PieChart, Building2, Calculator,
  Plus, ArrowUpDown, Landmark, FileText
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { CURRENCIES } from "@/lib/currency";
import { format, differenceInMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ExpenseForm } from "./ExpenseForm";
import { AccountingSummary } from "@/hooks/useAccounting";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

const PAYMENT_METHODS: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia" };
const INCOME_LABELS: Record<string, string> = {
  membership: "Membresías", personal_training: "E. Personal",
  classes: "Clases", products: "Productos", other: "Otros",
};
const ASSET_CATEGORIES = ["Equipamiento Cardio", "Equipamiento Fuerza", "Mobiliario", "Tecnología", "Mejoras Locativas", "Otro"];

interface Props {
  summary: AccountingSummary;
  monthExpenses: any[];
  monthPayments: any[];
  cashRegisters: any[];
  budgets: any[];
  fixedAssets: any[];
  expenses: any[];
  payments: any[];
  refetch: () => void;
  selectedDate: Date;
}

function calcDepreciation(asset: any): { monthly: number; accumulated: number; bookValue: number } {
  const cost = Number(asset.original_cost);
  const salvage = Number(asset.salvage_value);
  const lifeMonths = Number(asset.useful_life_years) * 12;
  const monthly = lifeMonths > 0 ? (cost - salvage) / lifeMonths : 0;
  const monthsElapsed = Math.max(0, differenceInMonths(new Date(), new Date(asset.purchase_date)));
  const accumulated = Math.min(monthly * monthsElapsed, cost - salvage);
  return { monthly, accumulated, bookValue: cost - accumulated };
}

export function Level1Expert({ summary, monthExpenses, monthPayments, cashRegisters, budgets, fixedAssets, expenses, payments, refetch, selectedDate }: Props) {
  const [assetOpen, setAssetOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [assetForm, setAssetForm] = useState({ name: "", category: "Equipamiento Fuerza", purchase_date: "", original_cost: "", useful_life_years: "10", salvage_value: "0", currency: "CRC" });
  const [budgetForm, setBudgetForm] = useState({ category: "", budget_type: "expense", budgeted_amount: "", currency: "CRC" });

  const currentMonth = selectedDate.getMonth() + 1;
  const currentYear = selectedDate.getFullYear();

  const handleAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("fixed_assets").insert({
      name: assetForm.name, category: assetForm.category, purchase_date: assetForm.purchase_date,
      original_cost: Number(assetForm.original_cost), useful_life_years: Number(assetForm.useful_life_years),
      salvage_value: Number(assetForm.salvage_value), currency: assetForm.currency,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Activo registrado ✅" });
    setAssetOpen(false);
    refetch();
  };

  const handleBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("budgets").insert({
      month: currentMonth, year: currentYear, category: budgetForm.category,
      budget_type: budgetForm.budget_type, budgeted_amount: Number(budgetForm.budgeted_amount),
      currency: budgetForm.currency,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Presupuesto agregado ✅" });
    setBudgetOpen(false);
    setBudgetForm({ category: "", budget_type: "expense", budgeted_amount: "", currency: "CRC" });
    refetch();
  };

  // KPIs
  const fixedCategories = ["Alquiler", "Sueldos", "Seguros", "CCSS", "Servicios"];
  const fixedCosts = monthExpenses.filter(e => fixedCategories.includes(e.category)).reduce((s, e) => s + Number(e.amount), 0);
  const variableCosts = summary.totalExpenses - fixedCosts;
  const avgMembershipPrice = summary.memberCount > 0 ? summary.totalRevenue / summary.memberCount : 0;
  const breakEvenMembers = avgMembershipPrice > 0 ? Math.ceil(fixedCosts / avgMembershipPrice) : 0;
  const netIva = summary.ivaCollected - summary.ivaPaid;
  const ebitda = summary.balance; // Simplified
  const ebitdaMargin = summary.totalRevenue > 0 ? (ebitda / summary.totalRevenue * 100) : 0;
  const fixedCostRatio = summary.totalRevenue > 0 ? (fixedCosts / summary.totalRevenue * 100) : 0;

  // Depreciation totals
  const totalDepreciationMonthly = fixedAssets.filter(a => a.is_active).reduce((s, a) => s + calcDepreciation(a).monthly, 0);
  const totalBookValue = fixedAssets.filter(a => a.is_active).reduce((s, a) => s + calcDepreciation(a).bookValue, 0);

  // Budget variance
  const monthBudgets = budgets.filter(b => b.month === currentMonth && b.year === currentYear);
  const budgetVariance = monthBudgets.map(b => {
    const actual = b.budget_type === "expense"
      ? monthExpenses.filter(e => e.category === b.category).reduce((s, e) => s + Number(e.amount), 0)
      : monthPayments.filter(p => p.status === "paid" && (p.income_category || "membership") === b.category).reduce((s, p) => s + Number(p.amount), 0);
    return { ...b, actual, variance: actual - Number(b.budgeted_amount), pct: Number(b.budgeted_amount) > 0 ? ((actual / Number(b.budgeted_amount)) * 100) : 0 };
  });

  // Monthly trend
  const trendData = summary.monthlyRevenue.map((r, i) => ({
    month: r.month, ingresos: r.amount, gastos: summary.monthlyExpenses[i]?.amount || 0,
    balance: r.amount - (summary.monthlyExpenses[i]?.amount || 0),
  }));

  // Revenue by category data
  const revCategoryData = Object.entries(summary.revenueByCategory).map(([cat, amt]) => ({ name: INCOME_LABELS[cat] || cat, value: amt })).sort((a, b) => b.value - a.value);
  const expCategoryData = Object.entries(summary.expensesByCategory).map(([cat, amt]) => ({ name: cat, value: amt })).sort((a, b) => b.value - a.value);

  // Income statement
  const incomeStatement = {
    revenue: summary.totalRevenue,
    costOfSales: 0, // Could be refined
    grossProfit: summary.totalRevenue,
    opExpenses: summary.totalExpenses,
    depreciation: totalDepreciationMonthly,
    ebitda: summary.balance + totalDepreciationMonthly,
    netIncome: summary.balance - totalDepreciationMonthly,
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="dashboard">
        <TabsList className="w-full grid grid-cols-4 text-[10px]">
          <TabsTrigger value="dashboard" className="text-[10px]">Dashboard</TabsTrigger>
          <TabsTrigger value="statements" className="text-[10px]">Estados</TabsTrigger>
          <TabsTrigger value="assets" className="text-[10px]">Activos</TabsTrigger>
          <TabsTrigger value="budget" className="text-[10px]">Presupuesto</TabsTrigger>
        </TabsList>

        {/* DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-3 mt-3">
          <div className="grid grid-cols-3 gap-2">
            <StatCard title="Ingresos" value={formatCurrency(summary.totalRevenue)} icon={TrendingUp} />
            <StatCard title="Gastos" value={formatCurrency(summary.totalExpenses)} icon={TrendingDown} />
            <StatCard title="Balance" value={formatCurrency(summary.balance)} icon={DollarSign} />
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: "ARPM", value: formatCurrency(summary.arpm) },
              { label: "Equilibrio", value: `${breakEvenMembers}` },
              { label: "Margen", value: `${ebitdaMargin.toFixed(1)}%` },
              { label: "C.Fijos", value: `${fixedCostRatio.toFixed(0)}%` },
            ].map(kpi => (
              <Card key={kpi.label} className="border-border/50">
                <CardContent className="p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">{kpi.label}</p>
                  <p className="text-sm font-bold font-display">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {summary.pendingCount > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/30 text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              <p className="text-[10px]"><strong>{summary.pendingCount}</strong> pendientes: {formatCurrency(summary.pendingPayments)}</p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <ExpenseForm onCreated={refetch} showIva />
          </div>

          <Card className="border-border/50">
            <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-xs font-display flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Tendencia 6M</CardTitle></CardHeader>
            <CardContent className="px-1 pb-2">
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={trendData}>
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8 }} axisLine={false} tickLine={false} width={35} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 10, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="ingresos" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="gastos" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="balance" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category cards */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="border-border/50">
              <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-[10px] text-muted-foreground">Ingresos por línea</CardTitle></CardHeader>
              <CardContent className="px-3 pb-2 space-y-1">
                {revCategoryData.map(d => {
                  const pct = summary.totalRevenue > 0 ? (d.value / summary.totalRevenue * 100) : 0;
                  return (
                    <div key={d.name}>
                      <div className="flex justify-between text-[10px]"><span className="truncate">{d.name}</span><span className="font-semibold text-primary">{pct.toFixed(0)}%</span></div>
                      <div className="h-1 bg-muted rounded-full mt-0.5"><div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-[10px] text-muted-foreground">Gastos por tipo</CardTitle></CardHeader>
              <CardContent className="px-3 pb-2 space-y-1">
                {expCategoryData.map(d => {
                  const pct = summary.totalExpenses > 0 ? (d.value / summary.totalExpenses * 100) : 0;
                  return (
                    <div key={d.name}>
                      <div className="flex justify-between text-[10px]"><span className="truncate">{d.name}</span><span className="font-semibold text-destructive">{pct.toFixed(0)}%</span></div>
                      <div className="h-1 bg-muted rounded-full mt-0.5"><div className="h-full bg-destructive rounded-full" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* IVA */}
          <Card className="border-border/50">
            <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-xs font-display">IVA</CardTitle></CardHeader>
            <CardContent className="px-3 pb-2 grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[9px] text-muted-foreground">Cobrado</p><p className="text-sm font-semibold text-primary">{formatCurrency(summary.ivaCollected)}</p></div>
              <div><p className="text-[9px] text-muted-foreground">Crédito fiscal</p><p className="text-sm font-semibold">{formatCurrency(summary.ivaPaid)}</p></div>
              <div><p className="text-[9px] text-muted-foreground">Por pagar</p><p className={`text-sm font-semibold ${netIva > 0 ? "text-destructive" : "text-primary"}`}>{formatCurrency(netIva)}</p></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STATEMENTS TAB */}
        <TabsContent value="statements" className="space-y-3 mt-3">
          <Card className="border-border/50">
            <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-xs font-display flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />Estado de Resultados</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3 space-y-1.5">
              {[
                { label: "Ingresos operativos", value: incomeStatement.revenue, bold: true },
                ...revCategoryData.map(d => ({ label: `  ${d.name}`, value: d.value, bold: false })),
                { label: "(-) Gastos operativos", value: -incomeStatement.opExpenses, bold: true },
                ...expCategoryData.map(d => ({ label: `  ${d.name}`, value: -d.value, bold: false })),
                { label: "(-) Depreciación", value: -incomeStatement.depreciation, bold: false },
                { label: "EBITDA", value: incomeStatement.ebitda, bold: true, highlight: true },
                { label: "Resultado neto", value: incomeStatement.netIncome, bold: true, highlight: true },
              ].map((row, i) => (
                <div key={i} className={`flex justify-between text-xs ${row.bold ? "font-semibold" : "text-muted-foreground"} ${(row as any).highlight ? "border-t border-border pt-1" : ""}`}>
                  <span>{row.label}</span>
                  <span className={row.value >= 0 ? "text-primary" : "text-destructive"}>
                    {row.value >= 0 ? "" : "-"}{formatCurrency(Math.abs(row.value))}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Balance sheet simplified */}
          <Card className="border-border/50">
            <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-xs font-display flex items-center gap-1.5"><Landmark className="h-3.5 w-3.5" />Balance Simplificado</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground mb-1">ACTIVOS</p>
                <div className="flex justify-between text-xs"><span>Activos fijos (valor en libros)</span><span className="font-semibold">{formatCurrency(totalBookValue)}</span></div>
                <div className="flex justify-between text-xs"><span>Depreciación acumulada</span><span className="text-destructive">-{formatCurrency(fixedAssets.filter(a => a.is_active).reduce((s, a) => s + calcDepreciation(a).accumulated, 0))}</span></div>
              </div>
              <div className="border-t border-border pt-1">
                <p className="text-[10px] font-semibold text-muted-foreground mb-1">PASIVOS</p>
                <div className="flex justify-between text-xs"><span>IVA por pagar</span><span>{formatCurrency(Math.max(0, netIva))}</span></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ASSETS TAB */}
        <TabsContent value="assets" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Depreciación mensual total</p>
              <p className="text-lg font-bold font-display text-destructive">-{formatCurrency(totalDepreciationMonthly)}</p>
            </div>
            <Dialog open={assetOpen} onOpenChange={setAssetOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Activo</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Registrar Activo Fijo</DialogTitle></DialogHeader>
                <form onSubmit={handleAsset} className="space-y-3">
                  <div className="space-y-1.5"><Label>Nombre</Label><Input value={assetForm.name} onChange={e => setAssetForm({ ...assetForm, name: e.target.value })} required /></div>
                  <div className="space-y-1.5">
                    <Label>Categoría</Label>
                    <Select value={assetForm.category} onValueChange={v => setAssetForm({ ...assetForm, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ASSET_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5"><Label className="text-xs">Fecha compra</Label><Input type="date" value={assetForm.purchase_date} onChange={e => setAssetForm({ ...assetForm, purchase_date: e.target.value })} required /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Costo</Label><Input type="number" value={assetForm.original_cost} onChange={e => setAssetForm({ ...assetForm, original_cost: e.target.value })} required /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5"><Label className="text-xs">Vida útil (años)</Label><Input type="number" value={assetForm.useful_life_years} onChange={e => setAssetForm({ ...assetForm, useful_life_years: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Valor rescate</Label><Input type="number" value={assetForm.salvage_value} onChange={e => setAssetForm({ ...assetForm, salvage_value: e.target.value })} /></div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Moneda</Label>
                      <Select value={assetForm.currency} onValueChange={v => setAssetForm({ ...assetForm, currency: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.symbol}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full">Registrar</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {fixedAssets.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">No hay activos registrados</p> : (
            <div className="space-y-2">
              {fixedAssets.map(asset => {
                const dep = calcDepreciation(asset);
                const pctUsed = Number(asset.original_cost) > 0 ? (dep.accumulated / (Number(asset.original_cost) - Number(asset.salvage_value))) * 100 : 0;
                return (
                  <Card key={asset.id} className="border-border/50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xs font-semibold truncate">{asset.name}</h3>
                        <Badge variant="secondary" className="text-[9px]">{asset.category}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center mt-2">
                        <div><p className="text-[9px] text-muted-foreground">Costo</p><p className="text-[11px] font-semibold">{formatCurrency(Number(asset.original_cost), asset.currency)}</p></div>
                        <div><p className="text-[9px] text-muted-foreground">Dep. Acum.</p><p className="text-[11px] font-semibold text-destructive">{formatCurrency(dep.accumulated, asset.currency)}</p></div>
                        <div><p className="text-[9px] text-muted-foreground">V. Libros</p><p className="text-[11px] font-semibold text-primary">{formatCurrency(dep.bookValue, asset.currency)}</p></div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full mt-2">
                        <div className="h-full bg-destructive/60 rounded-full transition-all" style={{ width: `${Math.min(pctUsed, 100)}%` }} />
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1">Dep. mensual: {formatCurrency(dep.monthly, asset.currency)} · {pctUsed.toFixed(0)}% depreciado</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* BUDGET TAB */}
        <TabsContent value="budget" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Presupuesto vs Real</p>
            <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Partida</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Agregar Partida Presupuestaria</DialogTitle></DialogHeader>
                <form onSubmit={handleBudget} className="space-y-3">
                  <div className="space-y-1.5"><Label>Categoría</Label><Input value={budgetForm.category} onChange={e => setBudgetForm({ ...budgetForm, category: e.target.value })} required placeholder="Ej: Alquiler, Membresías..." /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={budgetForm.budget_type} onValueChange={v => setBudgetForm({ ...budgetForm, budget_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Ingreso</SelectItem>
                          <SelectItem value="expense">Gasto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Monto</Label><Input type="number" step="0.01" value={budgetForm.budgeted_amount} onChange={e => setBudgetForm({ ...budgetForm, budgeted_amount: e.target.value })} required /></div>
                  </div>
                  <Button type="submit" className="w-full">Agregar</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {budgetVariance.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No hay presupuesto para este mes. Agregá partidas para comenzar.</p>
          ) : (
            <div className="space-y-2">
              {budgetVariance.map((b, i) => {
                const isOver = b.budget_type === "expense" ? b.variance > 0 : b.variance < 0;
                return (
                  <Card key={i} className="border-border/50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{b.category}</span>
                        <Badge variant={b.budget_type === "income" ? "default" : "secondary"} className="text-[9px]">
                          {b.budget_type === "income" ? "Ingreso" : "Gasto"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center mt-1">
                        <div><p className="text-[9px] text-muted-foreground">Presup.</p><p className="text-[11px] font-semibold">{formatCurrency(Number(b.budgeted_amount))}</p></div>
                        <div><p className="text-[9px] text-muted-foreground">Real</p><p className="text-[11px] font-semibold">{formatCurrency(b.actual)}</p></div>
                        <div>
                          <p className="text-[9px] text-muted-foreground">Varianza</p>
                          <p className={`text-[11px] font-semibold ${isOver ? "text-destructive" : "text-primary"}`}>
                            {b.variance >= 0 ? "+" : ""}{formatCurrency(b.variance)}
                          </p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full mt-2">
                        <div className={`h-full rounded-full transition-all ${isOver ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(b.pct, 100)}%` }} />
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-1">{b.pct.toFixed(0)}% del presupuesto</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
