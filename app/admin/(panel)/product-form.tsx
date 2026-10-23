"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createProduct, deleteProduct, updateProduct } from "@/app/admin/actions";
import {
  ArrowUpIcon,
  CameraIcon,
  CheckIcon,
  ChevronLeftIcon,
  ImageIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@/components/icons";
import { useToast } from "@/components/toast";
import type { Product, ProductInput } from "@/lib/types";
import { deleteUploadedImages, uploadImage } from "@/lib/upload";
import { cn, imageUrl } from "@/lib/utils";
import { StatusPicker } from "./product-list";

const MAX_IMAGES = 10;
const PRESET_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Única"];

type FormState = Omit<ProductInput, "price"> & { price: string };
type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

function toForm(product?: Product): FormState {
  return {
    name: product?.name ?? "",
    description: product?.description ?? "",
    category: product?.category ?? "",
    price: product?.price != null ? String(product.price).replace(".", ",") : "",
    show_price: product?.show_price ?? true,
    sizes: product?.sizes ?? [],
    colors: product?.colors ?? [],
    stock: product?.stock ?? 1,
    status: product?.status ?? "available",
    is_new: product?.is_new ?? true,
    published: product?.published ?? true,
    images: product?.images ?? [],
  };
}

function toInput(form: FormState): ProductInput {
  const raw = form.price.replace(/\s|€/g, "").replace(",", ".");
  return { ...form, price: raw === "" ? null : Number(raw) };
}

/** Igual que en el listado: 0 unidades → agotado; reponer → disponible. */
function withStock(form: FormState, stock: number): Partial<FormState> {
  const patch: Partial<FormState> = { stock };
  if (stock === 0 && form.status === "available") patch.status = "sold_out";
  if (stock > 0 && form.status === "sold_out") patch.status = "available";
  return patch;
}

function validate(form: FormState) {
  if (!form.name.trim()) return "Ponle un nombre a la prenda.";
  const { price } = toInput(form);
  if (price !== null && (!Number.isFinite(price) || price < 0)) return "El precio no es válido.";
  return null;
}

export function ProductForm({ product, categories }: { product?: Product; categories: string[] }) {
  const isEdit = Boolean(product);
  const router = useRouter();
  const { show, toast } = useToast();
  const [form, setForm] = useState<FormState>(() => toForm(product));
  const [uploading, setUploading] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [creating, startCreate] = useTransition();
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  // ─── Autoguardado (solo al editar) ────────────────────────
  const latest = useRef(form);
  latest.current = form;
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function save() {
    clearTimeout(timer.current);
    if (!product || !dirty.current) return true;
    const error = validate(latest.current);
    if (error) {
      setSaveState("error");
      show(error, true);
      return false;
    }
    dirty.current = false;
    setSaveState("saving");
    const result = await updateProduct(product.id, toInput(latest.current));
    if (!result.ok) {
      dirty.current = true;
      setSaveState("error");
      show(result.error, true);
      return false;
    }
    setSaveState(dirty.current ? "pending" : "saved");
    return true;
  }

  function update(patch: Partial<FormState>) {
    setForm((f) => ({ ...f, ...patch }));
    if (!product) return;
    dirty.current = true;
    setSaveState("pending");
    clearTimeout(timer.current);
    timer.current = setTimeout(save, 900);
  }

  // Guarda lo pendiente si se sale de la página.
  useEffect(() => {
    const onHide = () => {
      if (dirty.current) void save();
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      onHide();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Fotos ────────────────────────────────────────────────
  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_IMAGES - form.images.length;
    const selected = Array.from(files).slice(0, room);
    if (files.length > room) show(`Máximo ${MAX_IMAGES} fotos por producto.`, true);
    if (selected.length === 0) return;

    setUploading((n) => n + selected.length);
    const results = await Promise.allSettled(
      selected.map(async (file) => {
        try {
          return await uploadImage(file);
        } finally {
          setUploading((n) => n - 1);
        }
      }),
    );
    const paths = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failed) show(failed.reason instanceof Error ? failed.reason.message : "Error al subir una foto.", true);
    if (paths.length) update({ images: [...latest.current.images, ...paths] });
  }

  function removeImage(path: string) {
    update({ images: form.images.filter((p) => p !== path) });
    // En un producto nuevo la foto aún no está guardada: se borra ya. Al editar, se borra al guardar.
    if (!product) void deleteUploadedImages([path]);
  }

  function makeCover(path: string) {
    update({ images: [path, ...form.images.filter((p) => p !== path)] });
  }

  // ─── Crear / eliminar ─────────────────────────────────────
  function create() {
    const error = validate(form);
    if (error) return show(error, true);
    if (uploading > 0) return show("Espera a que terminen de subir las fotos.", true);
    startCreate(async () => {
      const result = await createProduct(toInput(form));
      if (!result.ok) return show(result.error, true);
      router.replace("/admin");
    });
  }

  function remove() {
    if (!product) return;
    if (!confirm(`¿Eliminar «${product.name}»? Se borrarán también sus fotos.`)) return;
    clearTimeout(timer.current);
    dirty.current = false;
    startCreate(async () => {
      const result = await deleteProduct(product.id);
      if (!result.ok) return show(result.error, true);
      router.replace("/admin");
    });
  }

  async function done() {
    if (await save()) router.push("/admin");
  }

  return (
    <div className="px-4 pt-4 pb-36">
      <div className="flex items-center gap-2">
        <Link
          href="/admin"
          aria-label="Volver"
          className="-ml-2 grid size-11 place-items-center rounded-full text-xl active:bg-line"
        >
          <ChevronLeftIcon />
        </Link>
        <h1 className="mr-auto font-display text-2xl font-black uppercase">{isEdit ? "Editar" : "Nueva prenda"}</h1>
        {isEdit && <SaveIndicator state={saveState} onRetry={save} />}
      </div>

      {/* Fotos */}
      <section className="mt-4">
        <div className="grid grid-cols-3 gap-2">
          {form.images.map((path, i) => (
            <div key={path} className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-line">
              <Image src={imageUrl(path)} alt="" fill sizes="33vw" className="object-cover" />
              {i === 0 ? (
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-paper uppercase">
                  Portada
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeCover(path)}
                  aria-label="Usar como portada"
                  className="absolute bottom-1.5 left-1.5 grid size-9 place-items-center rounded-full bg-card/90 shadow"
                >
                  <ArrowUpIcon />
                </button>
              )}
              <button
                type="button"
                onClick={() => removeImage(path)}
                aria-label="Quitar foto"
                className="absolute top-1.5 right-1.5 grid size-9 place-items-center rounded-full bg-card/90 shadow"
              >
                <XIcon />
              </button>
            </div>
          ))}
          {Array.from({ length: uploading }, (_, i) => (
            <div key={`up-${i}`} className="grid aspect-[4/5] animate-pulse place-items-center rounded-2xl bg-line">
              <span className="text-xs font-semibold text-muted">Subiendo…</span>
            </div>
          ))}
          {form.images.length === 0 && uploading === 0 && (
            <div className="col-span-3 grid h-40 place-items-center rounded-2xl border-2 border-dashed border-line text-muted">
              <div className="text-center">
                <ImageIcon className="mx-auto text-3xl" />
                <p className="mt-1 text-sm">Añade fotos de la prenda</p>
              </div>
            </div>
          )}
        </div>

        {form.images.length + uploading < MAX_IMAGES && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraInput.current?.click()}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-ink font-semibold text-paper active:scale-[0.98]"
            >
              <CameraIcon className="text-xl" /> Cámara
            </button>
            <button
              type="button"
              onClick={() => galleryInput.current?.click()}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-ink font-semibold active:scale-[0.98]"
            >
              <ImageIcon className="text-xl" /> Galería
            </button>
          </div>
        )}
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </section>

      <div className="mt-6 space-y-5">
        <Field label="Nombre">
          <input
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            maxLength={120}
            placeholder="Ej. Sudadera oversize negra"
            className={inputClass}
          />
        </Field>

        <Field label="Categoría">
          <input
            value={form.category}
            onChange={(e) => update({ category: e.target.value })}
            maxLength={40}
            list="categories"
            placeholder="Ej. Sudaderas"
            className={inputClass}
          />
          <datalist id="categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {categories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map((c) => (
                <Chip key={c} active={form.category === c} onClick={() => update({ category: c })}>
                  {c}
                </Chip>
              ))}
            </div>
          )}
        </Field>

        <Field label="Precio (€) · opcional">
          <input
            value={form.price}
            onChange={(e) => update({ price: e.target.value.replace(/[^0-9.,]/g, "") })}
            inputMode="decimal"
            placeholder="Ej. 29,90"
            className={inputClass}
          />
          <Toggle
            className="mt-2"
            checked={form.show_price}
            onChange={(show_price) => update({ show_price })}
            label="Mostrar precio en el catálogo"
            hint={form.show_price ? "Se verá el precio" : "Solo se verá «Consultar»"}
          />
        </Field>

        <Field label="Tallas">
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set([...PRESET_SIZES, ...form.sizes])).map((size) => {
              const active = form.sizes.includes(size);
              return (
                <Chip
                  key={size}
                  active={active}
                  onClick={() =>
                    update({ sizes: active ? form.sizes.filter((s) => s !== size) : [...form.sizes, size] })
                  }
                >
                  {size}
                </Chip>
              );
            })}
          </div>
          <TagInput
            className="mt-2"
            placeholder="Otra talla (ej. 42, 10 años)…"
            onAdd={(size) => !form.sizes.includes(size) && update({ sizes: [...form.sizes, size] })}
            maxLength={12}
          />
        </Field>

        <Field label="Colores">
          {form.colors.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {form.colors.map((color) => (
                <Chip key={color} active onClick={() => update({ colors: form.colors.filter((c) => c !== color) })}>
                  {color} <XIcon className="ml-1 text-xs" />
                </Chip>
              ))}
            </div>
          )}
          <TagInput
            placeholder="Añadir color (ej. Negro)…"
            onAdd={(color) => !form.colors.includes(color) && update({ colors: [...form.colors, color] })}
            maxLength={30}
          />
        </Field>

        <Field label="Unidades disponibles">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-2xl border border-line bg-card">
              <button
                type="button"
                aria-label="Restar"
                onClick={() => update(withStock(form, Math.max(0, form.stock - 1)))}
                className="grid size-14 place-items-center text-xl active:bg-line"
              >
                <MinusIcon />
              </button>
              <input
                value={form.stock}
                onChange={(e) => update(withStock(form, Math.min(9999, Number(e.target.value.replace(/\D/g, "")) || 0)))}
                inputMode="numeric"
                aria-label="Unidades"
                className="h-14 w-16 bg-transparent text-center text-lg font-semibold outline-none"
              />
              <button
                type="button"
                aria-label="Sumar"
                onClick={() => update(withStock(form, form.stock + 1))}
                className="grid size-14 place-items-center text-xl active:bg-line"
              >
                <PlusIcon />
              </button>
            </div>
          </div>
        </Field>

        <Field label="Estado">
          <StatusPicker value={form.status} onChange={(status) => update({ status })} />
        </Field>

        <div className="space-y-2">
          <Toggle
            checked={form.published}
            onChange={(published) => update({ published })}
            label="Visible en el catálogo"
            hint={form.published ? "Cualquiera puede verlo" : "Oculto: solo lo ves tú"}
          />
          <Toggle
            checked={form.is_new}
            onChange={(is_new) => update({ is_new })}
            label="Marcar como novedad"
            hint="Muestra la etiqueta «Nuevo»"
          />
        </div>

        <Field label="Descripción · opcional">
          <textarea
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
            rows={4}
            maxLength={2000}
            placeholder="Tejido, corte, medidas, estado…"
            className={cn(inputClass, "h-auto py-3")}
          />
        </Field>

        {isEdit && (
          <button
            type="button"
            onClick={remove}
            disabled={creating}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-danger/30 font-semibold text-danger"
          >
            <TrashIcon /> Eliminar producto
          </button>
        )}
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pt-3 backdrop-blur-md">
        <div className="mx-auto max-w-3xl">
          {isEdit ? (
            <button
              type="button"
              onClick={done}
              disabled={saveState === "saving" || creating}
              className="h-14 w-full rounded-full bg-ink text-lg font-semibold text-paper active:scale-[0.98] disabled:opacity-60"
            >
              {saveState === "saving" ? "Guardando…" : "Listo"}
            </button>
          ) : (
            <button
              type="button"
              onClick={create}
              disabled={creating || uploading > 0}
              className="h-14 w-full rounded-full bg-ink text-lg font-semibold text-paper active:scale-[0.98] disabled:opacity-60"
            >
              {creating
                ? "Guardando…"
                : uploading > 0
                  ? "Subiendo fotos…"
                  : form.published
                    ? "Publicar prenda"
                    : "Guardar oculta"}
            </button>
          )}
        </div>
      </div>
      {toast}
    </div>
  );
}

