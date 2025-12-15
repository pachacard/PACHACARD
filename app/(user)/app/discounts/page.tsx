// app/(user)/discounts/page.tsx
export const dynamic = "force-dynamic";

import {
  getCategoriesWithCounts,
  getDiscountsByCategorySlug,
} from "@/lib/db";
import CategoryPills from "@/components/pachacard/CategoryPills";
import DiscountCard from "@/components/pachacard/DiscountCard";

type Props = { searchParams?: { cat?: string } };

export default async function DiscountsPage({ searchParams }: Props) {
  const current = searchParams?.cat;
  const [cats, discounts] = await Promise.all([
    getCategoriesWithCounts(),
    getDiscountsByCategorySlug(current),
  ]);

  return (
    <div className="container-app py-6 md:py-8">
      <CategoryPills
        categories={cats as any}
        currentSlug={current}
        baseHref="/app/discounts"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {discounts.map((d: any) => (
          <DiscountCard key={d.id} discount={d} />
        ))}
      </div>
    </div>
  );
}
