import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

// ✅ tipos de Prisma
import type { Redemption, Discount, Business } from "@prisma/client";
import { CalendarDays, Clock, CheckCircle2 } from "lucide-react";

// ✅ cada fila con sus relaciones
type Row = Redemption & { discount: Discount | null; business: Business | null };

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: String(session.user.email) },
  });
  if (!user) redirect("/login");

  const reds: Row[] = await prisma.redemption.findMany({
    where: { userId: user.id },
    orderBy: { redeemedAt: "desc" },
    include: { discount: true, business: true },
  });

  const total = reds.length;
  const subtitle =
    total === 0
      ? "Aún no has realizado canjes."
      : `${total} canje${total === 1 ? "" : "s"} realizado${
          total === 1 ? "" : "s"
        }`;

  return (
    <div className="container-app py-6 md:py-8 space-y-4">
      <header className="mb-2">
        <h1 className="text-xl md:text-2xl font-semibold">
          Mi historial de canjes
        </h1>
        <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
      </header>

      {total === 0 && (
        <div className="mx-auto max-w-md rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 p-6 text-center">
          <p className="font-medium text-slate-800 mb-1">
            Aún no tienes movimientos
          </p>
          <p className="text-sm text-slate-600">
            Cuando realices tu primer canje, lo verás registrado aquí.
          </p>
        </div>
      )}

      {total > 0 && (
        <div className="space-y-3 md:space-y-4">
          {reds.map((r) => {
            const redeemedDate = new Date(r.redeemedAt);

            const dateLabel = redeemedDate.toLocaleDateString("es-PE", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });

            const timeLabel = redeemedDate.toLocaleTimeString("es-PE", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });

            const title =
              r.discount?.title ?? "Descuento aplicado en el comercio";
            const businessName = r.business?.name ?? "Negocio";

            // porcentaje: usa campo percentage o intenta leerlo del título
            let percentage: number | null =
              (r.discount as any)?.percentage ?? null;
            if (percentage == null && typeof r.discount?.title === "string") {
              const match = r.discount.title.match(/(\d+)\s*%/);
              if (match) percentage = Number(match[1]);
            }

            return (
              <div
                key={r.id}
                className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 px-4 py-3 md:px-5 md:py-4"
              >
                {/* fila superior: estado + porcentaje */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Canjeado
                    </span>

                    <h2 className="mt-2 text-sm md:text-base font-semibold text-slate-900 line-clamp-2">
                      {title}
                    </h2>
                    <p className="mt-0.5 text-xs md:text-sm text-slate-600">
                      {businessName}
                    </p>
                  </div>

                  {percentage != null && (
                    <div className="flex flex-col items-center justify-center rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700 min-w-[70px]">
                      <span className="text-lg md:text-xl font-semibold leading-none">
                        {percentage}
                      </span>
                      <span className="text-[10px] leading-none">%</span>
                    </div>
                  )}
                </div>

                {/* fila inferior: fecha + hora */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    <span>{dateLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{timeLabel}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
