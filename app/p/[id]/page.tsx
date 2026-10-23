import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "@/components/icons";
import { ProductGallery } from "@/components/product-gallery";
import { ProductActions } from "@/components/product-actions";
import { getPublicProduct, getSettings } from "@/lib/data";
import { availabilityText, cn, formatPrice, imageUrl } from "@/lib/utils";

export const revalidate = 300;

// Las fichas se generan en la primera visita y quedan en caché (ISR).
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/p/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = await getPublicProduct(id);
  if (!product) return { title: "Producto no encontrado" };
  const description =
    product.description.slice(0, 160) || [product.category, product.sizes.join(" · ")].filter(Boolean).join(" — ");
  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: product.images[0] ? [{ url: imageUrl(product.images[0]) }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/p/[id]">) {
  const { id } = await params;
  const [product, settings] = await Promise.all([getPublicProduct(id), getSettings()]);
  if (!product) notFound();

  const soldOut = product.status === "sold_out" || (product.status === "available" && product.stock <= 0);

  return (
    <main className="mx-auto min-h-dvh max-w-5xl pb-36 md:grid md:grid-cols-2 md:gap-10 md:px-6 md:pt-6 md:pb-16">
      <div className="relative">
        <Link
          href="/"
          aria-label="Volver al catálogo"
          className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 z-10 grid size-11 place-items-center rounded-full bg-card/90 text-xl shadow-sm backdrop-blur md:hidden"
        >
          <ChevronLeftIcon />
        </Link>
        <ProductGallery images={product.images} name={product.name} dimmed={soldOut} />
      </div>

      <section className="px-4 pt-6 md:px-0 md:pt-0">
        <Link
          href="/"
          className="hidden items-center gap-1 text-sm font-semibold text-muted hover:text-ink md:inline-flex"
        >
          <ChevronLeftIcon /> {settings.store_name}
        </Link>
        {product.category && (
          <p className="mt-0 text-xs font-semibold tracking-wider text-muted uppercase md:mt-6">{product.category}</p>
        )}
        <h1 className="mt-1 font-display text-3xl leading-none font-extrabold tracking-tight uppercase sm:text-4xl">
          {product.name}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-xl font-bold">
            {product.price !== null ? formatPrice(product.price) : <span className="text-muted">Precio a consultar</span>}
          </p>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              soldOut
                ? "bg-danger/10 text-danger"
                : product.status === "reserved"
                  ? "bg-warn/15 text-[#a86b00]"
                  : "bg-ok/10 text-ok",
            )}
          >
            {availabilityText(product)}
          </span>
          {product.is_new && !soldOut && (
            <span className="rounded-full bg-acid px-3 py-1 text-xs font-bold uppercase">Nuevo</span>
          )}
        </div>

        <ProductActions
          name={product.name}
          sizes={product.sizes}
          whatsapp={settings.whatsapp_number}
          path={`/p/${product.id}`}
        />

        {product.colors.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xs font-semibold tracking-wider text-muted uppercase">Colores</h2>
            <p className="mt-2">{product.colors.join(" · ")}</p>
          </div>
        )}

        {product.description && (
          <div className="mt-6">
            <h2 className="text-xs font-semibold tracking-wider text-muted uppercase">Descripción</h2>
            <p className="mt-2 leading-relaxed whitespace-pre-line">{product.description}</p>
          </div>
        )}
      </section>
    </main>
  );
}
