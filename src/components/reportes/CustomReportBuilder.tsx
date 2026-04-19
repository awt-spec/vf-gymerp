import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
  CartesianGrid, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  Download, Database, GitCompareArrows, Table2, BarChart3, Plus, X, ArrowUpDown,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const COLORS = ["hsl(var(--primary))", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];
const tooltipStyle = { fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 };

type DataSource = "payments" | "expenses" | "check_ins" | "members" | "workouts" | "shop_sales" | "subscriptions";
type AggFn = "count" | "sum" | "avg" | "min" | "max";
type ChartType = "table" | "bar" | "line" | "pie";

interface DataSourceConfig {
  label: string;
  fields: { key: string; label: string; type: "text" | "number" | "date" }[];
}

const DATA_SOURCES: Record<DataSource, DataSourceConfig> = {
  payments: {
    label: "Pagos",
    fields: [
      { key: "payment_date", label: "Fecha", type: "date" },
      { key: "amount", label: "Monto", type: "number" },
      { key: "payment_method", label: "Método", type: "text" },
      { key: "status", label: "Estado", type: "text" },
      { key: "member_name", label: "Socio", type: "text" },
      { key: "income_category", label: "Categoría", type: "text" },
    ],
  },
  expenses: {
    label: "Gastos",
    fields: [
      { key: "expense_date", label: "Fecha", type: "date" },
      { key: "amount", label: "Monto", type: "number" },
      { key: "category", label: "Categoría", type: "text" },
      { key: "description", label: "Descripción", type: "text" },
      { key: "payment_method", label: "Método", type: "text" },
    ],
  },
  check_ins: {
    label: "Asistencia",
    fields: [
      { key: "check_in_date", label: "Fecha", type: "date" },
      { key: "check_in_hour", label: "Hora", type: "text" },
      { key: "member_name", label: "Socio", type: "text" },
    ],
  },
  members: {
    label: "Socios",
    fields: [
      { key: "full_name", label: "Nombre", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "status", label: "Estado", type: "text" },
      { key: "created_date", label: "Registro", type: "date" },
    ],
  },
  workouts: {
    label: "Ejercicios",
    fields: [
      { key: "workout_date", label: "Fecha", type: "date" },
      { key: "exercise_name", label: "Ejercicio", type: "text" },
      { key: "muscle_group", label: "Grupo muscular", type: "text" },
      { key: "sets", label: "Series", type: "number" },
      { key: "reps", label: "Reps", type: "number" },
      { key: "weight_kg", label: "Peso (kg)", type: "number" },
      { key: "volume", label: "Volumen", type: "number" },
    ],
  },
  shop_sales: {
    label: "Ventas tienda",
    fields: [
      { key: "sale_date", label: "Fecha", type: "date" },
      { key: "product_name", label: "Producto", type: "text" },
      { key: "category", label: "Categoría", type: "text" },
      { key: "quantity", label: "Cantidad", type: "number" },
      { key: "total_amount", label: "Total", type: "number" },
      { key: "payment_method", label: "Método", type: "text" },
    ],
  },
  subscriptions: {
    label: "Suscripciones",
    fields: [
      { key: "plan_name", label: "Plan", type: "text" },
      { key: "member_name", label: "Socio", type: "text" },
      { key: "status", label: "Estado", type: "text" },
      { key: "start_date", label: "Inicio", type: "date" },
      { key: "end_date", label: "Fin", type: "date" },
    ],
  },
};

const AGG_LABELS: Record<AggFn, string> = { count: "Contar", sum: "Sumar", avg: "Promedio", min: "Mínimo", max: "Máximo" };
const CHART_LABELS: Record<ChartType, string> = { table: "Tabla", bar: "Barras", line: "Líneas", pie: "Circular" };

interface QueryPanel {
  id: number;
  source: DataSource;
  groupBy: string;
  metric: string;
  aggFn: AggFn;
  chartType: ChartType;
  sortDir: "asc" | "desc";
  limit: number;
}

