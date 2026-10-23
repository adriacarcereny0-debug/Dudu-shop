"use client";

import { useState } from "react";
import { CheckIcon, ShareIcon, WhatsAppIcon } from "@/components/icons";
import { useOrigin } from "@/components/use-origin";
import { cn, productMessage, whatsappLink } from "@/lib/utils";

export function ProductActions({
  name,
  sizes,
  whatsapp,
  path,
}: {
  name: string;
  sizes: string[];
  whatsapp: string;
  path: string;
}) {
  const [size, setSize] = useState<string>();
  const [copied, setCopied] = useState(false);
  const origin = useOrigin();
  const url = origin ? origin + path : undefined;

  async function share() {
    const link = url ?? window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url: link });
      } catch {
        // El usuario ha cancelado.
      }
      return;
    }
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {sizes.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold tracking-wider text-muted uppercase">
            Tallas {sizes.length > 1 && <span className="font-normal normal-case">· elige una para consultar</span>}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(size === s ? undefined : s)}
                aria-pressed={size === s}
                className={cn(
                  "h-11 min-w-11 rounded-xl border px-3 font-semibold transition active:scale-95",
                  size === s ? "border-ink bg-ink text-paper" : "border-line bg-card",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-paper/95 px-4 pt-3 backdrop-blur-md md:static md:mt-8 md:border-0 md:bg-transparent md:p-0">
        <a
          href={whatsappLink(whatsapp, productMessage(name, url, size))}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-ink font-semibold text-paper transition active:scale-[0.98]"
        >
          <WhatsAppIcon className="text-xl" />
          Consultar por WhatsApp
        </a>
        <button
          type="button"
          onClick={share}
          aria-label="Compartir"
          className="grid size-14 shrink-0 place-items-center rounded-full border border-line bg-card text-xl transition active:scale-95"
        >
          {copied ? <CheckIcon /> : <ShareIcon />}
        </button>
      </div>
    </>
  );
}
