import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Search, Check, Camera, Upload, Image as ImageIcon, Play, Link as LinkIcon, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { PRESET_MACHINES, type PresetMachine } from "@/data/presetMachines";
import { cn } from "@/lib/utils";
import GymAiAssistant from "@/components/GymAiAssistant";
import { useGym } from "@/hooks/useGym";

export default function Inventario() {
  const { gymId } = useGym();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [listCategoryFilter, setListCategoryFilter] = useState("todos");
  const [selectedMachines, setSelectedMachines] = useState<Map<string, { quantity: number; weight_kg?: number }>>(new Map());
  const [customForm, setCustomForm] = useState({ name: "", category: "otro", quantity: "1", weight_kg: "", video_url: "" });
  const [customPhoto, setCustomPhoto] = useState<File | null>(null);
  const [customPhotoPreview, setCustomPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [editVideoId, setEditVideoId] = useState<string | null>(null);
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    const { data } = await supabase.from("inventory").select("*").order("category, name");
    setItems(data ?? []);
  };

  useEffect(() => { fetchData(); }, []);

  const existingNames = new Set(items.map(i => i.name));
  const itemCategories = ["todos", ...Array.from(new Set(items.map(i => i.category)))];

  const filteredItems = items.filter(item => {
    const matchSearch = !listSearch || item.name.toLowerCase().includes(listSearch.toLowerCase());
    const matchCat = listCategoryFilter === "todos" || item.category === listCategoryFilter;
    return matchSearch && matchCat;
  });

  const toggleMachine = (preset: PresetMachine) => {
    const next = new Map(selectedMachines);
    next.has(preset.name) ? next.delete(preset.name) : next.set(preset.name, { quantity: 1, weight_kg: undefined });
    setSelectedMachines(next);
  };

  const updateMachineData = (name: string, field: "quantity" | "weight_kg", value: number) => {
    const next = new Map(selectedMachines);
    const current = next.get(name) ?? { quantity: 1 };
    next.set(name, { ...current, [field]: value });
    setSelectedMachines(next);
  };

  const handleAddSelected = async () => {
    const toAdd = Array.from(selectedMachines.entries())
      .filter(([name]) => !existingNames.has(name))
      .map(([name, data]) => {
        const preset = PRESET_MACHINES.find(p => p.name === name)!;
        return { name: preset.name, category: preset.category, quantity: data.quantity, min_stock: 0, unit_cost: 0, image_url: preset.image, weight_kg: data.weight_kg ?? null };
      });
    if (toAdd.length === 0) { toast({ title: "No hay nuevos" }); return; }
    const { error } = await supabase.from("inventory").insert(toAdd);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${toAdd.length} equipo${toAdd.length > 1 ? "s" : ""} ✅` });
    setOpen(false); setSelectedMachines(new Map()); fetchData();
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomPhoto(file);
    setCustomPhotoPreview(URL.createObjectURL(file));
  };

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    let imageUrl: string | null = null;
    if (customPhoto) {
      const path = `${Date.now()}.${customPhoto.name.split(".").pop()}`;
      const { error: uploadErr } = await supabase.storage.from("equipment-photos").upload(path, customPhoto);
      if (uploadErr) { toast({ title: "Error foto", description: uploadErr.message, variant: "destructive" }); setUploading(false); return; }
      imageUrl = supabase.storage.from("equipment-photos").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("inventory").insert({
      name: customForm.name, category: customForm.category, quantity: Number(customForm.quantity),
      min_stock: 0, unit_cost: 0, image_url: imageUrl, weight_kg: customForm.weight_kg ? Number(customForm.weight_kg) : null,
      video_url: customForm.video_url || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setUploading(false); return; }
    toast({ title: "Agregado ✅" });
    setCustomForm({ name: "", category: "otro", quantity: "1", weight_kg: "", video_url: "" });
    setCustomPhoto(null); setCustomPhotoPreview(null); setUploading(false); setOpen(false); fetchData();
  };

  const handleRemove = async (id: string) => {
    await supabase.from("inventory").delete().eq("id", id);
    fetchData();
  };

  const updateQuantity = async (id: string, qty: number) => {
    if (qty < 0) return;
    await supabase.from("inventory").update({ quantity: qty }).eq("id", id);
    fetchData();
  };

  const saveVideoUrl = async (id: string) => {
    await supabase.from("inventory").update({ video_url: editVideoUrl || null }).eq("id", id);
    setEditVideoId(null);
    setEditVideoUrl("");
    fetchData();
    toast({ title: "Video guardado ✅" });
  };

  const categories = ["todos", "cardio", "fuerza", "peso libre", "accesorios"];
  const filteredPresets = PRESET_MACHINES.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "todos" || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-3xl font-display font-bold">Inventario</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{items.length} equipos</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedMachines(new Map()); setSearch(""); setCategoryFilter("todos"); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" />Agregar</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Agregar Equipo</DialogTitle></DialogHeader>
            <Tabs defaultValue="catalog">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="catalog">Catálogo</TabsTrigger>
                <TabsTrigger value="custom">Personalizado</TabsTrigger>
              </TabsList>

              <TabsContent value="catalog" className="space-y-3 mt-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {categories.map(cat => (
                    <Button key={cat} type="button" variant={categoryFilter === cat ? "default" : "outline"} size="sm" onClick={() => setCategoryFilter(cat)} className="capitalize text-xs h-7 px-2.5">
                      {cat}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {filteredPresets.map((preset) => {
                    const added = existingNames.has(preset.name);
                    const selected = selectedMachines.has(preset.name);
                    const data = selectedMachines.get(preset.name);
                    return (
                      <div key={preset.name} className="space-y-1">
                        <button type="button" disabled={added} onClick={() => toggleMachine(preset)}
                          className={cn("relative rounded-lg border-2 overflow-hidden transition-all w-full",
                            added ? "border-muted opacity-50 cursor-not-allowed"
                              : selected ? "border-primary ring-2 ring-primary/30"
                              : "border-border/50 hover:border-primary/50"
                          )}>
                          <img src={preset.image} alt={preset.name} className="w-full aspect-square object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-1.5">
                            <p className="text-[10px] font-medium text-white leading-tight">{preset.name}</p>
                          </div>
                          {(added || selected) && (
                            <div className={cn("absolute top-1 right-1 rounded-full p-0.5", added ? "bg-muted-foreground" : "bg-primary")}>
                              <Check className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                        </button>
                        {selected && (
                          <div className="flex gap-1">
                            <Input type="number" min="1" placeholder="Cant" className="h-6 text-[10px] px-1.5" value={data?.quantity ?? 1}
                              onChange={(e) => updateMachineData(preset.name, "quantity", Number(e.target.value))} />
                            {preset.needsWeight && (
                              <Input type="number" min="0" step="0.5" placeholder="Kg" className="h-6 text-[10px] px-1.5" value={data?.weight_kg ?? ""}
                                onChange={(e) => updateMachineData(preset.name, "weight_kg", Number(e.target.value))} />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Button onClick={handleAddSelected} className="w-full" size="sm" disabled={selectedMachines.size === 0}>
                  Agregar {selectedMachines.size > 0 ? `${selectedMachines.size} equipo${selectedMachines.size > 1 ? "s" : ""}` : ""}
                </Button>
              </TabsContent>

              <TabsContent value="custom" className="space-y-3 mt-2">
                <form onSubmit={handleAddCustom} className="space-y-3">
                  <div className="flex gap-3">
                    {customPhotoPreview ? (
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border shrink-0">
                        <img src={customPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => { setCustomPhoto(null); setCustomPhotoPreview(null); }}
                          className="absolute top-1 right-1 bg-destructive rounded-full p-0.5">
                          <Trash2 className="h-3 w-3 text-destructive-foreground" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center shrink-0">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5 justify-center">
                      <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => cameraInputRef.current?.click()}>
                        <Camera className="mr-1 h-3 w-3" />Foto
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-1 h-3 w-3" />Subir
                      </Button>
                      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Nombre</Label><Input value={customForm.name} onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })} required /></div>
                    <div className="space-y-1"><Label className="text-xs">Categoría</Label><Input value={customForm.category} onChange={(e) => setCustomForm({ ...customForm, category: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Cantidad</Label><Input type="number" min="1" value={customForm.quantity} onChange={(e) => setCustomForm({ ...customForm, quantity: e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs">Peso (kg)</Label><Input type="number" min="0" step="0.5" value={customForm.weight_kg} onChange={(e) => setCustomForm({ ...customForm, weight_kg: e.target.value })} /></div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1"><Play className="h-3 w-3" />Video demostrativo (URL)</Label>
                    <Input value={customForm.video_url} onChange={(e) => setCustomForm({ ...customForm, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                  </div>
                  <Button type="submit" className="w-full" size="sm" disabled={uploading}>{uploading ? "Subiendo..." : "Agregar"}</Button>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search/filter for item list */}
      {items.length > 0 && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar equipo..." value={listSearch} onChange={(e) => setListSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {itemCategories.map(cat => (
              <Button key={cat} type="button" variant={listCategoryFilter === cat ? "default" : "outline"} size="sm"
                onClick={() => setListCategoryFilter(cat)} className="capitalize text-xs h-7 px-2.5">
                {cat}
              </Button>
            ))}
          </div>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground text-sm mb-3">{items.length === 0 ? "Sin equipos" : "Sin resultados"}</p>
            {items.length === 0 && <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />Agregar</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
          {filteredItems.map((item) => {
            const img = item.image_url || PRESET_MACHINES.find(p => p.name === item.name)?.image;
            const isExpanded = expandedItem === item.id;
            return (
              <Card key={item.id} className="border-border/50 bg-card overflow-hidden group">
                <div className="cursor-pointer" onClick={() => setExpandedItem(isExpanded ? null : item.id)}>
                  {img ? (
                    <div className="relative h-28 md:h-36 overflow-hidden">
                      <img src={img} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                      {item.video_url && (
                        <div className="absolute top-1.5 left-1.5 bg-primary/90 rounded-full p-1">
                          <Play className="h-2.5 w-2.5 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative h-28 md:h-36 bg-muted/30 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <CardContent className="p-2.5">
                  <h3 className="font-display font-semibold text-xs md:text-sm truncate">{item.name}</h3>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <Badge variant="secondary" className="capitalize text-[10px]">{item.category}</Badge>
                    {item.weight_kg && <Badge variant="outline" className="text-[10px]">{item.weight_kg}kg</Badge>}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <Button variant="outline" size="icon" className="h-6 w-6 text-xs" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</Button>
                    <span className="font-bold text-xs w-6 text-center">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-6 w-6 text-xs" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-border/30 space-y-2">
                      {/* Video section */}
                      {editVideoId === item.id ? (
                        <div className="flex gap-1">
                          <Input value={editVideoUrl} onChange={e => setEditVideoUrl(e.target.value)} placeholder="URL del video..." className="h-7 text-xs flex-1" />
                          <Button size="sm" className="h-7 text-xs px-2" onClick={() => saveVideoUrl(item.id)}>✓</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          {item.video_url ? (
                            <a href={item.video_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary underline flex items-center gap-0.5 flex-1 truncate">
                              <Play className="h-3 w-3 shrink-0" /> Ver video
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted-foreground flex-1">Sin video</span>
                          )}
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={() => { setEditVideoId(item.id); setEditVideoUrl(item.video_url || ""); }}>
                            <LinkIcon className="h-3 w-3 mr-0.5" />{item.video_url ? "Editar" : "Agregar"}
                          </Button>
                        </div>
                      )}
                      <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-destructive gap-1" onClick={() => handleRemove(item.id)}>
                        <Trash2 className="h-3 w-3" /> Eliminar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <GymAiAssistant
        module="inventario"
        moduleLabel="Inventario"
        context={{
          total_items: items.length,
          low_stock: items.filter((i: any) => i.quantity <= (i.min_stock || 0)).length,
          total_value: items.reduce((s: number, i: any) => s + Number(i.unit_cost || 0) * Number(i.quantity || 0), 0),
          items: items.slice(0, 20).map((i: any) => ({ name: i.name, qty: i.quantity, min: i.min_stock, category: i.category })),
        }}
      />
    </div>
  );
}
