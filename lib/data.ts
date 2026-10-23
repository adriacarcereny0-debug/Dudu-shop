import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import type { Product, PublicProduct, Settings } from "@/lib/types";
import { DEFAULT_SETTINGS, toPublicProduct } from "@/lib/utils";

const SETTINGS_COLUMNS = "store_name, tagline, whatsapp_number, instagram, show_prices";

export const getSettings = cache(async (): Promise<Settings> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("settings").select(SETTINGS_COLUMNS).eq("id", 1).maybeSingle();
  if (error) throw new Error(`No se pudo cargar la configuración: ${error.message}`);
  return data ?? DEFAULT_SETTINGS;
});

export const getCatalog = cache(async (): Promise<PublicProduct[]> => {
  const supabase = createPublicClient();
  const [settings, { data, error }] = await Promise.all([
    getSettings(),
    supabase
      .from("products")
      .select("*")
      .eq("published", true)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);
  if (error) throw new Error(`No se pudo cargar el catálogo: ${error.message}`);
  return (data as Product[]).map((p) => toPublicProduct(p, settings));
});

export const getPublicProduct = cache(async (id: string): Promise<PublicProduct | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = createPublicClient();
  const [settings, { data, error }] = await Promise.all([
    getSettings(),
    supabase.from("products").select("*").eq("id", id).eq("published", true).maybeSingle(),
  ]);
  if (error) throw new Error(`No se pudo cargar el producto: ${error.message}`);
  return data ? toPublicProduct(data as Product, settings) : null;
});
