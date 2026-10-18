import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Pet } from "@/lib/types";
import { getPets, getPurchases, createPurchase, updatePurchase, deletePurchase } from "@/lib/api";
import {
  Purchase,
  PurchaseCategory,
  PurchaseInput,
  PURCHASE_CATEGORIES,
  PURCHASE_CATEGORY_CONFIG,
  PURCHASE_IMAGES_MAX,
  formatCOP,
  formatPurchaseDate,
  totalSpent,
} from "@/lib/purchases";
import { todayInAppTimeZone } from "@/lib/dates";
import { compressImage } from "@/lib/images";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Wallet, ShoppingBag, ImagePlus, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const ALL = "all";

type FormState = {
  petId: string;
  itemName: string;
  category: PurchaseCategory | "";
  purchaseDate: string;
  price: string;
  notes: string;
  images: string[];
};

const emptyForm = (petId = ""): FormState => ({
  petId,
  itemName: "",
  category: "",
  purchaseDate: todayInAppTimeZone(),
  price: "",
  notes: "",
  images: [],
});

// Validación del formulario (el servidor vuelve a validar)
const validateForm = (form: FormState): string | null => {
  if (!form.petId) return "Selecciona la mascota";
  if (!form.itemName.trim()) return "El nombre del artículo es obligatorio";
  if (!form.category) return "Selecciona una categoría";
  if (!form.purchaseDate) return "Indica la fecha de compra";
  if (form.purchaseDate > todayInAppTimeZone()) return "La fecha de compra no puede ser futura";
  if (form.price !== "" && (!Number.isFinite(Number(form.price)) || Number(form.price) < 0)) {
    return "El precio debe ser un número mayor o igual a 0";
  }
  return null;
};

