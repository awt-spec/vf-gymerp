import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPublicBaseUrl } from "@/lib/publicUrl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Shield, Building2, Users, CreditCard, TrendingUp,
  ExternalLink, LogOut, ChevronRight, Dumbbell, BarChart3,
  Settings, Layers, Plus, Receipt, Server,
  CheckCircle2, AlertTriangle, FileText, Mail, Lock, User, Phone, Copy, Link2, Check, Trash2
} from "lucide-react";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import GymDetailPanel from "@/components/erp/GymDetailPanel";
import ErpAiAssistant from "@/components/erp/ErpAiAssistant";

/* ─── Types ─── */
type GymInstance = {
  id: string; name: string; slug: string; logo_url: string | null;
  primary_color: string | null; email: string | null; phone: string | null;
  address: string | null; subscription_status: string; trial_ends_at: string | null;
  created_at: string; owner_user_id: string; memberCount: number;
  activeSubscriptions: number; monthlyRevenue: number;
  subscription?: { id: string; plan_type: string; monthly_amount: number; currency: string; next_payment_date: string | null; status: string } | null;
};

type GymInvoice = {
  id: string; gym_id: string; gym_name?: string; amount: number; currency: string;
  issue_date: string; due_date: string; paid_date: string | null; status: string; notes: string | null;
};

type GymFeatureRow = { id: string; gym_id: string; feature_name: string; enabled: boolean };

const ALL_FEATURES = [
  "socios", "planes", "pagos", "contabilidad", "inventario",
  "clases", "tienda", "nutricion", "ejercicio", "acceso", "reportes", "mercadeo", "ia"
];

const FEATURE_LABELS: Record<string, string> = {
  socios: "Socios", planes: "Planes", pagos: "Pagos", contabilidad: "Contabilidad",
  inventario: "Inventario", clases: "Clases", tienda: "Tienda", nutricion: "Nutrición",
  ejercicio: "Ejercicio", acceso: "Control Acceso", reportes: "Reportes", mercadeo: "Mercadeo", ia: "IA"
};

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "gyms", label: "Gimnasios", icon: Building2 },
  { id: "billing", label: "Facturación", icon: Receipt },
  { id: "infra", label: "Infraestructura", icon: Server },
];

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};

const statusBadge = (status: string) => {
  const map: Record<string, { cls: string; label: string }> = {
    active: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Activo" },
    trial: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Prueba" },
    suspended: { cls: "bg-red-50 text-red-700 border-red-200", label: "Suspendido" },
    cancelled: { cls: "bg-zinc-100 text-zinc-600 border-zinc-200", label: "Cancelado" },
    paid: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Pagada" },
    pending: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Pendiente" },
    overdue: { cls: "bg-red-50 text-red-700 border-red-200", label: "Vencida" },
  };
  const s = map[status] ?? { cls: "bg-zinc-100 text-zinc-500 border-zinc-200", label: status };
  return <Badge variant="outline" className={`text-[9px] tracking-widest uppercase ${s.cls}`}>{s.label}</Badge>;
};

const fmt = (n: number, c = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n);

