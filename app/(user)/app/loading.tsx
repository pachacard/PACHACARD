import SkeletonCard from "@/components/pachacard/SkeletonCard";

export default function LoadingDiscounts() {
  return (
    <div className="container-app py-6">
      <div className="mb-4">
        <div className="h-6 w-40 rounded bg-slate-200" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="h-16" /> {/* espacio para BottomNav */}
    </div>
  );
}
