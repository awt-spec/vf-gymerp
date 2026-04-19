import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { User, Shield, Dumbbell, Save, Camera } from "lucide-react";

export default function Perfil() {
  const { user } = useAuth();
  const { isAdmin, isCoach, isMember, loading: roleLoading } = useRole();
  const [profile, setProfile] = useState({ full_name: "", phone: "", bio: "", avatar_url: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile({ full_name: data.full_name || "", phone: data.phone || "", bio: data.bio || "", avatar_url: data.avatar_url || "" });
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: profile.full_name, phone: profile.phone, bio: profile.bio, avatar_url: profile.avatar_url })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Perfil actualizado ✅" });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("equipment-photos").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Error subiendo foto", variant: "destructive" }); return; }
    const { data: { publicUrl } } = supabase.storage.from("equipment-photos").getPublicUrl(path);
    setProfile(p => ({ ...p, avatar_url: publicUrl }));
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    toast({ title: "Foto actualizada ✅" });
  };

  if (loading || roleLoading) return <div className="flex items-center justify-center p-8"><div className="text-primary animate-pulse text-lg">Cargando perfil...</div></div>;

  const roleBadge = isAdmin ? { label: "Administrador", icon: Shield, color: "bg-red-500/20 text-red-400" }
    : isCoach ? { label: "Coach", icon: Dumbbell, color: "bg-blue-500/20 text-blue-400" }
    : isMember ? { label: "Socio", icon: User, color: "bg-green-500/20 text-green-400" }
    : { label: "Usuario", icon: User, color: "bg-muted text-muted-foreground" };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <h1 className="text-xl font-display font-bold text-foreground">Mi Perfil</h1>

      {/* Avatar + Role */}
      <Card className="border-border/50">
        <CardContent className="pt-6 flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/30">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center cursor-pointer">
              <Camera className="w-3.5 h-3.5 text-primary-foreground" />
              <input type="file" accept="image/*" capture="user" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">{profile.full_name || user?.email}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Badge className={`${roleBadge.color} gap-1`}>
            <roleBadge.icon className="w-3 h-3" />
            {roleBadge.label}
          </Badge>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nombre completo</Label>
            <Input value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} placeholder="Tu nombre" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Teléfono</Label>
            <Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+506 8888-8888" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bio</Label>
            <Textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Cuéntanos sobre ti..." rows={3} />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </CardContent>
      </Card>

      {/* Role-specific info */}
      {isAdmin && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-red-400" />
              <span className="font-semibold text-sm text-red-400">Panel Admin</span>
            </div>
            <p className="text-xs text-muted-foreground">Acceso completo: Contabilidad, Inventario, Cobranza, Gestión de Socios y Planes.</p>
          </CardContent>
        </Card>
      )}
      {isCoach && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Dumbbell className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-sm text-blue-400">Panel Coach</span>
            </div>
            <p className="text-xs text-muted-foreground">Gestión de planes de ejercicio, nutrición y seguimiento de progreso de socios.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
