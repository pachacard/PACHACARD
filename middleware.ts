// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  // Nunca interceptar rutas de next-auth ni assets
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
    // en Vercel es https, usar secureCookie evita lecturas inconsistentes
    secureCookie: true,
  });

  // Si NO hay sesión e intenta entrar a zonas privadas → al login con callbackUrl
  if (!token && (pathname.startsWith("/app") || pathname.startsWith("/admin"))) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname + (search || ""));
    return NextResponse.redirect(url);
  }

  // Si SÍ hay sesión y visita /login → llévalo a /app (o al callbackUrl si viene)
  if (token && pathname === "/login") {
    const cb = req.nextUrl.searchParams.get("callbackUrl") || "/app";
    return NextResponse.redirect(new URL(cb, req.url));
  }

  return NextResponse.next();
}

// Limita el alcance del middleware para evitar bucles
export const config = {
  matcher: [
    "/login",
    "/app/:path*",
    "/admin/:path*",
  ],
};
