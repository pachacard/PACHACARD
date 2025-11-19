import Image from "next/image";

type BusinessLite = {
  id: string;
  name: string;
  address?: string | null;
  imageUrl?: string | null;
  _count?: { discounts: number };
};

export default function BusinessCard({ business }: { business: BusinessLite }) {
  const b = business;
  const img = b.imageUrl || "/brand/business-fallback.png"; 
  const isExternal = /^https?:\/\//i.test(img);
  const count = b._count?.discounts ?? 0;

  return (
    <div className="group overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-sm hover:shadow-md hover:ring-[var(--brand)]/40 transition">
      <div className="relative h-40 w-full border-b bg-white">
        {img ? (
          isExternal ? (
            <img src={img} alt={b.name} className="h-full w-full object-contain p-3" />
          ) : (
            <Image src={img} alt={b.name} fill className="object-contain p-3" sizes="(max-width:768px) 100vw, 33vw" />
          )
        ) : (
          <div className="grid h-full w-full place-content-center text-slate-400">Sin imagen</div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold leading-tight text-slate-900">{b.name}</h3>
            {b.address && <p className="mt-1 text-xs text-slate-600 line-clamp-1">{b.address}</p>}
          </div>
          <span className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
            {count} desc.
          </span>
        </div>

        <a
          href={`/app/businesses/${b.id}`}
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-b from-[#9a1e1e] to-[#7e1515] px-4 py-2.5 text-sm font-medium text-white shadow-[0_6px_20px_rgba(0,0,0,.20)] transition hover:shadow-[0_10px_28px_rgba(0,0,0,.25)]"
        >
          Ver negocio
        </a>
      </div>
    </div>
  );
}
