// app/api/admin/redemptions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Papa from "papaparse";
import type { Redemption, User, Discount, Business, Prisma } from "@prisma/client";

/**
 * Endpoint ADMIN para listar canjes (Redemption) y exportarlos.
 *
 * Soporta:
 * - Filtros por rango de fechas (from/to)
 * - Filtros por negocio (businessCode)
 * - Filtros por descuento (discountCode)
 * - Filtro por email del usuario (userEmail)
 * - Exportación a CSV (?export=csv)
 *
 * Permisos:
 * - Solo ADMIN (session.user.role === "ADMIN")
 *
 * Nota:
 * - force-dynamic evita cacheo; importante porque esto es data operativa (auditoría).
 */
export const dynamic = "force-dynamic";

/**
 * Tipo del registro con relaciones incluidas.
 * discount/business pueden ser null según reglas de borrado/cascada del modelo.
 */
type Row = Redemption & {
  user: User;
  discount: Discount | null;
  business: Business | null;
};

/**
 * Parsea fechas recibidas por query params.
 * Retorna undefined si la fecha es inválida o no viene.
 */
function parseDate(v: string | null): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * GET /api/admin/redemptions
 *
 * Query params:
 * - export=csv        -> si es "csv", devuelve un archivo CSV descargable
 * - from=YYYY-MM-DD   -> fecha/hora inicial (opcional)
 * - to=YYYY-MM-DD     -> fecha/hora final (opcional)
 * - businessCode=...  -> código del negocio (opcional)
 * - discountCode=...  -> código del descuento (opcional)
 * - userEmail=...     -> filtro parcial por email (opcional)
 *
 * Respuestas:
 * - 200 JSON: { ok: true, items }
 * - 200 CSV: descarga de redemptions.csv
 * - 403 si no es ADMIN
 * - 500 error interno
 */
export async function GET(req: NextRequest) {
  // 1) Autorización: solo ADMIN
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);

    const exportCsv = searchParams.get("export") === "csv";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const businessCode = (searchParams.get("businessCode") || "").trim().toUpperCase();
    const discountCode = (searchParams.get("discountCode") || "").trim().toUpperCase();
    const userEmail = (searchParams.get("userEmail") || "").trim();

    // 2) Construcción de filtros (where) en Prisma
    const where: Prisma.RedemptionWhereInput = {};

    const gte = parseDate(from);
    const lte = parseDate(to);
    if (gte || lte) {
      where.redeemedAt = {};
      if (gte) (where.redeemedAt as Prisma.DateTimeFilter).gte = gte;
      if (lte) (where.redeemedAt as Prisma.DateTimeFilter).lte = lte;
    }

    if (businessCode) {
      where.business = { is: { code: businessCode } };
    }

    if (discountCode) {
      where.discount = { is: { code: discountCode } };
    }

    if (userEmail) {
      where.user = { is: { email: { contains: userEmail } } };
    }

    // 3) Traer canjes con relaciones para mostrar en panel / exportar
    const items: Row[] = await prisma.redemption.findMany({
      where,
      orderBy: { redeemedAt: "desc" },
      include: { user: true, discount: true, business: true },
    });

    // 4) Exportación CSV (auditoría/reporte)
    if (exportCsv) {
      const rows = items.map((r: Row) => ({
        redemptionId: r.id,
        redeemedAt: r.redeemedAt.toISOString(),
        user: r.user.email,
        userName: r.user.name ?? "",
        tier: r.user.tier,
        discountCode: r.discount?.code ?? "",
        discountTitle: r.discount?.title ?? "",
        businessCode: r.business?.code ?? "",
        businessName: r.business?.name ?? "",
      }));

      const csv = Papa.unparse(rows);

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="redemptions.csv"',
        },
      });
    }

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
