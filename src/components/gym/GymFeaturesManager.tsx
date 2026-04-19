import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/hooks/useGym";
import { useRole } from "@/hooks/useRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Layers } from "lucide-react";

const ALL_FEATURES = [
  "socios", "planes", "pagos", "contabilidad", "inventario",
  "clases", "tienda", "nutricion", "ejercicio", "acceso", "reportes", "mercadeo",
];

const FEATURE_LABELS: Record<string, string> = {
  socios: "Socios", planes: "Planes", pagos: "Pagos", contabilidad: "Contabilidad",
  inventario: "Inventario", clases: "Clases", tienda: "Tienda", nutricion: "Nutrición",
  ejercicio: "Ejercicio", acceso: "Control Acceso", reportes: "Reportes", mercadeo: "Mercadeo",
};

type FeatureRow = { id: string; feature_name: string; enabled: boolean };

export function GymFeaturesManager() {
  const { gymId } = useGym();
  const { isAdmin } = useRole();
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gymId) return;
    supabase
      .from("gym_features")
      .select("id, feature_name, enabled")
      .eq("gym_id", gymId)
      .then(({ data }) => {
        setFeatures(data ?? []);
        setLoading(false);
      });
  }, [gymId]);

  const toggleFeature = async (featureName: string, currentEnabled: boolean) => {
    if (!gymId) return;
    const { error } = await supabase
      .from("gym_features")
      .update({ enabled: !currentEnabled })
      .eq("gym_id", gymId)
      .eq("feature_name", featureName);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setFeatures(prev =>
      prev.map(f => f.feature_name === featureName ? { ...f, enabled: !currentEnabled } : f)
    );
  };

  if (!isAdmin || !gymId) return null;
  if (loading) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs font-display flex items-center gap-2 text-foreground uppercase tracking-wider">
          <Layers className="h-3.5 w-3.5" /> Módulos Activos
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {ALL_FEATURES.map(feat => {
            const row = features.find(f => f.feature_name === feat);
            const enabled = row?.enabled ?? false;
            return (
              <div
                key={feat}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                  enabled
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/50 bg-muted/30"
                }`}
              >
                <span className={`text-xs ${enabled ? "text-foreground" : "text-muted-foreground"}`}>
                  {FEATURE_LABELS[feat]}
                </span>
                <Switch
                  checked={enabled}
                  onCheckedChange={() => row && toggleFeature(feat, enabled)}
                  className="scale-75"
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
