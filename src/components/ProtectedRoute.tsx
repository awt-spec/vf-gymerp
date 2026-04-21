import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { AppRole } from "@/hooks/useRole";
import { Shield } from "lucide-react";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
};

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { session, user, loading } = useAuth();
  const [checkingRole, setCheckingRole] = useState(!!requiredRoles);
  const [hasRequiredRole, setHasRequiredRole] = useState(false);

  useEffect(() => {
    if (!requiredRoles || !user) {
      setCheckingRole(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setCheckingRole(true);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (cancelled) return;
      if (error) {
        setHasRequiredRole(false);
      } else {
        const roles = (data?.map((r) => r.role) ?? []) as AppRole[];
        setHasRequiredRole(roles.some((r) => requiredRoles.includes(r)));
      }
      setCheckingRole(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, requiredRoles?.join(",")]);

  if (loading || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Shield className="h-8 w-8 text-primary animate-pulse" />
          <span className="text-xs text-muted-foreground tracking-widest uppercase">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/" replace />;

  if (requiredRoles && !hasRequiredRole) {
    toast({ title: "Sin permisos", description: "No tenés acceso a esta sección.", variant: "destructive" });
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
