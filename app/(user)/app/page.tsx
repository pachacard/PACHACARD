// app/(user)/app/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  getCategoriesWithCountsForUser,
  getDiscountsByCategorySlugForUser,
} from "@/lib/db";

import CategoryPills from "@/app/_components/CategoryPills";
import DiscountCard from "@/app/_components/DiscountCard";
import BottomNav from "@/app/_components/BottomNav";

export const dynamic = "force-dynamic";

type Tier = "BASIC" | "NORMAL" | "PREMIUM";
type Props = { searchParams?: { cat?: string; q?: string } };

/** Resuelve el Tier con buen fallback (session -> id -> email) */
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

export default async function Page({ searchParams }: Props) {
  const session = await auth();

  // ⛔️ Si es ADMIN, no debe ver /app → envíalo a /admin
  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  if (!session?.user) {
    return (
      <div className="container-app py-10 text-sm text-slate-600">
        Inicia sesión para ver tus descuentos.
      </div>
    );
  }

  const tier = await resolveTier(session);
  const currentCat = searchParams?.cat || undefined;
  const query = searchParams?.q || undefined;

  // 👉 Obtenemos el id real del usuario para poder contar sus canjes
  let userId: string | null = null;
  if (session.user.email) {
    const me = await prisma.user.findUnique({
      where: { email: String(session.user.email).toLowerCase() },
      select: { id: true },
    });
    if (me) userId = me.id;
  }

  // Categorías + descuentos visibles para el tier
  const [cats, discountsRaw] = await Promise.all([
    getCategoriesWithCountsForUser(tier),
    getDiscountsByCategorySlugForUser(currentCat, tier),
  ]);

  // Base: guardamos índice original para mantener el orden backend como fallback
  const baseDiscounts = (discountsRaw as any[]).map((d, index) => ({
    ...d,
    _idx: index,
  }));

  // 👉 Enriquecemos los descuentos con los canjes de ESTE usuario
  let discountsWithUsage: any[] = baseDiscounts;

  if (userId && baseDiscounts.length > 0) {
    const ids = baseDiscounts.map((d: any) => d.id as string);

    const usageRows = await prisma.redemption.groupBy({
      by: ["discountId"],
      where: {
        userId,
        discountId: { in: ids },
      },
      _count: { _all: true },
    });

    const usageMap = new Map<string, number>(
      usageRows.map((row) => [row.discountId, row._count._all])
    );

    discountsWithUsage = baseDiscounts.map((d: any) => ({
      ...d,
      usedByUser: usageMap.get(d.id) ?? 0,
    }));
  }

  // Filtro por búsqueda
  const filtered = filterByQuery(discountsWithUsage, query);

  // 👉 Orden:
  //    1. Disponibles primero, agotados/límite usado al final.
  //    2. Entre disponibles, por fecha de expiración (endAt más cercana primero).
  //    3. Fallback: índice original del backend.
  const discounts = filtered.sort((a: any, b: any) => {
    const limitPerUserA = a.limitPerUser ?? null;
    const usedByUserA = a.usedByUser ?? 0;
    const userLimitUsedA =
      limitPerUserA != null && usedByUserA >= limitPerUserA;
    const soldOutA =
      a.limitTotal && (a.usedTotal ?? 0) >= (a.limitTotal ?? 0);
    const isOutA = !!(userLimitUsedA || soldOutA);

    const limitPerUserB = b.limitPerUser ?? null;
    const usedByUserB = b.usedByUser ?? 0;
    const userLimitUsedB =
      limitPerUserB != null && usedByUserB >= limitPerUserB;
    const soldOutB =
      b.limitTotal && (b.usedTotal ?? 0) >= (b.limitTotal ?? 0);
    const isOutB = !!(userLimitUsedB || soldOutB);

    // Primero grupo: disponibles vs agotados
    if (isOutA !== isOutB) {
      return isOutA ? 1 : -1; // los agotados al final
    }

    // Ambos del mismo grupo
    // Si son disponibles, ordenar por fecha de expiración
    if (!isOutA) {
      const ea = a.endAt ? new Date(a.endAt).getTime() : Infinity;
      const eb = b.endAt ? new Date(b.endAt).getTime() : Infinity;
      if (ea !== eb) return ea - eb;
    }

    // Fallback: orden original
    return (a._idx ?? 0) - (b._idx ?? 0);
  });

  return (
    <>
      <div className="container-app py-6 md:py-8">
        <header className="mb-4">
          <h1 className="text-xl md:text-2xl font-semibold">Mis Descuentos</h1>
          <p className="text-sm text-slate-600">
            Explora beneficios disponibles para tu PACHACARD.
          </p>
        </header>

        <CategoryPills
          categories={cats}
          currentSlug={currentCat}
          baseHref="/app"
          showAllPill
          allIcon="/icons/cats/todas.png"
        />

        {discounts.length === 0 ? (
          <EmptyState hasQuery={!!query} />
        ) : (
          <section
            aria-label="Listado de descuentos"
            className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {discounts.map((d: any) => (
              <div key={d.id} className="mx-auto w-full max-w-sm sm:max-w-none">
                <DiscountCard discount={d} />
              </div>
            ))}
          </section>
        )}

        <div className="h-20 md:hidden" />
      </div>

      <BottomNav />
    </>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="mx-auto mt-8 max-w-md rounded-xl border bg-white p-8 text-center">
      <p className="font-semibold">
        {hasQuery
          ? "No encontramos resultados"
          : "No hay descuentos en esta categoría"}
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
