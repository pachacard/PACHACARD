// app/(user)/app/businesses/page.tsx
import { getBusinesses, getCategoriesWithCounts } from "@/lib/db";
import CategoryPills from "@/app/_components/CategoryPills";
import BusinessCard from "@/app/_components/BusinessCard";

export const dynamic = "force-dynamic";

type Props = { searchParams?: { cat?: string } };

export default async function NegociosPage({ searchParams }: Props) {
  const current = searchParams?.cat || undefined;

  const [cats, businesses] = await Promise.all([
    getCategoriesWithCounts(),
    getBusinesses({ categorySlug: current }),
  ]);

  const total = businesses.length;

  return (
    <div className="container-app py-6 md:py-8 space-y-4">
      {/* Encabezado */}
      <header className="space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">
            Negocios afiliados
          </h1>
          <p className="text-sm text-slate-600">
            {total === 0
              ? "Aún no hay negocios con descuentos para tu nivel."
              : `${total} negocio${total !== 1 ? "s" : ""} con descuentos para tu nivel.`}
          </p>
        </div>

        <CategoryPills
          categories={cats}
          currentSlug={current}
          baseHref="/app/businesses"
          showAllPill
        />
      </header>

      {/* Listado de negocios */}
      {businesses.length === 0 ? (
        <div className="card text-sm text-slate-600">
          No hay negocios para esta categoría.
        </div>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1 text-sm">
            <h2 className="font-medium text-slate-900">Negocios</h2>
            <span className="text-xs text-slate-500">
              {businesses.length} negocio
              {businesses.length !== 1 ? "s" : ""} afiliado
              {businesses.length !== 1 ? "s" : ""}.
            </span>
          </div>

          <div
            aria-label="Listado de negocios afiliados"
            className="
              mt-1 space-y-4
              md:space-y-0 md:grid md:grid-cols-2 md:gap-4
              xl:grid-cols-3
            "
          >
            {businesses.map((b) => (
              <div
                key={b.id}
                className="mx-auto w-full max-w-md md:max-w-none"
              >
                <BusinessCard business={b as any} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
