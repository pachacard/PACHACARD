// app/api/admin/redemptions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";
import type {
  Redemption,
  User,
  Discount,
  Business,
  Prisma,
} from "@prisma/client";
export const dynamic = "force-dynamic";

// Fila con includes tipados
type Row = Redemption & {
  user: User;
  discount: Discount | null;
  business: Business | null;
};

function parseDate(v: string | null): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const exportCsv = searchParams.get("export") === "csv";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const businessCode = (searchParams.get("businessCode") || "")
      .trim()
      .toUpperCase();
    const discountCode = (searchParams.get("discountCode") || "")
      .trim()
      .toUpperCase();
    const userEmail = (searchParams.get("userEmail") || "").trim();

    // 🧱 Construye el where de Prisma a partir de los filtros
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
      where.user = {
        is: { email: { contains: userEmail } },
      };
    }

    // ✅ tipa el resultado de Prisma
    const items: Row[] = await prisma.redemption.findMany({
      where,
      orderBy: { redeemedAt: "desc" },
      include: { user: true, discount: true, business: true },
    });

    if (exportCsv) {
      // ✅ tipa el parámetro del map
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
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
