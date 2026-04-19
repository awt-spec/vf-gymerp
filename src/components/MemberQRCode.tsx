import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Download } from "lucide-react";
import { useRef } from "react";

interface MemberQRCodeProps {
  memberId: string;
  memberName: string;
  size?: number;
  showButton?: boolean;
}

export function MemberQRCode({ memberId, memberName, size = 200, showButton = true }: MemberQRCodeProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const qrValue = JSON.stringify({ type: "gym_member", id: memberId });

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    canvas.width = size * 2;
    canvas.height = size * 2;
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, size * 2, size * 2);
      const a = document.createElement("a");
      a.download = `qr-${memberName.replace(/\s+/g, "-")}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (!showButton) {
    return (
      <div ref={qrRef} className="inline-flex">
        <QRCodeSVG value={qrValue} size={size} bgColor="transparent" fgColor="hsl(var(--foreground))" level="M" />
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <QrCode className="h-3.5 w-3.5" /> QR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="font-display text-center">{memberName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div ref={qrRef} className="bg-white p-4 rounded-xl">
            <QRCodeSVG value={qrValue} size={size} bgColor="#ffffff" fgColor="#000000" level="M" />
          </div>
          <p className="text-xs text-muted-foreground text-center">Escanear para check-in automático</p>
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Descargar QR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
