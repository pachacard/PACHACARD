import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Business } from "@prisma/client";
import { MapPin, Plus, Store } from "lucide-react";

export const dynamic = "force-dynamic";

function translateStatus(status: Business["status"]) {
  return status === "ACTIVE" ? "Activo" : "Inactivo";
}

export default async function Page() {
  const items: Business[] = await prisma.business.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="admin-shell">
      <div className="container-app space-y-6 py-6 md:py-8">
        <section className="admin-panel">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="admin-kicker">Modulo</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Negocios afiliados
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Administra la informacion visible de cada negocio y manten ordenado el
                directorio comercial.
              </p>
            </div>
            <Link className="btn btn-primary gap-2" href="/admin/businesses/new">
              <Plus className="h-4 w-4" />
              Nuevo negocio
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((b) => (
            <Link key={b.id} className="admin-list-card" href={`/admin/businesses/${b.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="admin-icon-badge">
                  <Store className="h-5 w-5" />
                </div>
                <span className="admin-chip">{translateStatus(b.status)}</span>
              </div>

              <div className="mt-5">
                <div className="text-lg font-semibold text-slate-950">{b.name}</div>
                <div className="mt-1 text-sm text-slate-500">Codigo: {b.code}</div>
              </div>

              <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
                <MapPin className="h-4 w-4" />
                <span className="line-clamp-1">{b.address || "Sin direccion registrada"}</span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
