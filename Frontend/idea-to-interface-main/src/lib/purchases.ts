import { Bath, Drumstick, Package, Puzzle, Shirt, Sparkles, Tag, type LucideIcon } from "lucide-react";

// Mismas categorías que backend/src/purchases.ts
export const PURCHASE_CATEGORIES = [
  "juguetes",
  "collar",
  "vestimenta",
  "comida",
  "accesorios",
  "higiene",
  "otro",
] as const;
export type PurchaseCategory = (typeof PURCHASE_CATEGORIES)[number];

export const PURCHASE_CATEGORY_CONFIG: Record<PurchaseCategory, { label: string; icon: LucideIcon }> = {
  juguetes: { label: "Juguetes", icon: Puzzle },
  collar: { label: "Collar", icon: Tag },
  vestimenta: { label: "Vestimenta", icon: Shirt },
  comida: { label: "Comida", icon: Drumstick },
  accesorios: { label: "Accesorios", icon: Sparkles },
  higiene: { label: "Higiene", icon: Bath },
  otro: { label: "Otro", icon: Package },
};

export interface Purchase {
  id: string;
  petId: string;
  petName: string;
  itemName: string;
  category: PurchaseCategory;
  purchaseDate: string;
  price: number | null;
  notes: string | null;
  // fotos opcionales (data URL comprimidas)
  images: string[];
  createdAt: string;
}

export type PurchaseInput = Pick<Purchase, "petId" | "itemName" | "category" | "purchaseDate" | "price" | "notes" | "images">;

export const PURCHASE_IMAGES_MAX = 3;

// Pesos colombianos sin decimales, p. ej. "$ 25.000"
export const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

// Total gastado (las compras sin precio no suman)
export const totalSpent = (purchases: Pick<Purchase, "price">[]) =>
  purchases.reduce((sum, p) => sum + (p.price ?? 0), 0);

// "2026-10-18" → "18 oct 2026"
export const formatPurchaseDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  });
