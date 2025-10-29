import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const b = await req.json();
  const created = await prisma.business.create({
    data: {
      code: b.code,
      name: b.name,
      ruc: b.ruc ?? "",
      address: b.address ?? "",
      contact: b.contact ?? "",
      status: b.status ?? "ACTIVE",
      imageUrl: b.imageUrl ?? "",   
    },
  });
  return NextResponse.json({ ok: true, id: created.id });
}
