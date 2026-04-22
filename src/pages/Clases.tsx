import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/hooks/useGym";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "@/hooks/use-toast";
import { Plus, CalendarDays, Users, TrendingUp, Activity, Pencil, Trash2, Clock, User, List, UserPlus, Check, X } from "lucide-react";
import GymAiAssistant from "@/components/GymAiAssistant";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAYS_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
// Hours from 6am to 10pm
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);
const HOUR_HEIGHT = 56; // px per hour for google-calendar style positioning

// Soft color palette per class (cycled)
const CLASS_COLORS = [
  { bg: "hsl(142 71% 45% / 0.15)", border: "hsl(142 71% 45%)", text: "hsl(142 71% 35%)" },
  { bg: "hsl(199 89% 48% / 0.15)", border: "hsl(199 89% 48%)", text: "hsl(199 89% 40%)" },
  { bg: "hsl(280 65% 60% / 0.15)", border: "hsl(280 65% 60%)", text: "hsl(280 65% 50%)" },
  { bg: "hsl(25 95% 53% / 0.15)", border: "hsl(25 95% 53%)", text: "hsl(25 95% 45%)" },
  { bg: "hsl(340 82% 52% / 0.15)", border: "hsl(340 82% 52%)", text: "hsl(340 82% 45%)" },
  { bg: "hsl(48 96% 53% / 0.15)", border: "hsl(48 96% 53%)", text: "hsl(48 96% 40%)" },
];

