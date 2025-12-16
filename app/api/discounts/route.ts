// app/api/discounts/route.ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/discounts
 *
 * Modos:
 * 1) Público (sin mine=true):
 *    - Devuelve todos los descuentos (sin filtros de estado/vigencia/tier)
 *    - Útil para admin o debugging, pero ojo si esto lo consume el portal de usuario:
 *      podrías estar exponiendo DRAFT/ARCHIVED.
 *
 * 2) Modo "mine" (?mine=true):
 *    - Requiere sesión
 *    - Trae descuentos vigentes y publicados para el tier del usuario
 *
 * Reglas en mine=true:
 * - status = PUBLISHED
 * - startAt <= now <= endAt
 * - Aplica tier con flags tierBasic/tierNormal/tierPremium
 *
 * Nota importante:
 * - La condición OR actual está escrita como:
 *   { tierBasic: tier === "BASIC" }, etc.
 *   Eso funciona, pero es menos directo que:
 *   tier === "BASIC" ? { tierBasic: true } : ...
 *   (No está mal, solo es un estilo distinto).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mine = url.searchParams.get("mine") === "true";

  // Modo: descuentos visibles para el usuario logueado
  if (mine) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ ok: false, items: [] });

    // Leemos tier desde BD por si cambió y el token quedó desactualizado
    const me = await prisma.user.findUnique({ where: { id: String(session.user.id) } });
    const tier = me?.tier ?? "BASIC";
    const now = new Date();

    const items = await prisma.discount.findMany({
      where: {
        status: "PUBLISHED",
        startAt: { lte: now },
        endAt: { gte: now },

        // Flags de tier: solo uno debería estar activo por tu regla de negocio
        OR: [
          { tierBasic: tier === "BASIC" },
          { tierNormal: tier === "NORMAL" },
          { tierPremium: tier === "PREMIUM" },
        ],
      },
      include: { business: true },
      orderBy: { startAt: "asc" },
    });

    return NextResponse.json({ ok: true, items });
  }

  // Modo: listado general (sin restricciones)
  // Si este endpoint es público de verdad, considera filtrar por status/vigencia para no exponer borradores.
  const items = await prisma.discount.findMany({
    include: { business: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, items });
}
