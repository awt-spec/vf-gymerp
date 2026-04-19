import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, ScanLine, X, Check, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export type ScannedFood = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  barcode?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (food: ScannedFood, portionGrams: number) => void;
};

const SCANNER_ID = "barcode-food-reader";

export default function BarcodeFoodScanner({ open, onClose, onConfirm }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const runningRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [food, setFood] = useState<ScannedFood | null>(null);
  const [portion, setPortion] = useState("100");
  const [manualBarcode, setManualBarcode] = useState("");
  const [notFound, setNotFound] = useState(false);

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    if (s && runningRef.current) {
      try { await s.stop(); s.clear(); } catch { /* ignore */ }
      runningRef.current = false;
    }
    scannerRef.current = null;
    setScanning(false);
  }, []);

  const lookupBarcode = useCallback(async (code: string) => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
      const json = await res.json();
      if (json.status !== 1 || !json.product) {
        setNotFound(true);
        return;
      }
      const p = json.product;
      const n = p.nutriments || {};
      setFood({
        name: p.product_name || p.product_name_es || p.generic_name || `Producto ${code}`,
        calories: Math.round(Number(n["energy-kcal_100g"] || n.energy_kcal_100g || 0)),
        protein: Math.round((Number(n.proteins_100g || 0)) * 10) / 10,
        carbs: Math.round((Number(n.carbohydrates_100g || 0)) * 10) / 10,
        fat: Math.round((Number(n.fat_100g || 0)) * 10) / 10,
        fiber: Math.round((Number(n.fiber_100g || 0)) * 10) / 10,
        barcode: code,
      });
    } catch (e: any) {
      toast({ title: "Error de conexión", description: "No se pudo consultar la base de alimentos", variant: "destructive" });
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleResult = useCallback(async (raw: string) => {
    await stopScanner();
    await lookupBarcode(raw);
  }, [stopScanner, lookupBarcode]);

  useEffect(() => {
    if (!open) return;
    // Reset state on open
    setFood(null);
    setNotFound(false);
    setPortion("100");
    setManualBarcode("");
  }, [open]);

  const startCamera = useCallback(async () => {
    if (runningRef.current) return;
    setScanning(true);
    setNotFound(false);
    setFood(null);

    // Wait for DOM render
    await new Promise(r => setTimeout(r, 100));

    try {
      const scanner = new Html5Qrcode(SCANNER_ID, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 140 } },
        (text) => { handleResult(text); },
        () => { /* ignore per-frame errors */ }
      );
      runningRef.current = true;
    } catch (e: any) {
      setScanning(false);
      runningRef.current = false;
      toast({ title: "Cámara no disponible", description: e?.message || "Concedé permiso de cámara o ingresá el código manualmente", variant: "destructive" });
    }
  }, [handleResult]);

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    await stopScanner();
    await lookupBarcode(manualBarcode.trim());
  };

  const portionMultiplier = (parseFloat(portion) || 100) / 100;
  const calculated = food ? {
    calories: Math.round(food.calories * portionMultiplier),
    protein: Math.round(food.protein * portionMultiplier * 10) / 10,
    carbs: Math.round(food.carbs * portionMultiplier * 10) / 10,
    fat: Math.round(food.fat * portionMultiplier * 10) / 10,
    fiber: Math.round(food.fiber * portionMultiplier * 10) / 10,
  } : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Escanear alimento
          </DialogTitle>
          <DialogDescription>
            Apuntá la cámara al código de barras del producto
          </DialogDescription>
        </DialogHeader>

        {/* Scanner area */}
        {!food && !loading && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] border-2 border-primary/30">
              <div id={SCANNER_ID} className="w-full h-full" />
              {!scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/95">
                  <ScanLine className="h-12 w-12 text-primary opacity-60" />
                  <Button onClick={startCamera} size="lg" className="gap-2">
                    <ScanLine className="h-4 w-4" /> Activar cámara
                  </Button>
                </div>
              )}
              {scanning && (
                <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-32 border-2 border-primary rounded-lg pointer-events-none animate-pulse" />
              )}
            </div>

            {scanning && (
              <p className="text-xs text-muted-foreground text-center">
                Centrá el código de barras en el recuadro
              </p>
            )}

            {/* Manual fallback */}
            <div className="border-t border-border/30 pt-3">
              <form onSubmit={handleManualSubmit} className="space-y-2">
                <Label className="text-xs text-muted-foreground">¿No funciona la cámara? Ingresá el código manualmente</Label>
                <div className="flex gap-2">
                  <Input
                    value={manualBarcode}
                    onChange={e => setManualBarcode(e.target.value)}
                    placeholder="7501234567890"
                    inputMode="numeric"
                    className="text-sm"
                  />
                  <Button type="submit" size="sm" variant="outline" disabled={!manualBarcode.trim()}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Buscando producto...</p>
          </div>
        )}

        {/* Not found */}
        {notFound && !loading && !food && (
          <Card className="border-destructive/40 bg-destructive/5 p-4 text-center space-y-3">
            <p className="text-2xl">😕</p>
            <p className="text-sm font-medium">Producto no encontrado</p>
            <p className="text-xs text-muted-foreground">
              Este código no está en la base de OpenFoodFacts. Probá otro o agregá el alimento manualmente desde el buscador.
            </p>
            <Button onClick={() => { setNotFound(false); startCamera(); }} variant="outline" size="sm" className="gap-1">
              <ScanLine className="h-3.5 w-3.5" /> Intentar otro
            </Button>
          </Card>
        )}

        {/* Result + portion adjustment */}
        {food && calculated && (
          <div className="space-y-4">
            <Card className="border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold leading-tight">{food.name}</p>
                  {food.barcode && <p className="text-[10px] text-muted-foreground mt-0.5">Código: {food.barcode}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Porción consumida (gramos)</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
                    onClick={() => setPortion(String(Math.max(10, (parseFloat(portion) || 100) - 25)))}>−</Button>
                  <Input type="number" inputMode="decimal" value={portion} onChange={e => setPortion(e.target.value)}
                    className="text-center font-bold text-lg h-9" />
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
                    onClick={() => setPortion(String((parseFloat(portion) || 100) + 25))}>+</Button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-card rounded-lg p-2">
                  <p className="text-base font-bold">{calculated.calories}</p>
                  <p className="text-[9px] text-muted-foreground">kcal</p>
                </div>
                <div className="bg-card rounded-lg p-2">
                  <p className="text-base font-bold text-blue-500">{calculated.protein}g</p>
                  <p className="text-[9px] text-muted-foreground">Prot</p>
                </div>
                <div className="bg-card rounded-lg p-2">
                  <p className="text-base font-bold text-yellow-500">{calculated.carbs}g</p>
                  <p className="text-[9px] text-muted-foreground">Carbs</p>
                </div>
                <div className="bg-card rounded-lg p-2">
                  <p className="text-base font-bold text-orange-500">{calculated.fat}g</p>
                  <p className="text-[9px] text-muted-foreground">Grasa</p>
                </div>
              </div>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setFood(null); startCamera(); }}>
                <ScanLine className="h-4 w-4 mr-1" /> Otro
              </Button>
              <Button className="flex-1 gap-1" onClick={() => { onConfirm(food, parseFloat(portion) || 100); handleClose(); }}>
                <Check className="h-4 w-4" /> Agregar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
