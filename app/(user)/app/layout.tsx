// app/(user)/app/layout.tsx
import BottomNav from "@/components/pachacard/BottomNav";
import { requireActiveSession } from "@/lib/security/admin";
import { redirect } from "next/navigation";

export default async function AppSectionLayout({ children }: { children: React.ReactNode }) {
  const active = await requireActiveSession();
  if (!active) redirect("/login");

  return (
    <>
      {children}

      {/* Espacio para que la barra fija no cubra el contenido (solo móvil) */}
      <div className="h-[max(env(safe-area-inset-bottom),72px)] md:hidden" />

      {/* Barra inferior fija para todo /app/** */}
      <BottomNav />
    </>
  );
}
