import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/hooks/useGym";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, UserPlus, IdCard, Mail, Phone, KeyRound, CreditCard, ShieldCheck, FileText } from "lucide-react";

type PlanRow = { id: string; name: string; price: number; currency: string; duration_days: number };

export default function SocioNuevo() {
  const { gymId } = useGym();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    cedula: "",
    email: "",
    phone: "",
    date_of_birth: "",
    status: "active" as "active" | "inactive" | "suspended",
    notes: "",
    plan_id: "",
    payment_method: "cash",
    register_payment: true,
  });

  useEffect(() => {
    if (!gymId) return;
    supabase
      .from("plans")
      .select("id, name, price, currency, duration_days")
      .eq("gym_id", gymId)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setPlans((data as PlanRow[]) ?? []));
  }, [gymId]);

  const selectedPlan = plans.find(p => p.id === form.plan_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymId) return;
    if (!form.cedula.trim() || !form.email.trim()) {
      toast({ title: "Faltan datos", description: "Cédula y email son obligatorios", variant: "destructive" });
      return;
    }
    if (!form.plan_id) {
      toast({ title: "Membresía requerida", description: "Todo usuario debe tener una membresía asignada", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-member-auth", {
        body: {
          cedula: form.cedula,
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          gym_id: gymId,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const memberId = (data as any)?.member?.id ?? (data as any)?.member_id;

      // Update extra fields
      if (memberId) {
        await supabase
          .from("members")
          .update({
            status: form.status,
            notes: form.notes || null,
            date_of_birth: form.date_of_birth || null,
          })
          .eq("id", memberId);

        // Create subscription if a plan was selected
        if (selectedPlan) {
          const start = new Date();
          const end = new Date();
          end.setDate(end.getDate() + selectedPlan.duration_days);
          const { data: sub } = await supabase
            .from("subscriptions")
            .insert({
              member_id: memberId,
              plan_id: selectedPlan.id,
              gym_id: gymId,
              start_date: start.toISOString().slice(0, 10),
              end_date: end.toISOString().slice(0, 10),
              status: "active",
            })
            .select()
            .single();

          if (form.register_payment && sub) {
            await supabase.from("payments").insert({
              member_id: memberId,
              subscription_id: sub.id,
              gym_id: gymId,
              amount: selectedPlan.price,
              currency: selectedPlan.currency,
              payment_method: form.payment_method,
              status: "paid",
            });
          }
        }
      }

      toast({ title: "Usuario creado ✅", description: `${form.first_name} ${form.last_name}` });
      navigate("/socios");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link to="/socios"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Nuevo Usuario
          </h1>
          <p className="text-muted-foreground text-sm">Registrá un nuevo miembro del gimnasio</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Información personal */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <IdCard className="h-4 w-4" /> Información personal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required maxLength={50} />
            </div>
            <div className="space-y-1.5">
              <Label>Apellido *</Label>
              <Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required maxLength={50} />
            </div>
            <div className="space-y-1.5">
              <Label>Cédula *</Label>
              <Input value={form.cedula} onChange={e => setForm({ ...form, cedula: e.target.value })} required maxLength={30} placeholder="Será la contraseña inicial" />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de nacimiento</Label>
              <Input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
            </div>
          </div>
        </section>

        {/* Acceso */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Acceso y contacto
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required maxLength={255} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Teléfono</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} maxLength={30} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">El usuario podrá iniciar sesión con su cédula. La contraseña inicial será su misma cédula.</p>
        </section>

        {/* Membresía */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Membresía
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Plan *</Label>
              <Select value={form.plan_id} onValueChange={v => setForm({ ...form, plan_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccioná un plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.currency} {p.price} ({p.duration_days}d)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {plans.length === 0 && (
                <p className="text-xs text-muted-foreground">No hay planes activos. <Link to="/planes" className="text-primary underline">Crear uno</Link></p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Estado inicial</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">✅ Activo</SelectItem>
                  <SelectItem value="inactive">⏸️ Inactivo</SelectItem>
                  <SelectItem value="suspended">🚫 Suspendido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Pago */}
        {selectedPlan && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Pago inicial
            </h2>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.register_payment}
                onChange={e => setForm({ ...form, register_payment: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              Registrar pago de <strong>{selectedPlan.currency} {selectedPlan.price}</strong> ahora
            </label>
            {form.register_payment && (
              <div className="space-y-1.5 max-w-xs">
                <Label>Método de pago</Label>
                <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">💵 Efectivo</SelectItem>
                    <SelectItem value="card">💳 Tarjeta</SelectItem>
                    <SelectItem value="transfer">🏦 Transferencia</SelectItem>
                    <SelectItem value="sinpe">📱 SINPE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </section>
        )}

        {/* Notas */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" /> Notas {form.status === "suspended" && <span className="text-destructive normal-case font-normal">(motivo de suspensión)</span>}
          </h2>
          <Textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder={form.status === "suspended" ? "Motivo de la suspensión..." : "Observaciones internas..."}
            maxLength={500}
            rows={3}
          />
        </section>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={() => navigate("/socios")} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting} className="flex-1 sm:flex-none sm:min-w-[200px]">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Usuario"}
          </Button>
        </div>
      </form>
    </div>
  );
}
