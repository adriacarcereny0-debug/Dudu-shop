import { IMAGE_BUCKET, SUPABASE_URL } from "@/lib/env";
import type { Product, ProductStatus, PublicProduct, Settings } from "@/lib/types";

export const DEFAULT_SETTINGS: Settings = {
  store_name: "Dudu Shop",
  tagline: "",
  whatsapp_number: "",
  instagram: "",
  show_prices: true,
};

export function imageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`;
}

const priceFormatter = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export function formatPrice(price: number) {
  return priceFormatter.format(price);
}

export const STATUS_LABEL: Record<ProductStatus, string> = {
  available: "Disponible",
  reserved: "Reservado",
  sold_out: "Agotado",
};

/** Elimina datos internos y oculta el precio si la tienda o el producto no lo muestran. */
export function toPublicProduct(product: Product, settings: Settings): PublicProduct {
  const showPrice = settings.show_prices && product.show_price && product.price !== null;
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    price: showPrice ? Number(product.price) : null,
    sizes: product.sizes,
    colors: product.colors,
    stock: product.stock,
    status: product.status,
    is_new: product.is_new,
    images: product.images,
  };
}

export function whatsappLink(number: string, message: string) {
  const digits = number.replace(/\D/g, "");
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function productMessage(name: string, url?: string, size?: string) {
  const sizeText = size ? ` en talla ${size}` : "";
  return `¡Hola! Me interesa «${name}»${sizeText}. ¿Está disponible?${url ? `\n${url}` : ""}`;
}

export function availabilityText(product: Pick<PublicProduct, "status" | "stock">) {
  if (product.status === "reserved") return "Reservado";
  if (product.status === "sold_out" || product.stock <= 0) return "Agotado";
  if (product.stock === 1) return "Última unidad";
  return `${product.stock} disponibles`;
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
