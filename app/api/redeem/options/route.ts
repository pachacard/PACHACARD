// app/api/redeem/options/route.ts
import { NextResponse } from "next/server";
import { verifyQrToken } from "@/lib/token";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

/**
 * Si está activo, se valida que el token (tv/jti) coincida con user.tokenVersion.
 * Esto sirve para invalidar tarjetas antiguas cuando se rota el QR.
 */
const ENFORCE_TV = process.env.QR_ENFORCE_TV === "true";

/**
 * Extrae la "versión" del token desde el payload.
 * Soporta:
 * - tv (campo personalizado)
 * - jti (campo estándar JWT)
 *
 * @returns número de versión o null si no existe/no es válida
 */
function extractTokenVersion(p: any): number | null {
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
 * GET /api/redeem/options?token=...&businessCode=RESTO
 *
 * Objetivo:
 * - El comercio escanea el QR y consulta qué descuentos puede usar ese usuario
 *   en un negocio específico.
 *
 * Qué devuelve:
 * - Lista de descuentos disponibles para ese usuario (por tier y vigencia)
 * - Incluye "remaining": cuántos canjes le quedan al usuario en cada descuento,
 *   según limitPerUser (si existe).
 *
 * Importante:
 * - Este endpoint NO registra canje, solo muestra opciones.
 * - El canje real se hace en POST /api/redeem.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const businessCode = url.searchParams.get("businessCode") || "";

  // Anti-abuso básico (reduce spam; no es seguridad fuerte)
  const key =
    (req.headers.get("x-forwarded-for") || "ip") +
    (req.headers.get("user-agent") || "");
  if (!rateLimit(key)) {
    return NextResponse.json(
      { ok: false, message: "Rate limit excedido" },
      { status: 429 }
    );
  }

  // Validación de parámetros
  if (!token || !businessCode) {
    return NextResponse.json(
      { ok: false, message: "Faltan parámetros" },
      { status: 400 }
    );
  }

  try {
    // 1) Validar token (firma/exp) y obtener userId desde sub
    const p: any = await verifyQrToken(token);
    const userId = String(p.sub ?? "");
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "Token inválido" },
        { status: 401 }
      );
    }

    // 2) Traer usuario real desde BD (no confiar solo en el token)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { ok: false, message: "Token/usuario inválido" },
        { status: 401 }
      );
    }

    // 2.1) (Opcional) Validar versión del token si está activado
    if (ENFORCE_TV) {
      const tv = extractTokenVersion(p);
      if (tv !== null && tv !== user.tokenVersion) {
        return NextResponse.json(
          { ok: false, message: "Token revocado/rotado" },
          { status: 401 }
        );
      }
    }

    // 3) Validar negocio
    const business = await prisma.business.findUnique({
      where: { code: businessCode },
      select: { id: true, name: true, status: true },
    });

    if (!business || business.status !== "ACTIVE") {
      return NextResponse.json(
        { ok: false, message: "Negocio inválido" },
        { status: 400 }
      );
    }

    const now = new Date();

    // 4) Traer descuentos vigentes y publicados del negocio
    // Nota: aquí todavía NO filtramos por tier; eso se hace luego con user.tier.
    const discounts = await prisma.discount.findMany({
      where: {
        businessId: business.id,
        status: "PUBLISHED",
        startAt: { lte: now },
        endAt: { gte: now },
      },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        tierBasic: true,
        tierNormal: true,
        tierPremium: true,
        limitPerUser: true,
        limitTotal: true,
        usedTotal: true,
      },
      orderBy: { title: "asc" },
    });

    // 5) Filtrar por tier del usuario
    // Regla: si el usuario es BASIC, solo descuentos con tierBasic=true, etc.
    const filteredByTier = discounts.filter((d) => {
      if (user.tier === "BASIC") return d.tierBasic;
      if (user.tier === "NORMAL") return d.tierNormal;
      if (user.tier === "PREMIUM") return d.tierPremium;
      return false;
    });

    // 6) Filtrar por límite total (stock global del descuento)
    // Si limitTotal no existe => no hay límite global.
    const available = filteredByTier.filter((d) => {
      if (!d.limitTotal) return true;
      return (d.usedTotal ?? 0) < d.limitTotal;
    });

    // 7) Calcular cuántas veces ESTE usuario ya canjeó cada descuento
    // Se arma un mapa { discountId -> conteo }.
    const discountIds = available.map((d) => d.id);

    let usedMap: Record<string, number> = {};
    if (discountIds.length > 0) {
      const userRedemptions = await prisma.redemption.findMany({
        where: {
          userId: user.id,
          discountId: { in: discountIds },
        },
        select: { discountId: true },
      });

      usedMap = userRedemptions.reduce<Record<string, number>>((acc, r) => {
        acc[r.discountId] = (acc[r.discountId] ?? 0) + 1;
        return acc;
      }, {});
    }

    // 8) Preparar respuesta final para el comercio
    // remaining:
    // - si limitPerUser existe => cuántos canjes le quedan al usuario
    // - si limitPerUser es null => remaining = null (ilimitado por usuario)
    const items = available.map((d) => {
      const usedByUser = usedMap[d.id] ?? 0;
      const remaining =
        d.limitPerUser != null
          ? Math.max(d.limitPerUser - usedByUser, 0)
          : null;

      return {
        code: d.code,
        label: d.title || d.code,
        description: d.description,
        limitPerUser: d.limitPerUser,
        remaining,
      };
    });

    return NextResponse.json({
      ok: true,
      business: { name: business.name },
      discounts: items,
    });
  } catch (e) {
    // Aquí caen errores de verificación del token u otros errores inesperados
    console.error("[REDEEM_OPTIONS]", e);
    return NextResponse.json(
      { ok: false, message: "Token inválido o expirado" },
      { status: 401 }
    );
  }
}
