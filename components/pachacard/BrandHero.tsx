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
                  w-[500px] sm:w-[700px] lg:w-[9000px]
                   max-w-[90vw] max-h-[80vh] h-auto
             opacity-[0.10]"
        />


      {/* Sellos esquina superior */}
      <img
        src="/brand/logpa.png"
        alt="Municipalidad Distrital de Pachacámac"
        className="select-none absolute right-6 top-6 h-14 md:h-16 w-auto opacity-95 drop-shadow"
      />


      {/* Viñeta ligera */}
      <div className="absolute inset-0 bg-black/10" />
    </div>
  );
}
