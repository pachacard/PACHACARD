// app/(user)/app/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  getCategoriesWithCountsForUser,
  getDiscountsByCategorySlugForUser,
} from "@/lib/db";

import CategoryPills from "@/components/pachacard/CategoryPills";
import DiscountCard from "@/components/pachacard/DiscountCard";
import BottomNav from "@/components/pachacard/BottomNav";

/**
 * force-dynamic:
 * Esta página depende de datos en tiempo real:
 * - sesión del usuario (tier/rol)
 * - vigencia de descuentos (fecha actual)
 * - canjes del usuario (Redemption)
 *
 * Entonces no conviene cachearla como estática.
 */
export const dynamic = "force-dynamic";

type Tier = "BASIC" | "NORMAL" | "PREMIUM";
type Props = { searchParams?: { cat?: string; q?: string } };

/**
 * Resuelve el tier del usuario con fallback.
 *
 * Orden de prioridad:
 * 1) session.user.tier (lo más rápido)
 * 2) buscar por session.user.id en BD
 * 3) buscar por session.user.email en BD
 *
 * Por qué se hace esto:
 * - A veces el token/sesión puede no tener tier (o estar viejo).
 * - La BD es la fuente de verdad.
 */
async function resolveTier(session: any): Promise<Tier | undefined> {
  const fromSession = session?.user?.tier as Tier | undefined;
  if (fromSession) return fromSession;

  const idFromSession = session?.user?.id ?? null;
  if (idFromSession) {
    const me = await prisma.user.findUnique({
      where: { id: String(idFromSession) },
      select: { tier: true },
    });
    if (me?.tier) return me.tier as Tier;
  }

  if (session?.user?.email) {
    const meByEmail = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { tier: true },
    });
    if (meByEmail?.tier) return meByEmail.tier as Tier;
  }

  return undefined;
}

/**
 * Filtra descuentos por texto libre.
 * Busca coincidencias en:
 * - title
 * - description
 * - business.name
 * - code
 */
function filterByQuery(discounts: any[], q?: string) {
  if (!q) return discounts;
  const needle = q.trim().toLowerCase();
  if (!needle) return discounts;

  return discounts.filter((d) => {
    const title = String(d?.title ?? "").toLowerCase();
    const desc = String(d?.description ?? "").toLowerCase();
    const biz = String(d?.business?.name ?? "").toLowerCase();
    const code = String(d?.code ?? "").toLowerCase();

    return (
      title.includes(needle) ||
      desc.includes(needle) ||
      biz.includes(needle) ||
      code.includes(needle)
    );
  });
}

/**
 * Página principal del portal de contribuyente: /app
 *
 * Funciones principales:
 * - Verificar sesión y rol
 * - Resolver tier
 * - Cargar categorías y descuentos visibles para ese tier
 * - Enriquecer descuentos con "usedByUser" (cuántas veces canjeó el usuario)
 * - Filtrar por categoría (cat) y por búsqueda (q)
 * - Ordenar: disponibles primero, luego agotados, luego por fecha de expiración
 */
