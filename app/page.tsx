import type { Metadata } from "next";
import { Catalog } from "@/components/catalog";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons";
import { getCatalog, getSettings } from "@/lib/data";
import { imageUrl, whatsappLink } from "@/lib/utils";

// Página estática que se regenera sola; el panel la actualiza al instante al guardar.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [settings, products] = await Promise.all([getSettings(), getCatalog()]);
  const cover = products.find((p) => p.images.length > 0);
  const description = settings.tagline || `Catálogo de ${settings.store_name}. Consulta por WhatsApp.`;
  return {
    title: { absolute: settings.store_name },
    description,
    openGraph: {
      title: settings.store_name,
      description,
      type: "website",
      images: cover ? [{ url: imageUrl(cover.images[0]) }] : undefined,
    },
  };
}

export default async function HomePage() {
  const [settings, products] = await Promise.all([getSettings(), getCatalog()]);

  return (
    <main className="mx-auto min-h-dvh max-w-6xl pb-16">
      <header className="px-4 pt-8 pb-4 sm:px-6 sm:pt-12">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-[13vw] leading-[0.85] font-black tracking-tight uppercase sm:text-7xl">
              {settings.store_name}
            </h1>
            {settings.tagline && <p className="mt-3 max-w-md text-sm text-muted sm:text-base">{settings.tagline}</p>}
          </div>
          <div className="flex shrink-0 gap-2 pt-1">
            {settings.instagram && (
              <a
                href={`https://instagram.com/${settings.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="grid size-11 place-items-center rounded-full border border-line bg-card text-xl transition active:scale-95"
              >
                <InstagramIcon />
              </a>
            )}
            {settings.whatsapp_number && (
              <a
                href={whatsappLink(settings.whatsapp_number, "¡Hola! Vengo del catálogo 👋")}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="grid size-11 place-items-center rounded-full bg-ink text-xl text-paper transition active:scale-95"
              >
                <WhatsAppIcon />
              </a>
            )}
          </div>
        </div>
      </header>

      <Catalog products={products} whatsapp={settings.whatsapp_number} />

      <footer className="mt-16 px-4 text-center text-xs text-muted sm:px-6">
        © {new Date().getFullYear()} {settings.store_name} · Pedidos y dudas por WhatsApp
      </footer>
    </main>
  );
}
