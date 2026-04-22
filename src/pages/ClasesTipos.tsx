import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/hooks/useGym";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Users, MoreVertical, Pencil, Trash2, User } from "lucide-react";

export default function ClasesTipos() {
  const navigate = useNavigate();
  const { gymId } = useGym();
  const [classes, setClasses] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  const fetchData = async () => {
    if (!gymId) return;
    const classesRes = await supabase.from("classes").select("*").eq("gym_id", gymId).order("name");
    const classIds = (classesRes.data ?? []).map((c) => c.id);
    const schedulesRes = classIds.length
      ? await supabase.from("class_schedules").select("id, class_id").in("class_id", classIds)
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

  const schedulesByClass = useMemo(() => {
    const m: Record<string, number> = {};
    schedules.forEach((s) => { m[s.class_id] = (m[s.class_id] ?? 0) + 1; });
    return m;
  }, [schedules]);

  const handleDeleteClass = async (id: string) => {
    if (!confirm("¿Eliminar esta clase y todos sus horarios?")) return;
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Clase eliminada" });
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clases")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl md:text-3xl font-display font-bold">Tipos de Clase</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Catálogo de clases válidas del gym</p>
          </div>
        </div>
        <Button size="sm" onClick={() => navigate("/clases/nueva")}>
          <Plus className="mr-1.5 h-4 w-4" />Nueva Clase
        </Button>
      </div>

      {classes.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center text-muted-foreground text-sm">
            No hay clases registradas. Crea la primera con "Nueva Clase".
          </CardContent>
        </Card>
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
                  <span className="ml-auto text-primary font-semibold">
                    {schedulesByClass[c.id] ?? 0} horarios · {bookingsByClass[c.id] ?? 0} reservas
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
