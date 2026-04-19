import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardContent className="p-2.5 md:p-6">
        {/* Mobile: stacked layout */}
        <div className="flex flex-col md:hidden gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">{title}</p>
            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Icon className="h-3 w-3 text-primary" />
            </div>
          </div>
          <p className="text-sm font-display font-bold text-foreground leading-tight">{value}</p>
          {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
        </div>
        {/* Desktop: side by side */}
        <div className="hidden md:flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-display font-bold text-foreground mt-1">{value}</p>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
