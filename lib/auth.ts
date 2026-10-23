import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function isAdmin() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** Para páginas del panel: sin sesión válida, al login. */
export async function requireAdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
}
