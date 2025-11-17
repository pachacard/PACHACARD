"use client";

import Link from "next/link";
import { useMemo } from "react";

type Cat = {
  id: string;
  slug: string;
  name: string;
  icon?: string | null;
  _count?: { discounts: number };
};

type Props = {
  categories: Cat[];
  currentSlug?: string | null;
  baseHref?: string;
  showAllPill?: boolean;
  allIcon?: string;
  allLabel?: string;
};

export default function CategoryPills({
  categories,
  currentSlug,
  baseHref = "/app",
  showAllPill = true,
  allIcon = "/icons/cats/todas.png",
  allLabel = "Todos",
}: Props) {
  const items = useMemo(() => {
    const acc: Array<{
      key: string;
      href: string;
      label: string;
      icon?: string | null;
      count?: number;
    }> = [];

    // 1) Siempre “Todos” primero
    if (showAllPill) {
      acc.push({
        key: "__all__",
        href: baseHref,
        label: allLabel,
        icon: allIcon,
      });
    }

    // 2) Separar categorías con descuentos vs sin descuentos
    const withDiscounts: Cat[] = [];
    const withoutDiscounts: Cat[] = [];

    for (const c of categories) {
      const count = c._count?.discounts ?? 0;
      if (count > 0) withDiscounts.push(c);
      else withoutDiscounts.push(c);
    }

    // 3) Ordenar las que tienen descuentos
    withDiscounts.sort((a, b) => {
      const ca = a._count?.discounts ?? 0;
      const cb = b._count?.discounts ?? 0;
      if (cb !== ca) return cb - ca; // más descuentos primero
      return a.name.localeCompare(b.name, "es"); // empate → por nombre
    });

    // 4) Ordenar las que no tienen descuentos por nombre
    withoutDiscounts.sort((a, b) =>
      a.name.localeCompare(b.name, "es")
    );

    // 5) Construir pills en el orden deseado
    const ordered = [...withDiscounts, ...withoutDiscounts];

    for (const c of ordered) {
      acc.push({
        key: c.slug,
        href: `${baseHref}?cat=${encodeURIComponent(c.slug)}`,
        label: c.name,
        icon: c.icon ?? undefined,
        count: c._count?.discounts,
      });
    }

    return acc;
  }, [categories, baseHref, showAllPill, allLabel, allIcon]);

  return (
    <div className="w-full">
      <div
        className="relative -mx-2 mb-4 flex gap-3 overflow-x-auto px-2 pb-2 no-scrollbar"
        aria-label="Categorías"
      >
        {items.map((it) => {
          const active =
            (it.key === "__all__" && !currentSlug) ||
            (it.key !== "__all__" && it.key === currentSlug);

          return (
            <Pill
              key={it.key}
              href={it.href}
              label={it.label}
              icon={it.icon}
              count={it.count}
              active={active}
            />
          );
        })}
      </div>
    </div>
  );
}

function Pill({
  href,
  label,
  icon,
  count,
  active,
}: {
  href: string;
  label: string;
  icon?: string | null;
  count?: number;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "group relative flex w-[120px] shrink-0 select-none flex-col items-center justify-center",
        "rounded-xl border bg-white px-3 py-2 text-center shadow-sm transition",
        active
          ? "border-[var(--brand)] ring-1 ring-[var(--brand)]/30"
          : "border-slate-200 hover:border-[var(--brand)]/50 hover:shadow",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/50",
      ].join(" ")}
    >
      <div
        className={[
          "mb-2 grid h-10 w-10 place-content-center overflow-hidden rounded-full border",
          active
            ? "border-[var(--brand)] bg-[var(--brand)]/5"
            : "border-slate-200 bg-slate-50",
        ].join(" ")}
      >
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt={label} className="h-8 w-8 object-contain" />
        ) : (
          <span className="text-[13px] font-semibold text-slate-600 uppercase">
            {initials(label)}
          </span>
        )}
      </div>

      <div
        className={[
          "line-clamp-2 text-[12px] leading-tight",
          active ? "text-[var(--brand)] font-medium" : "text-slate-700",
        ].join(" ")}
      >
        {label}
      </div>

      {typeof count === "number" && (
        <span
          className={[
            "mt-1 rounded-full px-2 py-[2px] text-[11px]",
            active
              ? "bg-[var(--brand)]/10 text-[var(--brand)]"
              : "bg-slate-100 text-slate-700",
          ].join(" ")}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (!parts.length) return "";
  const a = parts[0][0] || "";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
}
