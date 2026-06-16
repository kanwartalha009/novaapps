import { Skeleton } from "@/components/charts";

/** Route-level skeleton — cards + table shimmer while a page loads. */
export default function Loading() {
  return (
    <div>
      <div className="mb-6 border-b border-zinc-200 pb-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="mt-4 h-64" />
    </div>
  );
}
