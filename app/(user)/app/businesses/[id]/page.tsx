//app\(user)\app\businesses\[id]\page.tsx

import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DiscountCard from "@/app/_components/DiscountCard";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

// helpers locales (mismo criterio que en lib/db)
type Tier = "BASIC" | "NORMAL" | "PREMIUM";
function tierWhere(tier?: Tier) {
  if (!tier) return {};
  if (tier === "BASIC") return { tierBasic: true };
  if (tier === "NORMAL") return { tierNormal: true };
  return { tierPremium: true };
}
function publishedNowWhere() {
  const now = new Date();
  return {
    status: "PUBLISHED" as const,
    startAt: { lte: now },
    endAt: { gte: now },
  };
}

export default async function BusinessDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) return notFound();

  // tier del usuario
  const me = await prisma.user.findUnique({
    where: { id: String(session.user.id) },
    select: { tier: true },
  });
  const tier = (me?.tier as Tier) ?? undefined;

  // negocio
  const business = await prisma.business.findUnique({
    where: { id: params.id },
    include: {
      categories: { include: { category: true } }, // categorías del negocio
    },
  });
  if (!business) return notFound();

  // descuentos visibles de este negocio según tier
  const discounts = await prisma.discount.findMany({
    where: {
      businessId: business.id,
      ...publishedNowWhere(),
      ...tierWhere(tier),
    },
    include: {
      business: true,
      categories: { include: { category: true } },
    },
    orderBy: { startAt: "asc" },
  });

  const hero = business.imageUrl || "/brand/business-fallback.png";
  const isExternal = /^https?:\/\//i.test(hero);

  return (
    <div className="container-app py-6 md:py-8 space-y-6">
      {/* Hero negocio */}
      <div className="card overflow-hidden p-0">
        <div className="relative h-52 md:h-64 w-full bg-white border-b">
          {hero ? (
            isExternal ? (
              <img src={hero} alt={business.name} className="h-full w-full object-contain p-3" />
            ) : (
              // next/image también es válido si prefieres
              // <Image src={hero} alt={business.name} fill className="object-contain p-3" />
              <img src={hero} alt={business.name} className="h-full w-full object-contain p-3" />
            )
          ) : (
            <div className="grid h-full w-full place-content-center text-slate-400">Sin imagen</div>
          )}
        </div>

        <div className="card-body">
          <h1 className="text-2xl font-semibold">{business.name}</h1>
          {business.address && <p className="text-sm text-slate-600">{business.address}</p>}

          {/* chips de categorías del negocio */}
          {business.categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {business.categories.map((bc) => (
                <span
                  key={bc.categoryId}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700"
                >
                  {bc.category.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Descuentos del negocio */}
      <div>
        <h2 className="text-xl font-semibold">Descuentos</h2>
        {discounts.length === 0 ? (
          <div className="mt-3 text-sm text-slate-500">No hay descuentos activos para este negocio.</div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {discounts.map((d) => (
              <DiscountCard key={d.id} discount={d as any} />
            ))}
          </div>
        )}
      </div>

      <div>
        <a href="/app/businesses" className="text-sm text-slate-600 hover:underline">
          ← Volver a negocios
        </a>
      </div>
    </div>
  );
}
