"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";

export default function AdminHeader() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") {
      // Resumen solo activo en /admin exactamente
      return pathname === "/admin";
    }
    // Para las demás secciones sí vale el prefijo
    return pathname === href || pathname.startsWith(href + "/");
  };

  const link = (href: string, label: string) => {
    const active = isActive(href);
    return (
      <a
        href={href}
        className={`px-3 py-2 rounded-md text-sm transition ${
          active
            ? "bg-white/20 text-white font-semibold"
            : "text-white/90 hover:bg-white/10 hover:text-white"
        }`}
        onClick={() => setOpen(false)}
      >
        {label}
      </a>
    );
  };

  async function doSignOut() {
    // Prepara el CSRF cookie para evitar ?error=MissingCSRF
    await fetch("/api/auth/csrf", { cache: "no-store" }).catch(() => {});
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <header className="sticky top-0 z-40 bg-[var(--brand)] text-white shadow-sm">
      <div className="container-app h-14 flex items-center justify-between gap-4">
        {/* Marca */}
        <a href="/admin" className="flex items-center gap-3">
          <img
            src="/pachacard.png"
            alt=""
            className="hidden sm:block h-7 w-auto"
            onError={(e) => ((e.currentTarget.style.display = "none"))}
          />
          <div className="leading-none">
            <div className="font-semibold tracking-wide">PACHACARD</div>
            <div className="text-[11px] opacity-80">Panel de Administración</div>
          </div>
        </a>

        {/* Navegación desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {link("/admin", "Resumen")}
          {link("/admin/businesses", "Negocios")}
          {link("/admin/discounts", "Descuentos")}
          {link("/admin/users", "Usuarios")}
          {link("/admin/redemptions", "Canjes")}
          <button
            onClick={doSignOut}
            className="ml-1 px-3 py-2 rounded-md text-sm text-white/90 hover:bg-white/10 hover:text-white transition"
          >
            Salir
          </button>
        </nav>

        {/* Botón mobile */}
        <button
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-white/10"
          aria-label="Abrir menú"
          aria-expanded={open}
          aria-controls="admin-mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>
      </div>

      {/* Drawer mobile */}
      {open && (
        <div
          id="admin-mobile-menu"
          className="md:hidden border-t border-white/10 bg-[var(--brand)]/95 backdrop-blur"
        >
          <div className="container-app py-2 flex flex-col">
            {link("/admin", "Resumen")}
            {link("/admin/businesses", "Negocios")}
            {link("/admin/discounts", "Descuentos")}
            {link("/admin/users", "Usuarios")}
            {link("/admin/redemptions", "Canjes")}
            <button
              onClick={() => {
                setOpen(false);
                doSignOut();
              }}
              className="px-3 py-2 rounded-md text-sm text-white/90 hover:bg-white/10 hover:text-white transition text-left"
            >
              Salir
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
