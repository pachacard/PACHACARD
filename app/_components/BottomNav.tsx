"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Clock, IdCard, Store } from "lucide-react";

type Item = {
  href: string;
  label: string;
  Icon: any;
  isActive: (pathname: string) => boolean;
};

const items: Item[] = [
  // Inicio activo solo en /app y /app/discounts/*
  {
    href: "/app",
    label: "Inicio",
    Icon: Home,
    isActive: (p) => p === "/app" || p.startsWith("/app/discounts"),
  },
  {
    href: "/app/businesses",
    label: "Negocios",
    Icon: Store,
    isActive: (p) => p.startsWith("/app/businesses"),
  },
  {
    href: "/app/history",
    label: "Historial",
    Icon: Clock,
    isActive: (p) => p.startsWith("/app/history"),
  },
  {
    href: "/app/me",
    label: "Mi QR",
    Icon: IdCard,
    isActive: (p) => p.startsWith("/app/me"),
  },
];

export default function BottomNav() {
  const pathname = usePathname() || "/";

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-40 md:hidden
        border-t border-slate-200 bg-white/95 backdrop-blur
        shadow-[0_-2px_8px_rgba(0,0,0,0.04)]
        [@supports(padding:max(0px))]:pb-[max(env(safe-area-inset-bottom),8px)]
      "
      aria-label="Navegación inferior"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around py-2">
        {items.map(({ href, label, Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                className={[
                  "flex min-w-[80px] flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors",
                  active
                    ? "text-[var(--brand)] font-medium"
                    : "text-slate-600 hover:text-slate-900",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={[
                    "h-5 w-5",
                    active ? "stroke-[var(--brand)]" : "stroke-slate-500",
                  ].join(" ")}
                />
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
