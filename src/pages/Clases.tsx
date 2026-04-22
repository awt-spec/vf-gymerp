import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/hooks/useGym";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { Plus, CalendarDays, Users, TrendingUp, Activity, MoreVertical, Pencil, Trash2, Clock, User } from "lucide-react";
import GymAiAssistant from "@/components/GymAiAssistant";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAYS_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
// Hours from 6am to 10pm
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);

export default function Clases() {
  const navigate = useNavigate();
  const { gymId } = useGym();
  const [classes, setClasses] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [slotDialog, setSlotDialog] = useState<{ items: any[]; label: string } | null>(null);

  const fetchData = async () => {
    if (!gymId) return;
    const classesRes = await supabase.from("classes").select("*").eq("gym_id", gymId).order("name");
    const classIds = (classesRes.data ?? []).map((c) => c.id);
    const schedulesRes = classIds.length
      ? await supabase.from("class_schedules").select("*, classes(name, instructor, max_capacity, is_active)").in("class_id", classIds).order("day_of_week").order("start_time")
      : { data: [] as any[] };
    const scheduleIds = (schedulesRes.data ?? []).map((s: any) => s.id);
    const bookingsRes = scheduleIds.length
      ? await supabase.from("class_bookings").select("class_schedule_id, status").in("class_schedule_id", scheduleIds)
      : { data: [] as any[] };
    setClasses(classesRes.data ?? []);
    setSchedules(schedulesRes.data ?? []);
    setBookings(bookingsRes.data ?? []);
  };

  useEffect(() => { fetchData(); }, [gymId]);

  const bookingsByClass = useMemo(() => {
    const m: Record<string, number> = {};
    bookings.filter((b) => b.status !== "cancelled").forEach((b) => {
      const sch = schedules.find((s) => s.id === b.class_schedule_id);
      if (sch) m[sch.class_id] = (m[sch.class_id] ?? 0) + 1;
    });
    return m;
  }, [bookings, schedules]);

  const stats = useMemo(() => {
    const attended = bookings.filter((b) => b.status === "attended").length;
    const totalBookings = bookings.filter((b) => b.status !== "cancelled").length;
    const topClassId = Object.entries(bookingsByClass).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topClass = classes.find((c) => c.id === topClassId);
    return {
      attendances: attended,
      totalBookings,
      topClassName: topClass?.name ?? "—",
      topClassCount: topClassId ? bookingsByClass[topClassId] : 0,
      activeClasses: classes.filter((c) => c.is_active).length,
    };
  }, [bookings, bookingsByClass, classes]);

  // Build grid map: key "day-hour" -> schedules[]
  const grid = useMemo(() => {
    const map: Record<string, any[]> = {};
    schedules.forEach((s) => {
      const hour = parseInt(s.start_time.slice(0, 2), 10);
      const key = `${s.day_of_week}-${hour}`;
      (map[key] ??= []).push(s);
    });
    return map;
  }, [schedules]);

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("¿Eliminar este horario?")) return;
    const { error } = await supabase.from("class_schedules").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Horario eliminado" });
    setSlotDialog(null);
    fetchData();
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm("¿Eliminar esta clase y todos sus horarios?")) return;
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Clase eliminada" });
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-3xl font-display font-bold">Clases</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Calendario, tipos y agendamiento</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/clases/nueva")}>
            <Plus className="mr-1.5 h-4 w-4" />Nuevo Tipo
          </Button>
          <Button size="sm" onClick={() => navigate("/clases/horario/nuevo")}>
            <CalendarDays className="mr-1.5 h-4 w-4" />Agendar Clase
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">Asistencias</span>
            </div>
            <p className="text-2xl font-display font-bold">{stats.attendances}</p>
            <p className="text-[10px] text-muted-foreground">de {stats.totalBookings} reservas</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">Más agendada</span>
            </div>
            <p className="text-2xl font-display font-bold truncate">{stats.topClassName}</p>
            <p className="text-[10px] text-muted-foreground">{stats.topClassCount} reservas</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">Horarios</span>
            </div>
            <p className="text-2xl font-display font-bold">{schedules.length}</p>
            <p className="text-[10px] text-muted-foreground">programados</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">Activas</span>
            </div>
            <p className="text-2xl font-display font-bold">{stats.activeClasses}</p>
            <p className="text-[10px] text-muted-foreground">tipos disponibles</p>
          </CardContent>
        </Card>
      </div>

      {/* Tipos de Clase Cards */}
      <div className="space-y-2">
        <h2 className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">Tipos de clase</h2>
        {classes.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No hay clases registradas</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {classes.map((c) => (
              <Card key={c.id} className="border-border/50 hover:border-primary/50 transition-colors group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold truncate">{c.name}</h3>
                        <Badge variant={c.is_active ? "default" : "secondary"} className="text-[10px] shrink-0">
                          {c.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">{c.description || "Sin descripción"}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/clases/${c.id}/editar`)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteClass(c.id)} className="text-destructive">
                          <Trash2 className="h-3.5 w-3.5 mr-2" />Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/40 text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <User className="h-3 w-3" />{c.instructor}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3 w-3" />{c.max_capacity}
                    </span>
                    <span className="ml-auto text-primary font-semibold">{bookingsByClass[c.id] ?? 0} reservas</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="space-y-2">
        <h2 className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">Calendario semanal</h2>
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header row */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/40 bg-muted/30">
                <div className="p-2 text-[10px] font-semibold text-muted-foreground uppercase">Hora</div>
                {DAYS.map((d, i) => (
                  <div key={i} className="p-2 text-center text-xs font-display font-semibold border-l border-border/40">
                    {d}
                  </div>
                ))}
              </div>
              {/* Hour rows */}
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/30 last:border-b-0">
                  <div className="p-2 text-[10px] text-muted-foreground font-mono">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  {DAYS.map((_, dayIdx) => {
                    const items = grid[`${dayIdx}-${hour}`] ?? [];
                    return (
                      <div
                        key={dayIdx}
                        className="border-l border-border/40 min-h-[56px] p-1 hover:bg-muted/20 transition-colors cursor-pointer relative"
                        onClick={() => {
                          if (items.length > 1) {
                            setSlotDialog({ items, label: `${DAYS_FULL[dayIdx]} ${String(hour).padStart(2, "0")}:00` });
                          } else if (items.length === 0) {
                            navigate(`/clases/horario/nuevo?day=${dayIdx}&time=${String(hour).padStart(2, "0")}:00`);
                          }
                        }}
                      >
                        {items.slice(0, 2).map((s) => (
                          <div
                            key={s.id}
                            className="text-[10px] p-1 rounded bg-primary/10 border border-primary/20 mb-0.5 last:mb-0"
                            onClick={(e) => { e.stopPropagation(); navigate(`/clases/horario/${s.id}/editar`); }}
                          >
                            <p className="font-semibold truncate text-primary">{s.classes?.name}</p>
                            <p className="text-muted-foreground truncate">{s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)}</p>
                          </div>
                        ))}
                        {items.length > 2 && (
                          <div className="text-[10px] text-center text-primary font-semibold">+{items.length - 2} más</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
        <p className="text-[10px] text-muted-foreground">Click en una celda vacía para agendar · Click en clase para editar · Múltiples clases muestran detalle</p>
      </div>

      {/* Multi-class slot dialog */}
      <Dialog open={!!slotDialog} onOpenChange={(o) => !o && setSlotDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Clases — {slotDialog?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {slotDialog?.items.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border/40">
                <div className="min-w-0">
                  <p className="font-display font-semibold text-sm">{s.classes?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)} · {s.classes?.instructor} · Cupo {s.classes?.max_capacity}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setSlotDialog(null); navigate(`/clases/horario/${s.id}/editar`); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteSchedule(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <GymAiAssistant
        module="clases"
        moduleLabel="Clases"
        context={{
          total_classes: classes.length,
          active: stats.activeClasses,
          schedules: schedules.length,
          attendances: stats.attendances,
          top_class: stats.topClassName,
        }}
      />
    </div>
  );
}
