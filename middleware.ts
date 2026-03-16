// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Middleware de control de acceso para PACHACARD.
 *
 * Responsabilidades:
 * - Proteger rutas privadas: /app y /admin
 * - Redirigir a /login si no hay sesión
 * - Enforzar rol ADMIN para /admin
 * - Mejorar UX: si ADMIN entra a /app, lo redirige a /admin
 * - Si hay sesión y visita /login, lo redirige a su destino (callbackUrl o home por rol)
 *
 * Fuente de verdad del rol:
 * - El rol viene del token de NextAuth (JWT session).
 * - Se espera que en auth.ts se haya persistido token.role en callbacks.jwt().
 */

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  /**
   * Excepciones:
   * - No interceptar rutas de NextAuth (/api/auth)
   * - No interceptar assets estáticos de Next.js (_next)
   * - No interceptar favicon ni archivos estáticos comunes
   *
   * Esto evita loops y reduce latencia innecesaria.
   */
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(?:png|jpg|jpeg|svg|ico|gif|webp|css|js|txt|map)$/)
  ) {
    return NextResponse.next();
  }

  /**
   * Obtiene el token de sesión (NextAuth JWT).
   *
   * Notas:
   * - secret debe coincidir con el usado en NextAuth (NEXTAUTH_SECRET).
   * - secureCookie: true asume entorno https; si pruebas local en http y tienes problemas,
   *   podrías condicionarlo por NODE_ENV (pero en producción debe ser true).
   */
 const token = await getToken({
  req,
  secret: process.env.NEXTAUTH_SECRET,
  secureCookie: process.env.NODE_ENV === "production",
});

  const role = (token as any)?.role || "USER";

  // Zonas privadas: requieren sesión
  const needsAuth = pathname.startsWith("/app") || pathname.startsWith("/admin");

  /**
   * Si no hay sesión y se intenta entrar a zona privada:
   * - redirige a /login
   * - guarda callbackUrl para retornar exactamente a la URL solicitada
   */
  if (!token && needsAuth) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname + (search || ""));
    return NextResponse.redirect(url);
  }

  /**
   * Si es ADMIN y entra al portal de usuario /app:
   * - mejora UX: mándalo al panel /admin como home principal.
   */
  if (token && pathname.startsWith("/app") && role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  /**
   * /admin requiere rol ADMIN.
   * Si alguien logueado como USER intenta entrar:
   * - lo redirigimos al portal /app
   */
  if (token && pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/app", req.url));
  }

  /**
   * Si hay sesión y visita /login:
   * - Si existe callbackUrl, respétalo
   * - Si no existe, manda al home según rol
   */
  if (token && pathname === "/login") {
    const cb = req.nextUrl.searchParams.get("callbackUrl");
    if (cb) return NextResponse.redirect(new URL(cb, req.url));

    const dest = role === "ADMIN" ? "/admin" : "/app";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return NextResponse.next();
}

/**
 * Matcher:
 * - Se ejecuta en /login, /app/* y /admin/*
 * - Ojo: aunque excluyes estáticos arriba, esto reduce ejecución innecesaria.
 */
export const config = {
  matcher: ["/login", "/app/:path*", "/admin/:path*"],
};
