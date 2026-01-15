// app/_components/PachaHeader.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

// LINKS estático fuera del componente (sin hooks)
const LINKS = [
  { href: "/app", label: "Mis descuentos" },
  { href: "/app/businesses", label: "Negocios" },
  { href: "/app/me", label: "Mi información (QR)" },
  { href: "/app/history", label: "Historial" },
];

/**
 * Header responsive:
 * - Mobile: muestra solo la marca (logo PACHACARD). La navegación va en el BottomNav.
 * - Desktop: marca + navegación superior + botón "Salir".
 */
export default function PachaHeader() {
  const pathname = usePathname() || "/";
  const [elevated, setElevated] = useState(false);

  // Rutas donde NO se muestra el header
  const hideAll =
    pathname === "/login" ||
    pathname === "/logout" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/redeem");

  useEffect(() => {
    if (hideAll) return;
    const onScroll = () => setElevated(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hideAll]);

  if (hideAll) return null;

  function isActive(href: string) {
    const p = (pathname || "/").replace(/\/+$/, "");
    const h = href.replace(/\/+$/, "");
    if (h === "/app") return p === "/app";
    return p === h || p.startsWith(h + "/");
  }

  async function doSignOut() {
    await fetch("/api/auth/csrf", { cache: "no-store" }).catch(() => {});
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <header
      role="banner"
      className={[
        "sticky top-0 z-40 transition-all",
        "border-b border-black/15",
        elevated
          ? "bg-gradient-to-b from-[var(--brand)] to-[#6f1414] shadow-[0_2px_12px_rgba(0,0,0,.18)]"
          : "bg-gradient-to-b from-[var(--brand)] to-[#7f1616]",
      ].join(" ")}
    >
      {/* Línea de brillo superior para que se vea más institucional */}
      <div className="h-[2px] w-full bg-white/15" aria-hidden />

      <div className="container-app h-16 md:h-18 flex items-center justify-between gap-4">
        {/* Marca PACHACARD */}
        <a
          href="/app"
          className="group flex items-center gap-3 md:gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg"
          aria-label="Ir al inicio"
        >
          {/* Logo siempre visible, más grande */}
          <img
            src="/pachacard.png"
            alt="PACHACARD - Municipalidad de Pachacámac"
            className="
              h-9 sm:h-10 md:h-11
              w-auto
              rounded
              bg-black/10
              px-1.5 py-1
              shadow-[0_4px_14px_rgba(0,0,0,.45)]
              transition-transform
              group-hover:scale-[1.03]
            "
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />

          {/* Texto solo en sm+ para no saturar el mobile */}
          <div className="hidden sm:block leading-tight text-white">
            <div className="text-[10px] uppercase tracking-[0.16em] opacity-85">
              MUNICIPALIDAD DISTRITAL DE
            </div>
            <div className="text-sm md:text-base font-semibold">
              Pachacámac · PACHACARD
            </div>
          </div>
        </a>

        {/* Navegación SOLO en desktop */}
        <nav className="hidden md:block" aria-label="Principal">
          <ul className="flex items-center gap-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  data-active={isActive(l.href) ? "true" : "false"}
                  className={[
                    "relative px-3 py-2 rounded-lg text-sm",
                    "text-white/90 hover:text-white transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                    "group",
                    isActive(l.href)
                      ? "bg-white/15 shadow-inner"
                      : "hover:bg-white/8",
                  ].join(" ")}
                >
                  {l.label}
                  <span
                    className={[
                      "pointer-events-none absolute left-2 right-2 -bottom-[2px] h-[2px] rounded-full",
                      "bg-white/70 origin-left scale-x-0 transition-transform duration-300",
                      "group-hover:scale-x-100",
                      isActive(l.href) ? "scale-x-100" : "",
                    ].join(" ")}
                    aria-hidden
                  />
                </a>
              </li>
            ))}
            <li>
              <button
                onClick={doSignOut}
                className="hidden md:inline-flex px-3 py-2 rounded-lg text-sm text-white/90 hover:text-white hover:bg-white/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                Salir
              </button>
            </li>
          </ul>
        </nav>

        {/* Hueco derecho para balancear el layout */}
        <div className="w-8 md:w-10" aria-hidden />
      </div>
    </header>
  );
}
