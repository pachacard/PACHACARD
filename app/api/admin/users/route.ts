import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const b = await req.json();
  const name = String(b.name || "").trim();
  const email = String(b.email || "").toLowerCase().trim();
  const password = String(b.password || "");
  const tier = String(b.tier || "BASIC");
  const role = String(b.role || "USER");
  const status = String(b.status || "ACTIVE");

  if (!name || !email || !password) {
    return NextResponse.json({ ok: false, error: "Campos requeridos" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    const created = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hash,
        tier,
        role,
        status,
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ ok: false, error: "Email duplicado" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "Error" }, { status: 500 });
  }
}