function normalizeRows(source: DataSource, rawData: any[]): Record<string, any>[] {
  switch (source) {
    case "payments":
      return rawData.map(p => ({
        payment_date: p.payment_date,
        amount: Number(p.amount),
        payment_method: p.payment_method === "cash" ? "Efectivo" : p.payment_method === "card" ? "Tarjeta" : p.payment_method === "transfer" ? "Transferencia" : p.payment_method,
        status: p.status === "paid" ? "Pagado" : p.status === "pending" ? "Pendiente" : "Vencido",
        member_name: `${p.members?.first_name || ""} ${p.members?.last_name || ""}`.trim(),
        income_category: p.income_category || "membership",
      }));
    case "expenses":
      return rawData.map(e => ({
        expense_date: e.expense_date,
        amount: Number(e.amount),
        category: e.category,
        description: e.description,
        payment_method: e.payment_method,
      }));
    case "check_ins":
      return rawData.map(c => ({
        check_in_date: c.check_in_time?.split("T")[0] || "",
        check_in_hour: c.check_in_time?.split("T")[1]?.slice(0, 5) || "",
        member_name: `${c.members?.first_name || ""} ${c.members?.last_name || ""}`.trim(),
      }));
    case "members":
      return rawData.map(m => ({
        full_name: `${m.first_name} ${m.last_name}`,
        email: m.email || "",
        status: m.status === "active" ? "Activo" : m.status === "inactive" ? "Inactivo" : "Suspendido",
        created_date: m.created_at?.split("T")[0] || "",
      }));
    case "workouts":
      return rawData.map(w => ({
        workout_date: w.workout_date,
        exercise_name: w.exercise_name,
        muscle_group: w.muscle_group,
        sets: w.sets || 1,
        reps: w.reps || 1,
        weight_kg: w.weight_kg || 0,
        volume: (w.sets || 1) * (w.reps || 1) * (w.weight_kg || 0),
      }));
    case "shop_sales":
      return rawData.map(s => ({
        sale_date: s.sale_date,
        product_name: s.shop_products?.name || "Producto",
        category: s.shop_products?.category || "otros",
        quantity: s.quantity || 1,
        total_amount: Number(s.total_amount),
        payment_method: s.payment_method,
      }));
    case "subscriptions":
      return rawData.map(s => ({
        plan_name: s.plans?.name || "Sin plan",
        member_name: `${s.members?.first_name || ""} ${s.members?.last_name || ""}`.trim(),
        status: s.status === "active" ? "Activa" : s.status === "expired" ? "Vencida" : "Cancelada",
        start_date: s.start_date,
        end_date: s.end_date,
      }));
    default: return [];
  }
}

function aggregate(rows: Record<string, any>[], groupBy: string, metric: string, aggFn: AggFn, sortDir: "asc" | "desc", limit: number) {
  if (!groupBy) return rows.slice(0, limit);

  const groups: Record<string, number[]> = {};
  rows.forEach(r => {
    const key = String(r[groupBy] ?? "Sin dato");
    if (!groups[key]) groups[key] = [];
    groups[key].push(Number(r[metric]) || 0);
  });

  let result = Object.entries(groups).map(([label, vals]) => {
    let value = 0;
    switch (aggFn) {
      case "count": value = vals.length; break;
      case "sum": value = vals.reduce((a, b) => a + b, 0); break;
      case "avg": value = vals.reduce((a, b) => a + b, 0) / vals.length; break;
      case "min": value = Math.min(...vals); break;
      case "max": value = Math.max(...vals); break;
    }
    return { label, value: Math.round(value * 100) / 100 };
  });

  result.sort((a, b) => sortDir === "desc" ? b.value - a.value : a.value - b.value);
  return result.slice(0, limit);
}

function exportCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

interface Props {
  payments: any[];
  expenses: any[];
  checkIns: any[];
  members: any[];
  workouts: any[];
  shopSales: any[];
  subscriptions: any[];
}

