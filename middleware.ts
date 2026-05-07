// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

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
    secureCookie: process.env.NODE_ENV === "production",
  });

  const role = (token as any)?.role || "USER";
  const isAdminApi = pathname.startsWith("/api/admin");
  const isRedeemApi = pathname === "/api/redeem" || pathname.startsWith("/api/redeem/");
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

  if ((isAdminApi || isRedeemApi) && isMutation) {
    const origin = req.headers.get("origin");
    const secFetchSite = req.headers.get("sec-fetch-site");
    const contentType = req.headers.get("content-type") || "";
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_BASE_URL,
      process.env.NEXTAUTH_URL,
      req.nextUrl.origin,
    ].filter(Boolean);

    if (origin && !allowedOrigins.includes(origin)) {
      return NextResponse.json(
        { ok: false, message: "Origen no permitido" },
        { status: 403 }
      );
    }

    if (
      secFetchSite &&
      !["same-origin", "same-site", "none"].includes(secFetchSite)
    ) {
      return NextResponse.json(
        { ok: false, message: "Solicitud no permitida" },
        { status: 403 }
      );
    }

    if (contentType && !contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json(
        { ok: false, message: "Content-Type invalido" },
        { status: 415 }
      );
    }
  }

  const needsAuth =
    pathname.startsWith("/app") || pathname.startsWith("/admin") || isAdminApi;

  if (!token && needsAuth) {
    if (isAdminApi) {
      return NextResponse.json(
        { ok: false, message: "No autenticado" },
        { status: 401 }
      );
    }

    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname + (search || ""));
    return NextResponse.redirect(url);
  }

  if (token && pathname.startsWith("/app") && role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  if (token && (pathname.startsWith("/admin") || isAdminApi) && role !== "ADMIN") {
    if (isAdminApi) {
      return NextResponse.json(
        { ok: false, message: "No autorizado" },
        { status: 403 }
      );
    }

    return NextResponse.redirect(new URL("/app", req.url));
  }

  if (token && pathname === "/login") {
    const cb = req.nextUrl.searchParams.get("callbackUrl");
    if (cb) return NextResponse.redirect(new URL(cb, req.url));

    return NextResponse.redirect(new URL(role === "ADMIN" ? "/admin" : "/app", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/app/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/redeem",
    "/api/redeem/:path*",
  ],
};
