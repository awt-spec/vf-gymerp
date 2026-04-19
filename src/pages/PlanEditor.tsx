import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/hooks/useGym";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X, Trash2, Save, Check } from "lucide-react";
import { CURRENCIES, formatCurrency } from "@/lib/currency";

const PRESET_COLORS = [
  "#00E676", "#3b82f6", "#8b5cf6", "#ec4899",
  "#f59e0b", "#10b981", "#ef4444", "#6366f1",
];

export default function PlanEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { gymId } = useGym();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    duration_days: "30",
    currency: "CRC",
    is_active: true,
    color: "#00E676",
    benefits: [] as string[],
  });
  const [newBenefit, setNewBenefit] = useState("");

  useEffect(() => {
    if (!id || id === "nuevo") { setLoading(false); return; }
    (async () => {
      const { data } = await supabase.from("plans").select("*").eq("id", id).single();
      if (data) {
        setForm({
          name: data.name ?? "",
          description: data.description ?? "",
          price: String(data.price ?? ""),
          duration_days: String(data.duration_days ?? 30),
          currency: data.currency ?? "CRC",
          is_active: data.is_active ?? true,
          color: data.color ?? "#00E676",
          benefits: (data.benefits as string[]) ?? [],
        });
      }
      setLoading(false);
    })();
  }, [id]);

  const addBenefit = () => {
    if (!newBenefit.trim()) return;
    setForm({ ...form, benefits: [...form.benefits, newBenefit.trim()] });
    setNewBenefit("");
  };

  const removeBenefit = (i: number) => {
    setForm({ ...form, benefits: form.benefits.filter((_, idx) => idx !== i) });
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      toast({ title: "Faltan datos", description: "Nombre y precio son obligatorios", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      price: Number(form.price),
      duration_days: Number(form.duration_days),
      currency: form.currency,
      is_active: form.is_active,
      color: form.color,
      benefits: form.benefits,
    };
    const { error } = id && id !== "nuevo"
      ? await supabase.from("plans").update(payload).eq("id", id)
      : await supabase.from("plans").insert({ ...payload, gym_id: gymId });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: id && id !== "nuevo" ? "Plan actualizado ✅" : "Plan creado ✅" });
    navigate("/planes");
  };

  const handleDelete = async () => {
    if (!id || id === "nuevo") return;
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Plan eliminado" });
    navigate("/planes");
  };

  if (loading) return <div className="text-center py-10 text-sm text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/planes")} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-3xl font-display font-bold">
            {id && id !== "nuevo" ? "Editar plan" : "Nuevo plan"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Configurá los detalles del plan</p>
        </div>
        <div className="flex items-center gap-2">
          {id && id !== "nuevo" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" /> Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar este plan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Los pagos históricos asociados se mantendrán, pero el plan dejará de estar disponible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
            <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-display">Información básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ej: Mensual Plus" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descripción</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Acceso al gym + 8 clases grupales al mes"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Precio *</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Días</Label>
                  <Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Moneda</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Plan activo</p>
                  <p className="text-xs text-muted-foreground">Los planes inactivos no se pueden vender</p>
                </div>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-display">Beneficios incluidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBenefit(); } }}
                  placeholder="ej: Acceso a sauna"
                  className="text-sm"
                />
                <Button size="sm" onClick={addBenefit} variant="outline" className="gap-1">
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </div>
              {form.benefits.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">Sin beneficios todavía</p>
              ) : (
                <ul className="space-y-1.5">
                  {form.benefits.map((b, i) => (
                    <li key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 text-sm">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="flex-1">{b}</span>
                      <button
                        onClick={() => removeBenefit(i)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-display">Apariencia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Color del plan</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ background: c, borderColor: form.color === c ? "white" : "transparent", boxShadow: form.color === c ? `0 0 0 2px ${c}` : undefined }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-8 w-8 rounded-full cursor-pointer border-2 border-border"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">Vista previa</Label>
          <Card style={{ borderTopWidth: 3, borderTopColor: form.color }}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-semibold text-sm">{form.name || "Nombre del plan"}</h3>
                <Badge variant={form.is_active ? "default" : "secondary"} className="text-[10px]">
                  {form.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <p className="text-2xl font-display font-bold">
                {form.price ? formatCurrency(Number(form.price), form.currency) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">{form.duration_days} días · {form.currency}</p>
              {form.description && <p className="text-xs text-muted-foreground">{form.description}</p>}
              {form.benefits.length > 0 && (
                <ul className="space-y-1 pt-1">
                  {form.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <Check className="h-3 w-3 shrink-0 mt-0.5" style={{ color: form.color }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
