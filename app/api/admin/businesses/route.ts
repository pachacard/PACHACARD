// app/api/admin/businesses/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Convierte a string trimmed o null.
 * Útil para inputs de formulario donde el usuario deja el campo vacío.
 */
function toNull(v: any) {
  const s = (v ?? "").toString().trim();
  return s ? s : null;
}

/**
 * Normaliza una URL para permitir solo:
 * - http://
 * - https://
 * - data:   (caso especial si subes imágenes como data URL)
 *
 * Si el valor no cumple, retorna null para no guardar basura/inseguro.
 *
 * Nota:
 * - Permitir data: puede ser pesado (strings enormes). Si ya usas Cloudinary/S3,
 *   podrías restringirlo solo a http/https.
 */
function normUrl(u: any) {
  const s = (u ?? "").toString().trim();
  if (!s) return null;

  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:")) {
    return s;
  }
  return null;
}

/**
 * POST /api/admin/businesses
 * Crea un negocio afiliado.
 *
 * Permisos:
 * - Solo ADMIN
 *
 * Validaciones:
 * - code y name son requeridos
 * - imageUrl se normaliza para aceptar solo URLs válidas
 * - googleMapsUrl se guarda como string o null
 *
 * Nota:
 * - Este endpoint no gestiona categorías del negocio directamente;
 *   esas categorías se pueden asignar en otras rutas o se aseguran al crear/editar descuentos.
 */
export async function POST(req: Request) {
  const session = await auth();

  // Compatibilidad defensiva: si por alguna razón el shape cambiara, intenta ambos caminos
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
      imageUrl: normUrl(b.imageUrl ?? b.logoUrl ?? b.image ?? b.images),
      googleMapsUrl: toNull(b.googleMapsUrl),
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
