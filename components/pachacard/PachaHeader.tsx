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
 * - Mobile (md-): solo marca. (BottomNav se encarga de la navegación)
 * - Desktop (md+): marca + navegación superior + botón "Salir".
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

  // Este hook SIEMPRE se llama (aunque "hideAll" sea true)
  useEffect(() => {
    if (hideAll) return;
    const onScroll = () => setElevated(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hideAll]);


  if (hideAll) return null;

  function isActive(href: string) {
    // normaliza para evitar dobles barras finales
    const p = (pathname || "/").replace(/\/+$/, "");
    const h = href.replace(/\/+$/, "");

    // Para /app solo cuenta si estás exactamente en /app
    if (h === "/app") return p === "/app";

    // Para otras rutas: coincide exacto o como prefijo con “/”
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
      <div className="container-app h-12 sm:h-14 flex items-center justify-between gap-4">
        {/* Marca */}
        <a
          href="/app"
          className="group flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg"
          aria-label="Ir al inicio"
        >
          <img
            src="/pachacard.png"
            alt=""
            className="hidden sm:block h-6 w-auto transition-transform group-hover:scale-[1.02]"
            onError={(e) => ((e.currentTarget.style.display = "none"))}
          />
          <div className="leading-none text-white">
            <div className="font-semibold tracking-wide">PACHACARD</div>
            <div className="text-[11px] opacity-80">Municipalidad Distrital de Pachacámac</div>
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

        {/* Hueco derecho */}
        <div className="w-8 md:w-10" aria-hidden />
      </div>
    </header>
  );
}
