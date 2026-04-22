import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/StatCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { useGym } from "@/hooks/useGym";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ShoppingBag, Plus, Package, DollarSign, Search,
  Edit, Trash2, ShoppingCart, Loader2, Filter
} from "lucide-react";
import GymAiAssistant from "@/components/GymAiAssistant";

const CATEGORIES = ["bebidas", "suplementos", "snacks", "ropa", "accesorios", "otros"];
const CATEGORY_ICONS: Record<string, string> = {
  bebidas: "🥤", suplementos: "💊", snacks: "🍌", ropa: "👕", accesorios: "🎒", otros: "📦",
};
const PAYMENT_METHODS: Record<string, string> = { cash: "💵 Efectivo", card: "💳 Tarjeta", transfer: "🏦 Transfer" };

export default function Tienda() {
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [productOpen, setProductOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [form, setForm] = useState({ name: "", category: "bebidas", price: "", stock: "", min_stock: "0" });
  const [saleForm, setSaleForm] = useState({ product_id: "", member_id: "", quantity: "1", payment_method: "cash" });

  const fetchData = async () => {
    setLoading(true);
    const [pRes, sRes, mRes] = await Promise.all([
      supabase.from("shop_products").select("*").order("name"),
      supabase.from("shop_sales").select("*, shop_products(name, category), members(first_name, last_name)").order("sale_date", { ascending: false }).limit(100),
      supabase.from("members").select("id, first_name, last_name, status").eq("status", "active").order("first_name"),
    ]);
    setProducts(pRes.data ?? []);
    setSales(sRes.data ?? []);
    setMembers(mRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: form.name, category: form.category, price: Number(form.price), stock: Number(form.stock), min_stock: Number(form.min_stock) };
    let error;
    if (editProduct) {
      ({ error } = await supabase.from("shop_products").update(payload).eq("id", editProduct.id));
    } else {
      ({ error } = await supabase.from("shop_products").insert(payload));
    }
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: editProduct ? "Producto actualizado ✅" : "Producto creado ✅" });
    setProductOpen(false); setEditProduct(null);
    setForm({ name: "", category: "bebidas", price: "", stock: "", min_stock: "0" });
    fetchData();
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase.from("shop_products").update({ is_active: false }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Producto eliminado" }); fetchData();
  };

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.id === saleForm.product_id);
    if (!product) return;
    const qty = Number(saleForm.quantity);
    if (qty > product.stock) { toast({ title: "Stock insuficiente", variant: "destructive" }); return; }
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await supabase.from("shop_sales").insert({
      product_id: saleForm.product_id,
      member_id: saleForm.member_id && saleForm.member_id !== "none" ? saleForm.member_id : null,
      quantity: qty, unit_price: product.price, total_amount: product.price * qty,
      payment_method: saleForm.payment_method, sold_by: userId,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("shop_products").update({ stock: product.stock - qty }).eq("id", product.id);
    toast({ title: "Venta registrada ✅" });
    setSaleOpen(false);
    setSaleForm({ product_id: "", member_id: "", quantity: "1", payment_method: "cash" });
    fetchData();
  };

  // Quick sale from product card
  const quickSale = (product: any) => {
    setSaleForm({ product_id: product.id, member_id: "", quantity: "1", payment_method: "cash" });
    setSaleOpen(true);
  };

  const activeProducts = products.filter(p => p.is_active);
  const lowStock = activeProducts.filter(p => p.stock <= p.min_stock);
  const totalSales = sales.reduce((s, sale) => s + Number(sale.total_amount), 0);
  const filteredProducts = activeProducts
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter(p => categoryFilter === "all" || p.category === categoryFilter);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-3xl font-display font-bold">Tienda</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Productos, ventas e inventario</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard title="Productos" value={activeProducts.length} icon={Package} />
        <StatCard title="Stock bajo" value={lowStock.length} icon={ShoppingBag} description={lowStock.length > 0 ? "⚠️ Reabastecer" : undefined} />
        <StatCard title="Ventas (mes)" value={sales.length} icon={ShoppingCart} />
        <StatCard title="Ingresos" value={formatCurrency(totalSales)} icon={DollarSign} />
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => { setEditProduct(null); setForm({ name: "", category: "bebidas", price: "", stock: "", min_stock: "0" }); setProductOpen(true); }}>
          <Plus className="h-3.5 w-3.5" />Producto
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setSaleOpen(true)}>
          <ShoppingCart className="h-3.5 w-3.5" />Venta
        </Button>
      </div>

      <Tabs defaultValue="products">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="products" className="text-xs">📦 Productos</TabsTrigger>
          <TabsTrigger value="sales" className="text-xs">🧾 Ventas</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-3 mt-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-auto h-9 text-xs gap-1">
                <Filter className="h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_ICONS[c]} {c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            {filteredProducts.map(p => (
              <div key={p.id} className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/50 active:scale-[0.98] transition-transform">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-lg shrink-0">
                  {CATEGORY_ICONS[p.category] || "📦"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{formatCurrency(p.price)}</span>
                    <span className={p.stock <= p.min_stock ? "text-destructive font-semibold" : ""}>
                      Stock: {p.stock}
                    </span>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => quickSale(p)} title="Venta rápida">
                    <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                    setEditProduct(p);
                    setForm({ name: p.name, category: p.category, price: String(p.price), stock: String(p.stock), min_stock: String(p.min_stock) });
                    setProductOpen(true);
                  }}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteProduct(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && <p className="text-center text-muted-foreground text-xs py-6">Sin productos</p>}
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-3 mt-3">
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {sales.map(s => (
              <div key={s.id} className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/50">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-lg shrink-0">
                  {CATEGORY_ICONS[s.shop_products?.category] || "🧾"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.shop_products?.name || "Producto"}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                    <span>{s.quantity}× {formatCurrency(s.unit_price)}</span>
                    <span>·</span>
                    <span>{PAYMENT_METHODS[s.payment_method] || s.payment_method}</span>
                    <span>·</span>
                    <span>{format(new Date(s.sale_date), "dd MMM", { locale: es })}</span>
                  </div>
                  {s.members && <p className="text-[10px] text-primary mt-0.5">{s.members.first_name} {s.members.last_name}</p>}
                </div>
                <span className="text-primary font-bold text-sm shrink-0">{formatCurrency(s.total_amount)}</span>
              </div>
            ))}
            {sales.length === 0 && <p className="text-center text-muted-foreground text-xs py-6">Sin ventas</p>}
          </div>
        </TabsContent>
      </Tabs>

      {/* Product Dialog */}
      <Dialog open={productOpen} onOpenChange={setProductOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-base">{editProduct ? "Editar" : "Nuevo"} Producto</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveProduct} className="space-y-3">
            <div><Label className="text-[11px]">Nombre</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="text-sm h-9" /></div>
            <div>
              <Label className="text-[11px]">Categoría</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {CATEGORIES.map(c => (
                  <button key={c} type="button"
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] border transition-all capitalize ${
                      form.category === c ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 border-border/50 hover:bg-muted/50"
                    }`}
                    onClick={() => setForm({ ...form, category: c })}>
                    {CATEGORY_ICONS[c]} {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-[11px]">Precio</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required className="text-sm h-9" /></div>
              <div><Label className="text-[11px]">Stock</Label><Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required className="text-sm h-9" /></div>
              <div><Label className="text-[11px]">Mín.</Label><Input type="number" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} className="text-sm h-9" /></div>
            </div>
            <Button type="submit" className="w-full">{editProduct ? "Guardar" : "Crear"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sale Dialog */}
      <Dialog open={saleOpen} onOpenChange={setSaleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-base">Registrar Venta</DialogTitle></DialogHeader>
          <form onSubmit={handleSale} className="space-y-3">
            <div>
              <Label className="text-[11px]">Producto</Label>
              <Select value={saleForm.product_id} onValueChange={v => setSaleForm({ ...saleForm, product_id: v })}>
                <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Elegir producto" /></SelectTrigger>
                <SelectContent>{activeProducts.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {CATEGORY_ICONS[p.category]} {p.name} ({p.stock})
                  </SelectItem>
                ))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">Socio (opcional)</Label>
              <Select value={saleForm.member_id} onValueChange={v => setSaleForm({ ...saleForm, member_id: v })}>
                <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Sin socio" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin socio</SelectItem>
                  {members.map(m => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px]">Cantidad</Label>
                <div className="flex items-center gap-1 mt-1">
                  <button type="button" className="w-8 h-8 rounded-lg bg-muted/50 text-sm font-bold" onClick={() => setSaleForm({ ...saleForm, quantity: String(Math.max(1, Number(saleForm.quantity) - 1)) })}>−</button>
                  <span className="text-lg font-bold w-8 text-center">{saleForm.quantity}</span>
                  <button type="button" className="w-8 h-8 rounded-lg bg-muted/50 text-sm font-bold" onClick={() => setSaleForm({ ...saleForm, quantity: String(Number(saleForm.quantity) + 1) })}>+</button>
                </div>
              </div>
              <div>
                <Label className="text-[11px]">Método</Label>
                <div className="flex flex-col gap-1 mt-1">
                  {(["cash", "card", "transfer"] as const).map(m => (
                    <button key={m} type="button"
                      className={`px-2 py-1 rounded-lg text-[11px] border transition-all text-left ${
                        saleForm.payment_method === m ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 border-border/50"
                      }`}
                      onClick={() => setSaleForm({ ...saleForm, payment_method: m })}>
                      {PAYMENT_METHODS[m]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {saleForm.product_id && (
              <div className="p-3 rounded-xl bg-primary/10 text-center">
                <span className="text-[11px] text-muted-foreground">Total</span>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency((products.find(p => p.id === saleForm.product_id)?.price || 0) * Number(saleForm.quantity))}
                </p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={!saleForm.product_id}>Registrar Venta</Button>
          </form>
        </DialogContent>
      </Dialog>
      <GymAiAssistant
        module="tienda"
        moduleLabel="Tienda"
        context={{
          total_products: products.length,
          total_sales: sales.length,
          revenue_total: sales.reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0),
          top_products: products.slice(0, 10).map((p: any) => ({ name: p.name, price: p.price, stock: p.stock, category: p.category })),
        }}
      />
    </div>
  );
}
