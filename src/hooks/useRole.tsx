import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "admin" | "coach" | "member" | "receptionist" | "super_admin";

export function useRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (error) throw error;
        setRoles((data?.map((r) => r.role) as AppRole[]) ?? []);
      } catch {
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user?.id]);

  return {
    roles,
    loading,
    isAdmin: roles.includes("admin") || roles.includes("super_admin"),
    isSuperAdmin: roles.includes("super_admin"),
    isCoach: roles.includes("coach"),
    isMember: roles.includes("member"),
    isReceptionist: roles.includes("receptionist"),
    hasRole: (role: AppRole) => roles.includes(role),
  };
}