const ComprasPage = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [petFilter, setPetFilter] = useState<string>(ALL);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Purchase | null>(null);
  const [processingImages, setProcessingImages] = useState(false);
  // foto ampliada
  const [viewer, setViewer] = useState<{ src: string; title: string } | null>(null);

  useEffect(() => {
    Promise.all([getPets(), getPurchases()])
      .then(([petList, purchaseList]) => {
        setPets(petList);
        setPurchases(purchaseList);
      })
      .catch((e) => {
        console.error("failed to load purchases", e);
        toast.error("No se pudieron cargar las compras");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      purchases.filter(
        (p) => (petFilter === ALL || p.petId === petFilter) && (categoryFilter === ALL || p.category === categoryFilter)
      ),
    [purchases, petFilter, categoryFilter]
  );
  const total = totalSpent(filtered);
  const withoutPrice = filtered.filter((p) => p.price === null).length;

  const openCreate = () => {
    setEditing(null);
    // si hay un filtro de mascota activo, se preselecciona
    setForm(emptyForm(petFilter !== ALL ? petFilter : pets.length === 1 ? pets[0].id : ""));
    setDialogOpen(true);
  };

  const openEdit = (purchase: Purchase) => {
    setEditing(purchase);
    setForm({
      petId: purchase.petId,
      itemName: purchase.itemName,
      category: purchase.category,
      purchaseDate: purchase.purchaseDate,
      price: purchase.price === null ? "" : String(purchase.price),
      notes: purchase.notes ?? "",
      images: purchase.images ?? [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const error = validateForm(form);
    if (error) {
      toast.error(error);
      return;
    }
    const payload: PurchaseInput = {
      petId: form.petId,
      itemName: form.itemName.trim(),
      category: form.category as PurchaseCategory,
      purchaseDate: form.purchaseDate,
      price: form.price === "" ? null : Number(form.price),
      notes: form.notes.trim() || null,
      images: form.images,
    };

    setSaving(true);
    try {
      if (editing) {
        const updated = await updatePurchase(editing.id, payload);
        setPurchases((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        toast.success("Compra actualizada");
      } else {
        const created = await createPurchase(payload);
        setPurchases((prev) => [created, ...prev]);
        toast.success(`${created.itemName} agregado a las compras de ${created.petName}`);
      }
      setDialogOpen(false);
    } catch (e) {
      console.error("failed to save purchase", e);
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la compra");
    } finally {
      setSaving(false);
    }
  };

  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // permite volver a elegir la misma foto
    if (files.length === 0) return;

    const available = PURCHASE_IMAGES_MAX - form.images.length;
    if (files.length > available) {
      toast.error(`Puedes adjuntar máximo ${PURCHASE_IMAGES_MAX} fotos por compra`);
    }
    setProcessingImages(true);
    try {
      const compressed: string[] = [];
      for (const file of files.slice(0, available)) {
        try {
          compressed.push(await compressImage(file));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "No se pudo agregar la foto");
        }
      }
      setForm((f) => ({ ...f, images: [...f.images, ...compressed].slice(0, PURCHASE_IMAGES_MAX) }));
    } finally {
      setProcessingImages(false);
    }
  };

  const removeImage = (index: number) =>
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));

  const handleDelete = async () => {
    if (!toDelete) return;
    const target = toDelete;
    setToDelete(null);
    try {
      await deletePurchase(target.id);
      setPurchases((prev) => prev.filter((p) => p.id !== target.id));
      toast.success("Compra eliminada");
    } catch (e) {
      console.error("failed to delete purchase", e);
      toast.error("No se pudo eliminar la compra");
    }
  };

  // las compras siguen ordenadas por fecha (más reciente primero)
  const sorted = [...filtered].sort(
    (a, b) => b.purchaseDate.localeCompare(a.purchaseDate) || Number(b.id) - Number(a.id)
  );

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Compras</h1>
            <p className="text-muted-foreground mt-1">Juguetes, comida, accesorios y todo lo que compras para tus mascotas</p>
          </div>
          <Button className="gap-2 shrink-0" onClick={openCreate} disabled={pets.length === 0}>
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>
      </motion.div>

      {!loading && pets.length === 0 ? (
        <Card className="p-8 text-center border-border/50 shadow-card">
          <p className="text-muted-foreground">Primero registra una mascota para poder asociarle compras.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/mascotas">Ir a Mis Mascotas</Link>
          </Button>
        </Card>
      ) : (
        <>
          {/* Filtros */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Mascota</Label>
              <Select value={petFilter} onValueChange={setPetFilter}>
                <SelectTrigger aria-label="Filtrar por mascota">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas las mascotas</SelectItem>
                  {pets.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id}>
                      {pet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger aria-label="Filtrar por categoría">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas las categorías</SelectItem>
                  {PURCHASE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {PURCHASE_CATEGORY_CONFIG[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Total gastado */}
          <Card className="flex items-center gap-4 p-5 border-border/50 shadow-card">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                Total gastado
                {petFilter !== ALL && ` en ${pets.find((p) => p.id === petFilter)?.name ?? ""}`}
                {categoryFilter !== ALL && ` · ${PURCHASE_CATEGORY_CONFIG[categoryFilter as PurchaseCategory].label}`}
              </p>
              <p className="text-2xl font-bold" data-testid="total-gastado">{formatCOP(total)}</p>
              <p className="text-xs text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "compra" : "compras"}
                {withoutPrice > 0 && ` · ${withoutPrice} sin precio registrado`}
              </p>
            </div>
          </Card>

          {/* Lista */}
          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-muted-foreground py-12">Cargando compras...</p>
            ) : sorted.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <ShoppingBag className="mx-auto mb-2 h-8 w-8 opacity-50" />
                {purchases.length === 0 ? "Aún no has registrado compras" : "No hay compras con estos filtros"}
              </div>
            ) : (
              sorted.map((purchase) => {
                const category = PURCHASE_CATEGORY_CONFIG[purchase.category];
                const Icon = category.icon;
                return (
                  <motion.div key={purchase.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="flex gap-4 p-4 border-border/50 shadow-card">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                        <Icon className="h-5 w-5 text-secondary-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold truncate">{purchase.itemName}</p>
                          <p className="shrink-0 font-semibold">
                            {purchase.price === null ? (
                              <span className="text-sm font-normal text-muted-foreground">Sin precio</span>
                            ) : (
                              formatCOP(purchase.price)
                            )}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {category.label} · {purchase.petName} · {formatPurchaseDate(purchase.purchaseDate)}
                        </p>
                        {purchase.notes && <p className="mt-1 text-sm text-muted-foreground">{purchase.notes}</p>}
                        {purchase.images?.length > 0 && (
                          <div className="mt-2 flex gap-2">
                            {purchase.images.map((src, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setViewer({ src, title: purchase.itemName })}
                                className="h-14 w-14 overflow-hidden rounded-lg border border-border/60 transition-opacity hover:opacity-80"
                                aria-label={`Ver foto ${i + 1} de ${purchase.itemName}`}
                              >
                                <img src={src} alt={`Foto ${i + 1} de ${purchase.itemName}`} className="h-full w-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 flex gap-1">
                          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" onClick={() => openEdit(purchase)}>
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 px-2 text-destructive hover:text-destructive"
                            onClick={() => setToDelete(purchase)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Crear / editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar compra" : "Nueva compra"}</DialogTitle>
            <DialogDescription>Registra un artículo comprado para tu mascota.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Mascota *</Label>
              <Select value={form.petId} onValueChange={(v) => setForm((f) => ({ ...f, petId: v }))}>
                <SelectTrigger aria-label="Mascota">
                  <SelectValue placeholder="Selecciona la mascota" />
                </SelectTrigger>
                <SelectContent>
                  {pets.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id}>
                      {pet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="purchase-name">Artículo *</Label>
              <Input
                id="purchase-name"
                value={form.itemName}
                maxLength={100}
                onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
                placeholder="Ej: Pelota de caucho"
              />
            </div>
            <div>
              <Label>Categoría *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as PurchaseCategory }))}
              >
                <SelectTrigger aria-label="Categoría">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {PURCHASE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {PURCHASE_CATEGORY_CONFIG[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="purchase-date">Fecha de compra *</Label>
                <Input
                  id="purchase-date"
                  type="date"
                  value={form.purchaseDate}
                  max={todayInAppTimeZone()}
                  onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="purchase-price">Precio (COP)</Label>
                <Input
                  id="purchase-price"
                  type="number"
                  min={0}
                  step={100}
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="purchase-notes">Notas</Label>
              <Textarea
                id="purchase-notes"
                value={form.notes}
                maxLength={500}
                rows={3}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Opcional: tienda, talla, marca..."
              />
            </div>
            <div className="space-y-2">
              <Label>Fotos (opcional)</Label>
              <p className="text-xs text-muted-foreground">
                Hasta {PURCHASE_IMAGES_MAX} fotos del artículo o del recibo. JPG, PNG o WebP.
              </p>
              <div className="flex flex-wrap gap-3">
                {form.images.map((src, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border-2 border-primary/20">
                    <img src={src} alt={`Foto ${i + 1} de la compra`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 shadow"
                      aria-label={`Quitar foto ${i + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {form.images.length < PURCHASE_IMAGES_MAX && (
                  <label
                    className={`flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary/50 ${processingImages ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <ImagePlus className="h-6 w-6" />
                    {processingImages ? "Procesando..." : "Agregar"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="sr-only"
                      onChange={handleAddImages}
                      aria-label="Agregar fotos de la compra"
                    />
                  </label>
                )}
              </div>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={saving || processingImages}>
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Agregar compra"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Foto ampliada */}
      <Dialog open={viewer !== null} onOpenChange={(open) => !open && setViewer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewer?.title}</DialogTitle>
            <DialogDescription>Foto de la compra</DialogDescription>
          </DialogHeader>
          {viewer && <img src={viewer.src} alt={`Foto de ${viewer.title}`} className="max-h-[70vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta compra?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{toDelete?.itemName}" de las compras de {toDelete?.petName}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ComprasPage;
