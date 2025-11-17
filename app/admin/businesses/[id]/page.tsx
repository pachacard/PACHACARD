// app/admin/businesses/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import BusinessForm, { type Biz } from "../ui";

export default async function Page({ params }: { params: { id: string } }) {
  // Traemos únicamente los campos que usa el formulario
  const item = await prisma.business.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      code: true,
      name: true,
      ruc: true,
      address: true,
      contact: true,
      status: true,
      imageUrl: true,
      googleMapsUrl: true, // 👈 NUEVO
    },
  });

  if (!item) return <div>No encontrado</div>;

  // `Biz["id"]` es opcional en el form para poder reutilizarlo en "nuevo".
  // Aquí sí existe y es string, así que el cast es seguro.
  return <BusinessForm item={item as Biz} />;
}
