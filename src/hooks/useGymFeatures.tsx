import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "./useGym";

// Maps feature_name from gym_features table to route paths
const FEATURE_TO_ROUTES: Record<string, string[]> = {
  socios: ["/socios"],
  planes: ["/planes"],
  pagos: ["/pagos"],
  contabilidad: ["/contabilidad"],
  inventario: ["/inventario"],
  clases: ["/clases"],
  tienda: ["/tienda"],
  nutricion: ["/planes-nutricion"],
  ejercicio: ["/planes-ejercicio"],
  acceso: ["/acceso"],
  reportes: ["/reportes"],
  mercadeo: ["/mercadeo"],
};

export function useGymFeatures() {
  const { gymId } = useGym();
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gymId) {
      setEnabledFeatures([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchFeatures = async () => {
      const { data } = await supabase
        .from("gym_features")
        .select("feature_name, enabled")
        .eq("gym_id", gymId);

      if (cancelled) return;
      const enabled = (data ?? []).filter(f => f.enabled).map(f => f.feature_name);
      setEnabledFeatures(enabled);
      setLoading(false);
    };

    fetchFeatures();

    // Unique channel name per mount avoids "after subscribe()" collisions on HMR/remount
    const channelName = `gym_features:${gymId}:${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(channelName);
    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gym_features",
          filter: `gym_id=eq.${gymId}`,
        },
        () => {
          fetchFeatures();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gymId]);

  const isFeatureEnabled = (featureName: string) => {
    // If no features configured at all, show everything (backward compat)
    if (enabledFeatures.length === 0 && !loading) return true;
    return enabledFeatures.includes(featureName);
  };

  const isRouteEnabled = (route: string) => {
    // Dashboard, profile, progress, cobranza are always enabled
    const alwaysEnabled = ["/dashboard", "/perfil", "/progreso", "/mi-gym", "/cobranza"];
    if (alwaysEnabled.includes(route)) return true;

    for (const [feature, routes] of Object.entries(FEATURE_TO_ROUTES)) {
      if (routes.includes(route)) {
        return isFeatureEnabled(feature);
      }
    }
    return true; // Unknown routes are enabled by default
  };

  return { enabledFeatures, isFeatureEnabled, isRouteEnabled, loading };
}
