"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { IMAGE_BUCKET } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Product, ProductInput, ProductStatus, Settings } from "@/lib/types";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const STATUSES: ProductStatus[] = ["available", "reserved", "sold_out"];
const IMAGE_PATH = /^[a-zA-Z0-9_-]+\.(webp|jpe?g|png|avif)$/;
const MAX_IMAGES = 10;

/** Comprueba sesión y permisos de administrador. RLS lo vuelve a comprobar en la base de datos. */
async function requireAdmin() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return null;
  const { data: isAdmin } = await supabase.rpc("is_admin");
  return isAdmin ? supabase : null;
}

const DENIED = { ok: false, error: "Tu sesión ha caducado. Vuelve a iniciar sesión." } as const;

function refreshCatalog() {
  revalidatePath("/", "layout");
}

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  console.error(fallback, error);
  return { ok: false, error: fallback };
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanList(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return [];
  const items = value.map((v) => cleanText(v, maxLength)).filter(Boolean);
  return Array.from(new Set(items)).slice(0, maxItems);
}

function cleanStock(value: unknown) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 9999) : 0;
}

function cleanProduct(input: ProductInput): ProductInput | string {
  const name = cleanText(input.name, 120);
  if (!name) return "El nombre es obligatorio.";

  let price: number | null = null;
  if (input.price !== null && input.price !== undefined && String(input.price) !== "") {
    price = Math.round(Number(input.price) * 100) / 100;
    if (!Number.isFinite(price) || price < 0 || price > 99_999_999) return "El precio no es válido.";
  }

  const images = Array.isArray(input.images) ? input.images.filter((p) => IMAGE_PATH.test(p)).slice(0, MAX_IMAGES) : [];

  return {
    name,
    description: cleanText(input.description, 2000),
    category: cleanText(input.category, 40),
    price,
    show_price: Boolean(input.show_price),
    sizes: cleanList(input.sizes, 20, 12),
    colors: cleanList(input.colors, 20, 30),
    stock: cleanStock(input.stock),
    status: STATUSES.includes(input.status) ? input.status : "available",
    is_new: Boolean(input.is_new),
    published: Boolean(input.published),
    images,
  };
}

async function removeImages(supabase: Awaited<ReturnType<typeof createClient>>, paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(paths);
  if (error) console.error("No se pudieron borrar imágenes", error);
}

async function topPosition(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("products")
    .select("position")
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? 1) - 1;
}

// ─── Sesión ───────────────────────────────────────────────

export async function login(_prev: { error?: string; email?: string } | undefined, formData: FormData) {
  const email = cleanText(formData.get("email"), 200);
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";
  if (!email || !password) return { error: "Introduce tu email y contraseña.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error:
        error.status === 429
          ? "Demasiados intentos. Espera unos minutos."
          : "Email o contraseña incorrectos.",
      email,
    };
  }
  redirect("/admin");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ─── Productos ────────────────────────────────────────────

export async function createProduct(input: ProductInput): Promise<Result<{ id: string }>> {
  try {
    const supabase = await requireAdmin();
    if (!supabase) return DENIED;
    const product = cleanProduct(input);
    if (typeof product === "string") return { ok: false, error: product };

    const { data, error } = await supabase
      .from("products")
      .insert({ ...product, position: await topPosition(supabase) })
      .select("id")
      .single();
    if (error) return fail(error, "No se pudo crear el producto.");

    refreshCatalog();
    return { ok: true, id: data.id };
  } catch (error) {
    return fail(error, "No se pudo crear el producto.");
  }
}

export async function updateProduct(id: string, input: ProductInput): Promise<Result> {
  try {
    const supabase = await requireAdmin();
    if (!supabase) return DENIED;
    const product = cleanProduct(input);
    if (typeof product === "string") return { ok: false, error: product };

    const { data: previous } = await supabase.from("products").select("images").eq("id", id).maybeSingle();
    if (!previous) return { ok: false, error: "El producto ya no existe." };

    const { error } = await supabase.from("products").update(product).eq("id", id);
    if (error) return fail(error, "No se pudieron guardar los cambios.");

    const removed = (previous.images as string[]).filter((p) => !product.images.includes(p));
    await removeImages(supabase, removed);

    refreshCatalog();
    return { ok: true };
  } catch (error) {
    return fail(error, "No se pudieron guardar los cambios.");
  }
}

