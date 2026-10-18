// Sección "Compras": artículos comprados para una mascota.
import { Purchase } from "@prisma/client";
import { todayInAppTimeZone } from "./dates";

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

export const ITEM_NAME_MAX = 100;
export const NOTES_MAX = 500;
// fotos opcionales de la compra (el navegador las comprime antes de enviarlas)
export const IMAGES_MAX = 3;
export const IMAGE_MAX_CHARS = 1_500_000; // ~1,1 MB por foto en base64

export interface PurchaseInput {
  itemName: string;
  category: PurchaseCategory;
  purchaseDate: string;
  price: number | null;
  notes: string | null;
  images: string[];
}

const isValidDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

// Valida y normaliza el cuerpo de una compra. `now` permite fijar "hoy" en las pruebas.
export function parsePurchaseInput(body: any, now: Date = new Date()): { input?: PurchaseInput; error?: string } {
  const itemName = typeof body?.itemName === "string" ? body.itemName.trim() : "";
  if (!itemName) return { error: "El nombre del artículo es obligatorio" };
  if (itemName.length > ITEM_NAME_MAX) return { error: `El nombre del artículo admite máximo ${ITEM_NAME_MAX} caracteres` };

  const category = body?.category;
  if (!PURCHASE_CATEGORIES.includes(category)) return { error: "Selecciona una categoría válida" };

  const purchaseDate = typeof body?.purchaseDate === "string" ? body.purchaseDate : "";
  if (!isValidDate(purchaseDate)) return { error: "La fecha de compra no es válida" };
  if (purchaseDate > todayInAppTimeZone(now)) return { error: "La fecha de compra no puede ser futura" };

  let price: number | null = null;
  if (body?.price !== undefined && body?.price !== null && body?.price !== "") {
    price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) return { error: "El precio debe ser un número mayor o igual a 0" };
    price = Math.round(price);
  }

  const notes = typeof body?.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
  if (notes && notes.length > NOTES_MAX) return { error: `Las notas admiten máximo ${NOTES_MAX} caracteres` };

  const images = body?.images ?? [];
  if (!Array.isArray(images)) return { error: "Las fotos no tienen un formato válido" };
  if (images.length > IMAGES_MAX) return { error: `Puedes adjuntar máximo ${IMAGES_MAX} fotos por compra` };
  for (const image of images) {
    if (typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(image)) {
      return { error: "Las fotos deben ser imágenes JPG, PNG o WebP" };
    }
    if (image.length > IMAGE_MAX_CHARS) return { error: "Una de las fotos es demasiado grande" };
  }

  return { input: { itemName, category, purchaseDate, price, notes, images } };
}

export const toPurchaseResponse = ({ pet, ...p }: Purchase & { pet?: { name: string } | null }) => ({
  ...p,
  images: JSON.parse(p.images) as string[],
  id: String(p.id),
  petId: String(p.petId),
  petName: pet?.name ?? "",
});
