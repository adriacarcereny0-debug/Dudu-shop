import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="font-display text-6xl font-black">404</p>
        <p className="mt-2 text-muted">Esta prenda ya no está disponible.</p>
        <Link href="/" className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-6 font-semibold text-paper">
          Ver catálogo
        </Link>
      </div>
    </main>
  );
}
