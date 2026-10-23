"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { isAdmin } from "@/lib/auth";
import { UUID, getProduct } from "@/lib/data";
import { db } from "@/lib/db";
import { verifyAdminPassword } from "@/lib/password";
import { SESSION_COOKIE, SESSION_DAYS, createSessionToken } from "@/lib/session";
import type { Product, ProductInput, ProductStatus, Settings } from "@/lib/types";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const STATUSES: ProductStatus[] = ["available", "reserved", "sold_out"];
const IMAGE_URL = /^\/img\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const imageId = (url: string) => url.slice("/img/".length);
const MAX_IMAGES = 10;


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

  const images = Array.isArray(input.images) ? input.images.filter((url) => typeof url === "string" && IMAGE_URL.test(url)).slice(0, MAX_IMAGES) : [];

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

async function removeImages(urls: string[]) {
  const ids = urls.filter((url) => IMAGE_URL.test(url)).map(imageId);
  if (ids.length === 0) return;
  try {
    await db()`delete from images where id = any(${ids}::uuid[])`;
  } catch (error) {
    console.error("No se pudieron borrar imágenes", error);
  }
}

async function topPosition() {
  const rows = await db()`select coalesce(min(position), 1) - 1 as position from products`;
  return Number(rows[0].position);
}

// ─── Sesión ───────────────────────────────────────────────

const MAX_ATTEMPTS = 5;

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const password = formData.get("password");
  if (typeof password !== "string" || !password) return { error: "Introduce la contraseña." };

  const ip = ((await headers()).get("x-forwarded-for") ?? "local").split(",")[0].trim().slice(0, 64);
  const sql = db();
  const [{ count }] = await sql`
    select count(*)::int as count from login_attempts where ip = ${ip} and at > now() - interval '15 minutes'`;
  if (count >= MAX_ATTEMPTS) return { error: "Demasiados intentos. Espera 15 minutos." };

  let valid = false;
  try {
    valid = await verifyAdminPassword(password);
  } catch (error) {
    console.error(error);
    return { error: "El acceso no está configurado. Revisa ADMIN_PASSWORD_HASH." };
  }
  if (!valid) {
    await sql`insert into login_attempts (ip) values (${ip})`;
    await sql`delete from login_attempts where at < now() - interval '1 day'`;
    return { error: "Contraseña incorrecta." };
  }

  await sql`delete from login_attempts where ip = ${ip}`;
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

// ─── Productos ────────────────────────────────────────────

export async function createProduct(input: ProductInput): Promise<Result<{ id: string }>> {
  if (!(await isAdmin())) return DENIED;
  const p = cleanProduct(input);
  if (typeof p === "string") return { ok: false, error: p };
  try {
    const rows = await db()`
      insert into products (name, description, category, price, show_price, sizes, colors, stock, status, is_new, published, images, position)
      values (${p.name}, ${p.description}, ${p.category}, ${p.price}, ${p.show_price}, ${p.sizes}, ${p.colors},
              ${p.stock}, ${p.status}, ${p.is_new}, ${p.published}, ${p.images}, ${await topPosition()})
      returning id`;
    refreshCatalog();
    return { ok: true, id: rows[0].id as string };
  } catch (error) {
    return fail(error, "No se pudo crear el producto.");
  }
}

export async function updateProduct(id: string, input: ProductInput): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const p = cleanProduct(input);
  if (typeof p === "string") return { ok: false, error: p };
  try {
    const previous = await getProduct(id);
    if (!previous) return { ok: false, error: "El producto ya no existe." };
    await db()`
      update products set
        name = ${p.name}, description = ${p.description}, category = ${p.category}, price = ${p.price},
        show_price = ${p.show_price}, sizes = ${p.sizes}, colors = ${p.colors}, stock = ${p.stock},
        status = ${p.status}, is_new = ${p.is_new}, published = ${p.published}, images = ${p.images}
      where id = ${id}`;
    await removeImages(previous.images.filter((url) => !p.images.includes(url)));
    refreshCatalog();
    return { ok: true };
  } catch (error) {
    return fail(error, "No se pudieron guardar los cambios.");
  }
}

type QuickPatch = Partial<Pick<Product, "stock" | "status" | "published" | "is_new">>;

