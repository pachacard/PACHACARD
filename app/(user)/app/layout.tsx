// app/(user)/app/layout.tsx
import BottomNav from "@/app/_components/BottomNav";

export default function AppSectionLayout({ children }: { children: React.ReactNode }) {
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
