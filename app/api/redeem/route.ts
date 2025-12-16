// app/api/redeem/route.ts

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
 * Extrae la "versión" del token desde el payload.
 * Se soportan dos nombres por compatibilidad:
 * - tv: versión explícita
 * - jti: campo estándar de JWT (aquí lo usamos como versionado)
 *
 * @param payload Payload decodificado del JWT
 * @returns número de versión o null si no existe / no es válida
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
 *
 * No registra canje.
 * Se usa normalmente para:
 * - Validar que el QR corresponde a un usuario activo.
 * - Mostrar "dueño" del QR antes de elegir un descuento.
 *
 * Respuestas:
 * - 200 { ok: true, user: { id, name, email, tier } }
 * - 401 token inválido/expirado/usuario inactivo/token rotado
 * - 429 rate limit
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";

  // Anti-abuso (no es seguridad fuerte, pero reduce scraping y spam)
  const key = buildRateLimitKey(req);
  if (!rateLimit(key)) {
    return NextResponse.json(
      { ok: false, message: "Rate limit excedido" },
      { status: 429 }
    );
  }

  try {
    // 1) Verificar JWT (firma + exp + formato)
    const payload: any = await verifyQrToken(token);

    // 2) sub = userId (regla central: sub identifica al contribuyente)
    const userId = String(payload.sub ?? "");
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "Token inválido" },
        { status: 401 }
      );
    }

    // 3) Confirmar usuario activo en BD (no confiamos solo en el token)
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

    if (!u || u.status !== "ACTIVE") {
      return NextResponse.json(
        { ok: false, message: "Token/usuario inválido" },
        { status: 401 }
      );
    }

    // 4) (Opcional) Revisión de rotación de token (tokenVersion)
    if (ENFORCE_TV) {
      const tv = extractTokenVersion(payload);
      // Si el token trae versión y no coincide con la BD, asumimos QR revocado/rotado.
      if (tv !== null && tv !== u.tokenVersion) {
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
  } catch {
    // No filtramos detalles del error de verificación para no dar pistas (seguridad básica)
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
 * Body esperado:
 * - businessCode: string (código del negocio afiliado)
 * - discountCode: string (código del descuento a canjear)
 *
 * Validaciones principales:
 * 1) Token JWT válido (firma/exp) y usuario ACTIVE
 * 2) (Opcional) tokenVersion coincide (si ENFORCE_TV=true)
 * 3) Negocio existe y está ACTIVE
 * 4) Descuento existe, está PUBLISHED y en vigencia
 * 5) El descuento aplica al tier del usuario (tier flags)
 * 6) Si el descuento está ligado a un negocio, debe coincidir
 * 7) Límites: total y por usuario
 *
 * Operación atómica:
 * - Si hay limitTotal, se incrementa usedTotal + se crea Redemption en una transacción
 *
 * Nota de consistencia:
 * - El conteo usedByUser está fuera de la transacción (podría haber una carrera si dos canjes simultáneos).
 *   Si necesitas consistencia total, mueve ese count dentro de la misma $transaction.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";

  const key = buildRateLimitKey(req);
  if (!rateLimit(key)) {
    return NextResponse.json(
      { ok: false, message: "Rate limit excedido" },
      { status: 429 }
    );
  }

  try {
    // 1) Validar token (sub = userId)
    const payload: any = await verifyQrToken(token);
    const userId = String(payload.sub ?? "");
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "Token inválido" },
        { status: 401 }
      );
    }

    // 2) Traer usuario desde BD y validar estado
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { ok: false, message: "Token/usuario inválido" },
        { status: 401 }
      );
    }

    // 2.1) (Opcional) tokenVersion enforcement (rotación QR)
    if (ENFORCE_TV) {
      const tv = extractTokenVersion(payload);
      if (tv !== null && tv !== user.tokenVersion) {
        return NextResponse.json(
          { ok: false, message: "Token revocado/rotado" },
          { status: 401 }
        );
      }
    }

    // 3) Leer input del comercio (cajero)
    const body = await req.json().catch(() => null);
    const businessCode = String(body?.businessCode || "");
    const discountCode = String(body?.discountCode || "");

    if (!businessCode || !discountCode) {
      return NextResponse.json(
        { ok: false, message: "Campos requeridos" },
        { status: 400 }
      );
    }

    // 3.1) Validar negocio afiliado
    const business = await prisma.business.findUnique({
      where: { code: businessCode },
    });

    if (!business || business.status !== "ACTIVE") {
      return NextResponse.json(
        { ok: false, message: "Negocio inválido" },
        { status: 400 }
      );
    }

    // 4) Validar descuento (existencia, estado, vigencia)
    const now = new Date();
    const d = await prisma.discount.findUnique({ where: { code: discountCode } });

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

    // 5) Validación de tier: el tier real se toma de BD (no del token)
    const tier = user.tier;
    const tierOk =
      (tier === "BASIC" && d.tierBasic) ||
      (tier === "NORMAL" && d.tierNormal) ||
      (tier === "PREMIUM" && d.tierPremium);

    if (!tierOk) {
      return NextResponse.json(
        { ok: false, message: "No válido para tu tier" },
        { status: 400 }
      );
    }

    // 6) Si el descuento está asociado a un negocio, debe coincidir
    if (d.businessId && d.businessId !== business.id) {
      return NextResponse.json(
        { ok: false, message: "El código no corresponde a este negocio" },
        { status: 400 }
      );
    }

    // 7) Límites globales (rápido)
    if (d.limitTotal && d.usedTotal >= d.limitTotal) {
      return NextResponse.json({ ok: false, message: "Agotado" }, { status: 400 });
    }

    // 7.1) Límite por usuario (nota: para consistencia fuerte, muévelo dentro de la transacción)
    const usedByUser = await prisma.redemption.count({
      where: { userId, discountId: d.id },
    });

    if (d.limitPerUser && usedByUser >= d.limitPerUser) {
      return NextResponse.json(
        { ok: false, message: "Límite por usuario alcanzado" },
        { status: 400 }
      );
    }

    // 8) Registrar canje atómicamente (incremento usedTotal + creación de Redemption)
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Si hay límite total, revalidamos dentro de la transacción para evitar carreras
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

      // Crear log del canje
      return tx.redemption.create({
        data: {
          userId,
          discountId: d.id,
          businessId: business.id,
          channel: "qr",
        },
      });
    });

    return NextResponse.json({
      ok: true,
      redemptionId: result.id,
      message: "Canje registrado",
    });
  } catch (e) {
    /**
     * Mejora recomendada:
     * Actualmente todo error cae aquí como 401, pero muchos errores reales son 400 (agotado, vigencia, etc.).
     * Si quieres precisión: usa errores tipados (ej. throw new RedeemError("AGOTADO", 400))
     * y mapea el status según el caso.
     */
    return NextResponse.json(
      { ok: false, message: "Token inválido o expirado" },
      { status: 401 }
    );
  }
}
