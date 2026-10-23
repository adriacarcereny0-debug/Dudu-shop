import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { ExternalIcon, LogOutIcon, SettingsIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();

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
