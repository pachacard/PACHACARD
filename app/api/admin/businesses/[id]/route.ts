// app/api/admin/businesses/[id]/route.ts
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
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:")) {
    return s;
  }
  return null;
}

/**
 * PUT /api/admin/businesses/:id
 * Actualiza un negocio afiliado.
 *
 * Permisos:
 * - Solo ADMIN
 *
 * Diseño:
 * - Se construye "data" con campos opcionales.
 * - Luego se eliminan keys con undefined para no sobreescribir campos no enviados.
 *
 * Normalizaciones:
 * - imageUrl se valida para permitir solo http/https/data
 * - googleMapsUrl se guarda como string o null
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const role = (session as any)?.user?.role ?? (session as any)?.role ?? "USER";
  if (role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 403 });
  }

  try {
    const b = await req.json();

    const data: any = {
      code: toNull(b.code),
      name: toNull(b.name),
      ruc: toNull(b.ruc) ?? "",
      address: toNull(b.address) ?? "",
      contact: toNull(b.contact) ?? "",
      status: toNull(b.status) ?? "ACTIVE",
      imageUrl: normUrl(b.imageUrl ?? b.logoUrl ?? b.image ?? b.images),
      googleMapsUrl: toNull(b.googleMapsUrl),
    };

    // Elimina undefined para no tocar campos omitidos por el frontend
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    await prisma.business.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PUT /admin/businesses/[id] error:", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}
