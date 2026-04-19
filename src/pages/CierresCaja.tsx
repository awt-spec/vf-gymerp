import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/hooks/useGym";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Vault, Plus, Loader2, CheckCircle2, TrendingUp, TrendingDown, Minus, Sunrise, Sun, Moon } from "lucide-react";

const SHIFTS = [
  { value: "mañana", label: "Mañana", icon: Sunrise, color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  { value: "tarde", label: "Tarde", icon: Sun, color: "text-orange-600", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  { value: "noche", label: "Noche", icon: Moon, color: "text-indigo-600", bg: "bg-indigo-500/10", border: "border-indigo-500/30" },
];

const MAX_PER_SHIFT = 3;

export default function CierresCaja() {
  const { gymId } = useGym();
  const { user } = useAuth();
  const [registers, setRegisters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedShift, setSelectedShift] = useState<string>("mañana");
  const [form, setForm] = useState({ expected_amount: "", actual_amount: "", notes: "" });

  const fetchRegisters = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    const { data } = await supabase
      .from("cash_registers")
      .select("*")
      .eq("gym_id", gymId)
      .order("created_at", { ascending: false })
      .limit(100);
    setRegisters(data ?? []);
    setLoading(false);
  }, [gymId]);

  useEffect(() => { fetchRegisters(); }, [fetchRegisters]);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayRegisters = useMemo(
    () => registers.filter(r => r.register_date === todayStr),
    [registers, todayStr]
  );

  const shiftCounts = useMemo(() => {
    const counts: Record<string, number> = { mañana: 0, tarde: 0, noche: 0 };
    todayRegisters.forEach(r => {
      counts[r.shift_label] = (counts[r.shift_label] || 0) + 1;
    });
    return counts;
  }, [todayRegisters]);

  const todayDifference = useMemo(
    () => todayRegisters.reduce((sum, r) => sum + Number(r.difference ?? 0), 0),
    [todayRegisters]
  );

  const currentShiftCount = shiftCounts[selectedShift] || 0;
  const canRegister = currentShiftCount < MAX_PER_SHIFT;

  const expected = Number(form.expected_amount) || 0;
  const actual = Number(form.actual_amount) || 0;
  const previewDiff = actual - expected;

  const openDialog = (shift: string) => {
    if ((shiftCounts[shift] || 0) >= MAX_PER_SHIFT) {
      toast({
        title: "Turno completo",
        description: `Ya se registraron ${MAX_PER_SHIFT} cierres en el turno ${shift}`,
        variant: "destructive",
      });
      return;
    }
    setSelectedShift(shift);
    setForm({ expected_amount: "", actual_amount: "", notes: "" });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymId || !canRegister) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("cash_registers").insert({
        gym_id: gymId,
        created_by: user!.id,
        expected_amount: expected,
        actual_amount: actual,
        shift_label: selectedShift,
        shift_number: currentShiftCount + 1,
        notes: form.notes || null,
      });
      if (error) throw error;
      toast({ title: "Cierre registrado ✅", description: `Turno ${selectedShift} · Cierre #${currentShiftCount + 1}` });
      setOpen(false);
      fetchRegisters();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
          <Vault className="h-7 w-7 text-primary" />
          Cierres de Caja
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Registrá entre 1 y {MAX_PER_SHIFT} cierres por turno · Hoy {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
        </p>
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Cierres hoy</p>
            <p className="text-3xl font-display font-bold mt-1">{todayRegisters.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Diferencia neta</p>
            <p className={`text-3xl font-display font-bold mt-1 ${todayDifference > 0 ? "text-emerald-600" : todayDifference < 0 ? "text-destructive" : ""}`}>
              {todayDifference > 0 ? "+" : ""}{formatCurrency(todayDifference, todayRegisters[0]?.currency || "CRC")}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Estado</p>
            <p className="text-sm font-medium mt-2 flex items-center gap-1.5">
              {todayDifference === 0 && todayRegisters.length > 0 ? (
                <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Cuadrado</>
              ) : todayDifference > 0 ? (
                <><TrendingUp className="h-4 w-4 text-emerald-600" /> Sobrante</>
              ) : todayDifference < 0 ? (
                <><TrendingDown className="h-4 w-4 text-destructive" /> Faltante</>
              ) : (
                <><Minus className="h-4 w-4 text-muted-foreground" /> Sin registros</>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Shifts as action cards */}
      <div>
        <h2 className="text-sm font-display font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Turnos de hoy</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SHIFTS.map(s => {
            const count = shiftCounts[s.value] || 0;
            const reached = count >= MAX_PER_SHIFT;
            const Icon = s.icon;
            return (
              <Card key={s.value} className={`border-2 transition-all ${reached ? "border-emerald-500/40 bg-emerald-500/5" : `${s.border} hover:shadow-md`}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 ${s.color}`}>
                      <div className={`p-2 rounded-lg ${s.bg}`}><Icon className="h-5 w-5" /></div>
                      <span className="font-display font-semibold">{s.label}</span>
                    </div>
                    {reached && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-display font-bold">{count}</span>
                    <span className="text-sm text-muted-foreground">/ {MAX_PER_SHIFT} cierres</span>
                  </div>
                  <Button
                    onClick={() => openDialog(s.value)}
                    disabled={reached}
                    size="sm"
                    variant={reached ? "secondary" : "default"}
                    className="w-full"
                  >
                    {reached ? "Turno completo" : <><Plus className="h-4 w-4 mr-1" />Nuevo cierre</>}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {(() => {
                const s = SHIFTS.find(x => x.value === selectedShift);
                const Icon = s?.icon ?? Vault;
                return <><Icon className={`h-5 w-5 ${s?.color}`} /> Cierre · {s?.label}</>;
              })()}
            </DialogTitle>
            <DialogDescription>
              Cierre #{currentShiftCount + 1} de {MAX_PER_SHIFT} en este turno
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">💰 Esperado en caja</Label>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.expected_amount}
                  onChange={e => setForm({ ...form, expected_amount: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">💵 Conteo real</Label>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.actual_amount}
                  onChange={e => setForm({ ...form, actual_amount: e.target.value })}
                  required
                />
              </div>
            </div>

            {(form.expected_amount || form.actual_amount) && (
              <div className={`rounded-lg p-3 border-2 ${previewDiff === 0 ? "border-emerald-500/40 bg-emerald-500/5" : previewDiff > 0 ? "border-amber-500/40 bg-amber-500/5" : "border-destructive/40 bg-destructive/5"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Diferencia</span>
                  <span className={`text-xl font-display font-bold ${previewDiff === 0 ? "text-emerald-600" : previewDiff > 0 ? "text-amber-600" : "text-destructive"}`}>
                    {previewDiff > 0 ? "+" : ""}{formatCurrency(previewDiff, "CRC")}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {previewDiff === 0 ? "✅ Caja cuadrada" : previewDiff > 0 ? "⚠ Sobrante de caja" : "⚠ Faltante de caja"}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Notas (opcional)</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Observaciones del cierre..."
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar cierre"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* History */}
      <div>
        <h2 className="text-sm font-display font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Historial</h2>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : registers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              <Vault className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Aún no hay cierres registrados
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {registers.map(r => {
              const diff = Number(r.difference ?? 0);
              const shift = SHIFTS.find(s => s.value === r.shift_label);
              const Icon = shift?.icon ?? Vault;
              return (
                <Card key={r.id} className="border-border/50 hover:shadow-sm transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${shift?.bg ?? "bg-muted"} ${shift?.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{shift?.label ?? r.shift_label}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">#{r.shift_number ?? 1}</Badge>
                        <span className="text-xs text-muted-foreground">·</span>
                        <p className="text-xs text-muted-foreground">{format(new Date(r.register_date), "d MMM", { locale: es })}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Esperado {formatCurrency(Number(r.expected_amount), r.currency)} · Real {formatCurrency(Number(r.actual_amount), r.currency)}
                      </p>
                    </div>
                    <Badge
                      variant={diff === 0 ? "default" : diff > 0 ? "secondary" : "destructive"}
                      className="text-xs shrink-0 font-mono"
                    >
                      {diff > 0 ? "+" : ""}{formatCurrency(diff, r.currency)}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
