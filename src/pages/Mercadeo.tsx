import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/StatCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useGym } from "@/hooks/useGym";
import { formatCurrency } from "@/lib/currency";
import GymAiAssistant from "@/components/GymAiAssistant";
import {
  Megaphone, Users, Send, Search, MessageSquare, Mail,
  Phone, Bell, UserCheck, Filter, Dumbbell, ShoppingBag,
  TrendingUp, Calendar, Heart, Image, Plus, Trash2, Eye, EyeOff
} from "lucide-react";
import { format, differenceInDays, getDay } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const TEMPLATES = [
  { id: "welcome", name: "Bienvenida", icon: "🎉", message: "¡Bienvenido/a a nuestro gimnasio, {nombre}! Estamos felices de tenerte. Tu membresía está activa y lista." },
  { id: "renewal", name: "Renovación", icon: "🔄", message: "Hola {nombre}, tu membresía está por vencer. ¡Renová para seguir entrenando sin parar!" },
  { id: "promo", name: "Promoción", icon: "🔥", message: "¡{nombre}! Tenemos una promo especial este mes. Consultá en recepción o respondé este mensaje." },
  { id: "birthday", name: "Cumpleaños", icon: "🎂", message: "¡Feliz cumpleaños, {nombre}! 🎂 Como regalo, te ofrecemos un día de invitado gratis para un amigo/a." },
  { id: "inactive", name: "Re-activación", icon: "💪", message: "¡Te extrañamos, {nombre}! Hace días que no venís al gym. ¡Volvé y retomá tu progreso!" },
  { id: "class", name: "Clase nueva", icon: "📅", message: "Hola {nombre}, nueva clase disponible esta semana. ¡Reservá tu cupo antes de que se agote!" },
  { id: "product", name: "Producto nuevo", icon: "🛍️", message: "Hola {nombre}, tenemos nuevos productos en la tienda del gym. ¡Pasá a verlos!" },
];

const PIE_COLORS = ["hsl(var(--primary))", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const tooltipStyle = { fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 };

type MemberContact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
};

