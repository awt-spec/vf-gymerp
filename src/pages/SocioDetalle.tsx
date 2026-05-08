import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Phone, IdCard, Calendar, Pencil, AlertTriangle, User, Activity, Plus, X } from "lucide-react";

type Member = {
  id: string;
  first_name: string;
  last_name: string;
  cedula: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  status: "active" | "inactive" | "suspended";
  notes: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = { active: "Activo", inactive: "Inactivo", suspended: "Suspendido" };
const STATUS_CLS: Record<string, string> = {
  active: "bg-primary/20 text-primary border-primary/30",
  inactive: "bg-muted text-muted-foreground border-border",
  suspended: "bg-destructive/20 text-destructive border-destructive/30",
};

export default function SocioDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const [gymId, setGymId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<any[]>([]);
  const [inbodyList, setInbodyList] = useState<any[]>([]);
  const [showInbodyForm, setShowInbodyForm] = useState(false);
  const [savingInbody, setSavingInbody] = useState(false);
  const [inbodyForm, setInbodyForm] = useState({
    measurement_date: new Date().toISOString().split("T")[0],
    weight_kg: "", muscle_mass_kg: "", body_fat_pct: "",
    visceral_fat_level: "", bmi: "", metabolic_age: "", notes: ""
  });

  const refreshInbody = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("inbody_results")
      .select("*")
      .eq("member_id", id)
      .order("measurement_date", { ascending: false });
    setInbodyList(data || []);
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("members").select("*").eq("id", id).maybeSingle();
      setMember(data as Member | null);
      setGymId((data as any)?.gym_id ?? null);
      const { data: s } = await supabase
        .from("subscriptions")
        .select("id, start_date, end_date, status, plans(name, price, currency)")
        .eq("member_id", id)
        .order("start_date", { ascending: false });
      setSubs(s ?? []);
      await refreshInbody();
      setLoading(false);
    })();
  }, [id]);

  const saveInbody = async () => {
    if (!id) return;
    setSavingInbody(true);
    const { error } = await supabase.from("inbody_results").insert({
      member_id: id,
      gym_id: gymId,
      measurement_date: inbodyForm.measurement_date,
      weight_kg: parseFloat(inbodyForm.weight_kg) || null,
      muscle_mass_kg: parseFloat(inbodyForm.muscle_mass_kg) || null,
      body_fat_pct: parseFloat(inbodyForm.body_fat_pct) || null,
      visceral_fat_level: parseInt(inbodyForm.visceral_fat_level) || null,
      bmi: parseFloat(inbodyForm.bmi) || null,
      metabolic_age: parseInt(inbodyForm.metabolic_age) || null,
      notes: inbodyForm.notes || null,
    });
    setSavingInbody(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Medición InBody guardada ✅" });
    setShowInbodyForm(false);
    setInbodyForm({
      measurement_date: new Date().toISOString().split("T")[0],
      weight_kg: "", muscle_mass_kg: "", body_fat_pct: "",
      visceral_fat_level: "", bmi: "", metabolic_age: "", notes: ""
    });
    await refreshInbody();
  };

  const toggleActive = async () => {
    if (!member) return;
    const next = member.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("members").update({ status: next }).eq("id", member.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setMember({ ...member, status: next });
    toast({ title: next === "active" ? "Usuario activado" : "Usuario desactivado" });
  };

  if (loading) return <div className="text-sm text-muted-foreground">Cargando…</div>;
  if (!member) return <div className="text-sm text-muted-foreground">Usuario no encontrado</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link to="/socios"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            {member.first_name} {member.last_name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={STATUS_CLS[member.status]}>{STATUS_LABEL[member.status]}</Badge>
            <span className="text-xs text-muted-foreground">Registrado {new Date(member.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <Button variant="outline" onClick={toggleActive}>
          {member.status === "active" ? "Desactivar" : "Activar"}
        </Button>
        <Button onClick={() => navigate(`/socios/${member.id}/editar`)}>
          <Pencil className="h-4 w-4 mr-2" />Editar
        </Button>
      </div>

      {member.status === "suspended" && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />Motivo de suspensión
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {member.notes || <span className="italic text-muted-foreground">No se registró un motivo. Editá el usuario para agregarlo.</span>}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm font-display">Contacto</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><IdCard className="h-4 w-4 text-muted-foreground" /><span className="font-mono">{member.cedula || "—"}</span></div>
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{member.email || "—"}</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{member.phone || "—"}</div>
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />{member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString() : "—"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-display">Membresías</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {subs.length === 0 && <p className="text-muted-foreground italic">Sin suscripciones registradas</p>}
            {subs.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between border border-border/50 rounded p-2">
                <div>
                  <div className="font-medium">{s.plans?.name ?? "Plan"}</div>
                  <div className="text-xs text-muted-foreground">{s.start_date} → {s.end_date}</div>
                </div>
                <Badge variant="outline">{s.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {member.notes && member.status !== "suspended" && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-display">Notas</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{member.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
