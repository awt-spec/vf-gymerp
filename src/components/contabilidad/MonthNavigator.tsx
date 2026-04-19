import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  date: Date;
  onChange: (d: Date) => void;
}

export function MonthNavigator({ date, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onChange(subMonths(date, 1))}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-display font-semibold capitalize min-w-[100px] text-center">
        {format(date, "MMMM yyyy", { locale: es })}
      </span>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onChange(addMonths(date, 1))}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
