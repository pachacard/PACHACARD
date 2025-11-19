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
    <div className="container-app py-6 md:py-8 space-y-5">
      {/* Encabezado tipo “Negocios Afiliados” */}
      <header className="space-y-1">
        <h1 className="text-xl md:text-2xl font-semibold">Negocios afiliados</h1>
        <p className="text-sm text-slate-600">
          {total === 0
            ? "Aún no hay negocios con descuentos activos en esta categoría."
            : total === 1
            ? "1 negocio con descuentos para tu nivel."
            : `${total} negocios con descuentos para tu nivel.`}
        </p>
      </header>

      {/* Filtro de categorías */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700">Categorías</h2>
          <span className="text-xs text-slate-500">
            Filtra por tipo de beneficio
          </span>
        </div>

        <CategoryPills
          categories={cats}
          currentSlug={current}
          baseHref="/app/businesses"
          showAllPill
        />
      </section>

      {/* Listado de negocios */}
      {businesses.length === 0 ? (
        <div className="mt-4 text-sm text-slate-500">
          No hay negocios para esta categoría.
        </div>
      ) : (
        <section
          aria-label="Negocios afiliados"
          className="mt-2 space-y-4"
        >
          {businesses.map((b) => (
            <BusinessCard key={b.id} business={b as any} />
          ))}
        </section>
      )}

      <div className="h-20 md:hidden" />
    </div>
  );
}
