import { Skeleton } from "@/components/ui/skeleton";
import { StatsSkeleton, CardsGridSkeleton } from "@/components/skeletons";

export default function StudentLoading() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 px-4">
          <Skeleton className="h-7 w-7 rounded-md" />
          <div className="mr-2 h-4 w-px bg-border" />
          <Skeleton className="h-4 w-28" />
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-4 overflow-auto">
        {/* Welcome card skeleton */}
        <div className="rounded-lg border p-6 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <StatsSkeleton count={4} />
        <CardsGridSkeleton count={3} />
      </div>
    </div>
  );
}
