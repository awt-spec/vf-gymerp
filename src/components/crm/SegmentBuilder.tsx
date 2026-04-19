import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Save } from "lucide-react";

export type SegmentCriteria = {
  sub_status?: "active" | "expiring" | "expired" | "no_plan" | "any";
  inactive_days?: number;
  birthday_month?: boolean;
  has_purchases?: boolean;
};

export function evaluateSegment(member: any, criteria: SegmentCriteria, ctx: {
  sub?: { end_date: string };
  inactivityDays?: number;
  hasPurchases?: boolean;
}): boolean {
  if (criteria.sub_status && criteria.sub_status !== "any") {
    if (criteria.sub_status === "no_plan" && ctx.sub) return false;
    if (criteria.sub_status !== "no_plan" && !ctx.sub) return false;
    if (ctx.sub) {
      const days = Math.ceil((new Date(ctx.sub.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (criteria.sub_status === "active" && days < 8) return false;
      if (criteria.sub_status === "expiring" && (days < 0 || days > 7)) return false;
      if (criteria.sub_status === "expired" && days >= 0) return false;
    }
  }
  if (criteria.inactive_days && (ctx.inactivityDays ?? 0) < criteria.inactive_days) return false;
  if (criteria.birthday_month) {
    if (!member.date_of_birth) return false;
    if (new Date(member.date_of_birth).getMonth() !== new Date().getMonth()) return false;
  }
  if (criteria.has_purchases && !ctx.hasPurchases) return false;
  return true;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; description: string; criteria: SegmentCriteria }) => void;
  initial?: { name: string; description: string; criteria: SegmentCriteria };
};

export function SegmentBuilder({ open, onOpenChange, onSave, initial }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [criteria, setCriteria] = useState<SegmentCriteria>(initial?.criteria ?? {});

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), criteria });
    setName(""); setDescription(""); setCriteria({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Crear segmento</DialogTitle>
          <DialogDescription>Definí criterios para agrupar socios automáticamente</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre del segmento</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ej: Vencidos último mes" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descripción</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs font-semibold">Criterios</Label>

            <div className="space-y-1.5">
              <Label className="text-xs">Estado de membresía</Label>
              <Select
                value={criteria.sub_status ?? "any"}
                onValueChange={(v: any) => setCriteria({ ...criteria, sub_status: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Cualquiera</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="expiring">Por vencer (≤ 7 días)</SelectItem>
                  <SelectItem value="expired">Vencidos</SelectItem>
                  <SelectItem value="no_plan">Sin plan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Días sin entrenar (mínimo)</Label>
              <Input
                type="number"
                value={criteria.inactive_days ?? ""}
                onChange={(e) => setCriteria({ ...criteria, inactive_days: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="ej: 14"
              />
            </div>

            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={!!criteria.birthday_month}
                onChange={(e) => setCriteria({ ...criteria, birthday_month: e.target.checked })}
              />
              Cumpleañeros del mes
            </label>

            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={!!criteria.has_purchases}
                onChange={(e) => setCriteria({ ...criteria, has_purchases: e.target.checked })}
              />
              Compraron en la tienda
            </label>
          </div>

          <Button onClick={handleSave} className="w-full gap-1" disabled={!name.trim()}>
            <Save className="h-4 w-4" /> Guardar segmento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