export default function Mercadeo() {
  const { user } = useAuth();
  const { gymId } = useGym();
  const [members, setMembers] = useState<MemberContact[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [shopSales, setShopSales] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [messageTemplate, setMessageTemplate] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [openCampaign, setOpenCampaign] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<string | null>(null);

  // Ads state
  const [promotions, setPromotions] = useState<any[]>([]);
  const [openNewAd, setOpenNewAd] = useState(false);
  const [adTitle, setAdTitle] = useState("");
  const [adMessage, setAdMessage] = useState("");
  const [adImageFile, setAdImageFile] = useState<File | null>(null);
  const [adImagePreview, setAdImagePreview] = useState<string | null>(null);
  const [adTargetMembers, setAdTargetMembers] = useState<Set<string>>(new Set());
  const [adSearch, setAdSearch] = useState("");
  const [adSaving, setAdSaving] = useState(false);
  const [adDisplayType, setAdDisplayType] = useState<"banner" | "interstitial">("banner");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    if (!gymId) return;
    const memberIdsRes = await supabase.from("members").select("id").eq("gym_id", gymId);
    const memberIds = (memberIdsRes.data ?? []).map(m => m.id);

    const [membersRes, subsRes, workRes, salesRes, promosRes] = await Promise.all([
      supabase.from("members").select("id, first_name, last_name, email, phone, status, created_at").eq("gym_id", gymId).order("first_name"),
      memberIds.length > 0
        ? supabase.from("subscriptions").select("member_id, end_date, status").in("member_id", memberIds).eq("status", "active")
        : Promise.resolve({ data: [] as any[] }),
      memberIds.length > 0
        ? supabase.from("workout_logs").select("member_id, exercise_name, muscle_group, workout_date, sets, reps, weight_kg").in("member_id", memberIds)
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("shop_sales").select("member_id, total_amount, sale_date, shop_products(name, category)").eq("gym_id", gymId).order("sale_date", { ascending: false }),
      supabase.from("promotions").select("*, promotion_targets(id, member_id, seen, seen_at, members(first_name, last_name))").eq("gym_id", gymId).order("created_at", { ascending: false }),
    ]);
    setMembers((membersRes.data as MemberContact[]) ?? []);
    setSubscriptions(subsRes.data ?? []);
    setWorkouts(workRes.data ?? []);
    setShopSales(salesRes.data ?? []);
    setPromotions(promosRes.data ?? []);
  };

  useEffect(() => { fetchData(); }, [gymId]);

  const getMemberSubStatus = (memberId: string) => {
    const sub = subscriptions.find(s => s.member_id === memberId);
    if (!sub) return "sin-plan";
    const days = differenceInDays(new Date(sub.end_date), new Date());
    if (days < 0) return "vencido";
    if (days <= 7) return "por-vencer";
    return "activo";
  };

  // Training insights per member
  const getMemberTrainingInsights = (memberId: string) => {
    const memberWorkouts = workouts.filter(w => w.member_id === memberId);
    if (memberWorkouts.length === 0) return null;

    // Favorite muscle group
    const muscleFreq: Record<string, number> = {};
    memberWorkouts.forEach(w => { muscleFreq[w.muscle_group] = (muscleFreq[w.muscle_group] || 0) + 1; });
    const favMuscle = Object.entries(muscleFreq).sort((a, b) => b[1] - a[1])[0];

    // Training days
    const dayFreq: Record<number, number> = {};
    memberWorkouts.forEach(w => {
      const d = getDay(new Date(w.workout_date));
      dayFreq[d] = (dayFreq[d] || 0) + 1;
    });
    const favDays = Object.entries(dayFreq).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 3).map(([d]) => DAY_NAMES[Number(d)]);

    // Total volume
    const totalVol = memberWorkouts.reduce((s, w) => s + (w.sets || 1) * (w.reps || 1) * (w.weight_kg || 0), 0);

    return {
      totalWorkouts: memberWorkouts.length,
      favMuscle: favMuscle ? favMuscle[0] : "N/A",
      favMuscleCount: favMuscle ? favMuscle[1] : 0,
      favDays,
      totalVolume: totalVol,
      muscleDistribution: Object.entries(muscleFreq).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value })),
    };
  };

  // Shop insights per member
  const getMemberShopInsights = (memberId: string) => {
    const memberSales = shopSales.filter(s => s.member_id === memberId);
    if (memberSales.length === 0) return null;
    const totalSpent = memberSales.reduce((s, sale) => s + Number(sale.total_amount), 0);
    const productFreq: Record<string, number> = {};
    memberSales.forEach(s => {
      const name = s.shop_products?.name || "Producto";
      productFreq[name] = (productFreq[name] || 0) + 1;
    });
    const favProduct = Object.entries(productFreq).sort((a, b) => b[1] - a[1])[0];
    return { totalPurchases: memberSales.length, totalSpent, favProduct: favProduct?.[0] || "N/A" };
  };

  // Global training insights
  const globalMuscleGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    workouts.forEach(w => { groups[w.muscle_group] = (groups[w.muscle_group] || 0) + 1; });
    return Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [workouts]);

  const globalTrainingDays = useMemo(() => {
    const days: Record<number, number> = {};
    workouts.forEach(w => { const d = getDay(new Date(w.workout_date)); days[d] = (days[d] || 0) + 1; });
    return DAY_NAMES.map((name, i) => ({ day: name, entrenamientos: days[i] || 0 }));
  }, [workouts]);

  // Top buyers
  const topBuyers = useMemo(() => {
    const buyers: Record<string, { name: string; total: number; count: number }> = {};
    shopSales.forEach(s => {
      if (!s.member_id) return;
      const member = members.find(m => m.id === s.member_id);
      if (!member) return;
      if (!buyers[s.member_id]) buyers[s.member_id] = { name: `${member.first_name} ${member.last_name}`, total: 0, count: 0 };
      buyers[s.member_id].total += Number(s.total_amount);
      buyers[s.member_id].count++;
    });
    return Object.values(buyers).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [shopSales, members]);

  const filteredMembers = members.filter(m => {
    const nameMatch = `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase());
    const statusMatch = filterStatus === "all" || m.status === filterStatus;
    return nameMatch && statusMatch;
  });

  const withPhone = members.filter(m => m.phone).length;
  const withEmail = members.filter(m => m.email).length;
  const activeMembers = members.filter(m => m.status === "active").length;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedMembers);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedMembers(next);
  };

  const selectAll = () => {
    if (selectedMembers.size === filteredMembers.length) setSelectedMembers(new Set());
    else setSelectedMembers(new Set(filteredMembers.map(m => m.id)));
  };

  const selectBySubStatus = (status: string) => {
    const ids = filteredMembers.filter(m => getMemberSubStatus(m.id) === status).map(m => m.id);
    setSelectedMembers(new Set(ids));
    toast({ title: `${ids.length} socios seleccionados` });
  };

  const sendToSelected = () => {
    const msg = customMessage || TEMPLATES.find(t => t.id === messageTemplate)?.message || "";
    if (!msg) { toast({ title: "Escribí un mensaje", variant: "destructive" }); return; }
    const targets = members.filter(m => selectedMembers.has(m.id));
    let sent = 0;
    targets.forEach((m) => {
      const personalMsg = msg.replace(/\{nombre\}/g, m.first_name);
      if (channel === "whatsapp" && m.phone) {
        window.open(`https://wa.me/${m.phone.replace(/\D/g, "")}?text=${encodeURIComponent(personalMsg)}`, "_blank");
        sent++;
      } else if (channel === "email" && m.email) {
        window.open(`mailto:${m.email}?subject=${encodeURIComponent(campaignName || "Info del Gym")}&body=${encodeURIComponent(personalMsg)}`);
        sent++;
      }
    });
    toast({ title: `${sent} mensaje(s) enviado(s) 📨` });
  };

  const subStatusBadge = (status: string) => {
    switch (status) {
      case "activo": return <Badge className="text-[9px] bg-primary/15 text-primary border-primary/30">Activo</Badge>;
      case "por-vencer": return <Badge className="text-[9px] bg-warning/15 text-warning border-warning/30">Por vencer</Badge>;
      case "vencido": return <Badge className="text-[9px] bg-destructive/15 text-destructive border-destructive/30">Vencido</Badge>;
      default: return <Badge className="text-[9px]" variant="secondary">Sin plan</Badge>;
    }
  };

  const detailMember = members.find(m => m.id === selectedMemberDetail);
  const detailTraining = selectedMemberDetail ? getMemberTrainingInsights(selectedMemberDetail) : null;
  const detailShop = selectedMemberDetail ? getMemberShopInsights(selectedMemberDetail) : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-3xl font-display font-bold">CRM & Mercadeo</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Contactos, insights de entrenamiento y compras</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard title="Contactos" value={members.length} icon={Users} />
        <StatCard title="Con WhatsApp" value={withPhone} icon={Phone} />
        <StatCard title="Entrenamientos" value={workouts.length} icon={Dumbbell} />
        <StatCard title="Compras tienda" value={shopSales.length} icon={ShoppingBag} />
      </div>

      <Tabs defaultValue="contacts">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="contacts" className="text-xs">Contactos</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs">Insights</TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs">Campañas</TabsTrigger>
          <TabsTrigger value="ads" className="text-xs gap-1"><Megaphone className="w-3 h-3" />Anuncios</TabsTrigger>
        </TabsList>

        {/* ═══ CONTACTS TAB ═══ */}
        <TabsContent value="contacts" className="space-y-3 mt-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar socio..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={selectAll}>
              {selectedMembers.size === filteredMembers.length ? "Deseleccionar" : "Seleccionar"} todos ({filteredMembers.length})
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => selectBySubStatus("por-vencer")}>Por vencer</Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => selectBySubStatus("vencido")}>Vencidos</Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => selectBySubStatus("sin-plan")}>Sin plan</Button>
          </div>

          {selectedMembers.size > 0 && (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <span className="text-xs font-medium">{selectedMembers.size} seleccionado(s)</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => { setChannel("whatsapp"); setOpenCampaign(true); }}>
                  <MessageSquare className="h-3 w-3" />WhatsApp
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => { setChannel("email"); setOpenCampaign(true); }}>
                  <Mail className="h-3 w-3" />Email
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {filteredMembers.map((m) => {
              const subStatus = getMemberSubStatus(m.id);
              const isSelected = selectedMembers.has(m.id);
              const training = getMemberTrainingInsights(m.id);
              const shop = getMemberShopInsights(m.id);
              return (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? "bg-primary/5 border-primary/30" : "bg-card border-border/50 hover:border-border"}`}
                >
                  <div className="flex items-center gap-3" onClick={() => toggleSelect(m.id)}>
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {m.first_name[0]}{m.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{m.first_name} {m.last_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {subStatusBadge(subStatus)}
                        {training && <Badge variant="outline" className="text-[8px] gap-0.5"><Dumbbell className="h-2.5 w-2.5" />{training.favMuscle}</Badge>}
                        {shop && <Badge variant="outline" className="text-[8px] gap-0.5"><ShoppingBag className="h-2.5 w-2.5" />{shop.totalPurchases} compras</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setSelectedMemberDetail(m.id); }}>
                        <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      {m.phone && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${m.phone!.replace(/\D/g, "")}`, "_blank"); }}>
                          <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ═══ INSIGHTS TAB ═══ */}
        <TabsContent value="insights" className="space-y-4 mt-3">
          <h2 className="text-sm font-display font-semibold flex items-center gap-1.5">
            <Dumbbell className="h-4 w-4 text-primary" />Grupos Musculares Populares
          </h2>
          {globalMuscleGroups.length > 0 ? (
            <Card className="border-border/50">
              <CardContent className="px-1 pb-2 pt-3">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={globalMuscleGroups.slice(0, 8)} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Entrenamientos" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : <p className="text-muted-foreground text-xs text-center py-4">Sin datos de entrenamiento</p>}

          <h2 className="text-sm font-display font-semibold flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary" />Días de Entrenamiento
          </h2>
          {globalTrainingDays.some(d => d.entrenamientos > 0) && (
            <Card className="border-border/50">
              <CardContent className="px-1 pb-2 pt-3">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={globalTrainingDays}>
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="entrenamientos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <h2 className="text-sm font-display font-semibold flex items-center gap-1.5">
            <ShoppingBag className="h-4 w-4 text-primary" />Top Compradores
          </h2>
          {topBuyers.length > 0 ? (
            <div className="space-y-1.5">
              {topBuyers.map((b, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-4">{i + 1}.</span>
                    <span className="text-xs font-medium truncate">{b.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[9px]">{b.count} compras</Badge>
                    <span className="text-xs font-semibold text-primary">{formatCurrency(b.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-muted-foreground text-xs text-center py-4">Sin ventas registradas</p>}
        </TabsContent>

        {/* ═══ CAMPAIGNS TAB ═══ */}
        <TabsContent value="campaigns" className="space-y-3 mt-3">
          <h2 className="text-sm font-display font-semibold flex items-center gap-1.5">
            <Megaphone className="h-4 w-4 text-primary" />Plantillas de Mensajes
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {TEMPLATES.map((t) => (
              <Card
                key={t.id}
                className={`cursor-pointer transition-all hover:shadow-md border-2 ${messageTemplate === t.id ? "border-primary/50 bg-primary/5" : "border-border/50"}`}
                onClick={() => { setMessageTemplate(t.id); setCustomMessage(t.message); }}
              >
                <CardContent className="p-3">
                  <span className="text-2xl">{t.icon}</span>
                  <p className="font-medium text-xs mt-1">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{t.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-3 mt-4">
            <h2 className="text-sm font-display font-semibold flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-primary" />Envío Rápido
            </h2>
            <div className="space-y-2">
              <Label className="text-xs">Mensaje personalizado</Label>
              <Textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} placeholder="Escribí tu mensaje... Usá {nombre} para personalizar" className="text-sm min-h-[80px]" />
              <p className="text-[10px] text-muted-foreground">Usá <code className="bg-muted px-1 rounded">{"{nombre}"}</code> para insertar el nombre</p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 gap-1.5 text-xs" size="sm" onClick={() => {
                if (selectedMembers.size === 0) { toast({ title: "Seleccioná socios primero", variant: "destructive" }); return; }
                setChannel("whatsapp"); sendToSelected();
              }}>
                <MessageSquare className="h-3.5 w-3.5" />WhatsApp ({selectedMembers.size})
              </Button>
              <Button variant="outline" className="flex-1 gap-1.5 text-xs" size="sm" onClick={() => {
                if (selectedMembers.size === 0) { toast({ title: "Seleccioná socios primero", variant: "destructive" }); return; }
                setChannel("email"); sendToSelected();
              }}>
                <Mail className="h-3.5 w-3.5" />Email ({selectedMembers.size})
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ═══ ADS / ANUNCIOS TAB ═══ */}
        <TabsContent value="ads" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-display font-semibold flex items-center gap-1.5">
              <Megaphone className="h-4 w-4 text-primary" />Anuncios ({promotions.length})
            </h2>
            <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
              setOpenNewAd(true); setAdTitle(""); setAdMessage(""); setAdImageFile(null);
              setAdImagePreview(null); setAdTargetMembers(new Set()); setAdSearch(""); setAdDisplayType("banner");
            }}>
              <Plus className="h-3 w-3" /> Nuevo Anuncio
            </Button>
          </div>

          {promotions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No hay anuncios creados</p>
              <p className="text-xs mt-1">Creá uno para que aparezca en la app de tus socios</p>
            </div>
          ) : (
            <div className="space-y-2">
              {promotions.map((promo) => {
                const targets = promo.promotion_targets || [];
                const seenCount = targets.filter((t: any) => t.seen).length;
                return (
                  <Card key={promo.id} className="border-border/50 overflow-hidden">
                    <div className="flex gap-3 p-3">
                      {promo.image_url && (
                        <img src={promo.image_url} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="text-sm font-bold truncate">{promo.title}</h3>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={async () => {
                              await supabase.from("promotions").update({ is_active: !promo.is_active }).eq("id", promo.id);
                              fetchData();
                            }}>
                              {promo.is_active ? <Eye className="h-3 w-3 text-primary" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={async () => {
                              await supabase.from("promotions").delete().eq("id", promo.id);
                              fetchData();
                              toast({ title: "Anuncio eliminado" });
                            }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{promo.message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant={promo.is_active ? "default" : "secondary"} className="text-[8px]">
                            {promo.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                          <Badge variant="outline" className="text-[8px] gap-0.5">
                            <Users className="h-2.5 w-2.5" />{targets.length} destinatarios
                          </Badge>
                          <Badge variant="outline" className="text-[8px] gap-0.5">
                            <Eye className="h-2.5 w-2.5" />{seenCount} vistos
                          </Badge>
                        </div>
                        {targets.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {targets.slice(0, 5).map((t: any) => (
                              <span key={t.id} className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full">
                                {t.members?.first_name} {t.members?.last_name}
                                {t.seen && " ✓"}
                              </span>
                            ))}
                            {targets.length > 5 && <span className="text-[9px] text-muted-foreground">+{targets.length - 5} más</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Campaign dialog */}
      <Dialog open={openCampaign} onOpenChange={setOpenCampaign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {channel === "whatsapp" ? <MessageSquare className="h-5 w-5 text-primary" /> : <Mail className="h-5 w-5 text-primary" />}
              Enviar por {channel === "whatsapp" ? "WhatsApp" : "Email"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Asunto / Campaña</Label>
              <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Ej: Promo Enero" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Plantilla</Label>
              <Select value={messageTemplate} onValueChange={(v) => { setMessageTemplate(v); setCustomMessage(TEMPLATES.find(t => t.id === v)?.message || ""); }}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Elegir plantilla" /></SelectTrigger>
                <SelectContent>{TEMPLATES.map(t => <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mensaje</Label>
              <Textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} className="text-sm min-h-[100px]" />
            </div>
            <p className="text-[10px] text-muted-foreground">{selectedMembers.size} destinatario(s)</p>
            <Button className="w-full gap-1.5" onClick={() => { sendToSelected(); setOpenCampaign(false); }}>
              <Send className="h-4 w-4" />Enviar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member detail dialog */}
      <Dialog open={!!selectedMemberDetail} onOpenChange={(o) => !o && setSelectedMemberDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              {detailMember ? `${detailMember.first_name} ${detailMember.last_name}` : "Socio"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {detailTraining ? (
              <div className="space-y-3">
                <h3 className="text-xs font-display font-semibold flex items-center gap-1.5"><Dumbbell className="h-3.5 w-3.5 text-primary" />Entrenamiento</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground text-[10px]">Entrenamientos</p>
                    <p className="font-bold">{detailTraining.totalWorkouts}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground text-[10px]">Grupo favorito</p>
                    <p className="font-bold flex items-center gap-1"><Heart className="h-3 w-3 text-destructive" />{detailTraining.favMuscle}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50 col-span-2">
                    <p className="text-muted-foreground text-[10px]">Días preferidos</p>
                    <p className="font-bold">{detailTraining.favDays.join(", ")}</p>
                  </div>
                </div>
                {detailTraining.muscleDistribution.length > 0 && (
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={detailTraining.muscleDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={45} paddingAngle={2}>
                        {detailTraining.muscleDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            ) : <p className="text-xs text-muted-foreground">Sin datos de entrenamiento</p>}

            {detailShop ? (
              <div className="space-y-2">
                <h3 className="text-xs font-display font-semibold flex items-center gap-1.5"><ShoppingBag className="h-3.5 w-3.5 text-primary" />Compras en Tienda</h3>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground text-[10px]">Compras</p>
                    <p className="font-bold">{detailShop.totalPurchases}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground text-[10px]">Gastado</p>
                    <p className="font-bold">{formatCurrency(detailShop.totalSpent)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground text-[10px]">Favorito</p>
                    <p className="font-bold truncate">{detailShop.favProduct}</p>
                  </div>
                </div>
              </div>
            ) : <p className="text-xs text-muted-foreground">Sin compras en tienda</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Ad Dialog */}
      <Dialog open={openNewAd} onOpenChange={setOpenNewAd}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" /> Nuevo Anuncio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Título</Label>
              <Input value={adTitle} onChange={e => setAdTitle(e.target.value)} placeholder="Ej: Promo de verano 🔥" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mensaje</Label>
              <Textarea value={adMessage} onChange={e => setAdMessage(e.target.value)} placeholder="Describí tu promoción o anuncio..." className="text-sm min-h-[80px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de anuncio</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdDisplayType("banner")}
                  className={`p-3 rounded-lg border text-center transition-all ${adDisplayType === "banner" ? "border-foreground bg-foreground/5 ring-1 ring-foreground/20" : "border-border hover:border-foreground/30"}`}
                >
                  <div className="w-full h-6 bg-foreground/20 rounded mb-1.5" />
                  <span className="text-[10px] font-medium">Banner</span>
                  <p className="text-[9px] text-muted-foreground">Se muestra como tarjeta en el feed</p>
                </button>
                <button
                  type="button"
                  onClick={() => setAdDisplayType("interstitial")}
                  className={`p-3 rounded-lg border text-center transition-all ${adDisplayType === "interstitial" ? "border-foreground bg-foreground/5 ring-1 ring-foreground/20" : "border-border hover:border-foreground/30"}`}
                >
                  <div className="w-full h-10 bg-foreground/20 rounded mb-1.5 flex items-center justify-center">
                    <span className="text-[8px] text-foreground/50">FULLSCREEN</span>
                  </div>
                  <span className="text-[10px] font-medium">Pantalla completa</span>
                  <p className="text-[9px] text-muted-foreground">Ad interstitial al abrir la app</p>
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Imagen (opcional)</Label>
              <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { setAdImageFile(file); setAdImagePreview(URL.createObjectURL(file)); }
              }} />
              {adImagePreview ? (
                <div className="relative">
                  <img src={adImagePreview} alt="" className="w-full h-40 object-cover rounded-lg" />
                  <Button variant="destructive" size="sm" className="absolute top-2 right-2 h-6 text-[10px]" onClick={() => { setAdImageFile(null); setAdImagePreview(null); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full h-24 gap-2 border-dashed" onClick={() => fileInputRef.current?.click()}>
                  <Image className="h-5 w-5" /> Subir imagen
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Destinatarios ({adTargetMembers.size} seleccionados)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={adSearch} onChange={e => setAdSearch(e.target.value)} placeholder="Buscar socio..." className="pl-8 text-sm h-9" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => {
                  if (adTargetMembers.size === members.length) setAdTargetMembers(new Set());
                  else setAdTargetMembers(new Set(members.map(m => m.id)));
                }}>
                  {adTargetMembers.size === members.length ? "Deseleccionar todos" : "Seleccionar todos"}
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setAdTargetMembers(new Set(members.filter(m => m.status === "active").map(m => m.id)))}>
                  Solo activos
                </Button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
                {members.filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(adSearch.toLowerCase())).map(m => (
                  <label key={m.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={adTargetMembers.has(m.id)} onCheckedChange={(checked) => {
                      const next = new Set(adTargetMembers);
                      checked ? next.add(m.id) : next.delete(m.id);
                      setAdTargetMembers(next);
                    }} />
                    <span className="text-xs">{m.first_name} {m.last_name}</span>
                    <Badge variant={m.status === "active" ? "default" : "secondary"} className="text-[8px] ml-auto">{m.status}</Badge>
                  </label>
                ))}
              </div>
            </div>

            <Button className="w-full gap-1.5" disabled={adSaving || !adTitle.trim() || !adMessage.trim() || adTargetMembers.size === 0} onClick={async () => {
              if (!user) return;
              setAdSaving(true);
              try {
                let imageUrl: string | null = null;
                if (adImageFile) {
                  const ext = adImageFile.name.split('.').pop();
                  const path = `${Date.now()}.${ext}`;
                  const { error: uploadErr } = await supabase.storage.from("promotion-images").upload(path, adImageFile);
                  if (uploadErr) throw uploadErr;
                  const { data: urlData } = supabase.storage.from("promotion-images").getPublicUrl(path);
                  imageUrl = urlData.publicUrl;
                }
                const { data: promo, error: promoErr } = await supabase.from("promotions").insert({
                  title: adTitle.trim(), message: adMessage.trim(), image_url: imageUrl, created_by: user.id, display_type: adDisplayType,
                } as any).select().single();
                if (promoErr) throw promoErr;

                const targets = Array.from(adTargetMembers).map(mid => ({
                  promotion_id: (promo as any).id, member_id: mid,
                } as any));
                const { error: targetErr } = await supabase.from("promotion_targets").insert(targets);
                if (targetErr) throw targetErr;

                toast({ title: `Anuncio enviado a ${adTargetMembers.size} socios 📢` });
                setOpenNewAd(false);
                fetchData();
              } catch (err: any) {
                toast({ title: "Error", description: err.message, variant: "destructive" });
              } finally { setAdSaving(false); }
            }}>
              <Send className="h-4 w-4" /> {adSaving ? "Guardando..." : `Enviar a ${adTargetMembers.size} socio(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <GymAiAssistant
        module="mercadeo"
        moduleLabel="Mercadeo"
        context={{
          total_members: members.length,
          recent_members: members.slice(0, 10).map((m: any) => ({ name: `${m.first_name} ${m.last_name}`, email: m.email, phone: m.phone })),
        }}
      />
    </div>
  );
}
