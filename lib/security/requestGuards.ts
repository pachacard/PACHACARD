import { NextResponse } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function allowedOrigins(req: Request) {
  const host = req.headers.get("host");
  const fromHost = host ? [`https://${host}`, `http://${host}`] : [];
  return [
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXTAUTH_URL,
    process.env.APP_BASE_URL,
    ...fromHost,
  ].filter(Boolean) as string[];
}

export function validateMutationRequest(req: Request) {
  if (!MUTATING_METHODS.has(req.method)) return null;

  const origin = req.headers.get("origin");
  const secFetchSite = req.headers.get("sec-fetch-site");
  const contentType = req.headers.get("content-type") || "";

  if (origin && !allowedOrigins(req).includes(origin)) {
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

  return null;
}
