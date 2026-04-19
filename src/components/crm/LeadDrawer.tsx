import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGym } from "@/hooks/useGym";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { LEAD_STATUSES } from "./LeadKanban";
import { Phone, Mail, MessageSquare, UserPlus, Save, Trash2, Send } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Props = {
  leadId: string | null;
  onClose: () => void;
  onChanged: () => void;
};

export function LeadDrawer({ leadId, onClose, onChanged }: Props) {
  const { user } = useAuth();
  const { gymId } = useGym();
  const [lead, setLead] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!leadId) { setLead(null); setNotes([]); return; }
    (async () => {
      const [leadRes, notesRes] = await Promise.all([
        supabase.from("leads").select("*").eq("id", leadId).single(),
        supabase.from("lead_notes").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
      ]);
      setLead(leadRes.data);
      setNotes(notesRes.data ?? []);
    })();
  }, [leadId]);

  if (!leadId || !lead) return null;

  const update = async (changes: Record<string, any>) => {
    setSaving(true);
    const { error } = await supabase.from("leads").update(changes as any).eq("id", lead.id);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setLead({ ...lead, ...changes });
    onChanged();
    toast({ title: "Guardado" });
  };

  const addNote = async () => {
    if (!newNote.trim() || !user) return;
    const { error } = await supabase.from("lead_notes").insert({
      lead_id: lead.id,
      note: newNote.trim(),
      created_by: user.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("leads").update({ last_contact_at: new Date().toISOString() }).eq("id", lead.id);
    setNewNote("");
    const notesRes = await supabase.from("lead_notes").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false });
    setNotes(notesRes.data ?? []);
    onChanged();
  };

  const sendWhatsapp = () => {
    if (!lead.phone) return toast({ title: "Sin teléfono", variant: "destructive" });
    const msg = encodeURIComponent(`Hola ${lead.first_name}, te escribimos del gimnasio. ¿Te interesa conocer nuestros planes?`);
    window.open(`https://wa.me/${lead.phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
  };

  const sendEmail = () => {
    if (!lead.email) return toast({ title: "Sin email", variant: "destructive" });
    window.open(`mailto:${lead.email}?subject=Bienvenido al gimnasio&body=Hola ${lead.first_name},`);
  };

  const convertToMember = async () => {
    if (!gymId) return;
    const { data: member, error } = await supabase.from("members").insert({
      first_name: lead.first_name,
      last_name: lead.last_name ?? "",
      phone: lead.phone,
      email: lead.email,
      gym_id: gymId,
      status: "active",
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("leads").update({
      status: "convertido",
      converted_member_id: member.id,
    }).eq("id", lead.id);
    toast({ title: "Lead convertido a socio 🎉" });
    onChanged();
    onClose();
  };

  const deleteLead = async () => {
    if (!confirm("¿Eliminar este lead?")) return;
    await supabase.from("leads").delete().eq("id", lead.id);
    toast({ title: "Lead eliminado" });
    onChanged();
    onClose();
  };

  return (
    <Sheet open={!!leadId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">{lead.first_name} {lead.last_name}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Quick actions */}
          <div className="flex gap-1.5 flex-wrap">
            <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={sendWhatsapp} disabled={!lead.phone}>
              <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
            </Button>
            <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={sendEmail} disabled={!lead.email}>
              <Mail className="h-3.5 w-3.5" /> Email
            </Button>
            {lead.status !== "convertido" && (
              <Button size="sm" className="gap-1 h-8 text-xs" onClick={convertToMember}>
                <UserPlus className="h-3.5 w-3.5" /> Convertir a socio
              </Button>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs">Estado</Label>
            <Select value={lead.status} onValueChange={(v) => update({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre</Label>
              <Input value={lead.first_name ?? ""} onChange={(e) => setLead({ ...lead, first_name: e.target.value })} onBlur={() => update({ first_name: lead.first_name })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Apellido</Label>
              <Input value={lead.last_name ?? ""} onChange={(e) => setLead({ ...lead, last_name: e.target.value })} onBlur={() => update({ last_name: lead.last_name })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Teléfono</Label>
            <Input value={lead.phone ?? ""} onChange={(e) => setLead({ ...lead, phone: e.target.value })} onBlur={() => update({ phone: lead.phone })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input value={lead.email ?? ""} onChange={(e) => setLead({ ...lead, email: e.target.value })} onBlur={() => update({ email: lead.email })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fuente</Label>
            <Select value={lead.source ?? "walk_in"} onValueChange={(v) => update({ source: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="walk_in">Walk-in</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="referido">Referido</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs">Notas y seguimiento</Label>
            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Llamó pidiendo info del plan trimestral..."
                rows={2}
                className="text-sm"
              />
            </div>
            <Button size="sm" onClick={addNote} className="gap-1 w-full" disabled={!newNote.trim()}>
              <Send className="h-3.5 w-3.5" /> Agregar nota
            </Button>
            <div className="space-y-2 max-h-60 overflow-y-auto pt-2">
              {notes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">Sin notas todavía</p>
              ) : notes.map((n) => (
                <div key={n.id} className="p-2 rounded-lg bg-muted/40 text-xs">
                  <p>{n.note}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(n.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button variant="outline" size="sm" className="w-full text-destructive gap-1" onClick={deleteLead}>
              <Trash2 className="h-3.5 w-3.5" /> Eliminar lead
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
