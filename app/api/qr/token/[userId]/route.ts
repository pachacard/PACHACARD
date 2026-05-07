// app/api/qr/token/[userId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFreshAdmin } from "@/lib/security/admin";
import { makeCardToken } from "@/lib/token"; 

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { userId: string } }
) {
  const admin = await requireFreshAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 403 });
  }

  const userId = params?.userId;
  if (!userId)
    return NextResponse.json({ ok: false, message: "Falta userId" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user)
    return NextResponse.json({ ok: false, message: "No existe el usuario" }, { status: 404 });

  //  usa makeCardToken
  const token = await makeCardToken(user.id, user.tokenVersion);

  return NextResponse.json({ ok: true, token });
}
