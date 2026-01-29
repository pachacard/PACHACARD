// app/_components/PachaHeader.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const LINKS = [
  { href: "/app", label: "Mis beneficios" },
  { href: "/app/businesses", label: "Negocios" },
  { href: "/app/me", label: "Mi información (QR)" },
  { href: "/app/history", label: "Historial" },
];

export default function PachaHeader() {
  const pathname = usePathname() || "/";
  const [elevated, setElevated] = useState(false);

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
      className={[
        "sticky top-0 z-40 transition-all",
        elevated
          ? "bg-gradient-to-b from-[var(--brand)] to-[#6f1414] shadow-[0_2px_12px_rgba(0,0,0,.18)]"
          : "bg-gradient-to-b from-[var(--brand)] to-[#7f1616]",
      ].join(" ")}
      role="banner"
    >
      {/* un poco más alto para que respire el logo */}
      <div className="container-app h-14 md:h-16 flex items-center justify-between gap-4">
        {/* Marca principal */}
        <a
          href="/app"
          className="group flex items-center gap-3 md:gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg"
          aria-label="Ir al inicio"
        >
          {/* ICONO PACHACARD (siempre visible, también en móvil) */}
          <img
            src="/icons/pachacard-192.png"
            alt="PACHACARD"
            className="
              h-8 w-8
              sm:h-9 sm:w-9
              md:h-10 md:w-10
              rounded-lg
              bg-[#8f1b1b]
              object-cover
              shadow-[0_4px_14px_rgba(0,0,0,.55)]
              transition-transform
              group-hover:scale-[1.03]
            "
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />

          {/* Texto institucional (visible también en móvil, pero más compacto) */}
          <div className="leading-tight text-white">
            <div className="text-[9px] sm:text-[10px] tracking-[0.2em] uppercase opacity-85">
              MUNICIPALIDAD DISTRITAL DE
            </div>
            <div className="text-xs sm:text-sm font-semibold">
              Pachacámac · PACHACARD
            </div>
          </div>
        </a>

        {/* Navegación en desktop */}
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
                    isActive(l.href) ? "bg-white/15 shadow-inner" : "hover:bg-white/10",
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

        {/* Espacio a la derecha para balancear layout */}
        <div className="w-8 md:w-10" aria-hidden />
      </div>
    </header>
  );
}
