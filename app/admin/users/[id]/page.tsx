// app/admin/users/[id]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import UserForm from "./ui";

export const dynamic = "force-dynamic";

export default async function UserEditPage({
  params,
}: {
  params: { id: string };
}) {
  // Guard correcto
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/app");

  // Carga del usuario
  const item = await prisma.user.findUnique({
    where: { id: params.id },
  });
  if (!item) notFound();

  return (
    <div className="container-app py-6 max-w-xl">
      <UserForm item={item} />
    </div>
  );
}
