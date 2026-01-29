// components/SiteHeader.tsx
import Link from "next/link";
import { auth } from "@/lib/auth";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function SiteHeader() {
  const session = await auth();
  const role = session?.user?.role ?? "USER";

  return (
    <header className="topbar">
      <div className="container-app flex items-center justify-between h-12">
        <Link href="/" className="font-semibold">
          Plataforma de Descuentos
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {!session?.user && <Link href="/login">Entrar</Link>}

          {session?.user && role === "ADMIN" && (
            <>
              <Link href="/admin">Admin</Link>
              <LogoutButton />
            </>
          )}

          {session?.user && role !== "ADMIN" && (
            <>
              <Link href="/app">Mis beneficios</Link>
              <Link href="/app/me">Mi información (QR)</Link>
              <Link href="/app/history">Historial</Link>
              <LogoutButton />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
