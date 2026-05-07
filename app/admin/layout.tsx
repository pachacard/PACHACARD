// app/admin/layout.tsx
import { redirect } from "next/navigation";
import AdminHeader from "@/components/pachacard/AdminHeader";
import { requireFreshAdmin } from "@/lib/security/admin";
export const dynamic = "force-dynamic";
export const metadata = { title: "Administracion · PACHACARD" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireFreshAdmin();
  if (!admin) redirect("/login");

  return (
    <>
      <AdminHeader />
      <main>{children}</main>
    </>
  );
}
