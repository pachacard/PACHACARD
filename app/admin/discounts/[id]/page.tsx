import { prisma } from "@/lib/prisma";
import DiscountForm from "../ui";

export const dynamic = "force-dynamic";

export default async function EditDiscountPage({ params }: { params: { id: string } }) {
  const [item, businesses, categories] = await Promise.all([
    prisma.discount.findUnique({
      where: { id: params.id },
      include: { categories: { select: { categoryId: true } } },
    }),
    prisma.business.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      select: { id: true, name: true, icon: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!item) {
    return <div className="text-sm text-slate-600">No encontrado.</div>;
  }

  return <DiscountForm item={item as any} businesses={businesses} categories={categories} />;
}
