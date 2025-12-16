// app/(user)/app/history/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

import type { Redemption, Discount, Business } from "@prisma/client";
import { CalendarDays, Clock, CheckCircle2 } from "lucide-react";

/**
 * Se tipa cada fila del historial incluyendo relaciones:
 * - discount puede ser null si el descuento fue eliminado
 * - business puede ser null si el negocio fue eliminado
 */
type Row = Redemption & { discount: Discount | null; business: Business | null };

/**
 * Se muestra el historial de canjes del usuario (Redemption).
 * - Se valida sesión; si no hay, se redirige a /login
 * - Se obtiene el usuario real desde BD
 * - Se listan sus canjes ordenados del más reciente al más antiguo
 */
export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Se busca al usuario por email para obtener su id
  const user = await prisma.user.findUnique({
    where: { email: String(session.user.email) },
  });
  if (!user) redirect("/login");

  // Se consultan los canjes del usuario con sus relaciones
  const reds: Row[] = await prisma.redemption.findMany({
    where: { userId: user.id },
    orderBy: { redeemedAt: "desc" },
    include: { discount: true, business: true },
  });

  // Subtítulo según cantidad de registros
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

      {/* Estado vacío */}
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

      {/* Listado */}
      {total > 0 && (
        <div className="space-y-3 md:space-y-4">
          {reds.map((r) => {
            const redeemedDate = new Date(r.redeemedAt);

            // Se formatean fecha y hora para mostrar en pantalla
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

            // Se construyen textos con fallback por si faltan relaciones
            const title = r.discount?.title ?? "Descuento aplicado en el comercio";
            const businessName = r.business?.name ?? "Negocio";

            /**
             * Se intenta mostrar un porcentaje si existe.
             * - Primero se busca el campo discount.percentage (si el modelo lo tiene)
             * - Si no existe, se intenta extraer del título con una regex (ej: "20%")
             */
            let percentage: number | null = (r.discount as any)?.percentage ?? null;
            if (percentage == null && typeof r.discount?.title === "string") {
              const match = r.discount.title.match(/(\d+)\s*%/);
              if (match) percentage = Number(match[1]);
            }

            return (
              <div
                key={r.id}
                className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 px-4 py-3 md:px-5 md:py-4"
              >
                {/* Encabezado: estado + título + negocio + porcentaje */}
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

                {/* Pie: fecha + hora */}
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