type QuickPatch = Partial<Pick<Product, "stock" | "status" | "published" | "is_new">>;

export async function patchProduct(id: string, patch: QuickPatch): Promise<Result> {
  try {
    const supabase = await requireAdmin();
    if (!supabase) return DENIED;
    const clean: QuickPatch = {};
    if (patch.stock !== undefined) clean.stock = cleanStock(patch.stock);
    if (patch.status !== undefined && STATUSES.includes(patch.status)) clean.status = patch.status;
    if (patch.published !== undefined) clean.published = Boolean(patch.published);
    if (patch.is_new !== undefined) clean.is_new = Boolean(patch.is_new);
    if (Object.keys(clean).length === 0) return { ok: true };

    const { error } = await supabase.from("products").update(clean).eq("id", id);
    if (error) return fail(error, "No se pudo guardar el cambio.");

    refreshCatalog();
    return { ok: true };
  } catch (error) {
    return fail(error, "No se pudo guardar el cambio.");
  }
}

export async function duplicateProduct(id: string): Promise<Result<{ product: Product }>> {
  try {
    const supabase = await requireAdmin();
    if (!supabase) return DENIED;
    const { data: original } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    if (!original) return { ok: false, error: "El producto ya no existe." };

    // Cada copia tiene sus propias fotos, así borrar una no afecta a la otra.
    const images: string[] = [];
    for (const path of original.images as string[]) {
      const ext = path.split(".").pop();
      const copy = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(IMAGE_BUCKET).copy(path, copy);
      if (!error) images.push(copy);
    }

    const { id: _id, created_at: _c, updated_at: _u, ...rest } = original as Product;
    const { data, error } = await supabase
      .from("products")
      .insert({
        ...rest,
        name: `${rest.name} (copia)`.slice(0, 120),
        images,
        published: false,
        position: await topPosition(supabase),
      })
      .select("*")
      .single();
    if (error) {
      await removeImages(supabase, images);
      return fail(error, "No se pudo duplicar el producto.");
    }

    refreshCatalog();
    return { ok: true, product: data as Product };
  } catch (error) {
    return fail(error, "No se pudo duplicar el producto.");
  }
}

export async function deleteProduct(id: string): Promise<Result> {
  try {
    const supabase = await requireAdmin();
    if (!supabase) return DENIED;
    const { data: product } = await supabase.from("products").select("images").eq("id", id).maybeSingle();
    if (!product) return { ok: true };

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return fail(error, "No se pudo eliminar el producto.");

    await removeImages(supabase, product.images as string[]);
    refreshCatalog();
    return { ok: true };
  } catch (error) {
    return fail(error, "No se pudo eliminar el producto.");
  }
}

export async function reorderProducts(ids: string[]): Promise<Result> {
  try {
    const supabase = await requireAdmin();
    if (!supabase) return DENIED;
    const valid = ids.filter((id) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id));
    const { error } = await supabase.rpc("reorder_products", { ids: valid });
    if (error) return fail(error, "No se pudo guardar el orden.");

    refreshCatalog();
    return { ok: true };
  } catch (error) {
    return fail(error, "No se pudo guardar el orden.");
  }
}

// ─── Configuración ────────────────────────────────────────

export async function updateSettings(input: Settings): Promise<Result> {
  try {
    const supabase = await requireAdmin();
    if (!supabase) return DENIED;
    const storeName = cleanText(input.store_name, 60);
    if (!storeName) return { ok: false, error: "El nombre de la tienda es obligatorio." };

    const whatsapp = String(input.whatsapp_number ?? "").replace(/\D/g, "");
    if (whatsapp.length > 15) return { ok: false, error: "El número de WhatsApp es demasiado largo." };

    const { error } = await supabase
      .from("settings")
      .update({
        store_name: storeName,
        tagline: cleanText(input.tagline, 160),
        whatsapp_number: whatsapp,
        instagram: cleanText(input.instagram, 30).replace(/^@/, "").replace(/[^a-zA-Z0-9._]/g, ""),
        show_prices: Boolean(input.show_prices),
      })
      .eq("id", 1);
    if (error) return fail(error, "No se pudo guardar la configuración.");

    refreshCatalog();
    return { ok: true };
  } catch (error) {
    return fail(error, "No se pudo guardar la configuración.");
  }
}
