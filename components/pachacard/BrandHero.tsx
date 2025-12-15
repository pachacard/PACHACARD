// app/_components/BrandHero.tsx
export default function BrandHero() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* Realce suave */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-20%,rgba(255,255,255,.22),transparent_60%)]" />

      {/* Marca grande (marca de agua) */}
      <img
        src="/brand/pac-web.svg"
        alt=""
        className="select-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1400px] max-w-none opacity-[0.07]"
      />

      {/* Sellos esquina superior */}
      <img
        src="/brand/alcalde.svg"
        alt="Enrique Cabrera Sulca - Alcalde"
        className="select-none absolute left-6 top-6 h-14 w-auto opacity-95"
      />
      <img
        src="/brand/muni.svg"
        alt="Municipalidad de Pachacámac"
        className="select-none absolute right-6 top-6 h-14 w-auto opacity-95"
      />

      {/* Viñeta ligera */}
      <div className="absolute inset-0 bg-black/10" />
    </div>
  );
}
