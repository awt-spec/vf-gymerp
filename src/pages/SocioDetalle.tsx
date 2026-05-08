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
import { ArrowLeft, Mail, Phone, IdCard, Calendar, Pencil, AlertTriangle, User, Activity, Plus, X, Upload, Send, Loader2, CheckCircle2, FileText } from "lucide-react";
import AppointmentsPanel from "@/components/AppointmentsPanel";

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
    visceral_fat_level: "", bmi: "", metabolic_age: "", notes: "",
    file_url: "" as string | null, file_type: "" as string | null,
  });
  const [parsing, setParsing] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

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
      file_url: inbodyForm.file_url || null,
      file_type: inbodyForm.file_type || null,
    });
    setSavingInbody(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Medición InBody guardada ✅" });
    setShowInbodyForm(false);
    setInbodyForm({
      measurement_date: new Date().toISOString().split("T")[0],
      weight_kg: "", muscle_mass_kg: "", body_fat_pct: "",
      visceral_fat_level: "", bmi: "", metabolic_age: "", notes: "",
      file_url: "", file_type: "",
    });
    await refreshInbody();
  };

  const handleFileUpload = async (file: File) => {
    if (!id) return;
    setParsing(true);
    try {
      const path = `${id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("inbody-files").upload(path, file);
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("inbody-files").createSignedUrl(path, 3600);
      if (!signed?.signedUrl) throw new Error("No signed URL");
      setInbodyForm(f => ({ ...f, file_url: path, file_type: file.type }));

      toast({ title: "Archivo subido, extrayendo datos con IA..." });
      const { data, error } = await supabase.functions.invoke("parse-inbody", {
        body: { fileUrl: signed.signedUrl, fileType: file.type },
      });
      if (error) throw error;
      const p = data?.data || {};
      setInbodyForm(f => ({
        ...f,
        measurement_date: p.measurement_date || f.measurement_date,
        weight_kg: p.weight_kg != null ? String(p.weight_kg) : f.weight_kg,
        muscle_mass_kg: p.muscle_mass_kg != null ? String(p.muscle_mass_kg) : f.muscle_mass_kg,
        body_fat_pct: p.body_fat_pct != null ? String(p.body_fat_pct) : f.body_fat_pct,
        visceral_fat_level: p.visceral_fat_level != null ? String(p.visceral_fat_level) : f.visceral_fat_level,
        bmi: p.bmi != null ? String(p.bmi) : f.bmi,
        metabolic_age: p.metabolic_age != null ? String(p.metabolic_age) : f.metabolic_age,
      }));
      toast({ title: "Datos extraídos ✨", description: "Revisá y ajustá si hace falta antes de guardar." });
    } catch (e: any) {
      toast({ title: "Error procesando archivo", description: e.message || String(e), variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const sendInbodyEmail = async (rowId: string) => {
    setSendingEmailId(rowId);
    try {
      const { data, error } = await supabase.functions.invoke("send-inbody-email", { body: { inbodyId: rowId } });
      if (error) throw error;
      if (data?.sent) {
        toast({ title: "Email enviado ✅" });
        await refreshInbody();
      } else {
        toast({ title: "No se pudo enviar", description: data?.error || "Verificá la conexión a Resend", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || String(e), variant: "destructive" });
    } finally {
      setSendingEmailId(null);
    }
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

      {/* Composición Corporal InBody */}
      <Card className="border-cyan-500/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" /> Composición Corporal (InBody)
          </CardTitle>
          <Button size="sm" variant={showInbodyForm ? "ghost" : "default"} onClick={() => setShowInbodyForm(v => !v)}>
            {showInbodyForm ? <><X className="h-4 w-4 mr-1" />Cancelar</> : <><Plus className="h-4 w-4 mr-1" />Nueva medición</>}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showInbodyForm && (
            <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
              {/* Subida de archivo InBody con parseo IA */}
              <div className="rounded-lg border border-dashed border-cyan-500/40 bg-cyan-500/5 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs">
                    <Upload className="h-4 w-4 text-cyan-400" />
                    <span className="font-medium text-foreground">Cargar PDF o XML del InBody</span>
                  </div>
                  {parsing && <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">La IA extrae los valores automáticamente. Podés revisarlos abajo antes de guardar.</p>
                <Input
                  type="file"
                  accept="application/pdf,text/xml,application/xml,image/*,.xml,.pdf"
                  disabled={parsing}
                  className="mt-2 text-xs"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                />
                {inbodyForm.file_url && (
                  <p className="text-[10px] text-primary mt-2 flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Archivo adjunto listo para guardar
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Fecha</Label>
                  <Input type="date" value={inbodyForm.measurement_date}
                    onChange={e => setInbodyForm(f => ({ ...f, measurement_date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Peso (kg)</Label>
                  <Input type="number" step="0.1" value={inbodyForm.weight_kg}
                    onChange={e => setInbodyForm(f => ({ ...f, weight_kg: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Masa muscular (kg)</Label>
                  <Input type="number" step="0.1" value={inbodyForm.muscle_mass_kg}
                    onChange={e => setInbodyForm(f => ({ ...f, muscle_mass_kg: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">% Grasa corporal</Label>
                  <Input type="number" step="0.1" value={inbodyForm.body_fat_pct}
                    onChange={e => setInbodyForm(f => ({ ...f, body_fat_pct: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Grasa visceral (nivel)</Label>
                  <Input type="number" value={inbodyForm.visceral_fat_level}
                    onChange={e => setInbodyForm(f => ({ ...f, visceral_fat_level: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">IMC</Label>
                  <Input type="number" step="0.1" value={inbodyForm.bmi}
                    onChange={e => setInbodyForm(f => ({ ...f, bmi: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Edad metabólica</Label>
                  <Input type="number" value={inbodyForm.metabolic_age}
                    onChange={e => setInbodyForm(f => ({ ...f, metabolic_age: e.target.value }))} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Notas</Label>
                  <Textarea rows={2} value={inbodyForm.notes}
                    onChange={e => setInbodyForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <Button onClick={saveInbody} disabled={savingInbody || parsing} className="w-full">
                {savingInbody ? "Guardando..." : "Guardar medición"}
              </Button>
            </div>
          )}

          {inbodyList.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Sin mediciones registradas</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Historial ({inbodyList.length})
              </p>
              {inbodyList.map((row) => (
                <div key={row.id} className="rounded-lg border border-border/50 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {new Date(row.measurement_date).toLocaleDateString("es-CR", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {row.file_url && (
                        <Badge variant="outline" className="text-[10px]">
                          <FileText className="h-3 w-3 mr-1" />Archivo
                        </Badge>
                      )}
                      {row.email_sent ? (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Email enviado {row.email_sent_at ? new Date(row.email_sent_at).toLocaleDateString() : ""}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Email no enviado</Badge>
                      )}
                      <Button
                        size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                        disabled={sendingEmailId === row.id || !member?.email}
                        title={member?.email ? "Enviar al email del consumidor" : "El consumidor no tiene email"}
                        onClick={() => sendInbodyEmail(row.id)}
                      >
                        {sendingEmailId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Send className="h-3 w-3 mr-1" />{row.email_sent ? "Reenviar" : "Enviar"}</>}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                    {row.weight_kg != null && <span>⚖️ {row.weight_kg} kg</span>}
                    {row.muscle_mass_kg != null && <span>💪 {row.muscle_mass_kg} kg</span>}
                    {row.body_fat_pct != null && <span>📊 {row.body_fat_pct}%</span>}
                    {row.visceral_fat_level != null && <span>🫀 N{row.visceral_fat_level}</span>}
                    {row.bmi != null && <span>📏 {row.bmi}</span>}
                    {row.metabolic_age != null && <span>⚡ {row.metabolic_age}a</span>}
                  </div>
                  {row.notes && <p className="text-[11px] italic text-muted-foreground pt-1 border-t border-border/30">{row.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Citas con coach */}
      <AppointmentsPanel memberId={member.id} gymId={gymId} />

      {member.notes && member.status !== "suspended" && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-display">Notas</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{member.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
