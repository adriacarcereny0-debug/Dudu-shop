import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/** Primera barrera del panel: sin sesión válida se va al login. Cada acción lo vuelve a comprobar. */
export async function proxy(request: NextRequest) {
  const loggedIn = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const isLogin = request.nextUrl.pathname === "/admin/login";

  if (!loggedIn && !isLogin) return NextResponse.redirect(new URL("/admin/login", request.url));
  if (loggedIn && isLogin) return NextResponse.redirect(new URL("/admin", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
