"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { ProductBadges } from "@/components/badges";
import { ImageIcon, SearchIcon, WhatsAppIcon, XIcon } from "@/components/icons";
import { useOrigin } from "@/components/use-origin";
import type { PublicProduct } from "@/lib/types";
import { availabilityText, cn, formatPrice, imageUrl, productMessage, whatsappLink } from "@/lib/utils";

const ALL = "__all";
const NEW = "__new";

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function Catalog({ products, whatsapp }: { products: PublicProduct[]; whatsapp: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(ALL);
  const deferredQuery = useDeferredValue(query);
  const origin = useOrigin();

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es")),
    [products],
  );
  const hasNew = products.some((p) => p.is_new);

  const visible = useMemo(() => {
    const q = normalize(deferredQuery.trim());
    return products.filter((p) => {
      if (filter === NEW && !p.is_new) return false;
      if (filter !== ALL && filter !== NEW && p.category !== filter) return false;
      if (!q) return true;
      const haystack = normalize([p.name, p.category, p.description, ...p.colors, ...p.sizes].join(" "));
      return q.split(/\s+/).every((word) => haystack.includes(word));
    });
  }, [products, filter, deferredQuery]);

  const chips = [
    { value: ALL, label: "Todo" },
    ...(hasNew ? [{ value: NEW, label: "Novedades" }] : []),
    ...categories.map((c) => ({ value: c, label: c })),
  ];

  return (
    <>
      <div className="sticky top-0 z-20 bg-paper/90 px-4 pt-2 pb-3 backdrop-blur-md sm:px-6">
        <label className="relative block">
          <span className="sr-only">Buscar</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar prendas, colores, tallas…"
            className="h-12 w-full rounded-full border border-line bg-card pr-11 pl-11 outline-none placeholder:text-muted focus:border-ink [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Borrar búsqueda"
              className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted"
            >
              <XIcon />
            </button>
          )}
        </label>
        {chips.length > 1 && (
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
            {chips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setFilter(chip.value)}
                className={cn(
                  "h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition active:scale-95",
                  filter === chip.value ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <p className="px-4 py-24 text-center text-muted">Pronto habrá prendas nuevas por aquí.</p>
      ) : visible.length === 0 ? (
        <div className="px-4 py-24 text-center">
          <p className="text-muted">No hay prendas que coincidan.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter(ALL);
            }}
            className="mt-4 text-sm font-semibold underline underline-offset-4"
          >
            Ver todo
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-8 px-4 pt-2 sm:grid-cols-3 sm:gap-x-5 sm:px-6 lg:grid-cols-4">
          {visible.map((product, index) => (
            <li key={product.id}>
              <ProductCard product={product} whatsapp={whatsapp} origin={origin} priority={index < 4} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ProductCard({
  product,
  whatsapp,
  origin,
  priority,
}: {
  product: PublicProduct;
  whatsapp: string;
  origin: string;
  priority: boolean;
}) {
  const href = `/p/${product.id}`;
  const soldOut = product.status === "sold_out" || (product.status === "available" && product.stock <= 0);
  const message = productMessage(product.name, origin ? origin + href : undefined);

  return (
    <article className="flex h-full flex-col">
      <Link href={href} className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-line">
        {product.images[0] ? (
          <Image
            src={imageUrl(product.images[0])}
            alt={product.name}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 270px, (min-width: 640px) 33vw, 50vw"
            className={cn(
              "object-cover transition duration-500 group-hover:scale-[1.03]",
              soldOut && "opacity-60 grayscale",
            )}
          />
        ) : (
          <div className="grid h-full place-items-center text-4xl text-muted">
            <ImageIcon />
          </div>
        )}
        <ProductBadges product={product} />
      </Link>

      <div className="mt-3 flex flex-1 flex-col">
        {product.category && (
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">{product.category}</p>
        )}
        <h2 className="mt-0.5 line-clamp-2 leading-snug font-semibold">
          <Link href={href}>{product.name}</Link>
        </h2>
        <p className="mt-1 text-sm">
          {product.price !== null ? (
            <span className="font-bold">{formatPrice(product.price)}</span>
          ) : (
            <span className="text-muted">Precio a consultar</span>
          )}
        </p>
        {(product.sizes.length > 0 || product.colors.length > 0) && (
          <p className="mt-1 line-clamp-1 text-xs text-muted">
            {[product.sizes.join(" · "), product.colors.join(", ")].filter(Boolean).join("  /  ")}
          </p>
        )}
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            soldOut ? "text-danger" : product.status === "reserved" ? "text-warn" : "text-ok",
          )}
        >
          {availabilityText(product)}
        </p>

        <div className="mt-auto pt-3">
          <a
            href={whatsappLink(whatsapp, message)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-3 text-sm font-semibold text-paper transition active:scale-[0.97]"
          >
            <WhatsAppIcon className="shrink-0 text-base" />
            <span className="truncate">Consultar</span>
          </a>
        </div>
      </div>
    </article>
  );
}
