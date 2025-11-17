"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import { Copy } from "lucide-react";

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
  limitPerUser?: number | null;   // 👈 NUEVO
  usedByUser?: number | null;     // 👈 NUEVO (lo llenamos en /app/page.tsx)
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
  const [copied, setCopied] = useState(false);

  const now = new Date();
  const MS_DAY = 24 * 60 * 60 * 1000;

  const startAt = d?.startAt ? new Date(d.startAt) : null;
  const endAt = d?.endAt ? new Date(d.endAt) : null;

  const isNew = !!(
    startAt && now.getTime() - startAt.getTime() <= 7 * MS_DAY
  );
  const expiringSoon = !!(
    endAt &&
    endAt.getTime() - now.getTime() <= 3 * MS_DAY &&
    endAt.getTime() >= now.getTime()
  );
  const soldOut = !!(d?.limitTotal && (d.usedTotal ?? 0) >= (d.limitTotal ?? 0));
  const isUpcoming = !!(d?.status === "pronto" || (startAt && startAt > now));

  // 👉 Límite por usuario agotado
  const limitPerUser = d?.limitPerUser ?? null;
  const usedByUser = d?.usedByUser ?? 0;
  const userLimitUsed = !!(
    limitPerUser != null && usedByUser >= limitPerUser
  );

  // Estado unificado (sin mezclar "expiringSoon" para no duplicar mensajes)
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
    "/brand/muni.png";

  const isExternal = /^https?:\/\//i.test(String(hero));

  async function copyCode() {
    if (!d?.code) return;
    await navigator.clipboard.writeText(d.code);
    if (typeof navigator !== "undefined" && "vibrate" in navigator)
      (navigator as any).vibrate?.(35);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const isGreyed = soldOut || userLimitUsed;

  return (
    <article
      className={`group overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-sm transition
                 hover:shadow-md hover:ring-[var(--brand,#7e1515)]/40 ${
                   isGreyed ? "opacity-80" : ""
                 }`}
      aria-label={d?.title ?? "Descuento"}
    >
      {/* Imagen (altura consistente) */}
      <div
        className={[
          "relative w-full border-b bg-white",
          isGreyed ? "grayscale opacity-95" : "",
        ].join(" ")}
      >
        <div className="relative w-full aspect-[4/3]">
          {isExternal ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={String(hero)}
              alt={d?.business?.name ?? "Negocio"}
              className="absolute inset-0 h-full w-full object-contain p-4"
              loading="lazy"
            />
          ) : (
            <Image
              src={String(hero)}
              alt={d?.business?.name ?? "Negocio"}
              fill
              sizes="(max-width:768px) 100vw, 33vw"
              className="object-contain p-4"
              priority={false}
            />
          )}
        </div>

        {/* BANDA SUPERIOR: izquierda (chips) + derecha (estado) */}
        {(isNew || expiringSoon || status) && (
          <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
            <div className="flex gap-2">
              {isNew && !soldOut && !userLimitUsed && (
                <span className="rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 shadow-sm">
                  nuevo
                </span>
              )}
              {expiringSoon && !soldOut && !userLimitUsed && (
                <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 shadow-sm">
                  pronto expira
                </span>
              )}
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium shadow-sm ${status.cls}`}
            >
              {status.text}
            </span>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              {typeof d?.percentage === "number" && (
                <span className="text-2xl font-extrabold text-[var(--brand,#7e1515)]">
                  {d.percentage}%
                </span>
              )}
              <h3 className="line-clamp-2 font-semibold leading-tight text-slate-900">
                {d?.title ?? "Descuento"}
              </h3>
            </div>
            {d?.description && (
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                {d.description}
              </p>
            )}
          </div>

          {/* Código copiable */}
          {d?.code && (
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              aria-label={`Copiar código ${d.code}`}
              title="Copiar código"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copiado" : d.code}
            </button>
          )}
        </div>

        {/* Negocio y categoría */}
        <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
          <p className="truncate">
            {d?.business?.name ? `Negocio: ${d.business.name}` : "—"}
          </p>
          {d?.business?.category && (
            <span className="ml-2 shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] ring-1 ring-slate-200">
              {d.business.category}
            </span>
          )}
        </div>

        {/* CTA */}
        <a
          href={`/app/discounts/${d.id}`}
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg
                     bg-gradient-to-b from-[#9a1e1e] to-[#7e1515] px-4 py-2.5 text-sm font-medium text-white
                     shadow-[0_6px_20px_rgba(0,0,0,.20)] transition hover:shadow-[0_10px_28px_rgba(0,0,0,.25)]
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7e1515]"
        >
          Ver detalle
        </a>
      </div>
    </article>
  );
}
