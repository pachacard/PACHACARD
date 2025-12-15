// app/admin/discounts/new/page.tsx
import { prisma } from "@/lib/prisma";
import DiscountForm from "../ui";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: {
    from?: string;
  };
};

export default async function NewDiscountPage({ searchParams }: Props) {
  const fromId = searchParams?.from;

  const [source, businesses, categories] = await Promise.all([
    fromId
      ? prisma.discount.findUnique({
          where: { id: fromId },
          include: { categories: { select: { categoryId: true } } },
        })
      : Promise.resolve(null),
    prisma.business.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      select: { id: true, name: true, icon: true },
      orderBy: { name: "asc" },
    }),
  ]);

  //  Si venimos con ?from=, prellenamos el form usando ese descuento
  //    pero forzamos: sin id, código vacío y estado DRAFT
  const itemForForm = source
    ? ({
        ...source,
        id: undefined,        // para que DiscountForm lo trate como "nuevo"
        code: "",             // obligas a escribir un código nuevo
        status: "DRAFT",
      } as any)
    : undefined;

  return (
    <DiscountForm
      item={itemForForm}
      businesses={businesses}
      categories={categories}
    />
  );
}
