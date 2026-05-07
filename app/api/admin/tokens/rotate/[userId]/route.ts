import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFreshAdmin } from "@/lib/security/admin";

export async function POST(_: Request, { params }: { params: { userId: string } }) {
  const admin = await requireFreshAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 403 });
  }

  const user = await prisma.user.update({
    where: { id: params.userId },
    data: { tokenVersion: { increment: 1 } },
    select: { tokenVersion: true },
  });

  return NextResponse.json({ ok: true, tokenVersion: user.tokenVersion });
}
