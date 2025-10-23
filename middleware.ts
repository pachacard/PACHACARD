import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // 👇 PASA EL SECRET AQUÍ
  const token = await getToken({ req, secret: SECRET });
  const role = (token as any)?.role;

  if (pathname.startsWith("/admin")) {
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
    if (role !== "ADMIN") return NextResponse.redirect(new URL("/app", req.url));
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    if (!token || role !== "ADMIN") {
      return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/app")) {
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*", "/api/admin/:path*"],
};
