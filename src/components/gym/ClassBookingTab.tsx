import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CalendarDays, Users, Clock, Check, X, Loader2 } from "lucide-react";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

interface Props {
  memberId: string | null;
  upcomingClasses: any[];
  onRefresh: () => void;
}

export function ClassBookingTab({ memberId, upcomingClasses, onRefresh }: Props) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("class_schedules")
        .select("*, classes(name, instructor, max_capacity, is_active, description)")
        .order("day_of_week")
        .order("start_time");
      setSchedules((data || []).filter(s => s.classes?.is_active));
      setLoading(false);
    };
    load();
  }, []);

  const today = new Date().getDay();
  const todayDate = new Date().toISOString().split("T")[0];

  const bookClass = async (scheduleId: string) => {
    if (!memberId) return;
    setBooking(scheduleId);
    const { error } = await supabase.from("class_bookings").insert({
      member_id: memberId,
      class_schedule_id: scheduleId,
      booking_date: todayDate,
      status: "booked" as const,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "¡Reservado! ✅", description: "Tu cupo está asegurado" });
      onRefresh();
    }
    setBooking(null);
  };

  const cancelBooking = async (bookingId: string) => {
    const { error } = await supabase.from("class_bookings")
      .update({ status: "cancelled" as const })
      .eq("id", bookingId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cancelado" });
      onRefresh();
    }
  };

  const bookedScheduleIds = upcomingClasses.map(b => b.class_schedule_id);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  // Group by day
  const byDay: Record<number, any[]> = {};
  schedules.forEach(s => { if (!byDay[s.day_of_week]) byDay[s.day_of_week] = []; byDay[s.day_of_week].push(s); });

  return (
    <div className="space-y-4">
      {/* My reservations */}
      {upcomingClasses.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
            <Check className="w-3 h-3" /> Mis reservas
          </p>
          {upcomingClasses.map(b => (
            <Card key={b.id} className="border-primary/30 bg-primary/5">
              <CardContent className="py-3 flex items-center gap-3">
                <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{b.class_schedules?.classes?.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {b.class_schedules?.classes?.instructor} · {b.class_schedules?.start_time?.slice(0, 5)} - {b.class_schedules?.end_time?.slice(0, 5)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-destructive h-7" onClick={() => cancelBooking(b.id)}>
                  <X className="w-3 h-3 mr-1" /> Cancelar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Available classes by day */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clases disponibles</p>
      {Object.entries(byDay).sort(([a], [b]) => {
        // Sort starting from today
        const da = ((Number(a) - today) + 7) % 7;
        const db = ((Number(b) - today) + 7) % 7;
        return da - db;
      }).map(([day, classes]) => (
        <div key={day} className="space-y-1.5">
          <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <CalendarDays className="w-3 h-3 text-muted-foreground" />
            {DAY_NAMES[Number(day)]}
            {Number(day) === today && <Badge className="text-[8px] h-4 bg-primary/20 text-primary">Hoy</Badge>}
          </p>
          {classes.map(s => {
            const isBooked = bookedScheduleIds.includes(s.id);
            return (
              <Card key={s.id} className={`border-border/50 ${isBooked ? "opacity-60" : ""}`}>
                <CardContent className="py-2.5 flex items-center gap-3">
                  <div className="flex flex-col items-center shrink-0 w-14">
                    <Clock className="w-3 h-3 text-muted-foreground mb-0.5" />
                    <span className="text-xs font-bold text-foreground">{s.start_time?.slice(0, 5)}</span>
                    <span className="text-[9px] text-muted-foreground">{s.end_time?.slice(0, 5)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{s.classes?.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.classes?.instructor}</p>
                    {s.classes?.description && <p className="text-[10px] text-muted-foreground truncate">{s.classes.description}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Users className="w-3 h-3" /> {s.classes?.max_capacity}
                    </div>
                    {isBooked ? (
                      <Badge className="text-[9px] bg-primary/20 text-primary">Reservado</Badge>
                    ) : (
                      <Button size="sm" className="h-7 text-xs" onClick={() => bookClass(s.id)} disabled={!!booking}>
                        {booking === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Reservar"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}

      {schedules.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-sm">No hay clases disponibles</p>
        </div>
      )}
    </div>
  );
}
