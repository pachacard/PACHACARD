import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Gift, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

function translateStatus(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "Publicado";
    case "ARCHIVED":
      return "Archivado";
    default:
      return "Borrador";
  }
}

export default async function AdminDiscountsList() {
  const items = await prisma.discount.findMany({
    include: { business: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="admin-shell">
      <div className="container-app space-y-6 py-6 md:py-8">
        <section className="admin-panel">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="admin-kicker">Modulo</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Descuentos y beneficios
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Revisa las campañas vigentes, su negocio asociado y el estado de publicacion.
              </p>
            </div>
            <Link className="btn btn-primary gap-2" href="/admin/discounts/new">
              <Plus className="h-4 w-4" />
              Nuevo descuento
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((d) => (
            <Link key={d.id} className="admin-list-card" href={`/admin/discounts/${d.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="admin-icon-badge">
                  <Gift className="h-5 w-5" />
                </div>
                <span className="admin-chip">{translateStatus(d.status)}</span>
              </div>

              <div className="mt-5">
                <div className="text-lg font-semibold text-slate-950">{d.title}</div>
                <div className="mt-1 text-sm text-slate-500">Codigo: {d.code}</div>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {d.business?.name ?? "Sin negocio asignado"}
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
