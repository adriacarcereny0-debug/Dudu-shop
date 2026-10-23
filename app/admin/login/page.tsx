import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Acceso", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <p className="font-display text-5xl leading-none font-black uppercase">Dudu Shop</p>
        <p className="mt-2 text-muted">Panel de administración</p>
        <LoginForm />
      </div>
    </main>
  );
}
