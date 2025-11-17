// app/api/redeem/options/route.ts
import { NextResponse } from "next/server";
import { verifyQrToken } from "@/lib/token";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

const ENFORCE_TV = process.env.QR_ENFORCE_TV === "true";

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
 * Devuelve los descuentos disponibles para ese usuario en ese negocio,
 * incluyendo cuántos canjes le quedan por usuario.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const businessCode = url.searchParams.get("businessCode") || "";

  // Anti-abuso sencillo
  const ip =
    (req.headers.get("x-forwarded-for") || "ip") +
    (req.headers.get("user-agent") || "");
  if (!rateLimit(ip)) {
    return NextResponse.json(
      { ok: false, message: "Rate limit excedido" },
      { status: 429 }
    );
  }

  if (!token || !businessCode) {
    return NextResponse.json(
      { ok: false, message: "Faltan parámetros" },
      { status: 400 }
    );
  }

  try {
    // 1) Validar token y usuario
    const p: any = await verifyQrToken(token);
    const userId = String(p.sub ?? "");
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "Token inválido" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { ok: false, message: "Token/usuario inválido" },
        { status: 401 }
      );
    }

    if (ENFORCE_TV) {
      const tv = extractTokenVersion(p);
      if (tv !== null && tv !== user.tokenVersion) {
        return NextResponse.json(
          { ok: false, message: "Token revocado/rotado" },
          { status: 401 }
        );
      }
    }

    // 2) Negocio
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

    // 3) Descuentos vigentes de ese negocio
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

    // 4) Filtrar por tier del usuario
    const filteredByTier = discounts.filter((d) => {
      if (user.tier === "BASIC") return d.tierBasic;
      if (user.tier === "NORMAL") return d.tierNormal;
      if (user.tier === "PREMIUM") return d.tierPremium;
      return false;
    });

    // 5) Filtrar por stock total (límite global)
    const available = filteredByTier.filter((d) => {
      if (!d.limitTotal) return true;
      return (d.usedTotal ?? 0) < d.limitTotal;
    });

    // 6) Calcular cuántos canjes lleva este usuario por cada descuento
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

    // 7) Armar respuesta con "remaining" (cuántos le quedan)
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
    console.error("[REDEEM_OPTIONS]", e);
    return NextResponse.json(
      { ok: false, message: "Token inválido o expirado" },
      { status: 401 }
    );
  }
}
