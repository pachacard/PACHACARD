// app/(user)/app/category/[slug]/page.tsx
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getCategoriesWithCounts, getDiscountsByCategorySlug } from "@/lib/db";
import DiscountCard from "@/components/pachacard/DiscountCard";

type Props = { params: { slug: string } };

/**
 * Se muestra el detalle de una categoría.
 * - Se valida que el slug exista dentro de las categorías disponibles.
 * - Se cargan los descuentos publicados asociados a ese slug.
 */
export default async function CategoryDetailPage({ params }: Props) {
  const [cats, discounts] = await Promise.all([
    getCategoriesWithCounts(),
    getDiscountsByCategorySlug(params.slug),
  ]);

  const current = (cats as any[]).find((c) => c.slug === params.slug);
  if (!current) return notFound();

  return (
    <main className="container-app py-6 md:py-8 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-semibold">
          <span className="mr-2">{current.icon ?? "🏷️"}</span>
          {current.name}
        </h1>

        <a
          href="/app/category"
          className="text-sm text-[var(--brand)] hover:underline"
        >
          Ver categorías
        </a>
      </div>

      {discounts.length === 0 ? (
        <div className="rounded-lg border bg-white p-6 text-slate-600">
          No hay descuentos publicados para esta categoría por ahora.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {discounts.map((d: any) => (
            <DiscountCard key={d.id} discount={d} />
          ))}
        </div>
      )}
    </main>
  );
}
