// app/(user)/app/businesses/[id]/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DiscountCard from "@/app/_components/DiscountCard";
import { MapPin } from "lucide-react";

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

  // negocio + categorías
  const business = await prisma.business.findUnique({
    where: { id: params.id },
    include: {
      categories: { include: { category: true } },
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

  const categoryLabels =
    business.categories?.map((bc) => bc.category.name) ?? [];

  return (
    <div className="container-app py-6 md:py-8 space-y-6">
      {/* Hero del negocio + info básica */}
      <section className="card overflow-hidden p-0">
        <div className="relative h-52 md:h-64 w-full bg-slate-100">
          {hero ? (
            isExternal ? (
              <img
                src={hero}
                alt={business.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <img
                src={hero}
                alt={business.name}
                className="h-full w-full object-cover"
              />
            )
          ) : (
            <div className="grid h-full w-full place-content-center text-slate-400">
              Sin imagen
            </div>
          )}

          {/* Degradado para texto */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />

          {/* Nombre + categorías sobre la imagen */}
          <div className="absolute bottom-4 left-4 right-4 space-y-2">
            {categoryLabels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categoryLabels.map((name) => (
                  <span
                    key={name}
                    className="rounded-full bg-black/45 px-3 py-1 text-xs text-white border border-white/20"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-xl md:text-2xl font-semibold text-white drop-shadow">
              {business.name}
            </h1>
          </div>
        </div>

        <div className="card-body space-y-4">
          {/* Bloque de ubicación */}
          {(business.address || business.googleMapsUrl) && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-[var(--brand,#7e1515)]/10 p-2">
                  <MapPin className="h-4 w-4 text-[var(--brand,#7e1515)]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500">
                    Ubicación del negocio
                  </p>
                  <p className="text-sm text-slate-800">
                    {business.address ?? "Dirección no registrada"}
                  </p>
                </div>
              </div>

              {business.googleMapsUrl && (
                <a
                  href={business.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  <MapPin className="h-4 w-4" />
                  Abrir en Google Maps
                </a>
              )}
            </div>
          )}

          {/* Chips de categorías como resumen textual abajo (opcional) */}
          {categoryLabels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categoryLabels.map((name) => (
                <span
                  key={name + "-chip"}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Descuentos del negocio */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg md:text-xl font-semibold">
            Descuentos disponibles
          </h2>
          <span className="text-xs text-slate-500">
            {discounts.length} activo{discounts.length === 1 ? "" : "s"}
          </span>
        </div>

        {discounts.length === 0 ? (
          <div className="mx-auto max-w-md rounded-xl border bg-white p-6 text-center text-sm text-slate-600">
            Este negocio aún no tiene descuentos activos para tu nivel.
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {discounts.map((d) => (
              <div key={d.id} className="w-full max-w-sm sm:max-w-none mx-auto">
                <DiscountCard discount={d as any} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Volver */}
      <div>
        <a
          href="/app/businesses"
          className="text-sm text-slate-600 hover:underline"
        >
          ← Volver a negocios
        </a>
      </div>
    </div>
  );
}
