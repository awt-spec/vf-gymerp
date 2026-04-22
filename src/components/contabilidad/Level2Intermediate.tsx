import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Receipt, AlertTriangle, Vault, PieChart, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ExpenseForm } from "./ExpenseForm";
import { AccountingSummary } from "@/hooks/useAccounting";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const PAYMENT_METHODS: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia" };
const INCOME_LABELS: Record<string, string> = {
  membership: "Membresías", personal_training: "Entrenamiento Personal",
  classes: "Clases", products: "Productos", other: "Otros",
};

interface Props {
  summary: AccountingSummary;
  monthExpenses: any[];
  monthPayments: any[];
  monthShopSales?: any[];
  cashRegisters: any[];
  plans?: any[];
  refetch: () => void;
}

export function Level2Intermediate({ summary, monthExpenses, monthPayments, monthShopSales = [], cashRegisters, refetch }: Props) {
  const [arqueoOpen, setArqueoOpen] = useState(false);
  const [arqueo, setArqueo] = useState({ expected_amount: "", actual_amount: "", notes: "" });

  const handleArqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const gymId = typeof window !== "undefined" ? localStorage.getItem("current_gym_id") : null;
    const { error } = await supabase.from("cash_registers").insert({
      expected_amount: Number(arqueo.expected_amount),
      actual_amount: Number(arqueo.actual_amount),
      notes: arqueo.notes || null,
      created_by: user?.id!,
      gym_id: gymId,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Arqueo registrado ✅" });
    setArqueoOpen(false);
    setArqueo({ expected_amount: "", actual_amount: "", notes: "" });
    refetch();
  };

  // Break-even calculation (fixed costs / avg membership price)
  const fixedCategories = ["Alquiler", "Sueldos", "Seguros", "CCSS", "Servicios"];
  const fixedCosts = monthExpenses.filter(e => fixedCategories.includes(e.category)).reduce((s, e) => s + Number(e.amount), 0);
  const avgMembershipPrice = summary.memberCount > 0 ? summary.totalRevenue / summary.memberCount : 0;
  const breakEvenMembers = avgMembershipPrice > 0 ? Math.ceil(fixedCosts / avgMembershipPrice) : 0;

  // Expense category chart
  const expCategoryData = Object.entries(summary.expensesByCategory).map(([cat, amt]) => ({ name: cat, value: amt })).sort((a, b) => b.value - a.value);
  const revCategoryData = Object.entries(summary.revenueByCategory).map(([cat, amt]) => ({ name: INCOME_LABELS[cat] || cat, value: amt })).sort((a, b) => b.value - a.value);

  // Monthly trend combined
  const trendData = summary.monthlyRevenue.map((r, i) => ({
    month: r.month,
    ingresos: r.amount,
    gastos: summary.monthlyExpenses[i]?.amount || 0,
  }));

  const netIva = summary.ivaCollected - summary.ivaPaid;

  return (
    <div className="space-y-4">
      {/* Stats row 1 */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard title="Ingresos" value={formatCurrency(summary.totalRevenue)} icon={TrendingUp} />
        <StatCard title="Gastos" value={formatCurrency(summary.totalExpenses)} icon={TrendingDown} />
        <StatCard title="Balance" value={formatCurrency(summary.balance)} icon={DollarSign} />
      </div>

      {/* Stats row 2 */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard title="ARPM" value={formatCurrency(summary.arpm)} icon={Users} />
        <StatCard title="Pto. Equilibrio" value={`${breakEvenMembers} socios`} icon={Target} />
        <StatCard title="IVA Neto" value={formatCurrency(netIva)} icon={Receipt} />
      </div>

      {/* Pending alert */}
      {summary.pendingCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-xs"><strong>{summary.pendingCount}</strong> pagos pendientes por {formatCurrency(summary.pendingPayments)}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <ExpenseForm onCreated={refetch} showIva />
        <Dialog open={arqueoOpen} onOpenChange={setArqueoOpen}>
          <DialogTrigger asChild><Button size="sm" variant="outline"><Vault className="mr-1 h-4 w-4" />Arqueo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Arqueo de Caja</DialogTitle></DialogHeader>
            <form onSubmit={handleArqueo} className="space-y-3">
              <div className="space-y-1.5"><Label>Monto esperado</Label><Input type="number" step="0.01" value={arqueo.expected_amount} onChange={e => setArqueo({ ...arqueo, expected_amount: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>Monto real en caja</Label><Input type="number" step="0.01" value={arqueo.actual_amount} onChange={e => setArqueo({ ...arqueo, actual_amount: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>Notas</Label><Textarea value={arqueo.notes} onChange={e => setArqueo({ ...arqueo, notes: e.target.value })} rows={2} /></div>
              <Button type="submit" className="w-full">Registrar Arqueo</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Monthly trend chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-xs font-display flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Tendencia Mensual</CardTitle>
        </CardHeader>
        <CardContent className="px-1 pb-2">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={trendData} barGap={2}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={40} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="ingresos" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="gastos" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category breakdowns side by side */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="border-border/50">
          <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-[10px] font-display text-muted-foreground">Ingresos por tipo</CardTitle></CardHeader>
          <CardContent className="px-3 pb-2 space-y-1">
            {revCategoryData.length === 0 ? <p className="text-[10px] text-muted-foreground">Sin datos</p> :
              revCategoryData.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <span className="text-[10px] truncate flex-1">{d.name}</span>
                  <span className="text-[10px] font-semibold text-primary">{formatCurrency(d.value)}</span>
                </div>
              ))
            }
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-[10px] font-display text-muted-foreground">Gastos por tipo</CardTitle></CardHeader>
          <CardContent className="px-3 pb-2 space-y-1">
            {expCategoryData.length === 0 ? <p className="text-[10px] text-muted-foreground">Sin datos</p> :
              expCategoryData.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <span className="text-[10px] truncate flex-1">{d.name}</span>
                  <span className="text-[10px] font-semibold text-destructive">{formatCurrency(d.value)}</span>
                </div>
              ))
            }
          </CardContent>
        </Card>
      </div>

      {/* IVA Summary */}
      <Card className="border-border/50">
        <CardHeader className="pb-1 pt-2 px-3"><CardTitle className="text-xs font-display">Control IVA</CardTitle></CardHeader>
        <CardContent className="px-3 pb-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground">Cobrado</p>
              <p className="text-sm font-semibold text-primary">{formatCurrency(summary.ivaCollected)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Pagado (crédito)</p>
              <p className="text-sm font-semibold">{formatCurrency(summary.ivaPaid)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Por pagar</p>
              <p className={`text-sm font-semibold ${netIva > 0 ? "text-destructive" : "text-primary"}`}>{formatCurrency(netIva)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <div className="space-y-2">
        <h2 className="text-sm font-display font-semibold text-muted-foreground">Movimientos del mes</h2>
        <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
          {[
            ...monthPayments.filter(p => p.status === "paid").map(p => ({ ...p, _type: "income", _label: `${p.members?.first_name ?? ""} ${p.members?.last_name ?? ""}`.trim() || "Pago", _date: p.payment_date, _amount: Number(p.amount) })),
            ...monthShopSales.map(s => ({ ...s, _type: "income", _label: `🛒 ${s.shop_products?.name || "Venta tienda"}`, _date: s.sale_date, _amount: Number(s.total_amount) })),
            ...monthExpenses.map(e => ({ ...e, _type: "expense", _label: e.description, _date: e.expense_date, _amount: Number(e.amount) }))
          ].sort((a, b) => b._date.localeCompare(a._date)).map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border/50">
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate">{item._label}</p>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(item._date), "dd MMM", { locale: es })} · {PAYMENT_METHODS[item.payment_method] || item.payment_method}
                </span>
              </div>
              <span className={`font-semibold text-sm ${item._type === "income" ? "text-primary" : "text-destructive"}`}>
                {item._type === "income" ? "+" : "-"}{formatCurrency(item._amount, item.currency)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Cash register history */}
      {cashRegisters.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-display font-semibold text-muted-foreground flex items-center gap-1.5"><Vault className="h-4 w-4" />Arqueos</h2>
          <div className="space-y-1.5">
            {cashRegisters.slice(0, 5).map(cr => (
              <div key={cr.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border/50">
                <div>
                  <p className="text-xs">{format(new Date(cr.register_date), "dd MMM yyyy", { locale: es })}</p>
                  <p className="text-[10px] text-muted-foreground">Esperado: {formatCurrency(Number(cr.expected_amount))}</p>
                </div>
                <Badge variant={Number(cr.difference) === 0 ? "default" : "destructive"} className="text-[10px]">
                  {Number(cr.difference) >= 0 ? "+" : ""}{formatCurrency(Number(cr.difference))}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
