import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/hooks/useGym";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, CalendarDays } from "lucide-react";
import GymAiAssistant from "@/components/GymAiAssistant";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function Clases() {
  const { gymId } = useGym();
  const [classes, setClasses] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [openClass, setOpenClass] = useState(false);
  const [openSchedule, setOpenSchedule] = useState(false);
  const [classForm, setClassForm] = useState({ name: "", description: "", instructor: "", max_capacity: "20" });
  const [scheduleForm, setScheduleForm] = useState({ class_id: "", day_of_week: "1", start_time: "09:00", end_time: "10:00" });

  const fetchData = async () => {
    if (!gymId) return;
    const classesRes = await supabase.from("classes").select("*").eq("gym_id", gymId).order("name");
    const classIds = (classesRes.data ?? []).map(c => c.id);
    const schedulesRes = classIds.length > 0
      ? await supabase.from("class_schedules").select("*, classes(name, instructor)").in("class_id", classIds).order("day_of_week").order("start_time")
      : { data: [] as any[] };
    setClasses(classesRes.data ?? []);
    setSchedules(schedulesRes.data ?? []);
  };

  useEffect(() => { fetchData(); }, [gymId]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymId) { toast({ title: "Sin gimnasio", variant: "destructive" }); return; }
    const { error } = await supabase.from("classes").insert({
      name: classForm.name, description: classForm.description,
      instructor: classForm.instructor, max_capacity: Number(classForm.max_capacity),
      gym_id: gymId,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Clase creada" });
    setOpenClass(false);
    setClassForm({ name: "", description: "", instructor: "", max_capacity: "20" });
    fetchData();
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("class_schedules").insert({
      class_id: scheduleForm.class_id, day_of_week: Number(scheduleForm.day_of_week),
      start_time: scheduleForm.start_time, end_time: scheduleForm.end_time,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Horario agregado" });
    setOpenSchedule(false);
    setScheduleForm({ class_id: "", day_of_week: "1", start_time: "09:00", end_time: "10:00" });
    fetchData();
  };

  const schedulesByDay = DAYS.map((day, i) => ({ day, items: schedules.filter((s) => s.day_of_week === i) }));
  const weekDays = schedulesByDay.filter((_, i) => i >= 1 && i <= 6).concat(schedulesByDay.filter((_, i) => i === 0));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-display font-bold">Clases y Horarios</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Calendario semanal y gestión</p>
      </div>

      {/* Action buttons - stacked on mobile */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Dialog open={openClass} onOpenChange={setOpenClass}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto"><Plus className="mr-1.5 h-4 w-4" />Nueva Clase</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Crear Clase</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateClass} className="space-y-3">
              <div className="space-y-1.5"><Label>Nombre</Label><Input value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>Instructor</Label><Input value={classForm.instructor} onChange={(e) => setClassForm({ ...classForm, instructor: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>Descripción</Label><Input value={classForm.description} onChange={(e) => setClassForm({ ...classForm, description: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Capacidad</Label><Input type="number" value={classForm.max_capacity} onChange={(e) => setClassForm({ ...classForm, max_capacity: e.target.value })} required /></div>
              <Button type="submit" className="w-full">Crear Clase</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={openSchedule} onOpenChange={setOpenSchedule}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="w-full sm:w-auto"><CalendarDays className="mr-1.5 h-4 w-4" />Agregar Horario</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Agregar Horario</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateSchedule} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Clase</Label>
                <Select value={scheduleForm.class_id} onValueChange={(v) => setScheduleForm({ ...scheduleForm, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Día</Label>
                <Select value={scheduleForm.day_of_week} onValueChange={(v) => setScheduleForm({ ...scheduleForm, day_of_week: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Inicio</Label><Input type="time" value={scheduleForm.start_time} onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })} required /></div>
                <div className="space-y-1.5"><Label>Fin</Label><Input type="time" value={scheduleForm.end_time} onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })} required /></div>
              </div>
              <Button type="submit" className="w-full">Agregar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Weekly Calendar - scrollable horizontally on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex md:grid md:grid-cols-7 gap-2 min-w-max md:min-w-0">
          {weekDays.map(({ day, items }) => (
            <Card key={day} className="border-border/50 bg-card/80 w-[140px] md:w-auto shrink-0">
              <CardHeader className="p-2.5 pb-1.5">
                <CardTitle className="text-xs font-display font-semibold text-primary">{day}</CardTitle>
              </CardHeader>
              <CardContent className="p-2.5 pt-0 space-y-1.5">
                {items.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">Sin clases</p>
                ) : items.map((s) => (
                  <div key={s.id} className="p-1.5 rounded-md bg-muted/40 border border-border/30">
                    <p className="text-xs font-medium leading-tight">{s.classes?.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}</p>
                    <p className="text-[10px] text-primary/70">{s.classes?.instructor}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Classes List - compact cards */}
      <div className="space-y-2">
        <h2 className="text-sm font-display font-semibold text-muted-foreground">Clases Registradas</h2>
        {classes.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No hay clases</p>
        ) : (
          <div className="space-y-2">
            {classes.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold text-sm truncate">{c.name}</h3>
                    <Badge variant={c.is_active ? "default" : "secondary"} className="text-[10px] shrink-0">{c.is_active ? "Activa" : "Inactiva"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.instructor} · Cap: {c.max_capacity}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <GymAiAssistant
        module="clases"
        moduleLabel="Clases"
        context={{
          total_classes: classes.length,
          active: classes.filter((c: any) => c.is_active).length,
          schedules: schedules.length,
          classes: classes.map((c: any) => ({ name: c.name, instructor: c.instructor, capacity: c.max_capacity, active: c.is_active })),
        }}
      />
    </div>
  );
}
