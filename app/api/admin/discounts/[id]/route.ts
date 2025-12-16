// app/api/admin/discounts/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

/**
 * Normaliza valores que pueden venir como boolean/string/number desde formularios.
 *
 * Casos típicos:
 * - checkbox en frontend puede mandar true/false
 * - algunos forms mandan "true"/"false"
 * - o valores tipo 1/"1"
 */
function toBool(v: any) {
  return v === true || v === "true" || v === 1 || v === "1";
}

/**
 * Convierte un valor a número o null.
 *
 * Uso:
 * - límites opcionales (limitPerUser, limitTotal)
 * - si el usuario deja en blanco, se guarda null
 */
function toNumOrNull(v: any) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * PUT /api/admin/discounts/:id
 * Actualiza un descuento existente.
 *
 * Permisos:
 * - Solo usuarios con session.user.role === "ADMIN"
 *
 * Validaciones principales:
 * - code requerido y en uppercase
 * - title requerido
 * - status válido: DRAFT | PUBLISHED | ARCHIVED
 * - exactamente un tier habilitado (regla de negocio: exclusividad por tier)
 * - startAt y endAt válidos y startAt <= endAt
 * - businessId (si viene) debe existir
 *
 * Consistencia de categorías:
 * - Se refresca completamente discountCategory (deleteMany + createMany).
 * - Si el descuento queda vinculado a un negocio, se asegura que el negocio
 *   también tenga esas categorías (upsert en businessCategory).
 *
 * Manejo de errores:
 * - P2002 => conflicto de unique (code duplicado)
 * - Otros => 500
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  // Autorización por rol (la fuente es la sesión de NextAuth)
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 403 });
  }

  // Validar existencia del descuento
  const existing = await prisma.discount.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "No encontrado" }, { status: 404 });
  }

  const b = await req.json();

  // code: requerido y normalizado
  const code = String(b.code ?? "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ ok: false, message: "El código es requerido." }, { status: 400 });
  }

  // title: requerido
  const title = String(b.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ ok: false, message: "El título es requerido." }, { status: 400 });
  }

  // status: validación contra set permitido
  const status = String(b.status ?? "DRAFT").trim().toUpperCase();
  const allowedStatus = new Set(["DRAFT", "PUBLISHED", "ARCHIVED"]);
  if (!allowedStatus.has(status)) {
    return NextResponse.json({ ok: false, message: "Estado inválido." }, { status: 400 });
  }

  // Regla de negocio: exactamente un tier debe estar activo.
  // Esto evita descuentos ambiguos y se alinea al filtro notMixedTier del portal.
  const tb = toBool(b.tierBasic);
  const tn = toBool(b.tierNormal);
  const tp = toBool(b.tierPremium);
  const onCount = (tb ? 1 : 0) + (tn ? 1 : 0) + (tp ? 1 : 0);
  if (onCount !== 1) {
    return NextResponse.json(
      { ok: false, message: "Debes seleccionar exactamente un nivel (BÁSICO, NORMAL o PREMIUM)." },
      { status: 400 }
    );
  }

  // Fechas: deben parsear bien y estar en orden
  const startAt = new Date(b.startAt);
  const endAt = new Date(b.endAt);
  if (Number.isNaN(+startAt) || Number.isNaN(+endAt)) {
    return NextResponse.json({ ok: false, message: "Fechas inválidas." }, { status: 400 });
  }
  if (startAt > endAt) {
    return NextResponse.json(
      { ok: false, message: "La fecha de inicio no puede ser mayor que la de fin." },
      { status: 400 }
    );
  }

  // Acepta b.images o b.imageUrl (compatibilidad con formularios distintos)
  const images: string | null = (b.images ?? b.imageUrl ?? "").toString().trim() || null;

  /**
   * Manejo de relación con Business:
   * - Si b.businessId viene con valor, se conecta (connect)
   * - Si viene como "" o null, se desconecta (disconnect)
   *
   * Nota:
   * - Guardamos businessId local para luego asegurar categorías del negocio.
   */
  let businessNested: Prisma.DiscountUpdateInput["business"] | undefined;
  let businessId: string | null = null;

  if (b.businessId) {
    const biz = await prisma.business.findUnique({
      where: { id: String(b.businessId) },
      select: { id: true },
    });

    if (!biz) {
      return NextResponse.json(
        { ok: false, message: "El negocio seleccionado no existe." },
        { status: 400 }
      );
    }

    businessId = biz.id;
    businessNested = { connect: { id: biz.id } };
  } else if (b.businessId === "" || b.businessId === null) {
    businessNested = { disconnect: true };
  }

  // Categorías seleccionadas por el admin (ids)
  const categoryIds: string[] = Array.isArray(b.categoryIds) ? b.categoryIds.map(String) : [];

  try {
    await prisma.$transaction(async (tx) => {
      // 1) Actualizar el descuento
      const disc = await tx.discount.update({
        where: { id: params.id },
        data: {
          code,
          title,
          description: String(b.description ?? ""),
          status,
          tierBasic: tb,
          tierNormal: tn,
          tierPremium: tp,
          startAt,
          endAt,
          limitPerUser: toNumOrNull(b.limitPerUser),
          limitTotal: toNumOrNull(b.limitTotal),
          images,
          ...(businessNested ? { business: businessNested } : {}),
        },
      });

      // 2) Refrescar categorías del descuento (reemplazo total)
      await tx.discountCategory.deleteMany({ where: { discountId: disc.id } });

      if (categoryIds.length) {
        await tx.discountCategory.createMany({
          data: categoryIds.map((categoryId) => ({ discountId: disc.id, categoryId })),
        });

        // 3) Asegurar categorías del negocio (si el descuento está vinculado a uno)
        // Esto mantiene coherencia para búsquedas por categorías de negocios.
        if (businessId) {
          for (const categoryId of categoryIds) {
            await tx.businessCategory.upsert({
              where: { businessId_categoryId: { businessId, categoryId } },
              update: {},
              create: { businessId, categoryId },
            });
          }
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // P2002: violación de índice unique (ej: Discount.code duplicado)
    if ((e as Prisma.PrismaClientKnownRequestError)?.code === "P2002") {
      return NextResponse.json({ ok: false, message: "El código ya existe." }, { status: 409 });
    }

    console.error(e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/discounts/:id
 * Elimina un descuento.
 *
 * Permisos:
 * - Solo ADMIN
 *
 * Nota:
 * - Si tu esquema tiene relaciones con onDelete Cascade, las tablas puente
 *   (DiscountCategory, Redemption, etc.) se manejarán según tu diseño.
 * - Si no hay cascade, aquí podría fallar por FK; en ese caso, conviene
 *   borrar relaciones primero o "archivar" en vez de eliminar.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 403 });
  }

  try {
    await prisma.discount.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: "No se pudo eliminar" }, { status: 500 });
  }
}
