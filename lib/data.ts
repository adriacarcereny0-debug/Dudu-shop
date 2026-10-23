import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Product, PublicProduct, Settings } from "@/lib/types";
import { DEFAULT_SETTINGS, toPublicProduct } from "@/lib/utils";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres devuelve numeric como texto: lo pasamos a número. */
export function toProduct(row: Record<string, unknown>): Product {
  return {
    ...(row as Product),
    price: row.price === null ? null : Number(row.price),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db()`select store_name, tagline, whatsapp_number, instagram, show_prices from settings where id = 1`;
  return (rows[0] as Settings | undefined) ?? DEFAULT_SETTINGS;
});

export const getCatalog = cache(async (): Promise<PublicProduct[]> => {
  const [settings, rows] = await Promise.all([
    getSettings(),
    db()`select * from products where published order by position, created_at desc`,
  ]);
  return rows.map((r) => toPublicProduct(toProduct(r), settings));
});

export const getPublicProduct = cache(async (id: string): Promise<PublicProduct | null> => {
  if (!UUID.test(id)) return null;
  const [settings, rows] = await Promise.all([
    getSettings(),
    db()`select * from products where id = ${id} and published`,
  ]);
  return rows[0] ? toPublicProduct(toProduct(rows[0]), settings) : null;
});

/** Todos los productos, incluidos los ocultos. Solo para el panel (comprueba la sesión antes). */
export async function getAllProducts() {
  const rows = await db()`select * from products order by position, created_at desc`;
  return rows.map(toProduct);
}

export async function getProduct(id: string) {
  if (!UUID.test(id)) return null;
  const rows = await db()`select * from products where id = ${id}`;
  return rows[0] ? toProduct(rows[0]) : null;
}

export async function getCategories() {
  const rows = await db()`select distinct category from products where category <> '' order by category`;
  return rows.map((r) => r.category as string);
}
