import { Skeleton } from "@/components/ui/skeleton";

export default function MenuLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10" aria-busy="true">
      <Skeleton className="h-9 w-32" />
      <Skeleton className="mt-3 mb-6 h-5 w-72 max-w-full" />
      <Skeleton className="h-11 w-full" />
      <div className="mt-5 flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="flex gap-3 rounded-xl border border-border p-3 sm:flex-col">
            <Skeleton className="size-28 shrink-0 sm:aspect-[4/3] sm:size-auto sm:w-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-6 w-20" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
