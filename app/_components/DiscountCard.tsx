"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Clock, Tag } from "lucide-react";

type Discount = {
  id: string;
  title?: string;
  description?: string;
  images?: string[] | string | null;
  code?: string; // sigue existiendo, pero no se muestra
  startAt?: string | Date | null;
  endAt?: string | Date | null;
  limitTotal?: number | null;
  usedTotal?: number | null;
  limitPerUser?: number | null;
  usedByUser?: number | null;
  percentage?: number | null;
  business?: {
    name?: string | null;
    imageUrl?: string | null;
    category?: string | null;
  } | null;
  status?: "disponible" | "agotado" | "pronto";
};

export default function DiscountCard({ discount }: { discount: Discount }) {
  const d = discount;
  const now = new Date();
  const MS_DAY = 24 * 60 * 60 * 1000;

  const startAt = d?.startAt ? new Date(d.startAt) : null;
  const endAt = d?.endAt ? new Date(d.endAt) : null;

  const isNew = !!(startAt && now.getTime() - startAt.getTime() <= 7 * MS_DAY);
  const expiringSoon = !!(
    endAt &&
    endAt.getTime() - now.getTime() <= 3 * MS_DAY &&
    endAt.getTime() >= now.getTime()
  );
  const soldOut = !!(
    d?.limitTotal && (d.usedTotal ?? 0) >= (d.limitTotal ?? 0)
  );
  const isUpcoming = !!(d?.status === "pronto" || (startAt && startAt > now));

  // Límite por usuario agotado
  const limitPerUser = d?.limitPerUser ?? null;
  const usedByUser = d?.usedByUser ?? 0;
  const userLimitUsed =
    limitPerUser != null && usedByUser >= limitPerUser ? true : false;

  // Estado unificado
  const status = useMemo(() => {
    if (soldOut)
      return {
        text: "agotado",
        cls: "bg-rose-100 text-rose-700 border border-rose-200",
      };
    if (userLimitUsed)
      return {
        text: "límite usado",
        cls: "bg-amber-100 text-amber-700 border border-amber-200",
      };
    if (isUpcoming)
      return {
        text: "pronto",
        cls: "bg-amber-100 text-amber-700 border border-amber-200",
      };
    return {
      text: "disponible",
      cls: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    };
  }, [soldOut, userLimitUsed, isUpcoming]);

  // Imagen principal
  const hero =
    (Array.isArray(d?.images) ? d.images[0] : d?.images) ||
    d?.business?.imageUrl ||
    "/brand/muni.png";
  const isExternal = /^https?:\/\//i.test(String(hero));

  const isGreyed = soldOut || userLimitUsed;

  // Datos de negocio
  const businessName = d?.business?.name ?? "";

  // Vigencia (solo fin para mostrar en la card)
  const endLabel = endAt
    ? endAt.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "short",
      })
    : "—";

  // Disponibilidad total
  const limitTotal = d?.limitTotal ?? null;
  const usedTotal = d?.usedTotal ?? 0;
  const remainingTotal =
    limitTotal != null ? Math.max(0, limitTotal - usedTotal) : null;
  const usagePct =
    limitTotal != null && limitTotal > 0
      ? Math.min(100, Math.round((usedTotal / limitTotal) * 100))
      : null;

  // Porcentaje: usa el campo percentage si viene, si no intenta leerlo del título
  let percentage = d?.percentage ?? null;
  if (percentage == null && typeof d?.title === "string") {
    const match = d.title.match(/(\d+)\s*%/);
    if (match) percentage = Number(match[1]);
  }

  return (
    <Link
      href={`/app/discounts/${d.id}`}
      className="group block"
      aria-label={d?.title ?? "Ver detalle del descuento"}
    >
      <article
        className={`overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-200/80 transition
        hover:shadow-lg hover:ring-[var(--brand,#7e1515)]/40 ${
          isGreyed ? "opacity-85" : ""
        }`}
      >
        {/* IMAGEN + OVERLAY */}
        <div className="relative h-48 overflow-hidden">
          {isExternal ? (
            <img
              src={String(hero)}
              alt={businessName || d?.title || "Negocio"}
              className={`h-full w-full object-cover transition ${
                isGreyed ? "grayscale" : ""
              }`}
              loading="lazy"
            />
          ) : (
            <Image
              src={String(hero)}
              alt={businessName || d?.title || "Negocio"}
              fill
              sizes="(max-width:768px) 100vw, 33vw"
              className={`object-cover transition ${isGreyed ? "grayscale" : ""}`}
              priority={false}
            />
          )}

          {/* Degradado para que se lea el texto */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />

          {/* Badges arriba izq (solo nuevo / pronto expira) */}
          <div className="absolute left-4 top-4 flex flex-col gap-2">
            <div className="flex gap-2">
              {isNew && !soldOut && !userLimitUsed && (
                <span className="rounded-full border border-sky-200 bg-sky-100/95 px-2 py-0.5 text-[11px] font-medium text-sky-800 shadow-sm">
                  nuevo
                </span>
              )}
              {expiringSoon && !soldOut && !userLimitUsed && (
                <span className="rounded-full border border-amber-200 bg-amber-100/95 px-2 py-0.5 text-[11px] font-medium text-amber-800 shadow-sm">
                  pronto expira
                </span>
              )}
            </div>
          </div>

          {/* Badge de estado arriba der */}
          <div className="absolute right-4 top-4">
            <span
              className={`rounded-full px-3 py-0.5 text-[11px] font-medium shadow-sm ${status.cls}`}
            >
              {status.text}
            </span>
          </div>

          {/* Badge de porcentaje flotante (sin texto "DESCUENTO") */}
          {percentage != null && (
            <div className="absolute right-4 bottom-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-2 text-white shadow-xl">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl leading-none">{percentage}</span>
                <span className="text-lg leading-none">%</span>
              </div>
            </div>
          )}

          {/* Nombre negocio + título del descuento */}
          <div className="absolute bottom-4 left-4 right-4">
            {businessName && (
              <p className="mb-1 text-xs text-white/90">{businessName}</p>
            )}
            <h3 className="line-clamp-2 text-sm font-medium leading-snug text-white md:text-base">
              {d?.title ?? "Descuento"}
            </h3>
          </div>
        </div>

        {/* CONTENIDO INFERIOR */}
        <div className="p-4">
          {d?.description && (
            <p className="mb-4 line-clamp-2 text-xs text-slate-600">
              {d.description}
            </p>
          )}

          {/* Vigencia + Canjes (cards) */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-rose-50 p-3">
              <div className="mb-1 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--brand,#7e1515)]" />
                <span className="text-[11px] uppercase tracking-wide text-rose-900">
                  Vigencia
                </span>
              </div>
              <p className="text-[13px] text-rose-900">{endLabel}</p>
            </div>

            <div className="rounded-lg bg-amber-50 p-3">
              <div className="mb-1 flex items-center gap-2">
                <Tag className="h-4 w-4 text-amber-600" />
                <span className="text-[11px] uppercase tracking-wide text-amber-900">
                  Canjes
                </span>
              </div>
              <p className="text-[13px] text-amber-900">
                {limitPerUser != null
                  ? `${limitPerUser} usos/usuario`
                  : "Sin límite por usuario"}
              </p>
              {limitPerUser != null && usedByUser > 0 && (
                <p className="mt-0.5 text-[11px] text-amber-700/80">
                  Ya usaste {Math.min(usedByUser, limitPerUser)} / {limitPerUser}
                </p>
              )}
            </div>
          </div>

          {/* Barra de disponibilidad (si hay límite total) */}
          {usagePct != null && remainingTotal != null && (
            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-slate-500">
                  Disponibilidad
                </span>
                <span className="text-[11px] text-slate-700">
                  {remainingTotal} restantes
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${
                    usagePct > 80
                      ? "bg-rose-500"
                      : usagePct > 50
                      ? "bg-amber-400"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.max(5, 100 - usagePct)}%` }}
                />
              </div>
            </div>
          )}

          {/* Botón Ver detalle con rojo institucional */}
          <div className="mt-3">
            <div
              className="inline-flex w-full items-center justify-center rounded-xl
                         bg-gradient-to-b from-[#9a1e1e] to-[#7e1515] px-4 py-2.5
                         text-sm font-medium text-white shadow-[0_6px_20px_rgba(0,0,0,.20)]
                         transition group-hover:shadow-[0_10px_28px_rgba(0,0,0,.25)]"
            >
              Ver detalle
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
