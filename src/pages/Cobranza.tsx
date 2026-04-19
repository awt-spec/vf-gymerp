import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/hooks/useGym";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle, CheckCircle, DollarSign, Search, Send, Clock, Plus, Download, Filter,
} from "lucide-react";
import { format, differenceInDays, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, CURRENCIES } from "@/lib/currency";
import GymAiAssistant from "@/components/GymAiAssistant";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function Cobranza() {
  const { gymId } = useGym();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");

  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Register payment dialog
  const [openPay, setOpenPay] = useState(false);
  const [payForm, setPayForm] = useState({
    member_id: "", amount: "", payment_method: "cash",
    status: "paid" as "paid" | "pending" | "overdue", currency: "CRC",
  });

  const fetchData = async () => {
    if (!gymId) return;
    setLoading(true);
    const [paymentsRes, subsRes, membersRes, plansRes] = await Promise.all([
      supabase.from("payments")
        .select("*, members(first_name, last_name, email, phone), subscriptions(plan_id, plans(name))")
        .eq("gym_id", gymId)
        .order("payment_date", { ascending: false }),
      supabase.from("subscriptions")
        .select("*, members(first_name, last_name, email, phone), plans(name, price, currency)")
        .eq("gym_id", gymId)
        .eq("status", "active")
        .order("end_date"),
      supabase.from("members").select("id, first_name, last_name").eq("gym_id", gymId).eq("status", "active"),
      supabase.from("plans").select("id, name, price, currency").eq("gym_id", gymId).eq("is_active", true),
    ]);
    setPayments(paymentsRes.data ?? []);
    setSubscriptions(subsRes.data ?? []);
    setMembers(membersRes.data ?? []);
    setPlans(plansRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [gymId]);

  // KPIs
  const now = new Date();
  const collectedThisMonth = payments
    .filter(p => p.status === "paid" && isSameMonth(new Date(p.payment_date), now))
    .reduce((s, p) => s + Number(p.amount), 0);
  const pendingTotal = payments
    .filter(p => p.status !== "paid")
    .reduce((s, p) => s + Number(p.amount), 0);
  const overdueTotal = payments
    .filter(p => p.status === "overdue")
    .reduce((s, p) => s + Number(p.amount), 0);
  const totalThisMonth = payments
    .filter(p => isSameMonth(new Date(p.payment_date), now))
    .reduce((s, p) => s + Number(p.amount), 0);
  const morosityPct = totalThisMonth > 0
    ? Math.round((payments.filter(p => p.status === "overdue" && isSameMonth(new Date(p.payment_date), now)).reduce((s, p) => s + Number(p.amount), 0) / totalThisMonth) * 100)
    : 0;

  // Filtered list
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const fullName = `${p.members?.first_name ?? ""} ${p.members?.last_name ?? ""}`.toLowerCase();
      if (search && !fullName.includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (planFilter !== "all" && p.subscriptions?.plan_id !== planFilter) return false;
      if (monthFilter !== "all") {
        const m = new Date(p.payment_date).getMonth();
        if (m !== Number(monthFilter)) return false;
      }
      return true;
    });
  }, [payments, search, statusFilter, planFilter, monthFilter]);

  const expiringSoon = subscriptions.filter(s => {
    const days = differenceInDays(new Date(s.end_date), new Date());
    return days >= 0 && days <= 7;
  });
  const expired = subscriptions.filter(s => differenceInDays(new Date(s.end_date), new Date()) < 0);

  const markAsPaid = async (paymentId: string) => {
    const { error } = await supabase.from("payments").update({ status: "paid" as const }).eq("id", paymentId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Pagado ✅" });
    fetchData();
  };

  const markSelectedPaid = async () => {
    if (selected.size === 0) return;
    const { error } = await supabase.from("payments").update({ status: "paid" as const }).in("id", Array.from(selected));
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${selected.size} pago(s) marcados como pagados` });
    setSelected(new Set());
    fetchData();
  };

  const sendReminder = (member: any) => {
    if (member?.phone) {
      const msg = encodeURIComponent(`Hola ${member.first_name}, te recordamos que tenés un pago pendiente en el gimnasio. ¡Gracias!`);
      window.open(`https://wa.me/${member.phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
    } else if (member?.email) {
      window.open(`mailto:${member.email}?subject=Recordatorio de pago&body=Hola ${member.first_name}, te recordamos que tenés un pago pendiente.`);
    } else {
      toast({ title: "Sin contacto", variant: "destructive" });
    }
  };

  const remindAllSelected = () => {
    const targets = filteredPayments.filter(p => selected.has(p.id));
    targets.forEach(p => sendReminder(p.members));
    toast({ title: `Recordatorios abiertos para ${targets.length} socios` });
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === filteredPayments.length) setSelected(new Set());
    else setSelected(new Set(filteredPayments.map(p => p.id)));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymId) return;
    const { error } = await supabase.from("payments").insert({
      member_id: payForm.member_id,
      amount: Number(payForm.amount),
      payment_method: payForm.payment_method,
      status: payForm.status,
      currency: payForm.currency,
      gym_id: gymId,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Pago registrado ✅" });
    setOpenPay(false);
    setPayForm({ member_id: "", amount: "", payment_method: "cash", status: "paid", currency: "CRC" });
    fetchData();
  };

  const exportCsv = () => {
    const rows = [
      ["Socio", "Monto", "Moneda", "Método", "Fecha", "Estado"],
      ...filteredPayments.map(p => [
        `${p.members?.first_name ?? ""} ${p.members?.last_name ?? ""}`,
        Number(p.amount).toString(),
        p.currency,
        p.payment_method,
        format(new Date(p.payment_date), "yyyy-MM-dd"),
        p.status,
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cobranza-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (s: string) => {
    if (s === "paid") return <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30">Pagado</Badge>;
    if (s === "overdue") return <Badge className="text-[10px] bg-destructive/15 text-destructive border-destructive/30">Vencido</Badge>;
    return <Badge className="text-[10px] bg-warning/15 text-warning border-warning/30">Pendiente</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-3xl font-display font-bold">Cobranza</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Pagos, vencimientos y recordatorios</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
            <Download className="h-4 w-4" /> Exportar
          </Button>
          <Dialog open={openPay} onOpenChange={setOpenPay}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Registrar pago</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Registrar pago</DialogTitle></DialogHeader>
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Socio</Label>
                  <Select value={payForm.member_id} onValueChange={(v) => setPayForm({ ...payForm, member_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {members.map(m => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Plan (opcional)</Label>
                    <Select onValueChange={(v) => {
                      const p = plans.find(x => x.id === v);
                      if (p) setPayForm({ ...payForm, amount: String(p.price), currency: p.currency });
                    }}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Monto</Label>
                    <Input type="number" step="0.01" required value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Moneda</Label>
                    <Select value={payForm.currency} onValueChange={(v) => setPayForm({ ...payForm, currency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Método</Label>
                    <Select value={payForm.payment_method} onValueChange={(v) => setPayForm({ ...payForm, payment_method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="card">Tarjeta</SelectItem>
                        <SelectItem value="transfer">Transferencia</SelectItem>
                        <SelectItem value="sinpe">SINPE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Estado</Label>
                    <Select value={payForm.status} onValueChange={(v: any) => setPayForm({ ...payForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Pagado</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="overdue">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full">Registrar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <StatCard title="Cobrado este mes" value={formatCurrency(collectedThisMonth)} icon={DollarSign} />
        <StatCard title="Por cobrar" value={formatCurrency(pendingTotal)} icon={Clock} />
        <StatCard title="Vencido" value={formatCurrency(overdueTotal)} icon={AlertTriangle} />
        <StatCard title="% morosidad" value={`${morosityPct}%`} icon={AlertTriangle} />
      </div>

      <Tabs defaultValue="payments">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="payments" className="text-xs">Pagos ({filteredPayments.length})</TabsTrigger>
          <TabsTrigger value="expiring" className="text-xs">Por vencer ({expiringSoon.length})</TabsTrigger>
          <TabsTrigger value="expired" className="text-xs">Vencidos ({expired.length})</TabsTrigger>
        </TabsList>

        {/* Payments tab */}
        <TabsContent value="payments" className="space-y-3 mt-3">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar socio..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pagados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="overdue">Vencidos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Plan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos planes</SelectItem>
                {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Mes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos meses</SelectItem>
                {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-xs font-medium">{selected.size} seleccionado(s)</span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={remindAllSelected}>
                  <Send className="h-3 w-3" /> Recordar a todos
                </Button>
                <Button size="sm" className="h-7 text-[10px] gap-1" onClick={markSelectedPaid}>
                  <CheckCircle className="h-3 w-3" /> Marcar pagados
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <p className="text-center text-sm text-muted-foreground py-8">Cargando...</p>
          ) : filteredPayments.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-8 text-center text-sm text-muted-foreground">Sin pagos</CardContent></Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="p-2 w-8">
                        <Checkbox
                          checked={selected.size === filteredPayments.length && filteredPayments.length > 0}
                          onCheckedChange={toggleAll}
                        />
                      </th>
                      <th className="p-2 text-left font-medium">Socio</th>
                      <th className="p-2 text-left font-medium hidden md:table-cell">Plan</th>
                      <th className="p-2 text-right font-medium">Monto</th>
                      <th className="p-2 text-left font-medium hidden sm:table-cell">Fecha</th>
                      <th className="p-2 text-left font-medium">Estado</th>
                      <th className="p-2 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="border-t border-border/50 hover:bg-muted/20">
                        <td className="p-2">
                          <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleOne(p.id)} />
                        </td>
                        <td className="p-2">
                          <p className="font-medium text-xs truncate">{p.members?.first_name} {p.members?.last_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{p.members?.phone || p.members?.email || "—"}</p>
                        </td>
                        <td className="p-2 hidden md:table-cell text-xs text-muted-foreground">
                          {p.subscriptions?.plans?.name ?? "—"}
                        </td>
                        <td className="p-2 text-right font-semibold text-xs">{formatCurrency(Number(p.amount), p.currency)}</td>
                        <td className="p-2 hidden sm:table-cell text-xs text-muted-foreground">
                          {format(new Date(p.payment_date), "dd MMM yy", { locale: es })}
                        </td>
                        <td className="p-2">{statusBadge(p.status)}</td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {p.status !== "paid" && (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => sendReminder(p.members)} title="Recordar">
                                  <Send className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary" onClick={() => markAsPaid(p.id)} title="Marcar pagado">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="expiring" className="space-y-2 mt-3">
          {expiringSoon.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Sin vencimientos próximos 👍</p>
          ) : expiringSoon.map((s) => {
            const daysLeft = differenceInDays(new Date(s.end_date), new Date());
            return (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  daysLeft <= 2 ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"
                }`}>
                  {s.members?.first_name?.[0]}{s.members?.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{s.members?.first_name} {s.members?.last_name}</p>
                  <p className="text-xs text-muted-foreground">{s.plans?.name} · {formatCurrency(Number(s.plans?.price || 0), s.plans?.currency)}</p>
                  <p className="text-[11px] text-muted-foreground">Vence {format(new Date(s.end_date), "dd MMM yyyy", { locale: es })}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Badge className={`text-[10px] ${daysLeft <= 2 ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>
                    {daysLeft === 0 ? "Hoy" : `${daysLeft}d`}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => sendReminder(s.members)} className="h-7 text-[10px] gap-1 px-2">
                    <Send className="h-3 w-3" /> Avisar
                  </Button>
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="expired" className="space-y-2 mt-3">
          {expired.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Sin membresías vencidas</p>
          ) : expired.map((s) => {
            const daysExpired = differenceInDays(new Date(), new Date(s.end_date));
            return (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
                <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold bg-destructive/15 text-destructive">
                  {s.members?.first_name?.[0]}{s.members?.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{s.members?.first_name} {s.members?.last_name}</p>
                  <p className="text-xs text-muted-foreground">{s.plans?.name}</p>
                  <p className="text-[11px] text-muted-foreground">Venció {format(new Date(s.end_date), "dd MMM yyyy", { locale: es })}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Badge className="text-[10px] bg-destructive/20 text-destructive">-{daysExpired}d</Badge>
                  <Button size="sm" variant="outline" onClick={() => sendReminder(s.members)} className="h-7 text-[10px] gap-1 px-2">
                    <Send className="h-3 w-3" /> Contactar
                  </Button>
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
      <GymAiAssistant
        module="cobranza"
        moduleLabel="Cobranza"
        context={{
          total_payments: payments.length,
          paid: payments.filter((p: any) => p.status === "paid").length,
          pending: payments.filter((p: any) => p.status === "pending").length,
          overdue: payments.filter((p: any) => p.status === "overdue").length,
          total_revenue: payments.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount || 0), 0),
          pending_amount: payments.filter((p: any) => p.status !== "paid").reduce((s: number, p: any) => s + Number(p.amount || 0), 0),
          subscriptions: subscriptions.length,
        }}
      />
    </div>
  );
}
