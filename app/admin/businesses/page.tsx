
// app/admin/businesses/page.tsx
import { prisma } from "@/lib/prisma";
import type { Business } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const items: Business[] = await prisma.business.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Negocios</h2>
        <a className="btn btn-primary" href="/admin/businesses/new">
          Nuevo
        </a>
      </div>

      <div className="grid gap-3">
        {items.map((b) => (
          <a
            key={b.id}
            className="card hover:shadow-lg transition"
            href={`/admin/businesses/${b.id}`}
          >
            <div className="card-body flex items-center justify-between">
              <div>
                <div className="font-semibold">{b.name}</div>
                <div className="text-xs text-slate-500">{b.code}</div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
