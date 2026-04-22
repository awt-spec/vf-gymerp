import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, DollarSign, Receipt, AlertTriangle, Vault } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ExpenseForm } from "./ExpenseForm";
import { AccountingSummary } from "@/hooks/useAccounting";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

const PAYMENT_METHODS: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia" };

interface Props {
  summary: AccountingSummary;
  monthExpenses: any[];
  monthPayments: any[];
  monthShopSales?: any[];
  cashRegisters: any[];
  refetch: () => void;
}

export function Level3Basic({ summary, monthExpenses, monthPayments, monthShopSales = [], cashRegisters, refetch }: Props) {
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

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard title="Ingresos" value={formatCurrency(summary.totalRevenue)} icon={TrendingUp} />
        <StatCard title="Gastos" value={formatCurrency(summary.totalExpenses)} icon={TrendingDown} />
        <StatCard title="Balance" value={formatCurrency(summary.balance)} icon={DollarSign} />
      </div>

      {/* Pending alert */}
      {summary.pendingCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-xs">
            <strong>{summary.pendingCount}</strong> pagos pendientes por {formatCurrency(summary.pendingPayments)}
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2">
        <ExpenseForm onCreated={refetch} />
        <Dialog open={arqueoOpen} onOpenChange={setArqueoOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Vault className="mr-1 h-4 w-4" />Arqueo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Arqueo de Caja</DialogTitle></DialogHeader>
            <form onSubmit={handleArqueo} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Monto esperado</Label>
                <Input type="number" step="0.01" value={arqueo.expected_amount} onChange={e => setArqueo({ ...arqueo, expected_amount: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Monto real en caja</Label>
                <Input type="number" step="0.01" value={arqueo.actual_amount} onChange={e => setArqueo({ ...arqueo, actual_amount: e.target.value })} required />
              </div>
              <div className="space-y-1.5"><Label>Notas</Label><Textarea value={arqueo.notes} onChange={e => setArqueo({ ...arqueo, notes: e.target.value })} rows={2} /></div>
              <Button type="submit" className="w-full">Registrar Arqueo</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Recent income */}
      <div className="space-y-2">
        <h2 className="text-sm font-display font-semibold text-muted-foreground flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4" />Ingresos del mes ({monthPayments.filter(p => p.status === "paid").length})
        </h2>
        {monthPayments.filter(p => p.status === "paid").length === 0 ? (
          <p className="text-muted-foreground text-xs text-center py-4">Sin ingresos este mes</p>
        ) : (
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {monthPayments.filter(p => p.status === "paid").map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-card border border-border/50">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{p.members?.first_name} {p.members?.last_name}</p>
                  <span className="text-[10px] text-muted-foreground">{PAYMENT_METHODS[p.payment_method]} · {format(new Date(p.payment_date), "dd MMM", { locale: es })}</span>
                </div>
                <span className="text-primary font-semibold text-sm">+{formatCurrency(Number(p.amount), p.currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expenses */}
      <div className="space-y-2">
        <h2 className="text-sm font-display font-semibold text-muted-foreground flex items-center gap-1.5">
          <Receipt className="h-4 w-4" />Gastos del mes ({monthExpenses.length})
        </h2>
        {monthExpenses.length === 0 ? (
          <p className="text-muted-foreground text-xs text-center py-4">Sin gastos este mes</p>
        ) : (
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {monthExpenses.map(exp => (
              <div key={exp.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-card border border-border/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[9px] shrink-0">{exp.category}</Badge>
                    <span className="text-xs truncate">{exp.description}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{PAYMENT_METHODS[exp.payment_method]} · {format(new Date(exp.expense_date), "dd MMM", { locale: es })}</span>
                </div>
                <span className="text-destructive font-semibold text-sm">-{formatCurrency(Number(exp.amount), exp.currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cash register history */}
      {cashRegisters.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-display font-semibold text-muted-foreground flex items-center gap-1.5">
            <Vault className="h-4 w-4" />Últimos Arqueos
          </h2>
          <div className="space-y-1.5">
            {cashRegisters.slice(0, 5).map(cr => (
              <div key={cr.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-card border border-border/50">
                <div>
                  <p className="text-xs font-medium">{format(new Date(cr.register_date), "dd MMM yyyy", { locale: es })}</p>
                  <p className="text-[10px] text-muted-foreground">Esperado: {formatCurrency(Number(cr.expected_amount))} · Real: {formatCurrency(Number(cr.actual_amount))}</p>
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
