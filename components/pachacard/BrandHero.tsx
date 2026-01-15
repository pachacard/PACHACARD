// app/components/BrandHero.tsx
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
        className="select-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                  w-[1200px] sm:w-[1600px] max-w-none opacity-[0.10]"
      />


      {/* Sellos esquina superior */}
  
      <img
        src="/brand/logpa.png"
        alt="Municipalidad Distrital de Pachacámac"
        className="select-none absolute right-6 top-6 h-16 w-auto opacity-95"

      />

      {/* Viñeta ligera */}
      <div className="absolute inset-0 bg-black/10" />
    </div>
  );
}
