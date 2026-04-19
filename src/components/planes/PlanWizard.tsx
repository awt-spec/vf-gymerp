import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CURRENCIES, formatCurrency } from "@/lib/currency";
import { Calendar, CalendarDays, CalendarRange, CalendarClock, Settings2, Check, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const PLAN_TYPES = [
  { id: "monthly", label: "Mensual", days: 30, icon: Calendar, hint: "Pago cada mes" },
  { id: "quarterly", label: "Trimestral", days: 90, icon: CalendarDays, hint: "Cada 3 meses" },
  { id: "biannual", label: "Semestral", days: 180, icon: CalendarRange, hint: "Cada 6 meses" },
  { id: "annual", label: "Anual", days: 365, icon: CalendarClock, hint: "Pago una vez al año" },
  { id: "custom", label: "Personalizado", days: 30, icon: Settings2, hint: "Definí los días" },
];

const PRICE_PRESETS = [15000, 25000, 35000, 50000, 75000, 100000];

const BENEFIT_OPTIONS = [
  "Acceso ilimitado al gym",
  "Clases grupales (4/mes)",
  "Clases grupales ilimitadas",
  "Asesoría con coach",
  "Plan nutricional incluido",
  "Acceso a sauna",
  "Descuento en tienda",
  "Invitado gratis al mes",
  "Evaluación física trimestral",
  "Acceso 24/7",
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: {
    name: string;
    description: string;
    price: number;
    duration_days: number;
    currency: string;
    benefits: string[];
    color: string;
  }) => Promise<void> | void;
};

export function PlanWizard({ open, onOpenChange, onCreate }: Props) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<typeof PLAN_TYPES[number] | null>(null);
  const [days, setDays] = useState(30);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("CRC");
  const [benefits, setBenefits] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep(1); setType(null); setDays(30); setPrice(""); setCurrency("CRC");
    setBenefits([]); setName(""); setDescription(""); setSubmitting(false);
  };

  const close = () => { onOpenChange(false); setTimeout(reset, 200); };

  const toggleBenefit = (b: string) => {
    setBenefits(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  };

  const handleCreate = async () => {
    if (!name || !price) return;
    setSubmitting(true);
    await onCreate({
      name, description,
      price: Number(price),
      duration_days: days,
      currency, benefits,
      color: "#00E676",
    });
    setSubmitting(false);
    close();
  };

  const canNext1 = !!type;
  const canNext2 = !!price && Number(price) > 0;
  const canFinish = !!name && !!price;

  return (
    <Dialog open={open} onOpenChange={(v) => v ? onOpenChange(true) : close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Crear nuevo plan</DialogTitle>
          <DialogDescription>Paso {step} de 3</DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div key={s} className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              s <= step ? "bg-primary" : "bg-muted"
            )} />
          ))}
        </div>

        {/* Step 1: Type */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">¿Qué tipo de plan querés crear?</p>
            <div className="grid grid-cols-2 gap-2">
              {PLAN_TYPES.map((t) => {
                const Icon = t.icon;
                const active = type?.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setType(t); setDays(t.days); }}
                    className={cn(
                      "flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all",
                      active ? "border-primary bg-primary/5" : "border-border hover:border-border/80"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                    <span className="font-semibold text-sm">{t.label}</span>
                    <span className="text-[11px] text-muted-foreground">{t.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Price + duration */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Precio sugerido</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRICE_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrice(String(p))}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs border transition-colors",
                      Number(price) === p ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:bg-muted"
                    )}
                  >
                    {formatCurrency(p, currency)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Precio</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25000" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Moneda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Duración (días)</Label>
              <Input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} disabled={type?.id !== "custom"} />
              <p className="text-[11px] text-muted-foreground">
                {type?.id === "custom" ? "Definí los días manualmente" : `Predefinido: ${type?.label}`}
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Benefits + name */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre del plan</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={type?.label === "Mensual" ? "ej: Mensual Plus" : `ej: ${type?.label} Premium`}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Descripción corta</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Acceso ilimitado + clases grupales"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">¿Qué incluye? ({benefits.length})</Label>
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {BENEFIT_OPTIONS.map((b) => (
                  <label
                    key={b}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-colors",
                      benefits.includes(b) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={benefits.includes(b)}
                      onCheckedChange={() => toggleBenefit(b)}
                    />
                    <span className="flex-1">{b}</span>
                    {benefits.includes(b) && <Check className="h-3.5 w-3.5 text-primary" />}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => step > 1 ? setStep(step - 1) : close()}
            disabled={submitting}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step === 1 ? "Cancelar" : "Atrás"}
          </Button>
          {step < 3 ? (
            <Button
              size="sm"
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
            >
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleCreate} disabled={!canFinish || submitting}>
              {submitting ? "Creando..." : "Crear plan"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
