import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, Shield, Zap, Globe } from "lucide-react";

const GATEWAYS = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Pagos con tarjeta de crédito y débito. La plataforma más popular del mundo.",
    features: ["Tarjetas Visa/Mastercard/Amex", "Suscripciones recurrentes", "Facturación automática", "Dashboard analítico"],
    color: "bg-[#635BFF]",
    textColor: "text-[#635BFF]",
    borderColor: "border-[#635BFF]/30",
    logo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
    url: "https://stripe.com",
    recommended: true,
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "Pagos rápidos con cuenta PayPal o tarjeta. Ideal para clientes internacionales.",
    features: ["Pago con cuenta PayPal", "Protección al comprador", "Checkout Express", "Multi-moneda"],
    color: "bg-[#003087]",
    textColor: "text-[#003087]",
    borderColor: "border-[#003087]/30",
    logo: "https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg",
    url: "https://paypal.com",
    recommended: false,
  },
  {
    id: "payoneer",
    name: "Payoneer",
    description: "Transferencias globales y pagos masivos. Perfecto para operaciones B2B.",
    features: ["Transferencias bancarias", "Pagos masivos", "Cuentas multi-moneda", "Tarjeta prepago"],
    color: "bg-[#FF4800]",
    textColor: "text-[#FF4800]",
    borderColor: "border-[#FF4800]/30",
    logo: "https://upload.wikimedia.org/wikipedia/commons/7/72/Payoneer_logo.svg",
    url: "https://payoneer.com",
    recommended: false,
  },
];

export default function Pagos() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-3xl font-display font-bold">Pasarela de Pagos</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Conectá una pasarela para cobrar membresías online</p>
      </div>

      {/* Status banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-muted/30">
        <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
          <Zap className="h-5 w-5 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Ninguna pasarela conectada</p>
          <p className="text-xs text-muted-foreground">Seleccioná un proveedor y configurá tu API key para empezar a cobrar</p>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px] bg-warning/10 text-warning border-warning/30">
          Pendiente
        </Badge>
      </div>

      {/* Gateway cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {GATEWAYS.map((gw) => (
          <Card
            key={gw.id}
            className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
              selected === gw.id ? gw.borderColor + " shadow-lg" : "border-border/50 hover:border-border"
            }`}
            onClick={() => setSelected(gw.id)}
          >
            {gw.recommended && (
              <div className="absolute -top-2.5 left-4">
                <Badge className="bg-primary text-primary-foreground text-[10px] shadow-sm">
                  Recomendado
                </Badge>
              </div>
            )}
            <CardContent className="p-5 space-y-4">
              {/* Logo area */}
              <div className="flex items-center justify-between">
                <div className={`h-10 w-10 rounded-lg ${gw.color} flex items-center justify-center`}>
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div className={`h-3 w-3 rounded-full border-2 transition-colors ${
                  selected === gw.id ? gw.color + " border-transparent" : "border-muted-foreground/30"
                }`} />
              </div>

              <div>
                <h3 className="font-display font-bold text-lg">{gw.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{gw.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-1.5">
                {gw.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Action */}
              <Button
                variant={selected === gw.id ? "default" : "outline"}
                className="w-full gap-1.5 text-xs"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(gw.url, "_blank");
                }}
              >
                <Globe className="h-3.5 w-3.5" />
                Visitar {gw.name}
                <ExternalLink className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Connect section */}
      {selected && (
        <Card className="border-border/50 bg-muted/20">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg ${GATEWAYS.find(g => g.id === selected)?.color} flex items-center justify-center`}>
                <CreditCard className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm">
                  Conectar {GATEWAYS.find(g => g.id === selected)?.name}
                </h3>
                <p className="text-xs text-muted-foreground">Necesitás tu API key para activar los cobros</p>
              </div>
            </div>

            <div className="bg-background rounded-lg p-4 border border-border/50 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">API Key (Restricted / Secret)</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder={`sk_live_... o tu key de ${GATEWAYS.find(g => g.id === selected)?.name}`}
                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled
                  />
                  <Button size="sm" disabled className="gap-1.5">
                    <Zap className="h-3.5 w-3.5" />Conectar
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                ⚡ Próximamente: La integración completa se activará cuando configures tu API key. 
                Contactá al administrador para habilitar pagos en línea.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
          <Shield className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-xs font-semibold">Seguridad PCI</p>
            <p className="text-[11px] text-muted-foreground">Datos encriptados end-to-end</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
          <Globe className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-xs font-semibold">Multi-moneda</p>
            <p className="text-[11px] text-muted-foreground">CRC, USD, EUR y más</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
          <Zap className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-xs font-semibold">Cobros automáticos</p>
            <p className="text-[11px] text-muted-foreground">Renovaciones sin fricción</p>
          </div>
        </div>
      </div>
    </div>
  );
}
