// app/api/qr/token/[userId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { makeCardToken } from "@/lib/token"; 

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 403 });
  }

  const userId = params?.userId;
  if (!userId)
    return NextResponse.json({ ok: false, message: "Falta userId" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user)
    return NextResponse.json({ ok: false, message: "No existe el usuario" }, { status: 404 });

  //  usa makeCardToken
  const token = await makeCardToken(user.id);

  return NextResponse.json({ ok: true, token });
}
