import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ScanLine, Search, LogIn, LogOut, Camera, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Html5Qrcode } from "html5-qrcode";
import GymAiAssistant from "@/components/GymAiAssistant";

export default function Acceso() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [todayCheckIns, setTodayCheckIns] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerRunningRef = useRef(false);
  const scannerContainerId = "qr-reader";

  const fetchToday = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("check_ins")
      .select("*, members(first_name, last_name)")
      .gte("check_in_time", today + "T00:00:00")
      .order("check_in_time", { ascending: false });
    setTodayCheckIns(data ?? []);
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const searchMembers = async (q: string) => {
    setSearch(q);
    if (!q.trim()) { setResults([]); return; }
    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("status", "active")
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .limit(5);
    setResults(data ?? []);
  };

  const handleCheckIn = useCallback(async (memberId: string, silent = false) => {
    const { error } = await supabase.from("check_ins").insert({ member_id: memberId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (!silent) toast({ title: "Check-in registrado ✅" });
    setSearch("");
    setResults([]);
    fetchToday();
  }, [fetchToday]);

  const handleCheckOut = useCallback(async (checkInId: string, silent = false) => {
    const { error } = await supabase.from("check_ins").update({ check_out_time: new Date().toISOString() }).eq("id", checkInId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (!silent) toast({ title: "Check-out registrado 👋" });
    fetchToday();
  }, [fetchToday]);

  // Stop scanner safely - returns a promise
  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (scanner && scannerRunningRef.current) {
      try {
        await scanner.stop();
        try { scanner.clear(); } catch {}
      } catch {
        // already stopped
      }
      scannerRunningRef.current = false;
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  // Process QR result
  const handleQRResult = useCallback(async (raw: string) => {
    await stopScanner();
    try {
      const parsed = JSON.parse(raw);
      if (parsed.type === "gym_member" && parsed.id) {
        const { data: member } = await supabase
          .from("members")
          .select("first_name, last_name")
          .eq("id", parsed.id)
          .single();

        const memberName = member ? `${member.first_name} ${member.last_name}` : "Socio";

        const today = new Date().toISOString().split("T")[0];
        const { data: existing } = await supabase
          .from("check_ins")
          .select("id")
          .eq("member_id", parsed.id)
          .gte("check_in_time", today + "T00:00:00")
          .is("check_out_time", null)
          .limit(1);

        if (existing && existing.length > 0) {
          await handleCheckOut(existing[0].id, true);
          toast({ title: `👋 Check-out: ${memberName}` });
        } else {
          await handleCheckIn(parsed.id, true);
          toast({ title: `✅ Check-in: ${memberName}` });
        }
      } else {
        toast({ title: "QR inválido", description: "El código no es de un socio", variant: "destructive" });
      }
    } catch {
      toast({ title: "QR inválido", description: "No se pudo leer el código", variant: "destructive" });
    }
  }, [stopScanner, handleCheckIn, handleCheckOut]);

  // Start camera after DOM renders the container
  useEffect(() => {
    if (!scanning) return;

    // Small delay to ensure DOM element exists
    const timer = setTimeout(() => {
      const el = document.getElementById(scannerContainerId);
      if (!el) { setScanning(false); return; }

      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;
      let cancelled = false;

      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (!cancelled) handleQRResult(decodedText);
        },
        () => {}
      ).then(() => {
        if (cancelled) {
          scanner.stop().catch(() => {});
        } else {
          scannerRunningRef.current = true;
        }
      }).catch(() => {
        if (!cancelled) {
          setScanning(false);
          toast({ title: "Error", description: "No se pudo acceder a la cámara", variant: "destructive" });
        }
      });

      return () => { cancelled = true; };
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current && scannerRunningRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRunningRef.current = false;
        scannerRef.current = null;
      }
    };
  }, [scanning, handleQRResult]);

  // Physical scanner (keyboard wedge)
  useEffect(() => {
    let buffer = "";
    let timeout: ReturnType<typeof setTimeout>;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Enter" && buffer.length > 10) {
        handleQRResult(buffer);
        buffer = "";
        return;
      }
      if (e.key.length === 1) {
        buffer += e.key;
        clearTimeout(timeout);
        timeout = setTimeout(() => { buffer = ""; }, 200);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeout);
    };
  }, [handleQRResult]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  const activeNow = todayCheckIns.filter(ci => !ci.check_out_time).length;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Control de Acceso</h1>
        <p className="text-muted-foreground mt-1 text-sm">Registro de entradas y salidas</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-primary/30 bg-card/80">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-display font-bold text-primary">{activeNow}</p>
            <p className="text-xs text-muted-foreground">En el gym ahora</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-display font-bold">{todayCheckIns.length}</p>
            <p className="text-xs text-muted-foreground">Visitas hoy</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/30 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="font-display flex items-center gap-2 text-base">
            <ScanLine className="h-5 w-5 text-primary" />
            Check-in / Check-out
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {scanning ? (
            <div className="relative">
              <div id={scannerContainerId} className="rounded-xl overflow-hidden" />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 z-10 gap-1"
                onClick={stopScanner}
              >
                <X className="h-3 w-3" /> Cerrar
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full gap-2 h-12" onClick={() => setScanning(true)}>
              <Camera className="h-5 w-5" /> Escanear QR con cámara
            </Button>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>o buscar por nombre</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar socio por nombre..."
              value={search}
              onChange={(e) => searchMembers(e.target.value)}
              className="pl-10 text-lg h-12"
            />
          </div>
          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                  <span className="font-medium text-lg">{m.first_name} {m.last_name}</span>
                  <Button onClick={() => handleCheckIn(m.id)} className="gap-2">
                    <LogIn className="h-4 w-4" /> Check-in
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            💡 Conectá un escáner físico USB — funciona automáticamente en modo teclado (wedge)
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Asistencia de Hoy ({todayCheckIns.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Socio</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todayCheckIns.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No hay check-ins hoy</TableCell></TableRow>
              ) : (
                todayCheckIns.map((ci) => (
                  <TableRow key={ci.id}>
                    <TableCell className="font-medium">
                      {ci.members?.first_name} {ci.members?.last_name}
                      {!ci.check_out_time && <Badge className="ml-2 text-[9px] bg-primary/20 text-primary border-primary/30">EN GYM</Badge>}
                    </TableCell>
                    <TableCell>{format(new Date(ci.check_in_time), "p", { locale: es })}</TableCell>
                    <TableCell>{ci.check_out_time ? format(new Date(ci.check_out_time), "p", { locale: es }) : "—"}</TableCell>
                    <TableCell>
                      {!ci.check_out_time && (
                        <Button variant="outline" size="sm" onClick={() => handleCheckOut(ci.id)} className="gap-1">
                          <LogOut className="h-3 w-3" /> Salida
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <GymAiAssistant
        module="acceso"
        moduleLabel="Acceso"
        context={{
          today_check_ins: todayCheckIns.length,
          recent: todayCheckIns.slice(0, 15).map((c: any) => ({ time: c.check_in_time, member: c.members ? `${c.members.first_name} ${c.members.last_name}` : "—" })),
        }}
      />
    </div>
  );
}
