import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { CURRENCIES } from "@/lib/currency";

const EXPENSE_CATEGORIES = ["Alquiler", "Servicios", "Mantenimiento", "Equipamiento", "Sueldos", "Marketing", "Limpieza", "Seguros", "CCSS", "IVA", "Otros"];

interface Props { onCreated: () => void; showIva?: boolean }

export function ExpenseForm({ onCreated, showIva = false }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    category: "Servicios", description: "", amount: "", expense_date: "",
    payment_method: "cash", notes: "", currency: "CRC", iva_amount: "0"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("expenses").insert({
      category: form.category, description: form.description, amount: Number(form.amount),
      expense_date: form.expense_date || undefined, payment_method: form.payment_method,
      notes: form.notes || null, currency: form.currency,
      iva_amount: Number(form.iva_amount) || 0,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Gasto registrado ✅" });
    setOpen(false);
    setForm({ category: "Servicios", description: "", amount: "", expense_date: "", payment_method: "cash", notes: "", currency: "CRC", iva_amount: "0" });
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" />Gasto</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Registrar Gasto</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Descripción</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Monto</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {showIva && (
            <div className="space-y-1.5"><Label>IVA incluido</Label><Input type="number" step="0.01" value={form.iva_amount} onChange={e => setForm({ ...form, iva_amount: e.target.value })} /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Fecha</Label><Input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>Método</Label>
              <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Notas</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <Button type="submit" className="w-full">Registrar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