const inputClass =
  "h-14 w-full rounded-2xl border border-line bg-card px-4 outline-none placeholder:text-muted/70 focus:border-ink";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">{label}</p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 font-semibold transition active:scale-95",
        active ? "border-ink bg-ink text-paper" : "border-line bg-card",
      )}
    >
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  className,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 py-2 text-left",
        className,
      )}
    >
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <span
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-full transition",
          checked ? "bg-ok" : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-6",
          )}
        />
      </span>
    </button>
  );
}

function TagInput({
  onAdd,
  placeholder,
  maxLength,
  className,
}: {
  onAdd: (value: string) => void;
  placeholder: string;
  maxLength: number;
  className?: string;
}) {
  const [value, setValue] = useState("");
  function add() {
    const v = value.trim();
    if (v) onAdd(v);
    setValue("");
  }
  return (
    <div className={cn("flex gap-2", className)}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        maxLength={maxLength}
        placeholder={placeholder}
        enterKeyHint="done"
        className={cn(inputClass, "flex-1")}
      />
      <button
        type="button"
        onClick={add}
        aria-label="Añadir"
        className="grid size-14 shrink-0 place-items-center rounded-2xl bg-ink text-xl text-paper"
      >
        <PlusIcon />
      </button>
    </div>
  );
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === "idle") return null;
  if (state === "error")
    return (
      <button type="button" onClick={onRetry} className="text-sm font-semibold text-danger underline">
        Reintentar
      </button>
    );
  return (
    <span className="flex items-center gap-1 text-sm text-muted">
      {state === "saved" ? (
        <>
          <CheckIcon className="text-ok" /> Guardado
        </>
      ) : (
        "Guardando…"
      )}
    </span>
  );
}
