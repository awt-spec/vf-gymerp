import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGym } from "@/hooks/useGym";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Send, MessageSquare, Mail } from "lucide-react";

const TEMPLATES = [
  { id: "renewal", label: "Renovación", text: "Hola {nombre}, tu membresía está por vencer. ¡Renová y seguí entrenando!" },
  { id: "promo", label: "Promoción", text: "{nombre}, tenemos una promo especial este mes. Pasá por recepción a consultar." },
  { id: "birthday", label: "Cumpleaños", text: "¡Feliz cumpleaños {nombre}! 🎂 Como regalo te invitamos a traer un amigo gratis esta semana." },
  { id: "comeback", label: "Volver", text: "Te extrañamos {nombre}, ¡volvé y retomemos tu progreso!" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: any[]; // members con phone/email
  segmentId?: string;
  onSent: () => void;
};

export function CampaignComposer({ open, onOpenChange, recipients, segmentId, onSent }: Props) {
  const { user } = useAuth();
  const { gymId } = useGym();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const eligible = recipients.filter(r => channel === "whatsapp" ? r.phone : r.email);

  const handleSend = async () => {
    if (!message.trim() || !gymId || !user || eligible.length === 0) return;
    setSending(true);
    let sent = 0;
    eligible.forEach((m) => {
      const personal = message.replace(/\{nombre\}/g, m.first_name);
      if (channel === "whatsapp" && m.phone) {
        window.open(`https://wa.me/${m.phone.replace(/\D/g, "")}?text=${encodeURIComponent(personal)}`, "_blank");
        sent++;
      } else if (channel === "email" && m.email) {
        window.open(`mailto:${m.email}?subject=${encodeURIComponent(name || "Mensaje del gym")}&body=${encodeURIComponent(personal)}`);
        sent++;
      }
    });

    await supabase.from("crm_campaigns").insert({
      gym_id: gymId,
      name: name || `Campaña ${new Date().toLocaleString("es")}`,
      channel,
      message,
      segment_id: segmentId ?? null,
      recipient_count: eligible.length,
      sent_count: sent,
      sent_at: new Date().toISOString(),
      created_by: user.id,
    });

    toast({ title: `${sent} mensaje(s) enviado(s) 📨` });
    setSending(false);
    setName(""); setMessage("");
    onOpenChange(false);
    onSent();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Nueva campaña</DialogTitle>
          <DialogDescription>Enviá un mensaje a {recipients.length} contactos</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre de la campaña</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ej: Promo trimestral marzo" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Canal</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setChannel("whatsapp")}
                className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border-2 text-xs transition-colors ${
                  channel === "whatsapp" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <MessageSquare className="h-4 w-4" /> WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setChannel("email")}
                className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border-2 text-xs transition-colors ${
                  channel === "email" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <Mail className="h-4 w-4" /> Email
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {eligible.length} de {recipients.length} contactos tienen {channel === "whatsapp" ? "teléfono" : "email"}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Plantillas</Label>
            <div className="flex flex-wrap gap-1">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMessage(t.text)}
                  className="px-2 py-1 rounded-full text-[10px] border hover:bg-muted transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Mensaje (usá {"{nombre}"} para personalizar)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Hola {nombre}, te recordamos..."
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={!message.trim() || eligible.length === 0 || sending}
            className="w-full gap-1.5"
          >
            <Send className="h-4 w-4" /> {sending ? "Enviando..." : `Enviar a ${eligible.length} contactos`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
