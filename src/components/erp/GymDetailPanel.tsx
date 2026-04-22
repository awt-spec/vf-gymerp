import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Building2, Users, CreditCard, Calendar, Mail, Phone, MapPin,
  Link2, Lock, Copy, Check, Dumbbell, TrendingUp, ShieldAlert, ShieldCheck,
  Layers, Clock, BarChart3, ExternalLink, Globe, Upload, FileSpreadsheet, Download
} from "lucide-react";
import GymMembersPlansPanel from "./GymMembersPlansPanel";
import { getPublicBaseUrl } from "@/lib/publicUrl";
import Papa from "papaparse";

// Lovable hosting fixed IP for A records (per docs.lovable.dev/features/custom-domain)
const LOVABLE_HOSTING_IP = "185.158.133.1";

const isValidDomain = (d: string) =>
  /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})+$/.test(d.trim());

const FEATURE_LABELS: Record<string, string> = {
  socios: "Socios", planes: "Planes", pagos: "Pagos", contabilidad: "Contabilidad",
  inventario: "Inventario", clases: "Clases", tienda: "Tienda", nutricion: "Nutrición",
  ejercicio: "Ejercicio", acceso: "Control Acceso", reportes: "Reportes", mercadeo: "Mercadeo", ia: "IA"
};

const IMPORT_TABLES = [
  { key: "members", label: "Socios", columns: "first_name,last_name,email,phone,cedula,status" },
  { key: "plans", label: "Planes", columns: "name,description,price,duration_days,currency" },
  { key: "payments", label: "Pagos", columns: "amount,payment_date,payment_method,status,currency" },
  { key: "inventory", label: "Inventario", columns: "name,category,quantity,unit_cost,min_stock" },
  { key: "classes", label: "Clases", columns: "name,instructor,max_capacity,description" },
];

const fmt = (n: number, c = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n);

type GymDetailPanelProps = {
  gymId: string;
  onBack: () => void;
};

type GymData = {
  id: string; name: string; slug: string; email: string | null; phone: string | null;
  address: string | null; logo_url: string | null; primary_color: string | null;
  subscription_status: string; trial_ends_at: string | null; created_at: string; owner_user_id: string;
  custom_domain: string | null;
};

type FeatureRow = { id: string; gym_id: string; feature_name: string; enabled: boolean };

