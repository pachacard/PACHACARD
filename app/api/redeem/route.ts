import { NextResponse } from "next/server";
import { verifyQrToken } from "@/lib/token";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import type { Prisma } from "@prisma/client";

/**
 * Si está activo, el backend exige que la versión del token (tv/jti) coincida con user.tokenVersion.
 * Esto permite "rotar" QR: al incrementar tokenVersion en BD, invalidas tarjetas/QR antiguos.
 *
 * Importante:
 * - Por defecto es false para evitar romper tokens antiguos si antes no enviaban tv/jti.
 * - Activarlo requiere que TODOS los QRs generados incluyan tv o jti.
 */
const ENFORCE_TV = process.env.QR_ENFORCE_TV === "true";

/**
 * DEBUG (AUMENTADO):
 * - Loguea a qué BD apunta el deploy (solo HOST, nunca credenciales).
 * - Loguea requestId, método, path, ip/ua, etc.
 */
function safeHostFromUrl(v?: string | null) {
  try {
    if (!v) return "MISSING";
    return new URL(v).host; // SOLO host
  } catch {
    return "INVALID_URL";
  }
}

function getReqMeta(req: Request) {
  const url = new URL(req.url);
  const ip = req.headers.get("x-forwarded-for") || "ip";
  const ua = req.headers.get("user-agent") || "";
  const rid =
    req.headers.get("x-vercel-id") ||
    req.headers.get("x-request-id") ||
    crypto.randomUUID();

  return {
    rid,
    method: req.method,
    path: url.pathname,
    query: url.search,
    ip,
    ua,
  };
}

function logEnvTarget(tag: string, rid: string) {
  const dbHost = safeHostFromUrl(process.env.DATABASE_URL);
  const directHost = safeHostFromUrl(process.env.DIRECT_URL);
  console.log(`[redeem:${tag}] rid=${rid} DATABASE_URL host=${dbHost}`);
  console.log(`[redeem:${tag}] rid=${rid} DIRECT_URL host=${directHost}`);
  console.log(
    `[redeem:${tag}] rid=${rid} ENFORCE_TV=${String(ENFORCE_TV)} NODE_ENV=${process.env.NODE_ENV ?? "?"}`
  );
}

/**
 * Extrae la "versión" del token desde el payload.
 * Se soportan dos nombres por compatibilidad:
 * - tv: versión explícita
 * - jti: campo estándar de JWT (aquí lo usamos como versionado)
 */
function extractTokenVersion(payload: unknown): number | null {
  const p = payload as any;
  if (!p) return null;

  if (typeof p.tv !== "undefined") {
    const n = Number(p.tv);
    return Number.isFinite(n) ? n : null;
  }

  if (typeof p.jti !== "undefined") {
    const n = Number(p.jti);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

/**
 * Construye un identificador de cliente para rate limiting (anti-abuso básico).
 * Nota: En entornos con proxy/CDN, x-forwarded-for suele traer IPs en lista.
 * Aquí concatenamos IP + user-agent para bajar colisiones.
 */
function buildRateLimitKey(req: Request): string {
  const ip = req.headers.get("x-forwarded-for") || "ip";
  const ua = req.headers.get("user-agent") || "";
  return `${ip}|${ua}`;
}

/**
 * GET /api/redeem?token=...
 * Verifica el token QR y retorna datos mínimos del usuario.
 */
export async function GET(req: Request) {
  const meta = getReqMeta(req);
  console.log(
    `[redeem:GET] rid=${meta.rid} ${meta.method} ${meta.path}${meta.query} ip=${meta.ip}`
  );
  logEnvTarget("GET", meta.rid);

  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  console.log(`[redeem:GET] rid=${meta.rid} token_present=${!!token}`);

  // Anti-abuso
  const key = buildRateLimitKey(req);
  if (!rateLimit(key)) {
    console.log(`[redeem:GET] rid=${meta.rid} rate_limit=BLOCK`);
    return NextResponse.json(
      { ok: false, message: "Rate limit excedido" },
      { status: 429 }
    );
  }
  console.log(`[redeem:GET] rid=${meta.rid} rate_limit=OK`);

  try {
    const payload: any = await verifyQrToken(token);
    const userId = String(payload.sub ?? "");
    console.log(`[redeem:GET] rid=${meta.rid} token_sub=${userId || "EMPTY"}`);

    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "Token inválido" },
        { status: 401 }
      );
    }

    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        tier: true,
        status: true,
        tokenVersion: true,
      },
    });

    console.log(
      `[redeem:GET] rid=${meta.rid} user_found=${!!u} status=${u?.status ?? "NULL"} tier=${u?.tier ?? "NULL"} tokenVersion=${u?.tokenVersion ?? "NULL"}`
    );

    if (!u || u.status !== "ACTIVE") {
      return NextResponse.json(
        { ok: false, message: "Token/usuario inválido" },
        { status: 401 }
      );
    }

    if (ENFORCE_TV) {
      const tv = extractTokenVersion(payload);
      console.log(`[redeem:GET] rid=${meta.rid} tv_from_token=${tv}`);

      if (tv !== null && tv !== u.tokenVersion) {
        console.log(`[redeem:GET] rid=${meta.rid} tv_mismatch=TRUE`);
        return NextResponse.json(
          { ok: false, message: "Token revocado/rotado" },
          { status: 401 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Token verificado",
      user: { id: u.id, name: u.name, email: u.email, tier: u.tier },
    });
  } catch (e: any) {
    console.log(
      `[redeem:GET] rid=${meta.rid} verify_error=${e?.message ?? "UNKNOWN"}`
    );
    return NextResponse.json(
      { ok: false, message: "Token inválido o expirado" },
      { status: 401 }
    );
  }
}

