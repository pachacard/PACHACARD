import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
   if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const b = await req.json();

  // actualizar datos básicos
  const data: any = {};
  if (typeof b.name === "string") data.name = b.name.trim();
  if (typeof b.email === "string") data.email = b.email.toLowerCase().trim();
  if (typeof b.tier === "string") data.tier = b.tier;
  if (typeof b.role === "string") data.role = b.role;
  if (typeof b.status === "string") data.status = b.status;

  // cambiar password (opcional)
  if (typeof b.password === "string" && b.password) {
    data.passwordHash = await bcrypt.hash(b.password, 10);
  }

  // rotar tokenVersion (invalidar QRs previos si lo chequeas en canje)
  if (b.rotateToken) {
    data.tokenVersion = { increment: 1 };
  }

  try {
    await prisma.user.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ ok: false, error: "Email duplicado" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "Error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user ||session.user.role !== "ADMIN"){
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
