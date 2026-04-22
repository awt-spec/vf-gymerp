import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Upload, MoreHorizontal, Eye, Pencil, Power, AlertTriangle } from "lucide-react";
import { MemberQRCode } from "@/components/MemberQRCode";
import { useGym } from "@/hooks/useGym";
import GymAiAssistant from "@/components/GymAiAssistant";

type Member = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  cedula: string;
  status: "active" | "inactive" | "suspended";
  notes: string | null;
  created_at: string;
};

export default function Socios() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { gymId } = useGym();
  const navigate = useNavigate();

  const fetchMembers = async () => {
    let query = supabase.from("members").select("*").order("created_at", { ascending: false });
    if (gymId) query = query.eq("gym_id", gymId);
    if (statusFilter !== "all") query = query.eq("status", statusFilter as any);
    if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,cedula.ilike.%${search}%`);
    const { data } = await query;
    setMembers((data as Member[]) ?? []);
  };

  useEffect(() => { fetchMembers(); }, [search, statusFilter, gymId]);

  const toggleActive = async (m: Member) => {
    const next = m.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("members").update({ status: next }).eq("id", m.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: next === "active" ? "Usuario activado" : "Usuario desactivado" });
    fetchMembers();
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-primary/20 text-primary border-primary/30",
      inactive: "bg-muted text-muted-foreground border-border",
      suspended: "bg-destructive/20 text-destructive border-destructive/30",
    };
    const labels: Record<string, string> = { active: "Activo", inactive: "Inactivo", suspended: "Suspendido" };
    return <Badge className={variants[status] ?? ""}>{labels[status] ?? status}</Badge>;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Usuarios</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-muted-foreground text-sm">Gestión de miembros del gimnasio</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{members.length} total</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">{members.filter(m => m.status === "active").length} activos</span>
            {members.filter(m => m.status === "inactive").length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{members.filter(m => m.status === "inactive").length} inactivos</span>}
            {members.filter(m => m.status === "suspended").length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">{members.filter(m => m.status === "suspended").length} suspendidos</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/socios/importar"><Upload className="mr-2 h-4 w-4" />Importar CSV</Link>
          </Button>
          <Button asChild>
            <Link to="/socios/nuevo"><Plus className="mr-2 h-4 w-4" />Nuevo Usuario</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, email o cédula..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" aria-label="Buscar usuarios" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
            <SelectItem value="suspended">Suspendidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>QR</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay usuarios registrados</TableCell></TableRow>
              ) : (
                members.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer" onClick={() => navigate(`/socios/${m.id}`)}>
                    <TableCell className="font-medium">{m.first_name} {m.last_name}</TableCell>
                    <TableCell className="font-mono text-xs">{m.cedula || "—"}</TableCell>
                    <TableCell>{m.email ?? "—"}</TableCell>
                    <TableCell>{m.phone ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {statusBadge(m.status)}
                        {m.status === "suspended" && m.notes && (
                          <span title={m.notes}><AlertTriangle className="h-3.5 w-3.5 text-destructive" /></span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <MemberQRCode memberId={m.id} memberName={`${m.first_name} ${m.last_name}`} />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/socios/${m.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/socios/${m.id}/editar`)}>
                            <Pencil className="h-4 w-4 mr-2" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toggleActive(m)}>
                            <Power className="h-4 w-4 mr-2" />
                            {m.status === "active" ? "Desactivar" : "Activar"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <GymAiAssistant
        module="socios"
        moduleLabel="Socios"
        context={{
          total: members.length,
          active: members.filter(m => m.status === "active").length,
          inactive: members.filter(m => m.status === "inactive").length,
          suspended: members.filter(m => m.status === "suspended").length,
          recent: members.slice(0, 10).map(m => ({ name: `${m.first_name} ${m.last_name}`, status: m.status, email: m.email })),
        }}
      />
    </div>
  );
}