export default function Clases() {
  const navigate = useNavigate();
  const { gymId } = useGym();
  const [classes, setClasses] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [detailSchedule, setDetailSchedule] = useState<any | null>(null);
  const [slotDialog, setSlotDialog] = useState<{ items: any[]; label: string } | null>(null);

  const fetchData = async () => {
    if (!gymId) return;
    const classesRes = await supabase.from("classes").select("*").eq("gym_id", gymId).order("name");
    const classIds = (classesRes.data ?? []).map((c) => c.id);
    const schedulesRes = classIds.length
      ? await supabase.from("class_schedules").select("*, classes(name, instructor, max_capacity, is_active, description)").in("class_id", classIds).order("day_of_week").order("start_time")
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

  const classColorMap = useMemo(() => {
    const m: Record<string, typeof CLASS_COLORS[number]> = {};
    classes.forEach((c, i) => { m[c.id] = CLASS_COLORS[i % CLASS_COLORS.length]; });
    return m;
  }, [classes]);

  const bookingsByClass = useMemo(() => {
    const m: Record<string, number> = {};
    bookings.filter((b) => b.status !== "cancelled").forEach((b) => {
      const sch = schedules.find((s) => s.id === b.class_schedule_id);
      if (sch) m[sch.class_id] = (m[sch.class_id] ?? 0) + 1;
    });
    return m;
  }, [bookings, schedules]);

  const bookingsBySchedule = useMemo(() => {
    const m: Record<string, { booked: number; attended: number; cancelled: number }> = {};
    bookings.forEach((b) => {
      const slot = (m[b.class_schedule_id] ??= { booked: 0, attended: 0, cancelled: 0 });
      if (b.status === "attended") slot.attended++;
      else if (b.status === "cancelled") slot.cancelled++;
      else slot.booked++;
    });
    return m;
  }, [bookings]);

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

  // Group by day for google-calendar style positioning
  const schedulesByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    schedules.forEach((s) => { map[s.day_of_week]?.push(s); });
    return map;
  }, [schedules]);

  // Compute overlap layout per day (column splitting)
  const layoutForDay = (daySchedules: any[]) => {
    const sorted = [...daySchedules].sort((a, b) => a.start_time.localeCompare(b.start_time));
    const columns: any[][] = [];
    const result: { item: any; col: number; cols: number }[] = [];

    sorted.forEach((s) => {
      const start = toMinutes(s.start_time);
      const end = toMinutes(s.end_time);
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const last = columns[i][columns[i].length - 1];
        if (toMinutes(last.end_time) <= start) {
          columns[i].push(s);
          result.push({ item: s, col: i, cols: 0 });
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([s]);
        result.push({ item: s, col: columns.length - 1, cols: 0 });
      }
      // Track overlapping count
      void end;
    });

    // Set total cols per item based on max overlap during its span
    return result.map((r) => {
      const start = toMinutes(r.item.start_time);
      const end = toMinutes(r.item.end_time);
      const overlapping = sorted.filter((o) => {
        const os = toMinutes(o.start_time);
        const oe = toMinutes(o.end_time);
        return os < end && oe > start;
      });
      const maxCol = Math.max(...overlapping.map((o) => result.find((rr) => rr.item.id === o.id)!.col)) + 1;
      return { ...r, cols: Math.max(maxCol, 1) };
    });
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("¿Eliminar este horario?")) return;
    const { error } = await supabase.from("class_schedules").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Horario eliminado" });
    setDetailSchedule(null);
    setSlotDialog(null);
    fetchData();
  };

  const startMin = HOURS[0] * 60;
  const totalHeight = HOURS.length * HOUR_HEIGHT;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap shrink-0">
        <div>
          <h1 className="text-xl md:text-3xl font-display font-bold">Clases</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Calendario semanal de clases</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/clases/tipos")}>
            <List className="mr-1.5 h-4 w-4" />Ver Clases
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/clases/nueva")}>
            <Plus className="mr-1.5 h-4 w-4" />Nueva Clase
          </Button>
          <Button size="sm" onClick={() => navigate("/clases/horario/nuevo")}>
            <CalendarDays className="mr-1.5 h-4 w-4" />Agendar Clase
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
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

      {/* Google-style Calendar */}
      <Card className="border-border/50 overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/40 bg-muted/30 shrink-0">
          <div className="p-2 text-[10px] font-semibold text-muted-foreground uppercase">GMT</div>
          {DAYS.map((d, i) => (
            <div key={i} className="p-2 text-center border-l border-border/40">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ height: totalHeight }}>
            {/* Hour labels & lines */}
            <div className="relative">
              {HOURS.map((h, i) => (
                <div key={h} className="absolute left-0 right-0 text-[10px] text-muted-foreground font-mono px-2 -translate-y-2"
                     style={{ top: i * HOUR_HEIGHT }}>
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {/* Day columns */}
            {DAYS.map((_, dayIdx) => {
              const layout = layoutForDay(schedulesByDay[dayIdx] ?? []);
              return (
                <div key={dayIdx} className="relative border-l border-border/40">
                  {/* Hour grid lines */}
                  {HOURS.map((_, i) => (
                    <div key={i}
                      className="absolute left-0 right-0 border-b border-border/20 hover:bg-muted/20 cursor-pointer transition-colors"
                      style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                      onClick={() => navigate(`/clases/horario/nuevo?day=${dayIdx}&time=${String(HOURS[i]).padStart(2, "0")}:00`)}
                    />
                  ))}
                  {/* Events */}
                  {layout.map(({ item: s, col, cols }) => {
                    const start = toMinutes(s.start_time) - startMin;
                    const end = toMinutes(s.end_time) - startMin;
                    const top = (start / 60) * HOUR_HEIGHT;
                    const height = Math.max(((end - start) / 60) * HOUR_HEIGHT - 2, 24);
                    const widthPct = 100 / cols;
                    const color = classColorMap[s.class_id] ?? CLASS_COLORS[0];
                    const counts = bookingsBySchedule[s.id] ?? { booked: 0, attended: 0, cancelled: 0 };
                    const occupied = counts.booked + counts.attended;
                    return (
                      <button
                        key={s.id}
                        onClick={(e) => { e.stopPropagation(); setDetailSchedule(s); }}
                        className="absolute rounded-md border-l-[3px] px-1.5 py-1 text-left overflow-hidden hover:shadow-md transition-shadow z-10"
                        style={{
                          top,
                          height,
                          left: `calc(${col * widthPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                          background: color.bg,
                          borderLeftColor: color.border,
                        }}
                      >
                        <p className="text-[11px] font-semibold truncate leading-tight" style={{ color: color.text }}>
                          {s.classes?.name}
                        </p>
                        <p className="text-[9px] text-muted-foreground truncate leading-tight">
                          {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                        </p>
                        {height > 44 && (
                          <p className="text-[9px] text-muted-foreground truncate leading-tight">
                            {occupied}/{s.classes?.max_capacity}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Schedule detail dialog */}
      <Dialog open={!!detailSchedule} onOpenChange={(o) => !o && setDetailSchedule(null)}>
        <DialogContent className="max-w-md">
          {detailSchedule && (() => {
            const counts = bookingsBySchedule[detailSchedule.id] ?? { booked: 0, attended: 0, cancelled: 0 };
            const occupied = counts.booked + counts.attended;
            const cap = detailSchedule.classes?.max_capacity ?? 0;
            const pct = cap > 0 ? (occupied / cap) * 100 : 0;
            const isFull = occupied >= cap;
            const color = classColorMap[detailSchedule.class_id] ?? CLASS_COLORS[0];
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-3">
                    <div className="w-1 h-10 rounded shrink-0" style={{ background: color.border }} />
                    <div className="min-w-0">
                      <DialogTitle className="font-display text-lg">{detailSchedule.classes?.name}</DialogTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {DAYS_FULL[detailSchedule.day_of_week]} · {detailSchedule.start_time.slice(0, 5)} – {detailSchedule.end_time.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-3">
                  {detailSchedule.classes?.description && (
                    <p className="text-sm text-muted-foreground">{detailSchedule.classes.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border/40 p-3">
                      <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Instructor</p>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-primary" />
                        <p className="text-sm font-medium truncate">{detailSchedule.classes?.instructor}</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/40 p-3">
                      <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Estado</p>
                      <Badge variant={detailSchedule.classes?.is_active ? "default" : "secondary"} className="text-[10px]">
                        {detailSchedule.classes?.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/40 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] uppercase text-muted-foreground font-semibold">Cupo</p>
                      <p className="text-sm font-display font-bold">
                        {occupied} / {cap}
                        {isFull && <Badge variant="destructive" className="ml-2 text-[9px]">Lleno</Badge>}
                      </p>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{ width: `${Math.min(pct, 100)}%`, background: color.border }}
                      />
                    </div>
                    <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span>📅 {counts.booked} reservadas</span>
                      <span>✅ {counts.attended} asistieron</span>
                      {counts.cancelled > 0 && <span>❌ {counts.cancelled} canceladas</span>}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { const id = detailSchedule.id; setDetailSchedule(null); navigate(`/clases/horario/${id}/editar`); }}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />Editar
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={() => handleDeleteSchedule(detailSchedule.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />Eliminar
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
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

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