export default function ErpDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [gyms, setGyms] = useState<GymInstance[]>([]);
  const [invoices, setInvoices] = useState<GymInvoice[]>([]);
  const [features, setFeatures] = useState<GymFeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewGym, setShowNewGym] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdGymResult, setCreatedGymResult] = useState<{
    gym_name: string; slug: string; admin_email: string; admin_password: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [newGym, setNewGym] = useState({
    gym_name: "", slug: "", admin_email: "", admin_password: "", admin_name: "", admin_phone: ""
  });
  const [deleteGymId, setDeleteGymId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const getBaseUrl = () => getPublicBaseUrl();
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };
  const totalMembers = gyms.reduce((s, g) => s + g.memberCount, 0);
  const totalActiveSubs = gyms.reduce((s, g) => s + g.activeSubscriptions, 0);
  const platformRevenue = gyms.reduce((s, g) => s + (g.subscription?.monthly_amount ?? 0), 0);

  const fetchData = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      navigate("/", { replace: true });
      return;
    }

    setLoading(true);
    try {
      const [{ data: gymsData }, { data: members }, { data: subs }, { data: payments }, { data: gymSubs }, { data: invData }, { data: featData }] = await Promise.all([
        supabase.from("gyms").select("*"),
        supabase.from("members").select("id, gym_id, status"),
        supabase.from("subscriptions").select("id, gym_id, status"),
        supabase.from("payments").select("amount, gym_id, payment_date, status"),
        supabase.from("gym_subscriptions").select("*"),
        supabase.from("gym_invoices").select("*"),
        supabase.from("gym_features").select("*"),
      ]);

      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const enriched: GymInstance[] = (gymsData ?? []).map(gym => {
        const gm = members?.filter(m => m.gym_id === gym.id) ?? [];
        const gs = subs?.filter(s => s.gym_id === gym.id && s.status === "active") ?? [];
        const gp = payments?.filter(p => p.gym_id === gym.id && p.status === "paid" && p.payment_date?.startsWith(thisMonth)) ?? [];
        const rev = gp.reduce((s, p) => s + Number(p.amount), 0);
        const sub = gymSubs?.find(s => s.gym_id === gym.id) ?? null;
        return { ...gym, memberCount: gm.length, activeSubscriptions: gs.length, monthlyRevenue: rev, subscription: sub };
      });

      setGyms(enriched);
      setInvoices((invData ?? []).map(inv => ({ ...inv, gym_name: enriched.find(g => g.id === inv.gym_id)?.name ?? "—" })));
      setFeatures(featData ?? []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  const toggleFeature = async (gymId: string, featureName: string, currentEnabled: boolean) => {
    const { error } = await supabase.from("gym_features").update({ enabled: !currentEnabled }).eq("gym_id", gymId).eq("feature_name", featureName);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setFeatures(prev => prev.map(f => f.gym_id === gymId && f.feature_name === featureName ? { ...f, enabled: !currentEnabled } : f));
  };

  const markInvoicePaid = async (invoiceId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("gym_invoices").update({ status: "paid", paid_date: today }).eq("id", invoiceId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: "paid", paid_date: today } : inv));
    toast({ title: "Factura marcada como pagada" });
  };

  const handleDeleteGym = async () => {
    if (!deleteGymId) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-gym", { body: { gym_id: deleteGymId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Gimnasio eliminado" });
      setDeleteGymId(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateGym = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-gym", {
        body: newGym,
      });

      // Edge function may return a non-2xx with a structured body; try to read it
      let payload: any = data ?? null;
      if (!payload && (error as any)?.context?.json) {
        try { payload = await (error as any).context.json(); } catch {}
      }
      if (!payload && (error as any)?.context && typeof (error as any).context.text === "function") {
        try { payload = JSON.parse(await (error as any).context.text()); } catch {}
      }

      const errorCode = payload?.error;
      const errorMessage = payload?.message || (typeof errorCode === "string" ? errorCode : null);

      if (errorCode === "EMAIL_ALREADY_REGISTERED") {
        toast({
          title: "Email ya registrado",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      if (error) throw new Error(errorMessage || error.message || "Error al crear gimnasio");
      if (payload?.error) throw new Error(errorMessage);

      setShowNewGym(false);
      setCreatedGymResult({
        gym_name: newGym.gym_name,
        slug: newGym.slug,
        admin_email: newGym.admin_email,
        admin_password: newGym.admin_password,
      });
      setNewGym({ gym_name: "", slug: "", admin_email: "", admin_password: "", admin_name: "", admin_phone: "" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Shield className="h-8 w-8 text-indigo-600 animate-pulse" />
          <span className="text-xs text-slate-400 tracking-widest uppercase">Cargando plataforma...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-slate-200 bg-white sticky top-0 h-screen">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <Shield className="h-4 w-4 text-indigo-600" />
          </div>
          <span className="text-sm font-bold tracking-tight font-display">
            ERP<span className="text-indigo-600">GYM</span>
          </span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs tracking-wide transition-colors ${
                activeTab === item.id
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
          <div className="pt-4 mt-4 border-t border-slate-100">
            <button
              onClick={() => setShowNewGym(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs tracking-wide text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Agregar Gimnasio
            </button>
          </div>
        </nav>
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-2 px-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <span className="text-[10px] text-slate-400 truncate flex-1">{user?.email}</span>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-bold font-display">ERP<span className="text-indigo-600">GYM</span></span>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600"><LogOut className="h-4 w-4" /></button>
        </div>
        <div className="flex overflow-x-auto px-2 pb-2 gap-1 no-scrollbar">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] tracking-wide transition-colors ${
                activeTab === item.id ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-400 hover:text-slate-600"
              }`}>
              <item.icon className="h-3 w-3" />{item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 mt-[88px] md:mt-0 space-y-6">

          {/* ──── GYM DETAIL PANEL ──── */}
          {selectedGymId ? (
            <GymDetailPanel gymId={selectedGymId} onBack={() => setSelectedGymId(null)} />
          ) : (<>

          {/* ──── DASHBOARD TAB ──── */}
          {activeTab === "dashboard" && (
            <>
              <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp}>
                <h1 className="text-2xl font-bold tracking-tight mb-1 font-display">Panel de Control</h1>
                <p className="text-slate-400 text-sm">Resumen general de la plataforma</p>
              </motion.div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Gimnasios", value: gyms.length, icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50" },
                  { label: "Socios Totales", value: totalMembers, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Suscripciones", value: totalActiveSubs, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Revenue Plataforma", value: fmt(platformRevenue), icon: CreditCard, color: "text-amber-600", bg: "bg-amber-50" },
                ].map((stat, i) => (
                  <motion.div key={stat.label} initial="hidden" animate="visible" custom={i + 1} variants={fadeUp}>
                    <Card className="bg-white border-slate-200 p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-7 h-7 rounded-lg ${stat.bg} flex items-center justify-center`}>
                          <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                        </div>
                        <span className="text-[10px] tracking-widest uppercase text-slate-400">{stat.label}</span>
                      </div>
                      <p className="text-xl font-bold font-display">{stat.value}</p>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <Card className="bg-white border-slate-200 p-5 shadow-sm">
                <h3 className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-4">Gimnasios Registrados</h3>
                <div className="space-y-3">
                  {gyms.map(gym => (
                    <div key={gym.id} className="py-3 border-b border-slate-100 last:border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200"
                            style={{ backgroundColor: `${gym.primary_color || '#6366f1'}10`, color: gym.primary_color || '#6366f1' }}>
                            <Dumbbell className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{gym.name}</p>
                            <p className="text-[10px] text-slate-400">{gym.subscription?.plan_type ?? "sin plan"} · {gym.memberCount} socios</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {statusBadge(gym.subscription?.status ?? gym.subscription_status)}
                          <Button variant="ghost" size="sm" className="text-[10px] text-indigo-400 hover:text-indigo-600"
                            onClick={() => setSelectedGymId(gym.id)}>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 ml-11">
                        <div className="flex items-center gap-1">
                          <Link2 className="h-3 w-3 text-slate-300" />
                          <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{getBaseUrl()}/gym/{gym.slug}</span>
                          <button onClick={() => copyToClipboard(`${getBaseUrl()}/gym/${gym.slug}`, `dash-link-${gym.id}`)}
                            className="text-slate-300 hover:text-indigo-500">
                            {copiedField === `dash-link-${gym.id}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                        <button onClick={() => copyToClipboard(`${getBaseUrl()}/`, `dash-login-${gym.id}`)}
                          className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-600">
                          <Lock className="h-3 w-3" /> Login
                          {copiedField === `dash-login-${gym.id}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  {gyms.length === 0 && (
                    <div className="py-8 text-center">
                      <Building2 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">No hay gimnasios registrados</p>
                    </div>
                  )}
                </div>
              </Card>

              {invoices.filter(i => i.status === "overdue").length > 0 && (
                <Card className="bg-red-50 border-red-200 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-xs font-semibold text-red-700">Alertas de Pago</span>
                  </div>
                  <p className="text-xs text-red-600">
                    {invoices.filter(i => i.status === "overdue").length} factura(s) vencida(s).{" "}
                    <button onClick={() => setActiveTab("billing")} className="underline font-medium">Ver facturación →</button>
                  </p>
                </Card>
              )}
            </>
          )}

          {/* ──── GYMS TAB ──── */}
          {activeTab === "gyms" && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight font-display">Gimnasios</h1>
                  <p className="text-slate-400 text-sm">Gestión de clientes/tenants</p>
                </div>
                <Button size="sm" onClick={() => setShowNewGym(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs tracking-wider uppercase gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Nuevo Gym
                </Button>
              </div>

              <div className="space-y-3">
                {gyms.map(gym => (
                  <Card key={gym.id} className="bg-white border-slate-200 hover:border-indigo-200 transition-all p-5 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-slate-200"
                          style={{ backgroundColor: `${gym.primary_color || '#6366f1'}10`, color: gym.primary_color || '#6366f1' }}>
                          {gym.logo_url ? <img src={gym.logo_url} alt={gym.name} className="w-full h-full object-contain rounded-xl" />
                            : <Dumbbell className="h-5 w-5" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm">{gym.name}</h3>
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className="text-[11px] text-slate-400">{getBaseUrl()}/gym/{gym.slug}</p>
                            <button onClick={() => copyToClipboard(`${getBaseUrl()}/gym/${gym.slug}`, `link-${gym.id}`)}
                              className="text-slate-300 hover:text-indigo-500 transition-colors">
                              {copiedField === `link-${gym.id}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center md:text-left">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Plan</p>
                          <p className="text-xs font-semibold capitalize">{gym.subscription?.plan_type ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Estado Pago</p>
                          {statusBadge(gym.subscription?.status ?? "—")}
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Próximo Pago</p>
                          <p className="text-xs">{gym.subscription?.next_payment_date ? new Date(gym.subscription.next_payment_date).toLocaleDateString("es-CR") : "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Monto</p>
                          <p className="text-xs font-semibold">{gym.subscription ? fmt(gym.subscription.monthly_amount, gym.subscription.currency) : "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Socios</p>
                          <p className="text-xs font-semibold">{gym.memberCount}</p>
                        </div>
                      </div>

                      {/* Links section */}
                      <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-slate-100">
                        <div className="flex items-center gap-1 bg-slate-50 rounded px-2 py-1">
                          <Link2 className="h-3 w-3 text-slate-400" />
                          <span className="text-[10px] text-slate-500 truncate max-w-[180px]">{getBaseUrl()}/gym/{gym.slug}</span>
                          <button onClick={() => copyToClipboard(`${getBaseUrl()}/gym/${gym.slug}`, `gym-link-${gym.id}`)}
                            className="ml-1 text-slate-300 hover:text-indigo-500 transition-colors">
                            {copiedField === `gym-link-${gym.id}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/gym/${gym.slug}`)}
                          className="text-[10px] tracking-widest uppercase text-slate-400 hover:text-slate-700 gap-1 h-7">
                          <ExternalLink className="h-3 w-3" /> Landing
                        </Button>
                        <Button variant="ghost" size="sm"
                          onClick={() => setSelectedGymId(gym.id)}
                          className="text-[10px] tracking-widest uppercase text-indigo-500 hover:text-indigo-700 gap-1 h-7">
                          Ver Detalle <ChevronRight className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm"
                          onClick={() => setDeleteGymId(gym.id)}
                          className="text-[10px] tracking-widest uppercase text-red-400 hover:text-red-600 hover:bg-red-50 gap-1 h-7">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {gyms.length === 0 && (
                  <Card className="bg-white border-slate-200 p-12 text-center shadow-sm">
                    <Building2 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">No hay gimnasios registrados</p>
                    <Button variant="outline" size="sm" onClick={() => setShowNewGym(true)} className="mt-4 text-xs">
                      Registrar primer gimnasio
                    </Button>
                  </Card>
                )}
              </div>
            </>
          )}

          {/* ──── BILLING TAB ──── */}
          {activeTab === "billing" && (
            <>
              <div>
                <h1 className="text-2xl font-bold tracking-tight font-display">Facturación</h1>
                <p className="text-slate-400 text-sm">Pagos e invoices de la plataforma</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Card className="bg-white border-slate-200 p-4 shadow-sm">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Revenue Mensual</p>
                  <p className="text-xl font-bold text-emerald-600 font-display">{fmt(platformRevenue)}</p>
                </Card>
                <Card className="bg-white border-slate-200 p-4 shadow-sm">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Facturas Pendientes</p>
                  <p className="text-xl font-bold text-amber-600 font-display">{invoices.filter(i => i.status === "pending").length}</p>
                </Card>
                <Card className="bg-white border-slate-200 p-4 shadow-sm">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Facturas Vencidas</p>
                  <p className="text-xl font-bold text-red-600 font-display">{invoices.filter(i => i.status === "overdue").length}</p>
                </Card>
              </div>

              <Card className="bg-white border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-xs font-semibold tracking-widest uppercase text-slate-400">Historial de Facturas</h3>
                </div>
                {invoices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-100">
                        <TableHead className="text-[10px] text-slate-400 uppercase tracking-wider">Gimnasio</TableHead>
                        <TableHead className="text-[10px] text-slate-400 uppercase tracking-wider">Monto</TableHead>
                        <TableHead className="text-[10px] text-slate-400 uppercase tracking-wider">Emisión</TableHead>
                        <TableHead className="text-[10px] text-slate-400 uppercase tracking-wider">Vencimiento</TableHead>
                        <TableHead className="text-[10px] text-slate-400 uppercase tracking-wider">Estado</TableHead>
                        <TableHead className="text-[10px] text-slate-400 uppercase tracking-wider">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map(inv => (
                        <TableRow key={inv.id} className="border-slate-100 hover:bg-slate-50">
                          <TableCell className="text-xs">{inv.gym_name}</TableCell>
                          <TableCell className="text-xs font-semibold">{fmt(inv.amount, inv.currency)}</TableCell>
                          <TableCell className="text-xs text-slate-500">{new Date(inv.issue_date).toLocaleDateString("es-CR")}</TableCell>
                          <TableCell className="text-xs text-slate-500">{new Date(inv.due_date).toLocaleDateString("es-CR")}</TableCell>
                          <TableCell>{statusBadge(inv.status)}</TableCell>
                          <TableCell>
                            {inv.status !== "paid" && (
                              <Button variant="ghost" size="sm" onClick={() => markInvoicePaid(inv.id)}
                                className="text-[10px] text-emerald-600 hover:text-emerald-700 gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Marcar pagada
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-8 text-center">
                    <FileText className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No hay facturas registradas</p>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* ──── INFRASTRUCTURE TAB ──── */}
          {activeTab === "infra" && (
            <>
              <div>
                <h1 className="text-2xl font-bold tracking-tight font-display">Infraestructura</h1>
                <p className="text-slate-400 text-sm">Estado de servicios y uso de recursos</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { name: "Base de Datos", uptime: "99.98%", icon: Server },
                  { name: "Autenticación", uptime: "99.99%", icon: Shield },
                  { name: "Edge Functions", uptime: "99.95%", icon: Layers },
                ].map(svc => (
                  <Card key={svc.name} className="bg-white border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svc.icon className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-medium">{svc.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-emerald-600">Operativo</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">Uptime: {svc.uptime}</p>
                  </Card>
                ))}
              </div>

              <Card className="bg-white border-slate-200 p-5 shadow-sm">
                <h3 className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-4">Uso por Gimnasio</h3>
                <div className="space-y-4">
                  {gyms.map(gym => (
                    <div key={gym.id} className="space-y-2 pb-4 border-b border-slate-100 last:border-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{gym.name}</p>
                        <span className="text-[10px] text-slate-400">{gym.memberCount} socios · {gym.activeSubscriptions} subs</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Storage", value: `${(gym.memberCount * 0.12).toFixed(1)} MB`, pct: Math.min(gym.memberCount * 1.2, 100) },
                          { label: "DB Rows", value: `${gym.memberCount * 8}`, pct: Math.min(gym.memberCount * 0.8, 100) },
                          { label: "Edge Calls", value: `${gym.memberCount * 3}/día`, pct: Math.min(gym.memberCount * 0.6, 100) },
                        ].map(r => (
                          <div key={r.label}>
                            <div className="flex justify-between text-[10px] mb-1">
                              <span className="text-slate-400">{r.label}</span>
                              <span className="text-slate-600">{r.value}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${r.pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          </>)}
        </div>
      </main>

      {/* ──── AI ASSISTANT (per-tab) ──── */}
      {!selectedGymId && (
        <ErpAiAssistant
          key={activeTab}
          tab={activeTab}
          tabLabel={NAV_ITEMS.find(n => n.id === activeTab)?.label}
          context={
            activeTab === "dashboard" ? {
              total_gyms: gyms.length,
              total_members: totalMembers,
              total_active_subs: totalActiveSubs,
              platform_revenue_usd: platformRevenue,
              gyms: gyms.map(g => ({ name: g.name, members: g.memberCount, active_subs: g.activeSubscriptions, revenue: g.monthlyRevenue, status: g.subscription_status })),
              overdue_invoices: invoices.filter(i => i.status === "overdue").length,
            } : activeTab === "gyms" ? {
              gyms: gyms.map(g => ({
                name: g.name, slug: g.slug, members: g.memberCount,
                active_subs: g.activeSubscriptions, monthly_revenue: g.monthlyRevenue,
                plan: g.subscription?.plan_type, status: g.subscription_status,
                next_payment: g.subscription?.next_payment_date,
              })),
            } : activeTab === "billing" ? {
              total_invoices: invoices.length,
              paid: invoices.filter(i => i.status === "paid").length,
              pending: invoices.filter(i => i.status === "pending").length,
              overdue: invoices.filter(i => i.status === "overdue").length,
              mrr: platformRevenue,
              invoices: invoices.slice(0, 30).map(i => ({ gym: i.gym_name, amount: i.amount, currency: i.currency, status: i.status, due: i.due_date })),
            } : {
              gyms_resource_usage: gyms.map(g => ({
                name: g.name, members: g.memberCount,
                est_storage_mb: +(g.memberCount * 0.12).toFixed(1),
                est_db_rows: g.memberCount * 8,
                est_edge_calls_day: g.memberCount * 3,
              })),
            }
          }
        />
      )}

      {/* ──── DELETE CONFIRMATION ──── */}
      <AlertDialog open={!!deleteGymId} onOpenChange={() => setDeleteGymId(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">¿Eliminar gimnasio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará <strong>{gyms.find(g => g.id === deleteGymId)?.name}</strong> y todos sus datos (socios, pagos, clases, etc.). No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGym} disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? "Eliminando..." : "Eliminar permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ──── NEW GYM MODAL ──── */}
      <Dialog open={showNewGym} onOpenChange={setShowNewGym}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" /> Nuevo Gimnasio
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateGym} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Nombre del Gimnasio *</Label>
              <Input value={newGym.gym_name} onChange={(e) => setNewGym({ ...newGym, gym_name: e.target.value, slug: generateSlug(e.target.value) })} placeholder="Iron Gym" required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Slug (URL) *</Label>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 whitespace-nowrap">/gym/</span>
                <Input value={newGym.slug} onChange={(e) => setNewGym({ ...newGym, slug: generateSlug(e.target.value) })} placeholder="iron-gym" required />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-3">Cuenta Admin del Gym</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> Nombre Admin *</Label>
              <Input value={newGym.admin_name} onChange={(e) => setNewGym({ ...newGym, admin_name: e.target.value })} placeholder="Juan Pérez" required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email Admin *</Label>
              <Input type="email" value={newGym.admin_email} onChange={(e) => setNewGym({ ...newGym, admin_email: e.target.value })} placeholder="admin@gym.com" required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1"><Lock className="h-3 w-3" /> Contraseña *</Label>
              <Input type="password" value={newGym.admin_password} onChange={(e) => setNewGym({ ...newGym, admin_password: e.target.value })} placeholder="Mínimo 6 caracteres" required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Teléfono</Label>
              <Input value={newGym.admin_phone} onChange={(e) => setNewGym({ ...newGym, admin_phone: e.target.value })} placeholder="+506 8888-8888" />
            </div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={creating}>
              {creating ? "Creando..." : "Crear Gimnasio"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──── SUCCESS / CREDENTIALS MODAL ──── */}
      <Dialog open={!!createdGymResult} onOpenChange={() => setCreatedGymResult(null)}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" /> ¡Gimnasio Creado!
            </DialogTitle>
          </DialogHeader>
          {createdGymResult && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                <strong>{createdGymResult.gym_name}</strong> está listo. Compartí estos datos con el cliente:
              </p>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Landing Page</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-white px-2 py-1 rounded border border-slate-200 flex-1 truncate">
                      {getBaseUrl()}/gym/{createdGymResult.slug}
                    </code>
                    <button onClick={() => copyToClipboard(`${getBaseUrl()}/gym/${createdGymResult.slug}`, "cred-landing")}
                      className="text-slate-400 hover:text-indigo-600 transition-colors">
                      {copiedField === "cred-landing" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Login del Admin</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-white px-2 py-1 rounded border border-slate-200 flex-1 truncate">
                      {getBaseUrl()}/
                    </code>
                    <button onClick={() => copyToClipboard(`${getBaseUrl()}/`, "cred-login")}
                      className="text-slate-400 hover:text-indigo-600 transition-colors">
                      {copiedField === "cred-login" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">Credenciales Admin</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Email:</span>
                      <div className="flex items-center gap-1">
                        <code className="text-xs font-medium">{createdGymResult.admin_email}</code>
                        <button onClick={() => copyToClipboard(createdGymResult.admin_email, "cred-email")}
                          className="text-slate-400 hover:text-indigo-600">
                          {copiedField === "cred-email" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Contraseña:</span>
                      <div className="flex items-center gap-1">
                        <code className="text-xs font-medium">{createdGymResult.admin_password}</code>
                        <button onClick={() => copyToClipboard(createdGymResult.admin_password, "cred-pw")}
                          className="text-slate-400 hover:text-indigo-600">
                          {copiedField === "cred-pw" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 text-xs gap-1" onClick={() => {
                  const text = `🏋️ ${createdGymResult.gym_name}\n\n🔗 Landing: ${getBaseUrl()}/gym/${createdGymResult.slug}\n🔐 Login: ${getBaseUrl()}/\n📧 Email: ${createdGymResult.admin_email}\n🔑 Contraseña: ${createdGymResult.admin_password}`;
                  copyToClipboard(text, "cred-all");
                }}>
                  {copiedField === "cred-all" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  Copiar Todo
                </Button>
                <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs" onClick={() => setCreatedGymResult(null)}>
                  Listo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
