import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/hooks/useGym";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";

export default function ClaseNueva() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { gymId } = useGym();
  const editing = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    instructor: "",
    description: "",
    max_capacity: "20",
    is_active: true,
  });

  useEffect(() => {
    if (!id) return;
    supabase.from("classes").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) setForm({
        name: data.name, instructor: data.instructor,
        description: data.description ?? "", max_capacity: String(data.max_capacity),
        is_active: data.is_active,
      });
    });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymId) return toast({ title: "Sin gimnasio", variant: "destructive" });
    setLoading(true);
    const payload = {
      name: form.name, instructor: form.instructor, description: form.description,
      max_capacity: Number(form.max_capacity), is_active: form.is_active, gym_id: gymId,
    };
    const { error } = editing
      ? await supabase.from("classes").update(payload).eq("id", id!)
      : await supabase.from("classes").insert(payload);
    setLoading(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: editing ? "Clase actualizada" : "Clase creada" });
    navigate("/clases");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/clases")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-display font-bold">
                {editing ? "Editar Tipo de Clase" : "Nuevo Tipo de Clase"}
              </h1>
              <p className="text-xs text-muted-foreground">Define una clase válida del gym</p>
            </div>
          </div>
          <Button form="class-form" type="submit" disabled={loading} size="sm">
            <Save className="h-4 w-4 mr-1.5" />Guardar
          </Button>
        </div>
      </div>

      <form id="class-form" onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <section className="space-y-4">
          <div>
            <h2 className="text-xs font-display font-semibold uppercase tracking-wider text-primary mb-1">Información</h2>
            <p className="text-xs text-muted-foreground">Nombre y persona a cargo</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nombre de la clase</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Spinning, Yoga, CrossFit..." required />
            </div>
            <div className="space-y-1.5">
              <Label>Instructor</Label>
              <Input value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe la clase..." />
          </div>
        </section>

        <section className="space-y-4 pt-4 border-t border-border/40">
          <div>
            <h2 className="text-xs font-display font-semibold uppercase tracking-wider text-primary mb-1">Configuración</h2>
            <p className="text-xs text-muted-foreground">Capacidad y estado</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <Label>Cupo máximo</Label>
              <Input type="number" min="1" value={form.max_capacity} onChange={(e) => setForm({ ...form, max_capacity: e.target.value })} required />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-2.5">
              <div>
                <p className="text-sm font-medium">Activa</p>
                <p className="text-xs text-muted-foreground">Disponible para agendar</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