export default async function Page({ searchParams }: Props) {
  const session = await auth();

  // Regla: Admin no debería usar portal ciudadano
  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  // Si no hay sesión, mostramos mensaje simple (no rediriges aquí)
  if (!session?.user) {
    return (
      <div className="container-app py-10 text-sm text-slate-600">
        Inicia sesión para ver tus descuentos.
      </div>
    );
  }

  // Tier (según sesión/BD)
  const tier = await resolveTier(session);

  // Filtros del URL
  const currentCat = searchParams?.cat || undefined;
  const query = searchParams?.q || undefined;

  /**
   * Necesitamos el userId real para:
   * - contar los canjes del usuario por descuento (usedByUser)
   *
   * Aquí estás resolviendo por email.
   */
  let userId: string | null = null;
  if (session.user.email) {
    const me = await prisma.user.findUnique({
      where: { email: String(session.user.email).toLowerCase() },
      select: { id: true },
    });
    if (me) userId = me.id;
  }

  /**
   * Carga principal:
   * - Categorías con conteo de descuentos visibles para el tier
   * - Descuentos visibles para el tier + categoría seleccionada
   *
   * Se ejecuta en paralelo con Promise.all para rendimiento.
   */
  const [cats, discountsRaw] = await Promise.all([
    getCategoriesWithCountsForUser(tier),
    getDiscountsByCategorySlugForUser(currentCat, tier),
  ]);

  /**
   * Guardamos un índice original (_idx) para:
   * - tener un orden fallback estable
   * - si hay empates al ordenar, no “salta” el listado raro
   */
  const baseDiscounts = (discountsRaw as any[]).map((d, index) => ({
    ...d,
    _idx: index,
  }));

  /**
   * Enriquecimiento: usedByUser (cuántos canjes tiene el usuario por descuento).
   * Esto sirve para mostrar:
   * - límites por usuario (limitPerUser)
   * - si está “agotado” para esa persona aunque haya stock global
   */
  let discountsWithUsage: any[] = baseDiscounts;

  if (userId && baseDiscounts.length > 0) {
    const ids = baseDiscounts.map((d: any) => d.id as string);

    // GroupBy para contar redemptions por discountId de este usuario
    const usageRows = await prisma.redemption.groupBy({
      by: ["discountId"],
      where: {
        userId,
        discountId: { in: ids },
      },
      _count: { _all: true },
    });

    // Mapa: discountId -> cantidad canjes
    const usageMap = new Map<string, number>(
      usageRows.map((row) => [row.discountId, row._count._all])
    );

    discountsWithUsage = baseDiscounts.map((d: any) => ({
      ...d,
      usedByUser: usageMap.get(d.id) ?? 0,
    }));
  }

  // Filtro por búsqueda (q)
  const filtered = filterByQuery(discountsWithUsage, query);

  /**
   * Orden final:
   * 1) Disponibles primero.
   *    - “Agotado” significa:
   *      a) el usuario ya alcanzó limitPerUser
   *      b) el descuento ya alcanzó limitTotal (stock global)
   * 2) Dentro de disponibles: expiran antes primero (endAt menor)
   * 3) Fallback: _idx (orden original)
   */
  const discounts = filtered.sort((a: any, b: any) => {
    const limitPerUserA = a.limitPerUser ?? null;
    const usedByUserA = a.usedByUser ?? 0;
    const userLimitUsedA = limitPerUserA != null && usedByUserA >= limitPerUserA;
    const soldOutA = a.limitTotal && (a.usedTotal ?? 0) >= (a.limitTotal ?? 0);
    const isOutA = !!(userLimitUsedA || soldOutA);

    const limitPerUserB = b.limitPerUser ?? null;
    const usedByUserB = b.usedByUser ?? 0;
    const userLimitUsedB = limitPerUserB != null && usedByUserB >= limitPerUserB;
    const soldOutB = b.limitTotal && (b.usedTotal ?? 0) >= (b.limitTotal ?? 0);
    const isOutB = !!(userLimitUsedB || soldOutB);

    // Primero disponibles vs agotados
    if (isOutA !== isOutB) {
      return isOutA ? 1 : -1;
    }

    // Si ambos son disponibles, ordenar por fecha de expiración
    if (!isOutA) {
      const ea = a.endAt ? new Date(a.endAt).getTime() : Infinity;
      const eb = b.endAt ? new Date(b.endAt).getTime() : Infinity;
      if (ea !== eb) return ea - eb;
    }

    // Fallback: orden original
    return (a._idx ?? 0) - (b._idx ?? 0);
  });

  /**
   * Datos para el header:
   * - userName: fallback al texto antes del @ si no hay nombre
   * - tierLabel: muestra el tier actual
   */
  const userName =
    (session.user.name as string | undefined) ||
    (session.user.email ? String(session.user.email).split("@")[0] : "ciudadano");

  const tierLabel =
    tier === "PREMIUM"
      ? "PREMIUM"
      : tier === "NORMAL"
      ? "NORMAL"
      : tier === "BASIC"
      ? "BASIC"
      : "—";

  const totalDisponibles = discounts.length;
  const totalCategorias = cats.length;

  return (
    <>
      <div className="container-app py-6 md:py-8 space-y-6">
        {/* Hero superior */}
        <section className="rounded-3xl bg-gradient-to-b from-[#9a1e1e] to-[#7e1515] px-5 py-4 text-white shadow-lg">
          <div className="mb-3 text-xs uppercase tracking-[0.18em] opacity-80">
            MIS DESCUENTOS
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm opacity-80">Hola, {userName}</p>
              <p className="max-w-xs text-xs text-white/90">
                Explora beneficios disponibles para tu PACHACARD.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 px-3 py-2 text-right text-xs border border-white/15">
              <div className="opacity-80 text-[10px]">Tu nivel</div>
              <div className="font-semibold text-sm">{tierLabel}</div>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl bg-white/10 px-3 py-3 border border-white/15">
              <div className="opacity-90 mb-1">Disponibles</div>
              <div className="text-lg font-semibold">{totalDisponibles}</div>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-3 border border-white/15">
              <div className="opacity-90 mb-1">Categorías</div>
              <div className="text-lg font-semibold">{totalCategorias}</div>
            </div>
          </div>
        </section>

        {/* Categorías */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1 text-sm">
            <h2 className="font-medium text-slate-900">Categorías</h2>
            <span className="text-xs text-slate-500">Filtra por tipo de beneficio</span>
          </div>

          <CategoryPills
            categories={cats}
            currentSlug={currentCat}
            baseHref="/app"
            showAllPill
            allIcon="/icons/cats/todas.png"
          />
        </section>

        {/* Listado de descuentos */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1 text-sm">
            <h2 className="font-medium text-slate-900">Descuentos para ti</h2>
            <span className="text-xs text-slate-500">{discounts.length} ofertas</span>
          </div>

          {discounts.length === 0 ? (
            <EmptyState hasQuery={!!query} />
          ) : (
            <div
              aria-label="Listado de descuentos"
              className="
                mt-1
                grid grid-cols-1 gap-4
                md:grid-cols-2
                xl:grid-cols-3
              "
            >
              {discounts.map((d: any) => (
                <div key={d.id} className="w-full">
                  <DiscountCard discount={d} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Espacio para que el BottomNav no tape contenido en móvil */}
        <div className="h-20 md:hidden" />
      </div>

      <BottomNav />
    </>
  );
}

/**
 * Estado vacío:
 * - si hay búsqueda (q), muestra "No encontramos resultados"
 * - si no hay búsqueda, muestra "No hay descuentos en esta categoría"
 */
function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="mx-auto mt-4 max-w-md rounded-xl border bg-white p-8 text-center">
      <p className="font-semibold">
        {hasQuery ? "No encontramos resultados" : "No hay descuentos en esta categoría"}
      </p>

      <p className="mt-1 text-sm text-slate-600">
        {hasQuery
          ? "Prueba con otras palabras clave o limpia la búsqueda."
          : "Explora otra categoría o vuelve más tarde."}
      </p>

      <div className="mt-4 flex items-center justify-center gap-2">
        <a
          href="/app"
          className="inline-flex items-center justify-center rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-700)]"
        >
          Limpiar filtros
        </a>
        <a
          href="/app?cat="
          className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Ver todo
        </a>
      </div>
    </div>
  );
}
