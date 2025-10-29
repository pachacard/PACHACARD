// app/api/admin/businesses/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function toNull(v: any) {
  const s = (v ?? "").toString().trim();
  return s ? s : null;
}
function normUrl(u: any) {
  const s = (u ?? "").toString().trim();
  if (!s) return null;
  // Permitimos http/https o data: (útil si subes a Cloudinary y recibes base64)
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:")) return s;
  return null;
}

export async function POST(req: Request) {
  // Solo ADMIN
  const session = await auth();
  const role = (session as any)?.user?.role ?? (session as any)?.role ?? "USER";
  if (role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 403 });
  }

  try {
    const b = await req.json();

    const data = {
      code: toNull(b.code)!,
      name: toNull(b.name)!,
      ruc: toNull(b.ruc) ?? "",
      address: toNull(b.address) ?? "",
      contact: toNull(b.contact) ?? "",
      status: toNull(b.status) ?? "ACTIVE",
      // clave: aceptar URL remota
      imageUrl: normUrl(b.imageUrl ?? b.logoUrl ?? b.image ?? b.images),
    };

    if (!data.code || !data.name) {
      return NextResponse.json(
        { ok: false, message: "Código y nombre son requeridos" },
        { status: 400 }
      );
    }

    const created = await prisma.business.create({ data });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    console.error("POST /admin/businesses error:", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}
