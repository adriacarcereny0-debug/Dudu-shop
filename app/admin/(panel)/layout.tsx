import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/admin/actions";
import { ExternalIcon, LogOutIcon, SettingsIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/admin/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="max-w-sm">
          <p className="font-display text-3xl font-black uppercase">Sin acceso</p>
          <p className="mt-3 text-muted">
            La cuenta <strong>{String(data.claims.email ?? "")}</strong> no es administradora. Sigue los pasos del
            README para darle permisos.
          </p>
          <form action={logout} className="mt-8">
            <button className="h-12 rounded-full bg-ink px-6 font-semibold text-paper">Cerrar sesión</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-4">
          <Link href="/admin" className="mr-auto font-display text-xl font-black uppercase">
            Dudu <span className="text-muted">Admin</span>
          </Link>
          <Link
            href="/"
            target="_blank"
            aria-label="Ver catálogo"
            className="grid size-11 place-items-center rounded-full text-xl active:bg-line"
          >
            <ExternalIcon />
          </Link>
          <Link
            href="/admin/settings"
            aria-label="Configuración"
            className="grid size-11 place-items-center rounded-full text-xl active:bg-line"
          >
            <SettingsIcon />
          </Link>
          <form action={logout}>
            <button aria-label="Cerrar sesión" className="grid size-11 place-items-center rounded-full text-xl active:bg-line">
              <LogOutIcon />
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-3xl">{children}</div>
    </div>
  );
}
