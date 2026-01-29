// app/(user)/app/businesses/page.tsx
import { auth } from "@/lib/auth";
import {
  getBusinesses,
  getCategoriesWithCountsForUser,
} from "@/lib/db";
import CategoryPills from "@/components/pachacard/CategoryPills";
import BusinessCard from "@/components/pachacard/BusinessCard";

export const dynamic = "force-dynamic";

type Props = { searchParams?: { cat?: string } };

type Tier = "BASIC" | "NORMAL" | "PREMIUM";

// Normaliza tier; si no hay sesión o viene raro, devuelve undefined (sin filtro)
function normalizeTier(t: unknown): Tier | undefined {
  if (!t) return undefined;
  const k = String(t).trim().toUpperCase();
  if (k === "BASIC" || k === "NORMAL" || k === "PREMIUM") return k;
  return "BASIC";
}

export default async function NegociosPage({ searchParams }: Props) {
  const current = searchParams?.cat || undefined;

  // --- obtener sesión de forma segura (que no rompa la página) ---
  let tier: Tier | undefined;
  try {
    const session = await auth();
    tier = normalizeTier(session?.user?.tier);
  } catch (err) {
    console.error("Error obteniendo sesión en NegociosPage:", err);
    tier = undefined; // sin sesión, mostramos todo
  }

  // --- consultas a BD ---
  const [cats, businesses] = await Promise.all([
    getCategoriesWithCountsForUser(tier),
    getBusinesses({ categorySlug: current }),
  ]);

  const total = businesses.length;

  return (
    <div className="container-app py-6 md:py-8 space-y-4">
      {/* Encabezado */}
      <header className="space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">
            Negocios afiliados
          </h1>
          <p className="text-sm text-slate-600">
            {total === 0
              ? "Aún no hay negocios con descuentos para tu nivel."
              : `${total} negocio${total !== 1 ? "s" : ""} con descuentos para tu nivel.`}
          </p>
        </div>

        <CategoryPills
          categories={cats}
          currentSlug={current}
          baseHref="/app/businesses"
          showAllPill
        />
      </header>

      {/* Listado de negocios */}
      {businesses.length === 0 ? (
        <div className="card text-sm text-slate-600">
          No hay negocios para esta categoría.
        </div>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1 text-sm">
            <h2 className="font-medium text-slate-900">Negocios</h2>
            <span className="text-xs text-slate-500">
              {businesses.length} negocio
              {businesses.length !== 1 ? "s" : ""} afiliado
              {businesses.length !== 1 ? "s" : ""}.
            </span>
          </div>

          <div
            aria-label="Listado de negocios afiliados"
            className="
              mt-1 space-y-4
              md:space-y-0 md:grid md:grid-cols-2 md:gap-4
              xl:grid-cols-3
            "
          >
            {businesses.map((b) => (
              <div
                key={b.id}
                className="mx-auto w-full max-w-md md:max-w-none"
              >
                <BusinessCard business={b as any} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
