import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/hooks/useGym";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Copy, Search, Check } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { PlanWizard } from "@/components/planes/PlanWizard";
import GymAiAssistant from "@/components/GymAiAssistant";

export default function Planes() {
  const navigate = useNavigate();
  const { gymId } = useGym();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [openWizard, setOpenWizard] = useState(false);

  const fetchPlans = async () => {
    if (!gymId) return;
    setLoading(true);
    const { data } = await supabase
      .from("plans")
      .select("*")
      .eq("gym_id", gymId)
      .order("price", { ascending: true });
    setPlans(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, [gymId]);

  const handleCreate = async (data: any) => {
    if (!gymId) return;
    const { error } = await supabase.from("plans").insert({ ...data, gym_id: gymId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Plan creado ✅" });
    fetchPlans();
  };

  const duplicatePlan = async (plan: any) => {
    if (!gymId) return;
    const { id, created_at, updated_at, ...rest } = plan;
    const { error } = await supabase.from("plans").insert({
      ...rest,
      name: `${plan.name} (copia)`,
      gym_id: gymId,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Plan duplicado" });
    fetchPlans();
  };

  const filtered = plans.filter(p => {
    const nameMatch = p.name.toLowerCase().includes(search.toLowerCase());
    const statusMatch = filter === "all" || (filter === "active" ? p.is_active : !p.is_active);
    return nameMatch && statusMatch;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-3xl font-display font-bold">Planes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Membresías y precios de tu gimnasio</p>
        </div>
        <Button onClick={() => setOpenWizard(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Nuevo plan
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-[130px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Plans grid */}
      {loading ? (
        <div className="text-center py-10 text-sm text-muted-foreground">Cargando...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {plans.length === 0 ? "Aún no tenés planes creados" : "No hay planes que coincidan"}
            </p>
            {plans.length === 0 && (
              <Button onClick={() => setOpenWizard(true)} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Crear tu primer plan
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((plan) => (
            <Card
              key={plan.id}
              className="border-border/50 bg-card hover:border-border transition-colors group"
              style={plan.color ? { borderTopWidth: 3, borderTopColor: plan.color } : undefined}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-semibold text-sm truncate">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{plan.description}</p>
                    )}
                  </div>
                  <Badge
                    variant={plan.is_active ? "default" : "secondary"}
                    className="text-[10px] shrink-0"
                  >
                    {plan.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                <div>
                  <p className="text-2xl md:text-3xl font-display font-bold">
                    {formatCurrency(Number(plan.price), plan.currency)}
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {plan.duration_days} días · {plan.currency}
                  </p>
                </div>

                {plan.benefits && plan.benefits.length > 0 && (
                  <ul className="space-y-1">
                    {plan.benefits.slice(0, 3).map((b: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                        <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{b}</span>
                      </li>
                    ))}
                    {plan.benefits.length > 3 && (
                      <li className="text-[10px] text-muted-foreground/60 pl-4.5">
                        + {plan.benefits.length - 3} más
                      </li>
                    )}
                  </ul>
                )}

                <div className="flex gap-1.5 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs gap-1"
                    onClick={() => navigate(`/planes/${plan.id}/editar`)}
                  >
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => duplicatePlan(plan)}
                    title="Duplicar"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PlanWizard open={openWizard} onOpenChange={setOpenWizard} onCreate={handleCreate} />
      <GymAiAssistant
        module="planes"
        moduleLabel="Planes"
        context={{
          total: plans.length,
          active: plans.filter((p: any) => p.is_active).length,
          plans: plans.map((p: any) => ({ name: p.name, price: p.price, currency: p.currency, duration_days: p.duration_days, active: p.is_active })),
        }}
      />
    </div>
  );
}