export default function GymDetailPanel({ gymId, onBack }: GymDetailPanelProps) {
  const [gym, setGym] = useState<GymData | null>(null);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [activeMembers, setActiveMembers] = useState(0);
  const [inactiveMembers, setInactiveMembers] = useState(0);
  const [activeSubs, setActiveSubs] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [classCount, setClassCount] = useState(0);
  const [planCount, setPlanCount] = useState(0);
  const [checkInsToday, setCheckInsToday] = useState(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [suspending, setSuspending] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [savingDomain, setSavingDomain] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedImportTable, setSelectedImportTable] = useState("members");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getBaseUrl = () => getPublicBaseUrl();
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    fetchAll();
  }, [gymId]);

  const fetchAll = async () => {
    setLoading(true);
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const today = now.toISOString().split("T")[0];

    const [
      { data: gymData },
      { data: featData },
      { data: membersData },
      { data: subsData },
      { data: paymentsData },
      { data: gymSubData },
      { data: classesData },
      { data: plansData },
      { data: checkInsData },
    ] = await Promise.all([
      supabase.from("gyms").select("*").eq("id", gymId).single(),
      supabase.from("gym_features").select("*").eq("gym_id", gymId),
      supabase.from("members").select("id, status, first_name, last_name, created_at").eq("gym_id", gymId),
      supabase.from("subscriptions").select("id, status").eq("gym_id", gymId),
      supabase.from("payments").select("id, amount, payment_date, status, currency, payment_method, member_id").eq("gym_id", gymId).order("payment_date", { ascending: false }).limit(10),
      supabase.from("gym_subscriptions").select("*").eq("gym_id", gymId).limit(1),
      supabase.from("classes").select("id").eq("gym_id", gymId),
      supabase.from("plans").select("id").eq("gym_id", gymId),
      supabase.from("check_ins").select("id").eq("gym_id", gymId).gte("check_in_time", `${today}T00:00:00`),
    ]);

    setGym(gymData);
    setCustomDomain(gymData?.custom_domain ?? "");
    setFeatures(featData ?? []);
    const members = membersData ?? [];
    setMemberCount(members.length);
    setActiveMembers(members.filter(m => m.status === "active").length);
    setInactiveMembers(members.filter(m => m.status !== "active").length);
    setActiveSubs((subsData ?? []).filter(s => s.status === "active").length);

    const payments = paymentsData ?? [];
    const paidPayments = payments.filter(p => p.status === "paid");
    setTotalRevenue(paidPayments.reduce((s, p) => s + Number(p.amount), 0));
    setMonthlyRevenue(paidPayments.filter(p => p.payment_date?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0));
    setRecentPayments(payments.slice(0, 5));
    setSubscription(gymSubData?.[0] ?? null);
    setClassCount((classesData ?? []).length);
    setPlanCount((plansData ?? []).length);
    setCheckInsToday((checkInsData ?? []).length);
    setLoading(false);
  };

  const toggleFeature = async (featureName: string, currentEnabled: boolean) => {
    const { error } = await supabase.from("gym_features").update({ enabled: !currentEnabled }).eq("gym_id", gymId).eq("feature_name", featureName);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setFeatures(prev => prev.map(f => f.feature_name === featureName ? { ...f, enabled: !currentEnabled } : f));
  };

  const toggleSuspend = async () => {
    if (!gym) return;
    setSuspending(true);
    const newStatus = gym.subscription_status === "suspended" ? "active" : "suspended";
    const { error } = await supabase.from("gyms").update({ subscription_status: newStatus }).eq("id", gymId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setGym({ ...gym, subscription_status: newStatus });
      toast({ title: newStatus === "suspended" ? "Servicio suspendido" : "Servicio reactivado" });
    }
    setSuspending(false);
  };

  const saveDomain = async () => {
    if (!gym) return;
    const trimmed = customDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (trimmed && !isValidDomain(trimmed)) {
      toast({ title: "Dominio inválido", description: "Usá el formato: midominio.com", variant: "destructive" });
      return;
    }
    setSavingDomain(true);
    const { error } = await supabase.from("gyms").update({ custom_domain: trimmed || null }).eq("id", gymId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setGym({ ...gym, custom_domain: trimmed || null });
      setCustomDomain(trimmed);
      toast({ title: "Dominio guardado", description: "Configurá los registros DNS para activarlo." });
    }
    setSavingDomain(false);
  };

  const downloadTemplate = (tableKey: string) => {
    const table = IMPORT_TABLES.find(t => t.key === tableKey);
    if (!table) return;
    const blob = new Blob([table.columns + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${table.key}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const NUMERIC_FIELDS = new Set([
        "price", "amount", "quantity", "unit_cost", "min_stock",
        "duration_days", "max_capacity",
      ]);

      const parsed = await new Promise<Papa.ParseResult<Record<string, string>>>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: "greedy",
          transformHeader: (h) => h.trim().toLowerCase(),
          complete: resolve,
          error: reject,
        });
      });

      if (parsed.errors.length) {
        throw new Error(parsed.errors[0].message);
      }
      if (!parsed.data.length) {
        throw new Error("El archivo CSV no contiene filas de datos");
      }

      const rows = parsed.data.map((rawRow) => {
        const row: Record<string, any> = { gym_id: gymId };
        for (const [k, v] of Object.entries(rawRow)) {
          if (v === undefined || v === null || v === "") continue;
          const trimmed = typeof v === "string" ? v.trim() : v;
          if (NUMERIC_FIELDS.has(k)) {
            const num = Number(trimmed);
            if (Number.isFinite(num)) row[k] = num;
          } else {
            row[k] = trimmed;
          }
        }
        return row;
      });

      const { error } = await supabase.from(selectedImportTable as any).insert(rows);
      if (error) throw error;

      toast({ title: `${rows.length} registros importados a ${IMPORT_TABLES.find(t => t.key === selectedImportTable)?.label}` });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error de importación", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading || !gym) {
    return (
      <div className="flex items-center justify-center py-20">
        <Dumbbell className="h-6 w-6 text-indigo-400 animate-pulse" />
      </div>
    );
  }

  const statusColor = gym.subscription_status === "active" || gym.subscription_status === "trial"
    ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : "text-red-600 bg-red-50 border-red-200";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-xs text-slate-400 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center border border-slate-200"
            style={{ backgroundColor: `${gym.primary_color || '#6366f1'}15`, color: gym.primary_color || '#6366f1' }}>
            {gym.logo_url ? <img src={gym.logo_url} alt={gym.name} className="w-full h-full object-contain rounded-xl" />
              : <Dumbbell className="h-6 w-6" />}
          </div>
          <div>
            <h1 className="text-xl font-bold font-display">{gym.name}</h1>
            <p className="text-xs text-slate-400">/{gym.slug} · Creado {new Date(gym.created_at).toLocaleDateString("es-CR")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] tracking-widest uppercase ${statusColor}`}>
            {gym.subscription_status === "active" ? "Activo" : gym.subscription_status === "trial" ? "Prueba" : gym.subscription_status === "suspended" ? "Suspendido" : gym.subscription_status}
          </Badge>
          <Button variant={gym.subscription_status === "suspended" ? "default" : "destructive"} size="sm"
            onClick={toggleSuspend} disabled={suspending}
            className="text-[10px] tracking-widest uppercase gap-1">
            {gym.subscription_status === "suspended"
              ? <><ShieldCheck className="h-3 w-3" /> Reactivar</>
              : <><ShieldAlert className="h-3 w-3" /> Suspender</>}
          </Button>
        </div>
      </div>

      {/* Links */}
      <Card className="bg-white border-slate-200 p-4 shadow-sm">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-3">Links para compartir</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Landing Page", url: `${getBaseUrl()}/gym/${gym.slug}`, field: "det-landing", icon: ExternalLink },
            { label: "Login Admin", url: `${getBaseUrl()}/`, field: "det-login", icon: Lock },
            { label: "ERP Dashboard", url: `${getBaseUrl()}/dashboard`, field: "det-erp", icon: BarChart3 },
          ].map(link => (
            <div key={link.field} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
              <link.icon className="h-3.5 w-3.5 text-slate-400" />
              <div>
                <p className="text-[10px] text-slate-400">{link.label}</p>
                <code className="text-[11px] text-slate-600">{link.url}</code>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => copyToClipboard(link.url, link.field)}
                  title="Copiar"
                  className="text-slate-300 hover:text-indigo-500 transition-colors p-1 rounded hover:bg-slate-100"
                >
                  {copiedField === link.field ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir en nueva pestaña"
                  className="text-slate-300 hover:text-emerald-600 transition-colors p-1 rounded hover:bg-slate-100"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Custom Domain */}
      <Card className="bg-white border-slate-200 p-4 shadow-sm">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-3 flex items-center gap-2">
          <Globe className="h-3.5 w-3.5" /> Dominio Personalizado
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs text-slate-500">Dominio (ej: mygym.com)</Label>
            <Input
              value={customDomain}
              onChange={e => setCustomDomain(e.target.value)}
              placeholder="mygym.com"
              className="mt-1 text-sm"
            />
          </div>
          <Button size="sm" onClick={saveDomain} disabled={savingDomain}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
            {savingDomain ? "Guardando..." : "Guardar"}
          </Button>
        </div>
        {gym.custom_domain ? (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] text-slate-500">
              Dominio actual: <span className="font-semibold text-slate-700">{gym.custom_domain}</span>
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Configurá estos registros DNS en tu proveedor:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                <div className="bg-white rounded border border-slate-200 px-2 py-1.5">
                  <p className="text-[9px] text-slate-400">Tipo</p>
                  <p className="text-slate-700">A</p>
                </div>
                <div className="bg-white rounded border border-slate-200 px-2 py-1.5">
                  <p className="text-[9px] text-slate-400">Nombre</p>
                  <p className="text-slate-700">@ y www</p>
                </div>
                <div className="bg-white rounded border border-slate-200 px-2 py-1.5 flex items-center justify-between gap-1">
                  <div>
                    <p className="text-[9px] text-slate-400">Valor</p>
                    <p className="text-slate-700">{LOVABLE_HOSTING_IP}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(LOVABLE_HOSTING_IP, "dns-ip")}
                    className="text-slate-300 hover:text-indigo-500 p-1"
                    title="Copiar IP"
                  >
                    {copiedField === "dns-ip" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                La propagación DNS puede tardar hasta 72 horas. El SSL se aprovisiona automáticamente.
                Si usás Cloudflare, deshabilitá el proxy (nube gris) durante la verificación inicial.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 mt-2">
            Después de guardar, te mostraremos los registros DNS que tenés que configurar.
          </p>
        )}
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Socios Totales", value: memberCount, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Activos", value: activeMembers, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Inactivos", value: inactiveMembers, icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Suscripciones Activas", value: activeSubs, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
        ].map(stat => (
          <Card key={stat.label} className="bg-white border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
              </div>
              <span className="text-[10px] tracking-widest uppercase text-slate-400">{stat.label}</span>
            </div>
            <p className="text-xl font-bold font-display">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Revenue Total", value: fmt(totalRevenue), icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Revenue Mes", value: fmt(monthlyRevenue), icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Check-ins Hoy", value: checkInsToday, icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Clases / Planes", value: `${classCount} / ${planCount}`, icon: Layers, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(stat => (
          <Card key={stat.label} className="bg-white border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
              </div>
              <span className="text-[10px] tracking-widest uppercase text-slate-400">{stat.label}</span>
            </div>
            <p className="text-xl font-bold font-display">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Data Import / Migration */}
      <Card className="bg-white border-slate-200 p-5 shadow-sm">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-4 flex items-center gap-2">
          <Upload className="h-3.5 w-3.5" /> Importar Datos (Migración CSV)
        </h3>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Label className="text-xs text-slate-500 mb-2 block">Tabla de destino</Label>
            <div className="flex flex-wrap gap-2">
              {IMPORT_TABLES.map(t => (
                <button
                  key={t.key}
                  onClick={() => setSelectedImportTable(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedImportTable === t.key
                      ? "bg-indigo-100 text-indigo-700 font-semibold"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadTemplate(selectedImportTable)}
              className="text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" /> Plantilla CSV
            </Button>
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button size="sm" disabled={importing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {importing ? "Importando..." : "Subir CSV"}
              </Button>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-3">
          Descargue la plantilla CSV, llénela con los datos y súbala. Los datos se asignarán automáticamente a este gimnasio.
        </p>
      </Card>

      {/* Members + their exercise & nutrition plans */}
      <GymMembersPlansPanel gymId={gymId} />

      {/* Contact & Subscription Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white border-slate-200 p-5 shadow-sm">
          <h3 className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-3">Información de Contacto</h3>
          <div className="space-y-2">
            {gym.email && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> {gym.email}
              </div>
            )}
            {gym.phone && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Phone className="h-3.5 w-3.5 text-slate-400" /> {gym.phone}
              </div>
            )}
            {gym.address && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> {gym.address}
              </div>
            )}
            {!gym.email && !gym.phone && !gym.address && (
              <p className="text-xs text-slate-300 italic">Sin información de contacto</p>
            )}
          </div>
        </Card>

        <Card className="bg-white border-slate-200 p-5 shadow-sm">
          <h3 className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-3">Suscripción Plataforma</h3>
          {subscription ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Plan:</span><span className="font-semibold capitalize">{subscription.plan_type}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Monto:</span><span className="font-semibold">{fmt(subscription.monthly_amount, subscription.currency)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Estado:</span>
                <Badge variant="outline" className={`text-[9px] ${subscription.status === "active" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-red-600 bg-red-50 border-red-200"}`}>
                  {subscription.status}
                </Badge>
              </div>
              <div className="flex justify-between"><span className="text-slate-400">Inicio:</span><span>{new Date(subscription.start_date).toLocaleDateString("es-CR")}</span></div>
              {subscription.next_payment_date && (
                <div className="flex justify-between"><span className="text-slate-400">Próximo pago:</span><span>{new Date(subscription.next_payment_date).toLocaleDateString("es-CR")}</span></div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-300 italic">Sin suscripción registrada</p>
          )}
        </Card>
      </div>

      {/* Features */}
      <Card className="bg-white border-slate-200 p-5 shadow-sm">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-4">Módulos / Funciones</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {features.map(f => (
            <div key={f.id} className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${f.enabled ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50"}`}>
              <span className={`text-xs font-medium ${f.enabled ? "text-emerald-700" : "text-slate-400"}`}>
                {FEATURE_LABELS[f.feature_name] ?? f.feature_name}
              </span>
              <Switch checked={f.enabled} onCheckedChange={() => toggleFeature(f.feature_name, f.enabled)} className="scale-75" />
            </div>
          ))}
          {features.length === 0 && <p className="text-xs text-slate-300 italic col-span-full">Sin módulos configurados</p>}
        </div>
      </Card>

      {/* Recent Payments */}
      <Card className="bg-white border-slate-200 p-5 shadow-sm">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-4">Últimos Pagos del Gym</h3>
        {recentPayments.length > 0 ? (
          <div className="space-y-2">
            {recentPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${p.status === "paid" ? "bg-emerald-500" : p.status === "pending" ? "bg-amber-500" : "bg-red-500"}`} />
                  <div>
                    <p className="text-xs font-medium">{fmt(Number(p.amount), p.currency)}</p>
                    <p className="text-[10px] text-slate-400">{p.payment_method} · {new Date(p.payment_date).toLocaleDateString("es-CR")}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[9px] ${p.status === "paid" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-amber-600 bg-amber-50 border-amber-200"}`}>
                  {p.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-300 italic">Sin pagos registrados</p>
        )}
      </Card>

      {/* Infrastructure */}
      <Card className="bg-white border-slate-200 p-5 shadow-sm">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-4">Infraestructura</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Storage", value: `${(memberCount * 0.12).toFixed(1)} MB` },
            { label: "DB Rows (est.)", value: `${memberCount * 8}` },
            { label: "Trial expira", value: gym.trial_ends_at ? new Date(gym.trial_ends_at).toLocaleDateString("es-CR") : "N/A" },
          ].map(r => (
            <div key={r.label} className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] text-slate-400 mb-1">{r.label}</p>
              <p className="text-sm font-semibold">{r.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
