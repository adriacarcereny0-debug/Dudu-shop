"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImageIcon } from "@/components/icons";
import { cn, imageUrl } from "@/lib/utils";

export function ProductGallery({ images, name, dimmed }: { images: string[]; name: string; dimmed?: boolean }) {
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  if (images.length === 0) {
    return (
      <div className="grid aspect-[4/5] place-items-center bg-line text-5xl text-muted md:rounded-3xl">
        <ImageIcon />
      </div>
    );
  }

  function goTo(index: number) {
    const el = scroller.current;
    if (el) el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div>
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          setActive(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="no-scrollbar flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto bg-line md:rounded-3xl"
      >
        {images.map((path, i) => (
          <div key={path} className="relative w-full shrink-0 snap-center">
            <Image
              src={imageUrl(path)}
              alt={`${name} — foto ${i + 1}`}
              fill
              priority={i === 0}
              sizes="(min-width: 768px) 50vw, 100vw"
              className={cn("object-cover", dimmed && "opacity-70 grayscale")}
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <div className="mt-3 flex justify-center gap-1.5 md:hidden">
            {images.map((path, i) => (
              <button
                key={path}
                type="button"
                aria-label={`Ver foto ${i + 1}`}
                onClick={() => goTo(i)}
                className={cn("h-1.5 rounded-full transition-all", i === active ? "w-6 bg-ink" : "w-1.5 bg-ink/25")}
              />
            ))}
          </div>
          <div className="mt-3 hidden gap-2 md:flex">
            {images.map((path, i) => (
              <button
                key={path}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ver foto ${i + 1}`}
                className={cn(
                  "relative size-16 overflow-hidden rounded-xl border-2 transition",
                  i === active ? "border-ink" : "border-transparent opacity-70",
                )}
              >
                <Image src={imageUrl(path)} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
