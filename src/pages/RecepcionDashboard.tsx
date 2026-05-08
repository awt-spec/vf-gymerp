import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/hooks/useGym";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Search, UserPlus, CreditCard, ScanLine, Users, Clock,
  AlertTriangle, CalendarDays, ChevronRight,
  MessageSquare, Phone, UserCheck, Bell, X,
} from "lucide-react";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function RecepcionDashboard() {
  const { gymId } = useGym();
  const navigate = useNavigate();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const todayDow = today.getDay();

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [checkInLoading, setCheckInLoading] = useState<string | null>(null);
  const [todayCheckIns, setTodayCheckIns] = useState<any[]>([]);
  const [expiringSubs, setExpiringSubs] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [statsToday, setStatsToday] = useState({ checkIns: 0, newMembers: 0, payments: 0 });

  const fetchAll = useCallback(async () => {
    if (!gymId) return;

    const sevenDays = format(new Date(today.getTime() + 7 * 86400000), "yyyy-MM-dd");

    const [checkInsRes, subsRes, paymentsRes, classesRes, followRes, newMembersRes, paymentsTodayRes] = await Promise.all([
      supabase.from("check_ins")
        .select("*, members(first_name, last_name, status)")
        .eq("gym_id", gymId)
        .gte("check_in_time", todayStr + "T00:00:00")
        .order("check_in_time", { ascending: false }),
      supabase.from("subscriptions")
        .select("*, members(first_name, last_name, phone, email), plans(name)")
        .eq("gym_id", gymId)
        .eq("status", "active")
        .lte("end_date", sevenDays)
        .gte("end_date", todayStr)
        .order("end_date"),
      supabase.from("payments")
        .select("*, members(first_name, last_name, phone)")
        .eq("gym_id", gymId)
        .eq("status", "pending")
        .order("payment_date"),
      supabase.from("class_schedules")
        .select("*, classes!inner(name, instructor, max_capacity, is_active, gym_id)")
        .eq("day_of_week", todayDow)
        .eq("classes.gym_id", gymId)
        .order("start_time"),
      supabase.from("contact_logs")
        .select("*, leads(first_name, last_name, phone, status), members(first_name, last_name, phone)")
        .eq("gym_id", gymId)
        .eq("follow_up_done", false)
        .lte("follow_up_date", todayStr)
        .order("follow_up_date"),
      supabase.from("members")
        .select("id", { count: "exact", head: true })
        .eq("gym_id", gymId)
        .gte("created_at", todayStr + "T00:00:00"),
      supabase.from("payments")
        .select("id", { count: "exact", head: true })
        .eq("gym_id", gymId)
        .eq("status", "paid")
        .eq("payment_date", todayStr),
    ]);

    setTodayCheckIns(checkInsRes.data ?? []);
    setExpiringSubs(subsRes.data ?? []);
    setPendingPayments(paymentsRes.data ?? []);
    setTodayClasses((classesRes.data ?? []).filter((s: any) => s.classes?.is_active));
    setFollowUps(followRes.data ?? []);
    setStatsToday({
      checkIns: checkInsRes.data?.length ?? 0,
      newMembers: newMembersRes.count ?? 0,
      payments: paymentsTodayRes.count ?? 0,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId, todayStr, todayDow]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Live search
  useEffect(() => {
    if (!search.trim() || !gymId) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("members")
        .select("id, first_name, last_name, status, phone, subscriptions(end_date, status, plans(name)), class_bookings(id, status, booking_date, class_schedules(day_of_week, start_time, classes(name)))")
        .eq("gym_id", gymId)
        .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%,cedula.ilike.%${search}%`)
        .limit(6);
      setSearchResults(data ?? []);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, gymId]);

  const doCheckIn = async (memberId: string, memberName: string) => {
    setCheckInLoading(memberId);
    const { error } = await supabase.from("check_ins").insert({ member_id: memberId, gym_id: gymId });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `✅ Check-in: ${memberName}` });
      setSearch(""); setSearchResults([]);
      fetchAll();
    }
    setCheckInLoading(null);
  };

  const markFollowUpDone = async (id: string) => {
    await supabase.from("contact_logs").update({ follow_up_done: true }).eq("id", id);
    fetchAll();
  };

  const quickActions = [
    { label: "Nuevo socio", desc: "Registrar miembro", icon: UserPlus, color: "bg-primary/10 text-primary border-primary/20", action: () => navigate("/socios/nuevo") },
    { label: "Registrar pago", desc: "Cobrar membresía", icon: CreditCard, color: "bg-green-500/10 text-green-600 border-green-500/20", action: () => navigate("/cobranza") },
    { label: "Nuevo prospecto", desc: "Persona interesada", icon: MessageSquare, color: "bg-blue-500/10 text-blue-600 border-blue-500/20", action: () => navigate("/mercadeo") },
    { label: "Check-in QR", desc: "Escáner de acceso", icon: ScanLine, color: "bg-purple-500/10 text-purple-600 border-purple-500/20", action: () => navigate("/acceso") },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Recepción</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {format(today, "EEEE d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <UserCheck className="h-3.5 w-3.5" /> {statsToday.checkIns} check-ins
          </Badge>
          {statsToday.newMembers > 0 && (
            <Badge className="gap-1.5 px-3 py-1.5 bg-primary/15 text-primary border-primary/30 hover:bg-primary/20">
              <UserPlus className="h-3.5 w-3.5" /> {statsToday.newMembers} nuevos
            </Badge>
          )}
          {statsToday.payments > 0 && (
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
              <CreditCard className="h-3.5 w-3.5" /> {statsToday.payments} pagos
            </Badge>
          )}
        </div>
      </div>

      {/* Búsqueda / Check-in */}
      <Card className="border-primary/30">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar socio por nombre, teléfono o cédula para check-in..."
              className="pl-10 h-12 text-base border-primary/30 bg-background focus:border-primary"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setSearchResults([]); }}
                className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((m) => {
                const activeSub = m.subscriptions?.find((s: any) => s.status === "active");
                const daysLeft = activeSub ? differenceInDays(new Date(activeSub.end_date), today) : null;
                const alreadyIn = todayCheckIns.some((ci) => ci.member_id === m.id && !ci.check_out_time);
                const trialToday = m.class_bookings?.find((b: any) => b.status === "booked" && b.booking_date === todayStr);
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 transition">
                    <div className="h-10 w-10 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                      {m.first_name?.[0]}{m.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{m.first_name} {m.last_name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <Badge variant={m.status === "active" ? "default" : "secondary"} className="text-[10px]">
                          {m.status === "active" ? "Activo" : "Inactivo"}
                        </Badge>
                        {activeSub && (
                          <Badge variant="outline" className="text-[10px]">
                            {activeSub.plans?.name} · {daysLeft !== null ? `${daysLeft}d` : "—"}
                          </Badge>
                        )}
                        {!activeSub && (
                          <Badge variant="destructive" className="text-[10px]">⚠️ Sin membresía activa</Badge>
                        )}
                        {trialToday && (
                          <Badge className="text-[10px] bg-blue-500/15 text-blue-600 border-blue-500/30 hover:bg-blue-500/20">
                            🎓 {trialToday.class_schedules?.classes?.name}
                          </Badge>
                        )}
                        {alreadyIn && (
                          <Badge className="text-[10px] bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/20">✓ Ya ingresó</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/socios/${m.id}`)}>Ver</Button>
                      <Button
                        size="sm"
                        onClick={() => doCheckIn(m.id, `${m.first_name} ${m.last_name}`)}
                        disabled={alreadyIn || checkInLoading === m.id || m.status !== "active"}
                        className="gap-1"
                      >
                        <UserCheck className="h-4 w-4" />
                        {alreadyIn ? "Ingresó" : "Check-in"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {search.length >= 2 && searchResults.length === 0 && (
            <div className="text-center py-6 space-y-2">
              <p className="text-sm text-muted-foreground">No se encontró "{search}"</p>
              <Button size="sm" variant="outline" onClick={() => navigate("/socios/nuevo")} className="gap-1">
                <UserPlus className="h-4 w-4" /> Registrar como nuevo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seguimientos */}
      {followUps.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-amber-600" /> Seguimientos pendientes hoy
              <Badge variant="outline" className="ml-1">{followUps.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {followUps.slice(0, 4).map((f) => {
              const contact = f.leads || f.members;
              return (
                <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <Phone className="h-4 w-4 text-amber-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{contact?.first_name} {contact?.last_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{f.notes}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => markFollowUpDone(f.id)}>Hecho</Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Fila media: Membresías + Acciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Membresías próximas a vencer (7 días)
              {expiringSubs.length > 0 && <Badge variant="outline">{expiringSubs.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiringSubs.length === 0 && pendingPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin alertas 🎉</p>
            ) : (
              <>
                {expiringSubs.slice(0, 6).map((s) => {
                  const daysLeft = differenceInDays(new Date(s.end_date), today);
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card">
                      <div className="h-8 w-8 rounded-full bg-amber-500/15 text-amber-600 font-bold flex items-center justify-center text-xs shrink-0">
                        {s.members?.first_name?.[0]}{s.members?.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.members?.first_name} {s.members?.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.members?.phone || "Sin teléfono"}</p>
                      </div>
                      <Badge variant={daysLeft <= 2 ? "destructive" : "outline"} className="text-[10px]">
                        {daysLeft <= 0 ? "Vence hoy" : `${daysLeft}d`}
                      </Badge>
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/socios/${s.member_id}`)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                {pendingPayments.length > 0 && (
                  <>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mt-3 mb-1">
                      Pagos pendientes ({pendingPayments.length})
                    </div>
                    {pendingPayments.slice(0, 4).map((p) => (
                      <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card">
                        <div className="h-8 w-8 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.members?.first_name} {p.members?.last_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.members?.phone || "Sin teléfono"}</p>
                        </div>
                        <Badge variant="destructive" className="text-[10px]">Pendiente</Badge>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground px-1">
            Acciones rápidas
          </h3>
          {quickActions.map(({ label, desc, icon: Icon, color, action }) => (
            <button
              key={label}
              onClick={action}
              className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 transition text-left"
            >
              <div className={`h-10 w-10 rounded-lg border flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Clases + Check-ins */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" /> Clases de hoy — {DAY_NAMES[todayDow]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin clases programadas hoy</p>
            ) : (
              todayClasses.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card">
                  <div className="text-center shrink-0 w-14">
                    <p className="font-bold text-sm">{s.start_time?.slice(0, 5)}</p>
                    <p className="text-[10px] text-muted-foreground">{s.end_time?.slice(0, 5)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{s.classes?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.classes?.instructor}</p>
                  </div>
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <Users className="h-3 w-3" /> {s.classes?.max_capacity}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" /> Check-ins de hoy
              <Badge variant="outline" className="ml-1">{todayCheckIns.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayCheckIns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin check-ins aún</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {todayCheckIns.map((ci) => (
                  <div key={ci.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/40">
                    <div className="h-8 w-8 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {ci.members?.first_name?.[0]}{ci.members?.last_name?.[0]}
                    </div>
                    <span className="flex-1 text-sm truncate">{ci.members?.first_name} {ci.members?.last_name}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(ci.check_in_time), "HH:mm")}</span>
                    {!ci.check_out_time && (
                      <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30">Dentro</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
