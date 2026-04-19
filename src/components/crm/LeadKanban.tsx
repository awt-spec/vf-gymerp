import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, Phone, Mail, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const LEAD_STATUSES = [
  { id: "nuevo", label: "Nuevo", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  { id: "contactado", label: "Contactado", color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  { id: "visita_agendada", label: "Visita", color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  { id: "convertido", label: "Convertido", color: "bg-primary/15 text-primary border-primary/30" },
  { id: "perdido", label: "Perdido", color: "bg-destructive/15 text-destructive border-destructive/30" },
];

const SOURCE_LABELS: Record<string, string> = {
  walk_in: "Walk-in",
  instagram: "Instagram",
  facebook: "Facebook",
  referido: "Referido",
  web: "Web",
  whatsapp: "WhatsApp",
};

type Props = {
  leads: any[];
  onStatusChange: (leadId: string, status: string) => void;
  onSelect: (leadId: string) => void;
};

export function LeadKanban({ leads, onStatusChange, onSelect }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 overflow-x-auto pb-2">
      {LEAD_STATUSES.map((col) => {
        const colLeads = leads.filter((l) => l.status === col.id);
        return (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragId) {
                onStatusChange(dragId, col.id);
                setDragId(null);
              }
            }}
            className="flex flex-col gap-2 min-w-[220px]"
          >
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2">
                <Badge className={cn("text-[10px]", col.color)}>{col.label}</Badge>
                <span className="text-xs text-muted-foreground">{colLeads.length}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 min-h-[100px]">
              {colLeads.map((l) => (
                <Card
                  key={l.id}
                  draggable
                  onDragStart={() => setDragId(l.id)}
                  onClick={() => onSelect(l.id)}
                  className="p-3 cursor-pointer hover:border-primary/50 transition-colors space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{l.first_name} {l.last_name}</p>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    {l.phone && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{l.phone}</span>}
                    {l.email && <span className="flex items-center gap-0.5"><Mail className="h-2.5 w-2.5" /></span>}
                  </div>
                  {l.source && (
                    <Badge variant="outline" className="text-[9px]">{SOURCE_LABELS[l.source] ?? l.source}</Badge>
                  )}
                  <p className="text-[9px] text-muted-foreground">
                    {format(new Date(l.created_at), "dd MMM", { locale: es })}
                  </p>
                </Card>
              ))}
              {colLeads.length === 0 && (
                <div className="text-[10px] text-muted-foreground text-center py-3 border border-dashed rounded-lg">
                  Vacío
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
