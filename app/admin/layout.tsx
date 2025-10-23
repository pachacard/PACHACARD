// app/admin/layout.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminHeader from "@/app/_components/AdminHeader";
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · PACHACARD" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/app");
  return (
    <>
      <AdminHeader />
      <main className="container-app py-6">{children}</main>
    </>
  );
}
