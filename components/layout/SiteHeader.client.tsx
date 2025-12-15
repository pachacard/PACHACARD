"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function SiteHeaderClient() {
  const { data } = useSession();
  const pathname = usePathname();
  const role = (data as any)?.user?.role ?? "USER";

  const LinkItem = ({ href, label }: { href: string; label: string }) => (
    <Link
      href={href}
      className={(pathname?.startsWith(href) ? "underline " : "") + "text-white/90 hover:text-white transition"}
    >
      {label}
    </Link>
  );

  return (
    <header className="topbar">
      <div className="container-app flex items-center justify-between h-12">
        <Link href="/" className="font-semibold text-white hover:text-white">
          Plataforma de Descuentos
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {!data?.user && <LinkItem href="/login" label="Entrar" />}

          {data?.user && role === "ADMIN" && (
            <>
              <LinkItem href="/admin" label="Admin" />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-white/90 hover:text-white transition"
              >
                Salir
              </button>
            </>
          )}

          {data?.user && role !== "ADMIN" && (
            <>
              <LinkItem href="/app" label="Mis descuentos" />
              <LinkItem href="/app/me" label="Mi información (QR)" />
              <LinkItem href="/app/history" label="Historial" />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-white/90 hover:text-white transition"
              >
                Salir
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