export function CustomReportBuilder({ payments, expenses, checkIns, members, workouts, shopSales, subscriptions }: Props) {
  const [panels, setPanels] = useState<QueryPanel[]>([
    { id: 1, source: "payments", groupBy: "payment_method", metric: "amount", aggFn: "sum", chartType: "bar", sortDir: "desc", limit: 20 },
  ]);
  const [compareMode, setCompareMode] = useState(false);

  const rawDataMap: Record<DataSource, any[]> = { payments, expenses, check_ins: checkIns, members, workouts, shop_sales: shopSales, subscriptions };

  const addPanel = () => {
    setPanels(prev => [...prev, {
      id: Date.now(),
      source: "payments",
      groupBy: "status",
      metric: "amount",
      aggFn: "count",
      chartType: "bar",
      sortDir: "desc",
      limit: 20,
    }]);
  };

  const removePanel = (id: number) => setPanels(prev => prev.filter(p => p.id !== id));

  const updatePanel = (id: number, updates: Partial<QueryPanel>) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <span className="text-sm font-display font-semibold">Extractor de datos</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={compareMode ? "default" : "outline"}
            className="text-xs h-7 gap-1"
            onClick={() => { setCompareMode(!compareMode); if (!compareMode && panels.length < 2) addPanel(); }}
          >
            <GitCompareArrows className="h-3 w-3" /> {compareMode ? "Comparando" : "Comparar"}
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={addPanel}>
            <Plus className="h-3 w-3" /> Agregar consulta
          </Button>
        </div>
      </div>

      <div className={compareMode && panels.length >= 2 ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
        {panels.map((panel) => (
          <QueryPanelCard
            key={panel.id}
            panel={panel}
            rawData={rawDataMap[panel.source]}
            onUpdate={(u) => updatePanel(panel.id, u)}
            onRemove={panels.length > 1 ? () => removePanel(panel.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function QueryPanelCard({ panel, rawData, onUpdate, onRemove }: {
  panel: QueryPanel;
  rawData: any[];
  onUpdate: (u: Partial<QueryPanel>) => void;
  onRemove?: () => void;
}) {
  const config = DATA_SOURCES[panel.source];
  const numericFields = config.fields.filter(f => f.type === "number");
  const allFields = config.fields;

  const rows = useMemo(() => normalizeRows(panel.source, rawData), [panel.source, rawData]);
  const result = useMemo(
    () => aggregate(rows, panel.groupBy, panel.metric, panel.aggFn, panel.sortDir, panel.limit),
    [rows, panel.groupBy, panel.metric, panel.aggFn, panel.sortDir, panel.limit]
  );

  const isAggregated = !!panel.groupBy;
  const displayData = isAggregated ? result : rows.slice(0, panel.limit);

  const handleExport = () => {
    if (isAggregated) {
      const aggResult = result as { label: string; value: number }[];
      exportCSV(
        `reporte_${panel.source}.csv`,
        [allFields.find(f => f.key === panel.groupBy)?.label || panel.groupBy, `${AGG_LABELS[panel.aggFn]} ${numericFields.find(f => f.key === panel.metric)?.label || panel.metric}`],
        aggResult.map(r => [r.label, String(r.value)])
      );
    } else {
      exportCSV(
        `reporte_${panel.source}.csv`,
        allFields.map(f => f.label),
        rows.slice(0, panel.limit).map(r => allFields.map(f => String(r[f.key] ?? "")))
      );
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-display flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            Consulta: {config.label}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={handleExport}>
              <Download className="h-3 w-3" /> CSV
            </Button>
            {onRemove && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={onRemove}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-3">
        {/* Query controls */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-[10px]">Fuente</Label>
            <Select value={panel.source} onValueChange={(v: DataSource) => onUpdate({ source: v, groupBy: "", metric: "" })}>
              <SelectTrigger className="h-7 text-xs w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(DATA_SOURCES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px]">Agrupar por</Label>
            <Select value={panel.groupBy || "_none"} onValueChange={v => onUpdate({ groupBy: v === "_none" ? "" : v })}>
              <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sin agrupar</SelectItem>
                {allFields.map(f => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isAggregated && (
            <>
              <div className="space-y-1">
                <Label className="text-[10px]">Métrica</Label>
                <Select value={panel.metric || numericFields[0]?.key || ""} onValueChange={v => onUpdate({ metric: v })}>
                  <SelectTrigger className="h-7 text-xs w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {numericFields.map(f => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px]">Función</Label>
                <Select value={panel.aggFn} onValueChange={(v: AggFn) => onUpdate({ aggFn: v })}>
                  <SelectTrigger className="h-7 text-xs w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(AGG_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label className="text-[10px]">Vista</Label>
            <Select value={panel.chartType} onValueChange={(v: ChartType) => onUpdate({ chartType: v })}>
              <SelectTrigger className="h-7 text-xs w-[90px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CHART_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px]">Orden</Label>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 w-[70px]"
              onClick={() => onUpdate({ sortDir: panel.sortDir === "desc" ? "asc" : "desc" })}
            >
              <ArrowUpDown className="h-3 w-3" />
              {panel.sortDir === "desc" ? "Desc" : "Asc"}
            </Button>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px]">Límite</Label>
            <Select value={String(panel.limit)} onValueChange={v => onUpdate({ limit: Number(v) })}>
              <SelectTrigger className="h-7 text-xs w-[70px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Badge variant="secondary" className="text-[9px]">{rows.length} registros</Badge>
          {isAggregated && <Badge variant="outline" className="text-[9px]">{(result as any[]).length} grupos</Badge>}
        </div>

        {/* Render */}
        {isAggregated ? (
          <AggregatedView data={result as { label: string; value: number }[]} chartType={panel.chartType} metricLabel={numericFields.find(f => f.key === panel.metric)?.label || "Valor"} aggLabel={AGG_LABELS[panel.aggFn]} isCurrency={panel.metric === "amount" || panel.metric === "total_amount"} />
        ) : (
          <RawTableView data={displayData as Record<string, any>[]} fields={allFields} />
        )}
      </CardContent>
    </Card>
  );
}

function AggregatedView({ data, chartType, metricLabel, aggLabel, isCurrency }: {
  data: { label: string; value: number }[];
  chartType: ChartType;
  metricLabel: string;
  aggLabel: string;
  isCurrency: boolean;
}) {
  const fmtVal = (v: number) => isCurrency ? formatCurrency(v) : v.toLocaleString();

  if (chartType === "table" || data.length === 0) {
    return (
      <div className="max-h-[300px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px]">Grupo</TableHead>
              <TableHead className="text-[10px] text-right">{aggLabel} {metricLabel}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs py-1.5">{d.label}</TableCell>
                <TableCell className="text-xs py-1.5 text-right font-semibold">{fmtVal(d.value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (chartType === "pie") {
    return (
      <div>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={35} outerRadius={70} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => fmtVal(v)} contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-0.5 px-2">
          {data.slice(0, 8).map((d, i) => (
            <div key={d.label} className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="truncate">{d.label}</span>
              </div>
              <span className="font-semibold">{fmtVal(d.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const ChartComp = chartType === "line" ? LineChart : BarChart;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ChartComp data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 8 }} axisLine={false} tickLine={false} interval={0} angle={data.length > 6 ? -45 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 60 : 30} />
        <YAxis tick={{ fontSize: 8 }} axisLine={false} tickLine={false} width={45} tickFormatter={v => isCurrency ? `${(v / 1000).toFixed(0)}k` : String(v)} />
        <Tooltip formatter={(v: number) => fmtVal(v)} contentStyle={tooltipStyle} />
        {chartType === "line" ? (
          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name={`${aggLabel} ${metricLabel}`} />
        ) : (
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={`${aggLabel} ${metricLabel}`} />
        )}
      </ChartComp>
    </ResponsiveContainer>
  );
}

function RawTableView({ data, fields }: { data: Record<string, any>[]; fields: { key: string; label: string; type: string }[] }) {
  if (data.length === 0) return <p className="text-muted-foreground text-xs text-center py-4">Sin datos</p>;
  return (
    <div className="max-h-[400px] overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {fields.map(f => <TableHead key={f.key} className="text-[10px]">{f.label}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={i}>
              {fields.map(f => (
                <TableCell key={f.key} className="text-[11px] py-1.5">
                  {f.type === "number" && (f.key === "amount" || f.key === "total_amount")
                    ? formatCurrency(row[f.key])
                    : String(row[f.key] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
