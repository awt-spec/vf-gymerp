import { useState } from "react";
import { LevelSelector } from "@/components/contabilidad/LevelSelector";
import { MonthNavigator } from "@/components/contabilidad/MonthNavigator";
import { Level3Basic } from "@/components/contabilidad/Level3Basic";
import { Level2Intermediate } from "@/components/contabilidad/Level2Intermediate";
import { Level1Expert } from "@/components/contabilidad/Level1Expert";
import { useAccounting } from "@/hooks/useAccounting";
import { Loader2 } from "lucide-react";
import GymAiAssistant from "@/components/GymAiAssistant";

export default function Contabilidad() {
  const [level, setLevel] = useState(3);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const data = useAccounting(selectedDate);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-3xl font-display font-bold">Contabilidad</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Finanzas del gimnasio</p>
      </div>

      <LevelSelector level={level} onChange={setLevel} />
      <MonthNavigator date={selectedDate} onChange={setSelectedDate} />

      {data.loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {level === 3 && (
            <Level3Basic
              summary={data.summary}
              monthExpenses={data.monthExpenses}
              monthPayments={data.monthPayments}
              monthShopSales={data.monthShopSales}
              cashRegisters={data.cashRegisters}
              refetch={data.refetch}
            />
          )}
          {level === 2 && (
            <Level2Intermediate
              summary={data.summary}
              monthExpenses={data.monthExpenses}
              monthPayments={data.monthPayments}
              monthShopSales={data.monthShopSales}
              cashRegisters={data.cashRegisters}
              refetch={data.refetch}
            />
          )}
          {level === 1 && (
            <Level1Expert
              summary={data.summary}
              monthExpenses={data.monthExpenses}
              monthPayments={data.monthPayments}
              cashRegisters={data.cashRegisters}
              budgets={data.budgets}
              fixedAssets={data.fixedAssets}
              expenses={data.expenses}
              payments={data.payments}
              refetch={data.refetch}
              selectedDate={selectedDate}
            />
          )}
        </>
      )}
      <GymAiAssistant
        module="contabilidad"
        moduleLabel="Contabilidad"
        context={{
          month: selectedDate.toISOString().slice(0, 7),
          income: data.monthPayments?.reduce?.((s: number, p: any) => s + Number(p.amount || 0), 0) ?? 0,
          expenses_count: data.expenses?.length ?? 0,
          expenses_total: data.expenses?.reduce?.((s: number, e: any) => s + Number(e.amount || 0), 0) ?? 0,
          cash_registers: data.cashRegisters?.length ?? 0,
          fixed_assets: data.fixedAssets?.length ?? 0,
          budgets: data.budgets?.length ?? 0,
        }}
      />
    </div>
  );
}
