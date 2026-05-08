import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Plus, X, Check, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS: Record<string, { label: string; cls: string; Icon: any }> = {
  pending:   { label: "Pendiente",  cls: "bg-amber-500/20 text-amber-400 border-amber-500/30", Icon: Clock },
  confirmed: { label: "Confirmada", cls: "bg-primary/20 text-primary border-primary/30", Icon: CheckCircle2 },
  completed: { label: "Completada", cls: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", Icon: Check },
  cancelled: { label: "Cancelada",  cls: "bg-destructive/20 text-destructive border-destructive/30", Icon: XCircle },
};

export default function AppointmentsPanel({ memberId, gymId }: { memberId: string; gymId: string | null }) {
  const [list, setList] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    scheduled_date: "",
    scheduled_time: "10:00",
    duration_minutes: "60",
    appointment_type: "general",
    notes: "",
  });

  const refresh = async () => {
    const { data } = await supabase
      .from("coach_appointments")
      .select("*")
      .eq("member_id", memberId)
      .order("scheduled_at", { ascending: false });
    setList(data || []);
  };

  useEffect(() => { refresh(); }, [memberId]);

  const save = async () => {
    if (!form.scheduled_date) { toast({ title: "Falta la fecha", variant: "destructive" }); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const scheduled_at = new Date(`${form.scheduled_date}T${form.scheduled_time}:00`).toISOString();
    const { error } = await supabase.from("coach_appointments").insert({
      member_id: memberId,
      gym_id: gymId,
      coach_id: user.id,
      scheduled_at,
      duration_minutes: parseInt(form.duration_minutes) || 60,
      appointment_type: form.appointment_type,
      notes: form.notes || null,
      status: "pending",
    });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Cita creada" });
    setShowForm(false);
    setForm({ scheduled_date: "", scheduled_time: "10:00", duration_minutes: "60", appointment_type: "general", notes: "" });
    refresh();
  };

  const setStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "confirmed") patch.confirmed_at = new Date().toISOString();
    const { error } = await supabase.from("coach_appointments").update(patch).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    refresh();
  };

  const now = Date.now();
  const upcoming = list
    .filter(a => new Date(a.scheduled_at).getTime() >= now && a.status !== "cancelled" && a.status !== "completed")
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const next = upcoming[0];

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-amber-400" /> Citas con coach
        </CardTitle>
        <Button size="sm" variant={showForm ? "ghost" : "default"} onClick={() => setShowForm(v => !v)}>
          {showForm ? <><X className="h-4 w-4 mr-1" />Cancelar</> : <><Plus className="h-4 w-4 mr-1" />Nueva cita</>}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {next && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
            <p className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold">Próxima cita</p>
            <p className="text-base font-bold text-foreground mt-1">
              {format(new Date(next.scheduled_at), "EEEE dd 'de' MMMM, HH:mm", { locale: es })}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className={STATUS[next.status]?.cls}>{STATUS[next.status]?.label}</Badge>
              <span className="text-xs text-muted-foreground">{next.duration_minutes} min · {next.appointment_type}</span>
            </div>
            {next.status === "pending" && (
              <Button size="sm" className="mt-3" onClick={() => setStatus(next.id, "confirmed")}>
                <Check className="h-3 w-3 mr-1" /> Marcar confirmada
              </Button>
            )}
          </div>
        )}

        {showForm && (
          <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Fecha</Label>
                <Input type="date" value={form.scheduled_date}
                  onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hora</Label>
                <Input type="time" value={form.scheduled_time}
                  onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duración (min)</Label>
                <Input type="number" value={form.duration_minutes}
                  onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Input value={form.appointment_type}
                  onChange={e => setForm(f => ({ ...f, appointment_type: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Notas</Label>
                <Textarea rows={2} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? "Guardando..." : "Crear cita"}
            </Button>
          </div>
        )}

        {list.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Sin citas registradas</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Historial ({list.length})</p>
            {list.map(a => {
              const s = STATUS[a.status] || STATUS.pending;
              return (
                <div key={a.id} className="rounded-lg border border-border/50 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {format(new Date(a.scheduled_at), "dd MMM yyyy · HH:mm", { locale: es })}
                    </span>
                    <Badge className={s.cls}><s.Icon className="h-3 w-3 mr-1" />{s.label}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{a.duration_minutes} min · {a.appointment_type}</p>
                  {a.notes && <p className="text-[11px] italic text-muted-foreground">{a.notes}</p>}
                  <div className="flex gap-1 flex-wrap">
                    {a.status === "pending" && (
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setStatus(a.id, "confirmed")}>
                        Confirmar
                      </Button>
                    )}
                    {(a.status === "pending" || a.status === "confirmed") && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setStatus(a.id, "completed")}>
                          Completada
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-[11px] text-destructive" onClick={() => setStatus(a.id, "cancelled")}>
                          Cancelar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
