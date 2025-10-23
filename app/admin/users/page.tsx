// app/admin/users/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Search = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function one(v?: string | string[]) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminUsersPage({ searchParams }: Search) {
  // ✅ Solo ADMIN (usa session.user.role)
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/app");

  // Filtros
  const q = (one(searchParams?.q) || "").trim();
  const tier = one(searchParams?.tier) || "";
  const status = one(searchParams?.status) || "";
  const role = one(searchParams?.role) || "";

  // Where dinámico
  const where: any = {};
  if (q) {
    where.OR = [
      { name:  { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (tier)   where.tier   = tier;
  if (status) where.status = status;
  if (role)   where.role   = role;

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
    <div className="container-app py-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <a className="btn btn-primary" href="/admin/users/new">
          Nuevo usuario
        </a>
      </div>

      {/* Filtros */}
      <div className="card">
        <form className="card-body grid md:grid-cols-5 gap-3" method="get">
          <div className="md:col-span-2">
            <label className="label">Buscar</label>
            <input
              name="q"
              className="input"
              placeholder="Nombre o email"
              defaultValue={q}
            />
          </div>
          <div>
            <label className="label">Tier</label>
            <select name="tier" className="select" defaultValue={tier}>
              <option value="">Todos</option>
              <option value="BASIC">BASIC</option>
              <option value="NORMAL">NORMAL</option>
              <option value="PREMIUM">PREMIUM</option>
            </select>
          </div>
          <div>
            <label className="label">Estado</label>
            <select name="status" className="select" defaultValue={status}>
              <option value="">Todos</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
          <div>
            <label className="label">Rol</label>
            <select name="role" className="select" defaultValue={role}>
              <option value="">Todos</option>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div className="md:col-span-5">
            <button className="btn btn-primary" type="submit">
              Aplicar filtros
            </button>
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="grid gap-3">
        {items.map((u) => (
          <a
            key={u.id}
            href={`/admin/users/${u.id}`}
            className="card hover:shadow-lg transition"
          >
            <div className="card-body flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {u.name} <span className="text-slate-500">({u.email})</span>
                </div>
                <div className="text-xs text-slate-500">
                  Alta: {new Date(u.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full border">{u.tier}</span>
                <span className="px-2 py-0.5 rounded-full border">{u.role}</span>
                <span className="px-2 py-0.5 rounded-full border">{u.status}</span>
              </div>
            </div>
          </a>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-slate-500">Sin resultados.</div>
        )}
      </div>
    </div>
  );
}
