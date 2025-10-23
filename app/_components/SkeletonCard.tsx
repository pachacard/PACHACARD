export default function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-pulse">
      <div className="h-40 w-full bg-slate-100" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-2/3 rounded bg-slate-100" />
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-5/6 rounded bg-slate-100" />
        <div className="mt-2 h-9 w-full rounded bg-slate-100" />
      </div>
    </div>
  );
}
