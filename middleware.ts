// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // No tocar auth/estáticos
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(?:png|jpg|jpeg|svg|ico|gif|webp|css|js|txt|map)$/)
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: true,
  });

  const role = (token as any)?.role || "USER";

  // 🔒 Zonas privadas: /app y /admin
  const needsAuth = pathname.startsWith("/app") || pathname.startsWith("/admin");
  if (!token && needsAuth) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname + (search || ""));
    return NextResponse.redirect(url);
  }

  // 🔒 /admin requiere ADMIN
  if (token && pathname.startsWith("/admin") && role !== "ADMIN") {
    // si no es admin, mándalo a /app
    return NextResponse.redirect(new URL("/app", req.url));
  }

  // ✅ Si hay sesión y visita /login → llévalo según rol (o callbackUrl)
  if (token && pathname === "/login") {
    const cb = req.nextUrl.searchParams.get("callbackUrl");
    if (cb) return NextResponse.redirect(new URL(cb, req.url));
    const dest = role === "ADMIN" ? "/admin" : "/app";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/app/:path*", "/admin/:path*"],
};
