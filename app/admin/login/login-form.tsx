"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="mt-10 space-y-4">
      <label className="block">
        <span className="text-sm font-semibold">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={state?.email}
          required
          className="mt-1.5 h-14 w-full rounded-2xl border border-line bg-card px-4 outline-none focus:border-ink"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Contraseña</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1.5 h-14 w-full rounded-2xl border border-line bg-card px-4 outline-none focus:border-ink"
        />
      </label>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-14 w-full rounded-full bg-ink text-lg font-semibold text-paper transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