export async function patchProduct(id: string, patch: QuickPatch): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  if (!UUID.test(id)) return { ok: false, error: "Producto no válido." };
  const stock = patch.stock !== undefined ? cleanStock(patch.stock) : null;
  const status = patch.status !== undefined && STATUSES.includes(patch.status) ? patch.status : null;
  const published = patch.published !== undefined ? Boolean(patch.published) : null;
  const isNew = patch.is_new !== undefined ? Boolean(patch.is_new) : null;
  try {
    await db()`
      update products set
        stock = coalesce(${stock}::int, stock),
        status = coalesce(${status}::product_status, status),
        published = coalesce(${published}::boolean, published),
        is_new = coalesce(${isNew}::boolean, is_new)
      where id = ${id}`;
    refreshCatalog();
    return { ok: true };
  } catch (error) {
    return fail(error, "No se pudo guardar el cambio.");
  }
}

export async function duplicateProduct(id: string): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  try {
    const original = await getProduct(id);
    if (!original) return { ok: false, error: "El producto ya no existe." };

    // Cada copia tiene sus propias fotos, así borrar una no afecta a la otra.
    const images: string[] = [];
    for (const url of original.images.filter((u) => IMAGE_URL.test(u))) {
      const rows = await db()`
        insert into images (content_type, data)
        select content_type, data from images where id = ${imageId(url)}
        returning id`;
      if (rows[0]) images.push(`/img/${rows[0].id}`);
    }

    const o = original;
    const name = `${o.name} (copia)`.slice(0, 120);
    await db()`
      insert into products (name, description, category, price, show_price, sizes, colors, stock, status, is_new, published, images, position)
      values (${name}, ${o.description}, ${o.category}, ${o.price}, ${o.show_price}, ${o.sizes}, ${o.colors},
              ${o.stock}, ${o.status}, ${o.is_new}, false, ${images}, ${await topPosition()})`;
    refreshCatalog();
    return { ok: true };
  } catch (error) {
    return fail(error, "No se pudo duplicar el producto.");
  }
}

export async function deleteProduct(id: string): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  try {
    const product = await getProduct(id);
    if (!product) return { ok: true };
    await db()`delete from products where id = ${id}`;
    await removeImages(product.images);
    refreshCatalog();
    return { ok: true };
  } catch (error) {
    return fail(error, "No se pudo eliminar el producto.");
  }
}

/** Borra fotos subidas que al final no se guardaron en ningún producto. */
export async function discardImages(urls: string[]): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const valid = urls.filter((url) => typeof url === "string" && IMAGE_URL.test(url));
  const rows = await db()`select 1 from products where images && ${valid}::text[] limit 1`;
  if (rows.length === 0) await removeImages(valid);
  return { ok: true };
}

export async function reorderProducts(ids: string[]): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const valid = ids.filter((id) => typeof id === "string" && UUID.test(id));
  try {
    await db()`
      update products as p set position = o.ord
      from unnest(${valid}::uuid[]) with ordinality as o(id, ord)
      where p.id = o.id`;
    refreshCatalog();
    return { ok: true };
  } catch (error) {
    return fail(error, "No se pudo guardar el orden.");
  }
}

// ─── Configuración ────────────────────────────────────────

export async function updateSettings(input: Settings): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const storeName = cleanText(input.store_name, 60);
  if (!storeName) return { ok: false, error: "El nombre de la tienda es obligatorio." };
  const whatsapp = String(input.whatsapp_number ?? "").replace(/\D/g, "");
  if (whatsapp.length > 15) return { ok: false, error: "El número de WhatsApp es demasiado largo." };
  const instagram = cleanText(input.instagram, 30).replace(/^@/, "").replace(/[^a-zA-Z0-9._]/g, "");
  try {
    await db()`
      update settings set
        store_name = ${storeName}, tagline = ${cleanText(input.tagline, 160)}, whatsapp_number = ${whatsapp},
        instagram = ${instagram}, show_prices = ${Boolean(input.show_prices)}
      where id = 1`;
    refreshCatalog();
    return { ok: true };
  } catch (error) {
    return fail(error, "No se pudo guardar la configuración.");
  }
}
