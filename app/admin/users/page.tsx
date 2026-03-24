import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Plus, Search, SlidersHorizontal, Users } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function one(v?: string | string[]) {
  return Array.isArray(v) ? v[0] : v;
}

function translateRole(role: string) {
  return role === "ADMIN" ? "Administrador" : "Usuario";
}

function translateStatus(status: string) {
  return status === "ACTIVE" ? "Activo" : "Inactivo";
}

function translateTier(tier: string) {
  switch (tier) {
    case "PREMIUM":
      return "Premium";
    case "NORMAL":
      return "Normal";
    default:
      return "Basico";
  }
}

export default async function AdminUsersPage({ searchParams }: SearchParams) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/app");

  const q = (one(searchParams?.q) || "").trim();
  const tier = one(searchParams?.tier) || "";
  const status = one(searchParams?.status) || "";
  const role = one(searchParams?.role) || "";

  const where: any = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (tier) where.tier = tier;
  if (status) where.status = status;
  if (role) where.role = role;

  const items = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tier: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <div className="admin-shell">
      <div className="container-app space-y-6 py-6 md:py-8">
        <section className="admin-panel">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="admin-kicker">Modulo</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Usuarios registrados
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Filtra por nivel, rol o estado y gestiona accesos del panel y del portal.
              </p>
            </div>
            <Link className="btn btn-primary gap-2" href="/admin/users/new">
              <Plus className="h-4 w-4" />
              Nuevo usuario
            </Link>
          </div>
        </section>

        <section className="admin-panel">
          <form className="grid gap-4 md:grid-cols-5" method="get">
            <div className="md:col-span-2">
              <label className="label">Buscar</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="q"
                  className="input pl-10"
                  placeholder="Nombre o correo"
                  defaultValue={q}
                />
              </div>
            </div>
            <div>
              <label className="label">Nivel</label>
              <select name="tier" className="select" defaultValue={tier}>
                <option value="">Todos</option>
                <option value="BASIC">Basico</option>
                <option value="NORMAL">Normal</option>
                <option value="PREMIUM">Premium</option>
              </select>
            </div>
            <div>
              <label className="label">Estado</label>
              <select name="status" className="select" defaultValue={status}>
                <option value="">Todos</option>
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
              </select>
            </div>
            <div>
              <label className="label">Rol</label>
              <select name="role" className="select" defaultValue={role}>
                <option value="">Todos</option>
                <option value="USER">Usuario</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <div className="md:col-span-5 flex flex-wrap gap-3">
              <button className="btn btn-primary gap-2" type="submit">
                <SlidersHorizontal className="h-4 w-4" />
                Aplicar filtros
              </button>
            </div>
          </form>
        </section>

        <section className="grid gap-3">
          {items.map((u) => (
            <Link key={u.id} href={`/admin/users/${u.id}`} className="admin-table-row">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="admin-icon-badge">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-slate-950">{u.name}</div>
                    <div className="text-sm text-slate-500">{u.email}</div>
                    <div className="mt-2 text-xs text-slate-500">
                      Alta: {new Date(u.createdAt).toLocaleString("es-PE")}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="admin-chip">{translateTier(u.tier)}</span>
                  <span className="admin-chip">{translateRole(u.role)}</span>
                  <span className="admin-chip">{translateStatus(u.status)}</span>
                </div>
              </div>
            </Link>
          ))}
          {items.length === 0 && (
            <div className="admin-panel text-sm text-slate-500">No se encontraron usuarios.</div>
          )}
        </section>
      </div>
    </div>
  );
}
