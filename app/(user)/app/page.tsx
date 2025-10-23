// app/(user)/app/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  // 1) directo desde la sesión
  const fromSession = session?.user?.tier as Tier | undefined;
  if (fromSession) return fromSession;

  // 2) buscar por id
  const idFromSession = session?.user?.id ?? null;
  if (idFromSession) {
    const me = await prisma.user.findUnique({
      where: { id: String(idFromSession) },
      select: { tier: true },
    });
    if (me?.tier) return me.tier as Tier;
  }

  // 3) buscar por email
  if (session?.user?.email) {
    const meByEmail = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { tier: true },
    });
    if (meByEmail?.tier) return meByEmail.tier as Tier;
  }

  return undefined;
}

/** Filtro simple en memoria (sin tocar tus helpers) */
function filterByQuery(discounts: any[], q?: string) {
  if (!q) return discounts;
  const needle = q.trim().toLowerCase();
  if (!needle) return discounts;

  return discounts.filter((d) => {
    const title = String(d?.title ?? "").toLowerCase();
    const desc  = String(d?.description ?? "").toLowerCase();
    const biz   = String(d?.business?.name ?? "").toLowerCase();
    const code  = String(d?.code ?? "").toLowerCase();
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

  if (!session?.user) {
    return (
      <div className="container-app py-10 text-sm text-slate-600">
        Inicia sesión para ver tus descuentos.
      </div>
    );
  }

  // 1) tier del usuario
  const tier = await resolveTier(session);

  // 2) filtros desde URL
  const currentCat = searchParams?.cat || undefined;
  const query = searchParams?.q || undefined;

  // 3) fetch paralelo: categorías + descuentos (según tier + categoría)
  const [cats, discountsRaw] = await Promise.all([
    getCategoriesWithCountsForUser(tier),
    getDiscountsByCategorySlugForUser(currentCat, tier),
  ]);

  // 4) filtro opcional por ?q= (en memoria)
  const discounts = filterByQuery(discountsRaw, query);

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

        {/* espacio para la BottomNav móvil */}
        <div className="h-20 md:hidden" />
      </div>

      {/* Barra inferior fija (móvil) */}
      <BottomNav />
    </>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="mx-auto mt-8 max-w-md rounded-xl border bg-white p-8 text-center">
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
