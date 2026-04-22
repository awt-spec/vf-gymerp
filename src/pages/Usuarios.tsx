import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/hooks/useGym";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  Users, UserPlus, Shield, Dumbbell, Headset, Loader2, Trash2, Upload,
  Search, Power, PowerOff, CheckCircle2, XCircle,
} from "lucide-react";

const ROLE_INFO: Record<string, { label: string; icon: any; color: string }> = {
  admin: { label: "Admin", icon: Shield, color: "bg-indigo-500/10 text-indigo-600 border-indigo-200" },
  coach: { label: "Coach", icon: Dumbbell, color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  receptionist: { label: "Recepcionista", icon: Headset, color: "bg-amber-500/10 text-amber-600 border-amber-200" },
};

type StaffRow = {
  user_id: string;
  full_name: string | null;
  roles: string[];
  is_active: boolean;
  created_at: string;
};

export default function Usuarios() {
  const { gymId } = useGym();
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useRole();
  const navigate = useNavigate();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<StaffRow | null>(null);

  const fetchStaff = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    try {
      const { data: staff } = await supabase
        .from("gym_staff")
        .select("user_id, is_active, created_at")
        .eq("gym_id", gymId);

      const userIds = (staff ?? []).map(s => s.user_id);
      if (userIds.length === 0) { setRows([]); return; }

      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", userIds),
        supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
      ]);

      const profileMap = new Map((profilesRes.data ?? []).map(p => [p.id, p]));
      const roleMap = new Map<string, string[]>();
      (rolesRes.data ?? []).forEach(r => {
        if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, []);
        roleMap.get(r.user_id)!.push(r.role);
      });

      const built: StaffRow[] = (staff ?? []).map(s => ({
        user_id: s.user_id,
        full_name: profileMap.get(s.user_id)?.full_name ?? null,
        roles: roleMap.get(s.user_id) ?? [],
        is_active: s.is_active,
        created_at: s.created_at,
      }));
      setRows(built);
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleRemove = async (userId: string) => {
    if (!gymId) return;
    try {
      const { data, error } = await supabase.functions.invoke("remove-staff", {
        body: { gym_id: gymId, user_id: userId },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Usuario eliminado" });
      setConfirmDelete(null);
      fetchStaff();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (row: StaffRow) => {
    if (!gymId) return;
    try {
      const { error } = await supabase
        .from("gym_staff")
        .update({ is_active: !row.is_active })
        .eq("gym_id", gymId)
        .eq("user_id", row.user_id);
      if (error) throw error;
      toast({ title: row.is_active ? "Usuario desactivado" : "Usuario activado" });
      fetchStaff();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (!isAdmin && !isSuperAdmin) {
    return <div className="text-sm text-muted-foreground">Solo administradores pueden gestionar usuarios.</div>;
  }

  const filtered = rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.full_name ?? "").toLowerCase().includes(q) ||
      r.roles.some(role => ROLE_INFO[role]?.label.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl md:text-3xl font-display font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Usuarios de la Plataforma
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Gestioná coaches, recepcionistas y administradores de tu gimnasio
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/usuarios/importar"><Upload className="mr-1 h-4 w-4" />Importar CSV</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/usuarios/nuevo"><UserPlus className="mr-1 h-4 w-4" />Nuevo Usuario</Link>
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o rol…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-sm text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
          {rows.length === 0 ? "Sin usuarios todavía. Creá uno para empezar." : "Sin resultados para tu búsqueda."}
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Alta</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(row => {
                  const visibleRoles = row.roles.filter(r => r !== "member" && r !== "super_admin");
                  const isSelf = row.user_id === user?.id;
                  return (
                    <TableRow key={row.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                            {(row.full_name ?? "?").slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{row.full_name ?? "Sin nombre"}</p>
                            {isSelf && <Badge variant="outline" className="text-[9px] mt-0.5">Vos</Badge>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {visibleRoles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : visibleRoles.map(r => {
                            const info = ROLE_INFO[r];
                            if (!info) return null;
                            const Icon = info.icon;
                            return (
                              <span key={r} className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${info.color}`}>
                                <Icon className="h-2.5 w-2.5" />{info.label}
                              </span>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <XCircle className="h-3.5 w-3.5" />Inactivo
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isSelf && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              title={row.is_active ? "Desactivar" : "Activar"}
                              onClick={() => handleToggleActive(row)}
                            >
                              {row.is_active
                                ? <PowerOff className="h-4 w-4 text-amber-600" />
                                : <Power className="h-4 w-4 text-emerald-600" />}
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                              title="Eliminar"
                              onClick={() => setConfirmDelete(row)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se removerá <strong>{confirmDelete?.full_name ?? "este usuario"}</strong> del gimnasio. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && handleRemove(confirmDelete.user_id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
