// app/admin/page.tsx  (Server Component)
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number | string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="
        group block rounded-xl border border-slate-200 bg-white p-4
        shadow-sm hover:shadow-md transition
        w-full min-w-0 overflow-hidden
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/40
      "
    >
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500 group-hover:text-slate-700">
        Ver detalle →
      </div>
    </Link>
  );
}

function ActionChip({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="
        inline-flex items-center justify-center shrink-0
        rounded-lg px-4 py-2
        bg-[var(--brand)] text-white text-sm font-medium
        shadow-sm hover:opacity-95 active:scale-[.99] transition
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/40
      "
    >
      {children}
    </Link>
  );
}

export default async function AdminHome() {
  noStore();

  const [usersCount, businessesCount, discountsCount, redemptionsCount, auditCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.business.count(),
      prisma.discount.count(),
      prisma.redemption.count(),
      prisma.auditLog.count(),
    ]);

  return (
    <main className="min-h-[calc(100vh-56px)] bg-slate-50">
      <div className="container-app mx-auto max-w-6xl px-4 sm:px-6 py-6 md:py-8 overflow-x-hidden">
        <header className="mb-4">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Panel de administración
          </h1>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Usuarios" value={usersCount} href="/admin/users" />
          <StatCard label="Negocios" value={businessesCount} href="/admin/businesses" />
          <StatCard label="Descuentos" value={discountsCount} href="/admin/discounts" />
          <StatCard label="Canjes" value={redemptionsCount} href="/admin/redemptions" />
          <StatCard label="Auditoría" value={auditCount} href="/admin/audit" />
        </section>

        <section className="mt-6 flex flex-wrap gap-3">
          <ActionChip href="/admin/businesses">Negocios</ActionChip>
          <ActionChip href="/admin/discounts">Descuentos</ActionChip>
          <ActionChip href="/admin/redemptions">Redemptions</ActionChip>
          <ActionChip href="/admin/users">Usuarios</ActionChip>
          <ActionChip href="/admin/audit">Auditoría</ActionChip>
        </section>
      </div>
    </main>
  );
}