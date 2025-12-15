// app/_components/BusinessCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";

type BusinessLite = {
  id: string;
  name: string;
  address?: string | null;
  imageUrl?: string | null;
  _count?: { discounts: number };
  // opcionales que podrían venir del backend
  googleMapsUrl?: string | null;
  categories?: { category?: { name?: string | null } | null }[];
  discounts?: { percentage?: number | null; title?: string | null }[];
  discountsCount?: number;
};

export default function BusinessCard({ business }: { business: BusinessLite }) {
  const b = business;
  if (!b.id) return null;

  // Imagen principal
  const img =
    b.imageUrl ||
    (Array.isArray((b as any).images) ? (b as any).images[0] : (b as any).images) ||
    "/brand/business-fallback.png";

  const isExternal = /^https?:\/\//i.test(String(img));

  // Categoría (primer tag si existe)
  const categoryName =
    b.categories?.[0]?.category?.name ??
    (b as any).categoryName ??
    "Negocio afiliado";

  // Conteo de descuentos
  const discountsArray = Array.isArray(b.discounts) ? b.discounts : [];
  const discountsCount =
    b._count?.discounts ??
    b.discountsCount ??
    discountsArray.length ??
    0;

  const percentages = extractPercentagesFromDiscounts(discountsArray);

  const hasLocation = !!b.googleMapsUrl || !!b.address;

  const handleLocationClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    let url: string | null = null;

    if (b.googleMapsUrl) {
      url = b.googleMapsUrl;
    } else if (b.address) {
      // fallback: búsqueda por dirección en Google Maps
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        b.address
      )}`;
    }

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Link href={`/app/businesses/${b.id}`} className="block group">
      <article className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-200/80 transition hover:shadow-lg hover:ring-[var(--brand,#7e1515)]/40">
        {/* HERO CON OVERLAY */}
        <div className="relative h-40 md:h-48 overflow-hidden">
          {isExternal ? (
            <img
              src={String(img)}
              alt={b.name}
              className="h-full w-full object-cover transition group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <Image
              src={String(img)}
              alt={b.name}
              fill
              sizes="(max-width:768px) 100vw, 33vw"
              className="object-cover transition group-hover:scale-[1.02]"
              priority={false}
            />
          )}

          {/* Degradado para legibilidad */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />

          {/* Categoría + nombre negocio */}
          <div className="absolute left-4 bottom-4 right-4">
            <span className="inline-block rounded-full bg-black/45 px-3 py-1 text-xs text-white border border-white/20">
              {categoryName}
            </span>
            <h3 className="mt-2 text-base font-semibold text-white leading-snug">
              {b.name}
            </h3>
          </div>
        </div>

        {/* CONTENIDO INFERIOR */}
        <div className="p-4 space-y-3">
          {/* Dirección */}
          {b.address && (
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <MapPin className="mt-[2px] h-4 w-4 text-[var(--brand,#7e1515)]" />
              <p className="leading-snug">{b.address}</p>
            </div>
          )}

          {/* Bloque de descuentos disponibles */}
          {discountsCount > 0 && (
            <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
              <p className="text-xs font-medium text-emerald-900 mb-1">
                Descuentos disponibles:
              </p>

              {percentages.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {percentages.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm"
                    >
                      {p}% OFF
                    </span>
                  ))}
                  {discountsCount > percentages.length && (
                    <span className="text-xs text-emerald-800">
                      +{discountsCount - percentages.length} más
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-emerald-800">
                  {discountsCount === 1
                    ? "1 descuento activo"
                    : `${discountsCount} descuentos activos`}
                </p>
              )}
            </div>
          )}

          {/* Botón Ver ubicación (no rompe el link del card) */}
          {hasLocation && (
            <button
              type="button"
              onClick={handleLocationClick}
              className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition group-hover:bg-slate-800"
            >
              <MapPin className="h-4 w-4" />
              Ver ubicación
            </button>
          )}
        </div>
      </article>
    </Link>
  );
}

/** Lee porcentajes de los descuentos (percentage o del texto del título) */
function extractPercentagesFromDiscounts(
  discounts: { percentage?: number | null; title?: string | null }[]
): number[] {
  const percentages: number[] = [];

  for (const d of discounts) {
    let p: number | null | undefined = d.percentage;

    if (p == null && typeof d.title === "string") {
      const m = d.title.match(/(\d+)\s*%/);
      if (m) p = Number(m[1]);
    }

    if (typeof p === "number" && !Number.isNaN(p)) {
      percentages.push(p);
    }
  }

  // valores únicos, máximo 3 para no saturar
  const unique = Array.from(new Set(percentages));
  return unique.slice(0, 3);
}
