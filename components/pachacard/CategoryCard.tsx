import Link from "next/link";

export default function CategoryCard({ c }: { c: any }) {
  return (
    <Link
      href={`/app/c/${c.slug}`}
      className="group rounded-xl border bg-white hover:shadow-md transition p-4 flex flex-col"
    >
      <div className="text-2xl">{c.icon ?? "🏷️"}</div>
      <div className="mt-2 font-medium">{c.name}</div>
      <div className="text-sm text-slate-500">
        {c._count.discounts} descuento{c._count.discounts === 1 ? "" : "s"}
      </div>
      <div className="mt-2 text-[12px] text-[var(--brand)]/80 group-hover:underline">
        Ver descuentos
      </div>
    </Link>
  );
}
