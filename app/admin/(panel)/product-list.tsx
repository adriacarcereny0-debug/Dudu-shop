"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useMemo, useOptimistic, useState } from "react";
import { deleteProduct, duplicateProduct, patchProduct, reorderProducts } from "@/app/admin/actions";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  EditIcon,
  EyeIcon,
  EyeOffIcon,
  ImageIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/icons";
import { useToast } from "@/components/toast";
import type { Product, ProductStatus } from "@/lib/types";
import { STATUS_LABEL, cn, formatPrice, imageUrl } from "@/lib/utils";

type Patch = Partial<Pick<Product, "stock" | "status" | "published" | "is_new">>;
type OptimisticAction =
  | { type: "patch"; id: string; patch: Patch }
  | { type: "remove"; id: string }
  | { type: "reorder"; ids: string[] };

function reducer(products: Product[], action: OptimisticAction): Product[] {
  switch (action.type) {
    case "patch":
      return products.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p));
    case "remove":
      return products.filter((p) => p.id !== action.id);
    case "reorder": {
      const byId = new Map(products.map((p) => [p.id, p]));
      return action.ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
    }
  }
}

/** Mantiene coherentes unidades y estado: 0 unidades → agotado; reponer → disponible. */
function stockPatch(product: Product, stock: number): Patch {
  const patch: Patch = { stock };
  if (stock === 0 && product.status === "available") patch.status = "sold_out";
  if (stock > 0 && product.status === "sold_out") patch.status = "available";
  return patch;
}

