import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Shield } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
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
  return <>{children}</>;
}
