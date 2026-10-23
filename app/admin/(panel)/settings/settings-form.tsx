"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { updateSettings } from "@/app/admin/actions";
import { CheckIcon, ChevronLeftIcon, CopyIcon, WhatsAppIcon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { useOrigin } from "@/components/use-origin";
import type { Settings } from "@/lib/types";
import { whatsappLink } from "@/lib/utils";
import { Toggle } from "../product-form";

const inputClass =
  "h-14 w-full rounded-2xl border border-line bg-card px-4 outline-none placeholder:text-muted/70 focus:border-ink";

export function SettingsForm({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [copied, setCopied] = useState(false);
  const { show, toast } = useToast();
  const origin = useOrigin();

  const latest = useRef(settings);
  latest.current = settings;
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function save() {
    clearTimeout(timer.current);
    if (!dirty.current) return;
    if (!latest.current.store_name.trim()) {
      setStatus("error");
      return show("El nombre de la tienda es obligatorio.", true);
    }
    dirty.current = false;
    setStatus("saving");
    const result = await updateSettings(latest.current);
    if (!result.ok) {
      dirty.current = true;
      setStatus("error");
      return show(result.error, true);
    }
    setStatus("saved");
  }

  function update(patch: Partial<Settings>) {
    setSettings((s) => ({ ...s, ...patch }));
    dirty.current = true;
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(save, 800);
  }

  useEffect(
    () => () => {
      if (dirty.current) void save();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  async function copyLink() {
    await navigator.clipboard.writeText(origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="px-4 pt-4 pb-16">
      <div className="flex items-center gap-2">
        <Link href="/admin" aria-label="Volver" className="-ml-2 grid size-11 place-items-center rounded-full text-xl active:bg-line">
          <ChevronLeftIcon />
        </Link>
        <h1 className="mr-auto font-display text-2xl font-black uppercase">Ajustes</h1>
        <span className="text-sm text-muted">
          {status === "saving" && "Guardando…"}
          {status === "saved" && (
            <span className="flex items-center gap-1">
              <CheckIcon className="text-ok" /> Guardado
            </span>
          )}
          {status === "error" && (
            <button type="button" onClick={save} className="font-semibold text-danger underline">
              Reintentar
            </button>
          )}
        </span>
      </div>

      <section className="mt-4 rounded-3xl bg-ink p-5 text-paper">
        <p className="text-sm font-semibold text-paper/60">Enlace del catálogo</p>
        <p className="mt-1 truncate font-mono text-lg">{origin.replace(/^https?:\/\//, "") || "…"}</p>
        <p className="mt-1 text-sm text-paper/60">Ponlo en la bio de Instagram o envíalo por WhatsApp.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-paper font-semibold text-ink"
          >
            {copied ? <CheckIcon /> : <CopyIcon />} {copied ? "Copiado" : "Copiar"}
          </button>
          <a
            href={whatsappLink("", `Mira el catálogo de ${settings.store_name}: ${origin}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-paper/30 font-semibold"
          >
            <WhatsAppIcon /> Enviar
          </a>
        </div>
      </section>

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Nombre de la tienda</span>
          <input
            value={settings.store_name}
            onChange={(e) => update({ store_name: e.target.value })}
            maxLength={60}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Frase de bienvenida · opcional</span>
          <input
            value={settings.tagline}
            onChange={(e) => update({ tagline: e.target.value })}
            maxLength={160}
            placeholder="Ej. Streetwear seleccionado · Envíos a toda España"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Número de WhatsApp</span>
          <input
            value={settings.whatsapp_number}
            onChange={(e) => update({ whatsapp_number: e.target.value.replace(/\D/g, "").slice(0, 15) })}
            inputMode="tel"
            placeholder="34600123456"
            className={inputClass}
          />
          <span className="mt-1.5 block text-sm text-muted">
            Con prefijo del país y sin espacios ni «+». España: 34 + tu número.
          </span>
          {settings.whatsapp_number && (
            <a
              href={whatsappLink(settings.whatsapp_number, "Prueba desde el panel de Dudu Shop")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
            >
              <WhatsAppIcon /> Probar enlace
            </a>
          )}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Usuario de Instagram · opcional</span>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted">@</span>
            <input
              value={settings.instagram}
              onChange={(e) => update({ instagram: e.target.value.replace(/^@/, "").replace(/[^a-zA-Z0-9._]/g, "") })}
              maxLength={30}
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="dudushop"
              className={`${inputClass} pl-9`}
            />
          </div>
        </label>

        <Toggle
          checked={settings.show_prices}
          onChange={(show_prices) => update({ show_prices })}
          label="Mostrar precios"
          hint={
            settings.show_prices
              ? "Se ven los precios de los productos que lo tengan activado"
              : "Ningún precio visible: todo «a consultar»"
          }
        />
      </div>
      {toast}
    </div>
  );
}
