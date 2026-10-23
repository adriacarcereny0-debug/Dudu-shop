import type { PublicProduct } from "@/lib/types";

export function ProductBadges({ product }: { product: Pick<PublicProduct, "is_new" | "status" | "stock"> }) {
  const soldOut = product.status === "sold_out" || (product.status === "available" && product.stock <= 0);
  return (
    <div className="pointer-events-none absolute top-2 left-2 flex flex-wrap gap-1">
      {product.is_new && !soldOut && (
        <span className="rounded-full bg-acid px-2 py-0.5 text-[10px] font-bold tracking-wider text-ink uppercase">
          Nuevo
        </span>
      )}
      {soldOut && (
        <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold tracking-wider text-paper uppercase">
          Agotado
        </span>
      )}
      {product.status === "reserved" && (
        <span className="rounded-full bg-warn px-2 py-0.5 text-[10px] font-bold tracking-wider text-ink uppercase">
          Reservado
        </span>
      )}
    </div>
  );
}
