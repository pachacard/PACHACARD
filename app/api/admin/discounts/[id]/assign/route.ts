// app/api/admin/discounts/[id]/assign/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 403 });
  }

  const exists = await prisma.discount.findUnique({ where: { id: params.id } });
  if (!exists) return NextResponse.json({ ok: false, message: "Descuento no encontrado" }, { status: 404 });

  const { categoryIds } = (await req.json()) as { categoryIds?: string[] };
  const ids = Array.isArray(categoryIds) ? categoryIds.map(String) : [];

  await prisma.$transaction(async (tx) => {
    await tx.discountCategory.deleteMany({ where: { discountId: params.id } });
    if (ids.length) {
      await tx.discountCategory.createMany({
        data: ids.map((categoryId) => ({ discountId: params.id, categoryId })),
        // sin skipDuplicates por SQLite
      });
    }
  });

  return NextResponse.json({ ok: true });
}
