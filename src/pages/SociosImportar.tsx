import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/hooks/useGym";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Upload, Loader2, CheckCircle2, XCircle, FileText } from "lucide-react";

const HEADERS = ["first_name", "last_name", "cedula", "email", "phone", "status"];

type Result = { row: number; cedula: string; status: "ok" | "error"; message?: string };

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const cells = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
}

export default function SociosImportar() {
  const { gymId } = useGym();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<Result[]>([]);

  const downloadTemplate = () => {
    const csv = HEADERS.join(",") + "\n" +
      "Carlos,Jiménez,101110111,carlos@example.com,8888-0000,active\n" +
      "María,Solís,202220222,maria@example.com,8888-1111,active\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "plantilla-usuarios-gym.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file || !gymId) return;
    setImporting(true);
    setResults([]);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast({ title: "CSV vacío", variant: "destructive" });
        setImporting(false);
        return;
      }
      const out: Result[] = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const cedula = r.cedula?.trim();
        const email = r.email?.trim();
        const first_name = r.first_name?.trim();
        const last_name = r.last_name?.trim();
        const phone = r.phone?.trim() || null;
        const status = (r.status?.trim() || "active").toLowerCase();

        if (!cedula || !email || !first_name || !last_name) {
          out.push({ row: i + 2, cedula: cedula || "—", status: "error", message: "Faltan campos obligatorios" });
          setResults([...out]);
          continue;
        }
        if (!["active", "inactive", "suspended"].includes(status)) {
          out.push({ row: i + 2, cedula, status: "error", message: `Estado inválido: ${status}` });
          setResults([...out]);
          continue;
        }
        try {
          const { data, error } = await supabase.functions.invoke("create-member-auth", {
            body: { cedula, email, first_name, last_name, phone, gym_id: gymId },
          });
          if (error) throw new Error(error.message);
          if ((data as any)?.error) throw new Error((data as any).error);

          const memberId = (data as any)?.member?.id ?? (data as any)?.member_id;
          if (memberId && status !== "active") {
            await supabase.from("members").update({ status }).eq("id", memberId);
          }
          out.push({ row: i + 2, cedula, status: "ok" });
        } catch (err: any) {
          out.push({ row: i + 2, cedula, status: "error", message: err.message });
        }
        setResults([...out]);
      }
      const okCount = out.filter(o => o.status === "ok").length;
      toast({ title: "Importación finalizada", description: `${okCount} creados, ${out.length - okCount} con error` });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link to="/socios"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar Usuarios desde CSV
          </h1>
          <p className="text-muted-foreground text-xs">Cargá múltiples miembros del gimnasio de una sola vez</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <FileText className="h-4 w-4" />Paso 1: Descargá la plantilla
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Columnas: <code className="px-1 bg-muted rounded text-xs">first_name, last_name, cedula, email, phone, status</code>
            <br />Estados válidos: <code className="px-1 bg-muted rounded text-xs">active</code>, <code className="px-1 bg-muted rounded text-xs">inactive</code>, <code className="px-1 bg-muted rounded text-xs">suspended</code>
          </p>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />Descargar plantilla CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Paso 2: Subí tu archivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Archivo CSV</Label>
            <Input type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0] ?? null)} disabled={importing} />
          </div>
          <Button onClick={handleImport} disabled={!file || importing} className="w-full">
            {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            {importing ? "Importando…" : "Importar usuarios"}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Resultados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-96 overflow-auto">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm p-2 rounded border border-border/50">
                  {r.status === "ok"
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                  <span className="text-xs text-muted-foreground">Fila {r.row}</span>
                  <span className="font-medium truncate">{r.cedula}</span>
                  {r.message && <span className="text-xs text-destructive ml-auto truncate">{r.message}</span>}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => navigate("/socios")} className="flex-1">
                Volver a Usuarios
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
