// components/pachacard/DiscountCard.tsx
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
  code?: string;
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

  const limitPerUser = d?.limitPerUser ?? null;
  const usedByUser = d?.usedByUser ?? 0;
  const userLimitUsed =
    limitPerUser != null && usedByUser >= limitPerUser ? true : false;
  const remainingUserUses =
    limitPerUser != null ? Math.max(0, limitPerUser - usedByUser) : null;

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

  const hero =
    (Array.isArray(d?.images) ? d.images[0] : d?.images) ||
    d?.business?.imageUrl ||
    "/brand/logpa.png";
  const isExternal = /^https?:\/\//i.test(String(hero));

  const isGreyed = soldOut || userLimitUsed;
  const businessName = d?.business?.name ?? "";

  // Formato dd-mm-aaaa
  const endLabel = endAt
    ? `${endAt.getDate().toString().padStart(2, "0")}-${(endAt.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${endAt.getFullYear()}`
    : "—";

  const limitTotal = d?.limitTotal ?? null;
  const usedTotal = d?.usedTotal ?? 0;
  const remainingTotal =
    limitTotal != null ? Math.max(0, limitTotal - usedTotal) : null;
  const usagePct =
    limitTotal != null && limitTotal > 0
      ? Math.min(100, Math.round((usedTotal / limitTotal) * 100))
      : null;

  let percentage = d?.percentage ?? null;
  if (percentage == null && typeof d?.title === "string") {
    const match = d.title.match(/(\d+)\s*%/);
    if (match) percentage = Number(match[1]);
  }

  // ---------- Texto opción B: "Te quedan X usos" ----------
  let perUserMain: string;
  let perUserSub: string | null = null;

  if (limitPerUser == null) {
    perUserMain = "Sin límite por persona.";
    perUserSub = "Puedes usar este beneficio las veces que quieras.";
  } else {
    const maxText = `Máximo ${limitPerUser} ${
      limitPerUser === 1 ? "uso por persona" : "usos por persona"
    }.`;

    if (usedByUser <= 0) {
      perUserMain = `Te quedan ${limitPerUser} ${
        limitPerUser === 1 ? "uso" : "usos"
      }.`;
      perUserSub = maxText;
    } else if (remainingUserUses && remainingUserUses > 0) {
      perUserMain = `Te queda${
        remainingUserUses === 1 ? "" : "n"
      } ${remainingUserUses} ${
        remainingUserUses === 1 ? "uso" : "usos"
      }.`;
      perUserSub = maxText;
    } else {
      perUserMain = "Sin usos disponibles.";
      perUserSub = "Ya usaste el máximo permitido.";
    }
  }

  // Clases del botón según estado (normal vs agotado/límite usado)
  const buttonColorClasses = isGreyed
    ? "bg-slate-100 text-slate-600 border border-slate-200 shadow-[0_3px_12px_rgba(0,0,0,.12)]"
    : "bg-gradient-to-b from-[#9a1e1e] to-[#7e1515] text-white shadow-[0_6px_20px_rgba(0,0,0,.20)] group-hover:shadow-[0_10px_28px_rgba(0,0,0,.25)]";

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

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />

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

          <div className="absolute right-4 top-4">
            <span
              className={`rounded-full px-3 py-0.5 text-[11px] font-medium shadow-sm ${status.cls}`}
            >
              {status.text}
            </span>
          </div>

          {percentage != null && (
            <div className="absolute right-4 bottom-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-2 text-white shadow-xl">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl leading-none">{percentage}</span>
                <span className="text-lg leading-none">%</span>
              </div>
            </div>
          )}

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

          {/* Vigencia + usos */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            {/* Card vigencia */}
            <div className="rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50 to-rose-100/80 p-3 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-rose-700 shadow-sm">
                  <Clock className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-rose-900">
                  Válido hasta
                </span>
              </div>
             <p className="mt-0.5 text-[13px] font-medium text-rose-900 text-center">
                {endLabel}
            </p>

            </div>

            {/* Card usos por persona (opción B) */}
            <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-amber-100/80 p-3 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-amber-700 shadow-sm">
                  <Tag className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
                  Usos disponibles
                </span>
              </div>

              <p className="text-[13px] font-medium text-amber-900">
                {perUserMain}
              </p>

              {perUserSub && (
                <p className="mt-0.5 text-[11px] text-amber-800/85">
                  {perUserSub}
                </p>
              )}
            </div>
          </div>

          {/* Barra de disponibilidad */}
          {usagePct != null && remainingTotal != null && (
            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium tracking-wide text-slate-600">
                  Cupos disponibles
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-800">
                  Quedan {remainingTotal}
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

          {/* Botón ver detalle */}
          <div className="mt-3">
            <div
              className={`
                inline-flex w-full items-center justify-center rounded-xl
                px-4 py-2.5 text-sm font-medium transition
                ${buttonColorClasses}
              `}
            >
              Ver detalle
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
