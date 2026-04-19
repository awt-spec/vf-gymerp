import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/hooks/useGym";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Users, UserPlus, Shield, Dumbbell, Headset, Loader2, Trash2, Mail, KeyRound } from "lucide-react";

const ROLE_INFO: Record<string, { label: string; icon: any; color: string }> = {
  admin: { label: "Admin", icon: Shield, color: "bg-indigo-500/10 text-indigo-600 border-indigo-200" },
  coach: { label: "Coach", icon: Dumbbell, color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  receptionist: { label: "Recepcionista", icon: Headset, color: "bg-amber-500/10 text-amber-600 border-amber-200" },
};

type StaffRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  roles: string[];
  is_owner: boolean;
};

export default function Usuarios() {
  const { gymId, gym } = useGym();
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useRole();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "receptionist" });

  const fetchStaff = useCallback(async () => {
    if (!gymId) return;
    setLoading(true);
    try {
      const { data: staff } = await supabase
        .from("gym_staff").select("user_id").eq("gym_id", gymId);
      const userIds = (staff ?? []).map(s => s.user_id);

      const ownerId = gym?.id ? (await supabase.from("gyms").select("owner_user_id").eq("id", gymId).maybeSingle()).data?.owner_user_id : null;
      const allIds = Array.from(new Set([...userIds, ...(ownerId ? [ownerId] : [])]));

      if (allIds.length === 0) { setRows([]); return; }

      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", allIds),
        supabase.from("user_roles").select("user_id, role").in("user_id", allIds),
      ]);

      const profileMap = new Map((profilesRes.data ?? []).map(p => [p.id, p]));
      const roleMap = new Map<string, string[]>();
      (rolesRes.data ?? []).forEach(r => {
        if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, []);
        roleMap.get(r.user_id)!.push(r.role);
      });

      const built: StaffRow[] = allIds.map(id => ({
        user_id: id,
        full_name: profileMap.get(id)?.full_name ?? null,
        email: null,
        roles: roleMap.get(id) ?? [],
        is_owner: id === ownerId,
      }));
      setRows(built);
    } finally {
      setLoading(false);
    }
  }, [gymId, gym?.id]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymId) return;
    if (form.password.length < 6) {
      toast({ title: "Contraseña muy corta", description: "Mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-staff", {
        body: { gym_id: gymId, email: form.email, password: form.password, full_name: form.full_name, role: form.role },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Usuario creado ✅", description: `${form.email} agregado como ${ROLE_INFO[form.role].label}` });
      setOpen(false);
      setForm({ email: "", password: "", full_name: "", role: "receptionist" });
      fetchStaff();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!gymId) return;
    if (!confirm("¿Eliminar este usuario del gimnasio?")) return;
    try {
      const { data, error } = await supabase.functions.invoke("remove-staff", {
        body: { gym_id: gymId, user_id: userId },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Usuario eliminado" });
      fetchStaff();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (!isAdmin && !isSuperAdmin) {
    return <div className="text-sm text-muted-foreground">Solo administradores pueden gestionar usuarios.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-3xl font-display font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Usuarios de la Plataforma
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Gestioná coaches, recepcionistas y administradores de tu gimnasio
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><UserPlus className="mr-1 h-4 w-4" />Nuevo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Crear Usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nombre completo</Label>
                <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Ej: Juan Pérez" required />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" />Contraseña inicial</Label>
                <Input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" required minLength={6} />
                <p className="text-[10px] text-muted-foreground">Compartila con el usuario; podrá cambiarla luego</p>
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receptionist">🎧 Recepcionista</SelectItem>
                    <SelectItem value="coach">💪 Coach</SelectItem>
                    <SelectItem value="admin">🛡️ Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Usuario"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-sm text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
          Sin usuarios todavía. Creá uno para empezar.
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {rows.map(row => {
            const visibleRoles = row.roles.filter(r => r !== "member" && r !== "super_admin");
            return (
              <Card key={row.user_id} className="border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {(row.full_name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{row.full_name ?? "Sin nombre"}</p>
                      {row.is_owner && <Badge variant="default" className="text-[9px]">Dueño</Badge>}
                      {row.user_id === user?.id && <Badge variant="outline" className="text-[9px]">Vos</Badge>}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {visibleRoles.length === 0 ? (
                        <span className="text-[10px] text-muted-foreground">Sin rol asignado</span>
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
                  </div>
                  {!row.is_owner && row.user_id !== user?.id && (
                    <Button variant="ghost" size="icon" className="text-destructive shrink-0 h-8 w-8" onClick={() => handleRemove(row.user_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