/**
 * POST /api/redeem?token=...
 * Registra un canje (Redemption) si el token y las reglas del descuento son válidos.
 *
 * NUEVO (mínimo):
 * - remainingAfter: para que el front actualice el "Te quedan X" sin refrescar página.
 */
export async function POST(req: Request) {
  const metaReq = getReqMeta(req);
  console.log(
    `[redeem:POST] rid=${metaReq.rid} ${metaReq.method} ${metaReq.path}${metaReq.query} ip=${metaReq.ip}`
  );
  logEnvTarget("POST", metaReq.rid);

  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  console.log(`[redeem:POST] rid=${metaReq.rid} token_present=${!!token}`);

  const key = buildRateLimitKey(req);
  if (!rateLimit(key)) {
    console.log(`[redeem:POST] rid=${metaReq.rid} rate_limit=BLOCK`);
    return NextResponse.json(
      { ok: false, message: "Rate limit excedido" },
      { status: 429 }
    );
  }
  console.log(`[redeem:POST] rid=${metaReq.rid} rate_limit=OK`);

  try {
    // 1) Validar token
    const payload: any = await verifyQrToken(token);
    const userId = String(payload.sub ?? "");
    console.log(`[redeem:POST] rid=${metaReq.rid} token_sub=${userId || "EMPTY"}`);

    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "Token inválido" },
        { status: 401 }
      );
    }

    // 2) Validar usuario
    const user = await prisma.user.findUnique({ where: { id: userId } });
    console.log(
      `[redeem:POST] rid=${metaReq.rid} user_found=${!!user} status=${user?.status ?? "NULL"} tier=${user?.tier ?? "NULL"}`
    );

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { ok: false, message: "Token/usuario inválido" },
        { status: 401 }
      );
    }

    // 2.1) Rotación tokenVersion (opcional)
    if (ENFORCE_TV) {
      const tv = extractTokenVersion(payload);
      console.log(
        `[redeem:POST] rid=${metaReq.rid} tv_from_token=${tv} user_tokenVersion=${user.tokenVersion}`
      );

      if (tv !== null && tv !== user.tokenVersion) {
        return NextResponse.json(
          { ok: false, message: "Token revocado/rotado" },
          { status: 401 }
        );
      }
    }

    // 3) Leer body
    const body = await req.json().catch(() => null);

    const businessCode = String(body?.businessCode || "").trim().toUpperCase();
    const discountCode = String(body?.discountCode || "").trim().toUpperCase();

    console.log(
      `[redeem:POST] rid=${metaReq.rid} input businessCode="${businessCode}" discountCode="${discountCode}"`
    );

    if (!businessCode || !discountCode) {
      return NextResponse.json(
        { ok: false, message: "Campos requeridos" },
        { status: 400 }
      );
    }

    // 3.1) Negocio
    const business = await prisma.business.findUnique({
      where: { code: businessCode },
    });

    console.log(
      `[redeem:POST] rid=${metaReq.rid} business_found=${!!business} business_status=${business?.status ?? "NULL"} business_id=${business?.id ?? "NULL"}`
    );

    if (!business || business.status !== "ACTIVE") {
      return NextResponse.json(
        { ok: false, message: "Negocio inválido" },
        { status: 400 }
      );
    }

    // 4) Descuento
    const now = new Date();
    const d = await prisma.discount.findUnique({ where: { code: discountCode } });

    console.log(
      `[redeem:POST] rid=${metaReq.rid} discount_found=${!!d} discount_status=${d?.status ?? "NULL"} discount_id=${d?.id ?? "NULL"}`
    );

    if (!d || d.status !== "PUBLISHED") {
      return NextResponse.json(
        { ok: false, message: "Descuento inválido" },
        { status: 400 }
      );
    }

    if (d.startAt > now || d.endAt < now) {
      return NextResponse.json(
        { ok: false, message: "Vencido o fuera de vigencia" },
        { status: 400 }
      );
    }

    // 5) Tier
    const tier = user.tier;
    const tierOk =
      (tier === "BASIC" && d.tierBasic) ||
      (tier === "NORMAL" && d.tierNormal) ||
      (tier === "PREMIUM" && d.tierPremium);

    console.log(`[redeem:POST] rid=${metaReq.rid} tier=${tier} tierOk=${tierOk}`);

    if (!tierOk) {
      return NextResponse.json(
        { ok: false, message: "No válido para tu tier" },
        { status: 400 }
      );
    }

    // 6) Si descuento está ligado a negocio, debe coincidir
    if (d.businessId && d.businessId !== business.id) {
      console.log(
        `[redeem:POST] rid=${metaReq.rid} business_mismatch discount.businessId=${d.businessId} business.id=${business.id}`
      );
      return NextResponse.json(
        { ok: false, message: "El código no corresponde a este negocio" },
        { status: 400 }
      );
    }

    // 7) Límite global rápido
    if (d.limitTotal && d.usedTotal >= d.limitTotal) {
      return NextResponse.json({ ok: false, message: "Agotado" }, { status: 400 });
    }

    // 7.1) Límite por usuario
    const usedByUser = await prisma.redemption.count({
      where: { userId, discountId: d.id },
    });

    console.log(
      `[redeem:POST] rid=${metaReq.rid} usedByUser=${usedByUser} limitPerUser=${d.limitPerUser ?? "NULL"}`
    );

    if (d.limitPerUser && usedByUser >= d.limitPerUser) {
      return NextResponse.json(
        { ok: false, message: "Límite por usuario alcanzado" },
        { status: 400 }
      );
    }

    // 8) Registrar canje en transacción
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (d.limitTotal) {
        const fresh = await tx.discount.findUnique({ where: { id: d.id } });
        if (!fresh) throw new Error("NOTFOUND");

        if (fresh.limitTotal && fresh.usedTotal >= fresh.limitTotal) {
          throw new Error("AGOTADO");
        }

        await tx.discount.update({
          where: { id: d.id },
          data: { usedTotal: fresh.usedTotal + 1 },
        });
      }

      return tx.redemption.create({
        data: {
          userId,
          discountId: d.id,
          businessId: business.id,
          channel: "qr",
        },
      });
    });

    const remainingAfter =
      d.limitPerUser != null ? Math.max(d.limitPerUser - (usedByUser + 1), 0) : null;

    console.log(
      `[redeem:POST] rid=${metaReq.rid} redemption_created id=${result.id} remainingAfter=${remainingAfter}`
    );

    return NextResponse.json({
      ok: true,
      redemptionId: result.id,
      message: "Canje registrado",
      remainingAfter,
    });
  } catch (e: any) {
    console.log(
      `[redeem:POST] rid=${metaReq.rid} ERROR=${e?.message ?? "UNKNOWN"}`
    );
    return NextResponse.json(
      { ok: false, message: "Token inválido o expirado" },
      { status: 401 }
    );
  }
}
