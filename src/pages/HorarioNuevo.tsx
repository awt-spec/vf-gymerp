import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/hooks/useGym";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Users, Clock, User } from "lucide-react";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function HorarioNuevo() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [params] = useSearchParams();
  const { gymId } = useGym();
  const editing = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [form, setForm] = useState({
    class_id: params.get("class_id") ?? "",
    day_of_week: params.get("day") ?? "1",
    start_time: params.get("time") ?? "09:00",
    end_time: "10:00",
  });

  useEffect(() => {
    if (!gymId) return;
    supabase.from("classes").select("*").eq("gym_id", gymId).eq("is_active", true).order("name")
      .then(({ data }) => setClasses(data ?? []));
  }, [gymId]);

  useEffect(() => {
    if (!id) return;
    supabase.from("class_schedules").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) setForm({
        class_id: data.class_id,
        day_of_week: String(data.day_of_week),
        start_time: data.start_time.slice(0, 5),
        end_time: data.end_time.slice(0, 5),
      });
    });
  }, [id]);

  const selectedClass = classes.find((c) => c.id === form.class_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      class_id: form.class_id,
      day_of_week: Number(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
    };
    const { error } = editing
      ? await supabase.from("class_schedules").update(payload).eq("id", id!)
      : await supabase.from("class_schedules").insert(payload);
    setLoading(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: editing ? "Horario actualizado" : "Clase agendada" });
    navigate("/clases");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/clases")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-display font-bold">
                {editing ? "Editar Horario" : "Agendar Clase"}
              </h1>
              <p className="text-xs text-muted-foreground">Programa una clase en el calendario</p>
            </div>
          </div>
          <Button form="sched-form" type="submit" disabled={loading} size="sm">
            <Save className="h-4 w-4 mr-1.5" />Guardar
          </Button>
        </div>
      </div>

      <form id="sched-form" onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <section className="space-y-4">
          <div>
            <h2 className="text-xs font-display font-semibold uppercase tracking-wider text-primary mb-1">Tipo de clase</h2>
            <p className="text-xs text-muted-foreground">Selecciona qué clase se impartirá</p>
          </div>
          <div className="space-y-1.5">
            <Label>Clase</Label>
            <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })} required>
              <SelectTrigger><SelectValue placeholder="Seleccionar clase" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} — {c.instructor}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {selectedClass && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/40 p-3 flex items-center gap-2.5">
                <User className="h-4 w-4 text-primary" />
                <div><p className="text-[10px] text-muted-foreground uppercase">Asignado</p><p className="text-sm font-medium">{selectedClass.instructor}</p></div>
              </div>
              <div className="rounded-lg border border-border/40 p-3 flex items-center gap-2.5">
                <Users className="h-4 w-4 text-primary" />
                <div><p className="text-[10px] text-muted-foreground uppercase">Cupo</p><p className="text-sm font-medium">{selectedClass.max_capacity} personas</p></div>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4 pt-4 border-t border-border/40">
          <div>
            <h2 className="text-xs font-display font-semibold uppercase tracking-wider text-primary mb-1">Día y hora</h2>
            <p className="text-xs text-muted-foreground">Cuándo se imparte la clase</p>
          </div>
          <div className="space-y-1.5">
            <Label>Día de la semana</Label>
            <Select value={form.day_of_week} onValueChange={(v) => setForm({ ...form, day_of_week: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Hora inicio</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Hora fin</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
