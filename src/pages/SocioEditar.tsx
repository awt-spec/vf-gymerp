import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Pencil, IdCard, Mail, Phone, ShieldCheck, FileText } from "lucide-react";

export default function SocioEditar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    cedula: "",
    email: "",
    phone: "",
    date_of_birth: "",
    status: "active" as "active" | "inactive" | "suspended",
    notes: "",
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("members").select("*").eq("id", id).maybeSingle();
      if (data) {
        setForm({
          first_name: data.first_name ?? "",
          last_name: data.last_name ?? "",
          cedula: data.cedula ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          date_of_birth: data.date_of_birth ?? "",
          status: data.status,
          notes: data.notes ?? "",
        });
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    const { error } = await supabase.from("members").update({
      first_name: form.first_name,
      last_name: form.last_name,
      cedula: form.cedula,
      email: form.email || null,
      phone: form.phone || null,
      date_of_birth: form.date_of_birth || null,
      status: form.status,
      notes: form.notes || null,
    }).eq("id", id);
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Usuario actualizado ✅" });
    navigate(`/socios/${id}`);
  };

  if (loading) return <div className="text-sm text-muted-foreground">Cargando…</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link to={`/socios/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <Pencil className="h-6 w-6 text-primary" />
            Editar Usuario
          </h1>
          <p className="text-muted-foreground text-sm">{form.first_name} {form.last_name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <IdCard className="h-4 w-4" /> Información personal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required maxLength={50} />
            </div>
            <div className="space-y-1.5">
              <Label>Apellido *</Label>
              <Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required maxLength={50} />
            </div>
            <div className="space-y-1.5">
              <Label>Cédula *</Label>
              <Input value={form.cedula} onChange={e => setForm({ ...form, cedula: e.target.value })} required maxLength={30} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de nacimiento</Label>
              <Input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contacto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} maxLength={255} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Teléfono</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} maxLength={30} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Estado
          </h2>
          <div className="space-y-1.5 max-w-xs">
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">✅ Activo</SelectItem>
                <SelectItem value="inactive">⏸️ Inactivo</SelectItem>
                <SelectItem value="suspended">🚫 Suspendido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" /> Notas {form.status === "suspended" && <span className="text-destructive normal-case font-normal">(motivo de suspensión)</span>}
          </h2>
          <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} maxLength={500} />
        </section>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={() => navigate(`/socios/${id}`)} disabled={submitting}>Cancelar</Button>
          <Button type="submit" disabled={submitting} className="flex-1 sm:flex-none sm:min-w-[200px]">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
