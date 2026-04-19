import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type Gym = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
};

type GymContextType = {
  gym: Gym | null;
  gymId: string | null;
  loading: boolean;
  availableGyms: Gym[];
  setGymId: (id: string) => void;
  refreshGyms: () => Promise<void>;
};

const GymContext = createContext<GymContextType>({
  gym: null,
  gymId: null,
  loading: true,
  availableGyms: [],
  setGymId: () => {},
  refreshGyms: async () => {},
});

export function GymProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [gym, setGym] = useState<Gym | null>(null);
  const [gymId, setGymIdState] = useState<string | null>(null);
  const [availableGyms, setAvailableGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);

  const setGymId = (id: string) => {
    setGymIdState(id);
    localStorage.setItem("current_gym_id", id);
    const next = availableGyms.find(g => g.id === id) ?? null;
    if (next) setGym(next);
  };

  const fetchGym = useCallback(async () => {
    setLoading(true);

    if (!user) {
      setGym(null);
      setGymIdState(null);
      setAvailableGyms([]);
      setLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem("current_gym_id");

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rolesError) throw rolesError;

      const isSuperAdmin = (rolesData ?? []).some(r => r.role === "super_admin");

      let allGyms: Gym[] = [];

      if (isSuperAdmin) {
        const { data, error } = await supabase
          .from("gyms")
          .select("id, name, slug, logo_url, primary_color")
          .order("name");

        if (error) throw error;
        allGyms = data ?? [];
      } else {
        const [staffRes, ownedRes] = await Promise.all([
          supabase.from("gym_staff").select("gym_id").eq("user_id", user.id),
          supabase.from("gyms").select("id, name, slug, logo_url, primary_color").eq("owner_user_id", user.id),
        ]);

        if (staffRes.error) throw staffRes.error;
        if (ownedRes.error) throw ownedRes.error;

        const staffGymIds = (staffRes.data ?? []).map(s => s.gym_id);
        const ownedGyms = ownedRes.data ?? [];

        const missingStaffIds = staffGymIds.filter(id => !ownedGyms.find(g => g.id === id));
        let staffGyms: Gym[] = [];

        if (missingStaffIds.length > 0) {
          const { data, error } = await supabase
            .from("gyms")
            .select("id, name, slug, logo_url, primary_color")
            .in("id", missingStaffIds);

          if (error) throw error;
          staffGyms = data ?? [];
        }

        const map = new Map<string, Gym>();
        [...ownedGyms, ...staffGyms].forEach(g => map.set(g.id, g));
        allGyms = Array.from(map.values());
      }

      setAvailableGyms(allGyms);

      const allowedIds = allGyms.map(g => g.id);
      const validStored = stored && allowedIds.includes(stored) ? stored : null;
      if (stored && !validStored) localStorage.removeItem("current_gym_id");

      const targetGymId = validStored || allowedIds[0] || null;

      if (targetGymId) {
        const gymData = allGyms.find(g => g.id === targetGymId) ?? null;
        if (gymData) {
          setGym(gymData);
          setGymIdState(gymData.id);
          localStorage.setItem("current_gym_id", gymData.id);
        } else {
          setGym(null);
          setGymIdState(null);
        }
      } else {
        setGym(null);
        setGymIdState(null);
      }

    } catch {
      setAvailableGyms([]);
      setGym(null);
      setGymIdState(null);
      localStorage.removeItem("current_gym_id");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGym();
  }, [fetchGym]);

  return (
    <GymContext.Provider value={{ gym, gymId, loading, availableGyms, setGymId, refreshGyms: fetchGym }}>
      {children}
    </GymContext.Provider>
  );
}

export function useGym() {
  return useContext(GymContext);
}
