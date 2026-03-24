"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import { signOut } from "next-auth/react";
import {
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Store,
  Ticket,
  Users,
  X,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/businesses", label: "Negocios", icon: Store },
  { href: "/admin/discounts", label: "Descuentos", icon: Gift },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/redemptions", label: "Canjes", icon: Ticket },
  { href: "/admin/audit", label: "Auditoría", icon: ShieldCheck },
];

export default function AdminHeader() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  async function doSignOut() {
    await fetch("/api/auth/csrf", { cache: "no-store" }).catch(() => {});
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[var(--brand)] text-white shadow-[0_14px_40px_-24px_rgba(0,0,0,0.55)]">
      <div className="container-app flex min-h-[72px] items-center justify-between gap-4 py-3">
        <Link href="/admin" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-inner shadow-white/10 backdrop-blur">
            <img
              src="/pachacard.png"
              alt="Pachacard"
              className="h-7 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-[0.18em] text-white/75">
              PACHACARD
            </div>
            <div className="text-base font-semibold sm:text-lg">
              Panel de administración
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                  active
                    ? "bg-white text-[var(--brand)] shadow-sm"
                    : "text-white/88 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            );
          })}

          <button
            onClick={doSignOut}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/16"
          >
            <LogOut className="h-4 w-4" />
            <span>Salir</span>
          </button>
        </nav>

        <button
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 transition hover:bg-white/16 lg:hidden"
          aria-label={open ? "Cerrar menu" : "Abrir menu"}
          aria-expanded={open}
          aria-controls="admin-mobile-menu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div
          id="admin-mobile-menu"
          className="admin-mobile-surface border-t border-white/10 backdrop-blur lg:hidden"
        >
          <div className="container-app flex flex-col gap-2 py-3">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                    active
                      ? "bg-white text-[var(--brand)]"
                      : "text-white/92 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}

            <button
              onClick={() => {
                setOpen(false);
                doSignOut();
              }}
              className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left text-sm text-white transition hover:bg-white/16"
            >
              <LogOut className="h-4 w-4" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
