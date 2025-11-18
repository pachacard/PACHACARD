// app/(user)/app/discounts/[id]/page.tsx
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Image from "next/image";
import { formatRange } from "@/lib/formatRange";

export default async function DiscountDetail({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  const now = new Date();

  const d = await prisma.discount.findUnique({
    where: { id: params.id },
    include: { business: true },
  });
  if (!d) return notFound();

  //  Aseguramos el ID del usuario desde BD (no confiamos en session.user.id)
  let mine = 0;
  if (session?.user?.email) {
    const me = await prisma.user.findUnique({
      where: { email: String(session.user.email) },
      select: { id: true },
    });

    if (me) {
      mine = await prisma.redemption.count({
        where: { userId: me.id, discountId: d.id },
      });
    }
  }

  // Badges
  const MS_DAY = 24 * 60 * 60 * 1000;
  const isNew = now.getTime() - d.startAt.getTime() <= 7 * MS_DAY;
  const expiringSoon =
    d.endAt.getTime() - now.getTime() <= 3 * MS_DAY &&
    d.endAt.getTime() >= now.getTime();

  const avail =
    d.limitTotal && d.usedTotal >= d.limitTotal
      ? {
          text: "agotado",
          cls: "bg-rose-100 text-rose-700 border border-rose-200",
        }
      : d.limitPerUser && mine >= d.limitPerUser
      ? {
          text: "límite usado",
          cls: "bg-amber-100 text-amber-700 border border-amber-200",
        }
      : {
          text: "disponible",
          cls: "bg-emerald-100 text-emerald-700 border border-emerald-200",
        };

  // Métricas
  const vigencia = formatRange(d.startAt, d.endAt);
  const totalRestante =
    d.limitTotal != null ? Math.max(0, d.limitTotal - d.usedTotal) : null;
  const porUso =
    d.limitTotal && d.limitTotal > 0
      ? Math.min(100, Math.round((d.usedTotal / d.limitTotal) * 100))
      : null;

  // Imagen
  const fromDiscount = Array.isArray(d.images) ? d.images[0] : d.images;
  const src = fromDiscount || d.business?.imageUrl || "";
  const isExternal = /^https?:\/\//i.test(src);

  // URL de Google Maps (si existe y no está vacía)
  const mapsUrl =
    d.business?.googleMapsUrl && d.business.googleMapsUrl.trim()
      ? d.business.googleMapsUrl.trim()
      : null;

  return (
    <div className="container-app py-6 space-y-6">
      <div className="card p-0 overflow-hidden">
        <div className="relative h-56 md:h-64 w-full bg-white border-b">
          {src ? (
            isExternal ? (
              <img
                src={src}
                alt={d.business?.name ?? "Negocio"}
                className="w-full h-full object-contain p-3"
              />
            ) : (
              <Image
                src={src}
                alt={d.business?.name ?? "Negocio"}
                fill
                className="object-contain p-3"
                sizes="(max-width: 768px) 100vw, 66vw"
              />
            )
          ) : (
            <div className="w-full h-full grid place-content-center text-slate-400">
              Sin imagen
            </div>
          )}

          <div className="absolute top-3 left-3 flex gap-2">
            {isNew && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium shadow-sm bg-sky-100 text-sky-700 border border-sky-200">
                nuevo
              </span>
            )}
            {expiringSoon && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium shadow-sm bg-amber-100 text-amber-700 border border-amber-200">
                pronto expira
              </span>
            )}
          </div>

          <span
            className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium shadow-sm ${avail.cls}`}
          >
            {avail.text}
          </span>
        </div>

        <div className="card-body space-y-2">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-semibold">{d.title}</h1>
            {/* Ya no mostramos el código del descuento al usuario final */}
          </div>

          {d.description && <p className="text-gray-700">{d.description}</p>}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-slate-500">Vigencia</div>
              <div className="font-medium">{vigencia || "—"}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-slate-500">Negocio</div>
              <div className="font-medium">{d.business?.name ?? "—"}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-slate-500">Estado</div>
              <div className="font-medium capitalize">{avail.text}</div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="text-xs text-slate-500">Límite por usuario</div>
              <div className="font-medium">
                {d.limitPerUser ?? "—"}
                {d.limitPerUser != null && session?.user ? (
                  <span className="text-xs text-slate-500">
                    {" "}
                    · te quedan {Math.max(0, d.limitPerUser - mine)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="text-xs text-slate-500">Límite total</div>
              <div className="font-medium">
                {d.limitTotal ?? "—"}
                {totalRestante != null && (
                  <span className="text-xs text-slate-500">
                    {" "}
                    · restantes {totalRestante}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="text-xs text-slate-500">Canjes realizados</div>
              <div className="font-medium">{d.usedTotal}</div>
            </div>
          </div>

          {porUso != null && (
            <div className="mt-2">
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${porUso}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {porUso}% del límite total utilizado
              </div>
            </div>
          )}

          {mapsUrl && (
            <div className="mt-3">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium text-[var(--brand,#7e1515)] hover:bg-slate-50"
              >
                Ver en Google Maps
              </a>
              <p className="mt-1 text-xs text-slate-500">
                Se abrirá Google Maps en una pestaña nueva con la ubicación del
                negocio.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="font-medium">Instrucciones de uso</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
            <li>
              Presenta tu <strong>tarjeta física</strong> y permite escanear el
              QR.
            </li>
            <li>
              El módulo de canje se abrirá automáticamente con tu token
              verificado.
            </li>
            <li>Respeta las condiciones y vigencia del comercio.</li>
          </ul>
          <p className="text-xs text-gray-500 mt-3">
            No hay canje desde el portal web; el acceso es únicamente desde el
            QR de la tarjeta.
          </p>
        </div>
      </div>

      <div>
        <a href="/app" className="text-sm text-slate-600 hover:underline">
          ← Volver a mis descuentos
        </a>
      </div>
    </div>
  );
}
