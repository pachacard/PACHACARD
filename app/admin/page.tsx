import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import type { ComponentType } from "react";
import {
  ArrowRight,
  Gift,
  ShieldCheck,
  Store,
  Ticket,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

const sections = [
  {
    label: "Usuarios",
    href: "/admin/users",
    description: "Gestiona perfiles, niveles y estado de acceso.",
    icon: Users,
  },
  {
    label: "Negocios",
    href: "/admin/businesses",
    description: "Administra comercios aliados y sus datos visibles.",
    icon: Store,
  },
  {
    label: "Descuentos",
    href: "/admin/discounts",
    description: "Publica beneficios y controla su vigencia.",
    icon: Gift,
  },
  {
    label: "Canjes",
    href: "/admin/redemptions",
    description: "Revisa actividad reciente y exporta registros.",
    icon: Ticket,
  },
  {
    label: "Auditoria",
    href: "/admin/audit",
    description: "Consulta eventos clave y trazabilidad del sistema.",
    icon: ShieldCheck,
  },
];

function StatCard({
  label,
  value,
  href,
  description,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  href: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={href} className="group admin-stat-card block">
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </div>
        </div>
        <div className="rounded-2xl bg-[var(--brand)]/8 p-3 text-[var(--brand)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="relative z-10 mt-4 text-sm leading-6 text-slate-600">{description}</p>
      <div className="relative z-10 mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--brand)]">
        Ver modulo
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
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

  const stats = [
    { ...sections[0], value: usersCount },
    { ...sections[1], value: businessesCount },
    { ...sections[2], value: discountsCount },
    { ...sections[3], value: redemptionsCount },
    { ...sections[4], value: auditCount },
  ];

  return (
    <div className="admin-shell">
      <div className="container-app space-y-6 py-6 md:space-y-8 md:py-8">
        <section className="admin-hero">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-white/70">
                Administracion
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Un panel mas claro para operar Pachacard.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 md:text-base">
                Visualiza el estado general, entra rapido a cada modulo y manten una
                administracion mas ordenada sin tocar la experiencia del cliente.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-white/65">
                  Usuarios
                </div>
                <div className="mt-2 text-2xl font-semibold">{usersCount}</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-white/65">
                  Descuentos
                </div>
                <div className="mt-2 text-2xl font-semibold">{discountsCount}</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-white/65">
                  Canjes
                </div>
                <div className="mt-2 text-2xl font-semibold">{redemptionsCount}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {stats.map((item) => (
            <StatCard key={item.href} {...item} />
          ))}
        </section>

        <section className="admin-panel">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Accesos directos</h2>
              <p className="mt-1 text-sm text-slate-600">
                Entra a las secciones clave del panel con una navegacion mas simple.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {sections.map((item) => (
                <Link key={item.href} href={item.href} className="admin-chip">
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
