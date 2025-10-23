"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Clock, IdCard, Store } from "lucide-react";

const items = [
  { href: "/app", label: "Inicio", Icon: Home },
  { href: "/app/businesses", label: "Negocios", Icon: Store },
  { href: "/app/history", label: "Historial", Icon: Clock },
  { href: "/app/me", label: "Mi QR", Icon: IdCard },
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
        {items.map(({ href, label, Icon }) => {
          const active =
            href === "/app"
              ? pathname === "/app" || pathname.startsWith("/app/")
              : pathname.startsWith(href);
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
