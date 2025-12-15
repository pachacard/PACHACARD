import { getCategoriesWithCounts } from "@/lib/db";
import { CategoryCard } from "@/components/pachacard";

export const metadata = { title: "Categorías | PACHACARD" };

export default async function CategoriesPage() {
  const categories = await getCategoriesWithCounts();

  return (
    <main className="container-app py-6 md:py-10">
      <h1 className="text-2xl md:text-3xl font-semibold mb-4">Categorías</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((c: any) => (
          <CategoryCard key={c.id} c={c} />
        ))}
      </div>
    </main>
  );
}
