// app/api/admin/discounts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

/**
 * Helpers de normalización para inputs de formulario.
 */
function toBool(v: any) {
  return v === true || v === "true" || v === 1 || v === "1";
}
function toNumOrNull(v: any) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * POST /api/admin/discounts
 * Crea un descuento.
 *
 * Permisos:
 * - Solo ADMIN (session.user.role)
 *
 * Validaciones:
 * - code requerido, uppercase
 * - title requerido
 * - status válido (DRAFT|PUBLISHED|ARCHIVED)
 * - exactamente un tier habilitado (regla de negocio)
 * - startAt/endAt válidos y startAt <= endAt
 * - businessId, si viene, debe existir
 *
 * Post-procesos:
 * - crea relaciones en DiscountCategory (tabla puente)
 * - si está vinculado a un negocio, asegura categorías en BusinessCategory
 *
 * Errores:
 * - P2002 => code duplicado (409)
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 403 });
  }

  const b = await req.json();

  const code = String(b.code ?? "").trim().toUpperCase();
  if (!code) return NextResponse.json({ ok: false, message: "El código es requerido." }, { status: 400 });

  const title = String(b.title ?? "").trim();
  if (!title) return NextResponse.json({ ok: false, message: "El título es requerido." }, { status: 400 });

  const status = String(b.status ?? "DRAFT").trim().toUpperCase();
  const allowedStatus = new Set(["DRAFT", "PUBLISHED", "ARCHIVED"]);
  if (!allowedStatus.has(status)) {
    return NextResponse.json({ ok: false, message: "Estado inválido." }, { status: 400 });
  }

  // Exclusividad de tier (coherente con UI y con filtros de portal)
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

  const images: string | null = (b.images ?? b.imageUrl ?? "").toString().trim() || null;

  // Conexión opcional a Business
  let businessConnect: Prisma.DiscountCreateInput["business"] | undefined;
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
    businessConnect = { connect: { id: biz.id } };
  }

  const categoryIds: string[] = Array.isArray(b.categoryIds) ? b.categoryIds.map(String) : [];

  try {
    const created = await prisma.$transaction(async (tx) => {
      const disc = await tx.discount.create({
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
          ...(businessConnect ? { business: businessConnect } : {}),
        },
      });

      // Categorías del descuento
      if (categoryIds.length) {
        await tx.discountCategory.createMany({
          data: categoryIds.map((categoryId) => ({ discountId: disc.id, categoryId })),
        });

        // Asegurar categorías del negocio vinculado (si aplica)
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

      return disc;
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    if ((e as Prisma.PrismaClientKnownRequestError)?.code === "P2002") {
      return NextResponse.json({ ok: false, message: "El código ya existe." }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}