export function ProductList({ products }: { products: Product[] }) {
  const [items, apply] = useOptimistic(products, reducer);
  const [query, setQuery] = useState("");
  const { show, toast } = useToast();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(q));
  }, [items, query]);

  const hiddenCount = items.filter((p) => !p.published).length;

  function run(optimistic: OptimisticAction, action: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    startTransition(async () => {
      apply(optimistic);
      const result = await action();
      if (!result.ok) show(result.error ?? "Algo ha fallado.", true);
      else if (success) show(success);
    });
  }

  function patch(product: Product, change: Patch, success?: string) {
    run({ type: "patch", id: product.id, patch: change }, () => patchProduct(product.id, change), success);
  }

  function move(product: Product, direction: -1 | 1) {
    const ids = items.map((p) => p.id);
    const from = ids.indexOf(product.id);
    const to = from + direction;
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    run({ type: "reorder", ids }, () => reorderProducts(ids));
  }

  function remove(product: Product) {
    if (!confirm(`¿Eliminar «${product.name}»? Se borrarán también sus fotos. No se puede deshacer.`)) return;
    run({ type: "remove", id: product.id }, () => deleteProduct(product.id), "Producto eliminado");
  }

  function duplicate(product: Product) {
    startTransition(async () => {
      const result = await duplicateProduct(product.id);
      show(result.ok ? "Copia creada (oculta). Edítala y publícala." : result.error, !result.ok);
    });
  }

  return (
    <div className="px-4 pt-4 pb-32">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black uppercase">Productos</h1>
          <p className="text-sm text-muted">
            {items.length} en total{hiddenCount > 0 && ` · ${hiddenCount} ocultos`}
          </p>
        </div>
      </div>

      {items.length > 4 && (
        <label className="relative mt-4 block">
          <span className="sr-only">Buscar</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto…"
            className="h-12 w-full rounded-2xl border border-line bg-card pr-4 pl-11 outline-none focus:border-ink"
          />
        </label>
      )}

      {items.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-muted">Todavía no hay productos.</p>
          <Link
            href="/admin/new"
            className="mt-6 inline-flex h-14 items-center gap-2 rounded-full bg-ink px-8 text-lg font-semibold text-paper"
          >
            <PlusIcon /> Añadir el primero
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {visible.map((product) => {
            const index = items.indexOf(product);
            return (
              <li
                key={product.id}
                className={cn("rounded-3xl border border-line bg-card p-3", !product.published && "opacity-70")}
              >
                <div className="flex gap-3">
                  <Link
                    href={`/admin/edit/${product.id}`}
                    className="relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-line"
                  >
                    {product.images[0] ? (
                      <Image src={imageUrl(product.images[0])} alt="" fill sizes="80px" className="object-cover" />
                    ) : (
                      <span className="grid h-full place-items-center text-2xl text-muted">
                        <ImageIcon />
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/edit/${product.id}`} className="line-clamp-2 leading-snug font-semibold">
                      {product.name}
                    </Link>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {[product.category, product.price !== null ? formatPrice(product.price) : "Sin precio"]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => patch(product, { is_new: !product.is_new })}
                        className={cn(
                          "h-7 rounded-full px-2.5 text-xs font-bold uppercase",
                          product.is_new ? "bg-acid text-ink" : "border border-line text-muted",
                        )}
                      >
                        {product.is_new ? "Nuevo ✓" : "+ Nuevo"}
                      </button>
                      {!product.published && (
                        <span className="flex h-7 items-center rounded-full bg-ink px-2.5 text-xs font-bold text-paper uppercase">
                          Oculto
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center rounded-full border border-line">
                    <button
                      type="button"
                      aria-label="Restar unidad"
                      disabled={product.stock === 0}
                      onClick={() => patch(product, stockPatch(product, product.stock - 1))}
                      className="grid size-11 place-items-center rounded-full text-lg active:bg-line disabled:opacity-30"
                    >
                      <MinusIcon />
                    </button>
                    <span className="min-w-14 text-center font-semibold tabular-nums">
                      {product.stock} <span className="text-xs font-normal text-muted">ud.</span>
                    </span>
                    <button
                      type="button"
                      aria-label="Sumar unidad"
                      onClick={() => patch(product, stockPatch(product, product.stock + 1))}
                      className="grid size-11 place-items-center rounded-full text-lg active:bg-line"
                    >
                      <PlusIcon />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      patch(
                        product,
                        { published: !product.published },
                        product.published ? "Oculto del catálogo" : "Visible en el catálogo",
                      )
                    }
                    className={cn(
                      "flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold",
                      product.published ? "bg-ok/10 text-ok" : "bg-line text-ink",
                    )}
                  >
                    {product.published ? <EyeIcon /> : <EyeOffIcon />}
                    {product.published ? "Visible" : "Oculto"}
                  </button>
                </div>

                <StatusPicker value={product.status} onChange={(status) => patch(product, { status })} />

                <div className="mt-3 flex items-center gap-1 border-t border-line pt-3">
                  <IconButton label="Subir" disabled={index <= 0} onClick={() => move(product, -1)}>
                    <ArrowUpIcon />
                  </IconButton>
                  <IconButton label="Bajar" disabled={index === items.length - 1} onClick={() => move(product, 1)}>
                    <ArrowDownIcon />
                  </IconButton>
                  <IconButton label="Duplicar" onClick={() => duplicate(product)}>
                    <CopyIcon />
                  </IconButton>
                  <IconButton label="Eliminar" danger onClick={() => remove(product)}>
                    <TrashIcon />
                  </IconButton>
                  <Link
                    href={`/admin/edit/${product.id}`}
                    className="ml-auto flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper"
                  >
                    <EditIcon /> Editar
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/admin/new"
        className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex h-16 items-center gap-2 rounded-full bg-ink px-7 text-lg font-semibold text-paper shadow-xl shadow-ink/20 transition active:scale-95"
      >
        <PlusIcon className="text-2xl" /> Añadir
      </Link>
      {toast}
    </div>
  );
}

const STATUS_OPTIONS: ProductStatus[] = ["available", "reserved", "sold_out"];

export function StatusPicker({ value, onChange }: { value: ProductStatus; onChange: (status: ProductStatus) => void }) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-paper p-1" role="radiogroup" aria-label="Estado">
      {STATUS_OPTIONS.map((status) => (
        <button
          key={status}
          type="button"
          role="radio"
          aria-checked={value === status}
          onClick={() => value !== status && onChange(status)}
          className={cn(
            "h-10 rounded-full text-sm font-semibold transition",
            value === status
              ? status === "available"
                ? "bg-ok text-white"
                : status === "reserved"
                  ? "bg-warn text-ink"
                  : "bg-ink text-paper"
              : "text-muted",
          )}
        >
          {STATUS_LABEL[status]}
        </button>
      ))}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-11 place-items-center rounded-full text-lg active:bg-line disabled:opacity-25",
        danger && "text-danger",
      )}
    >
      {children}
    </button>
  );
}
