import { Skeleton } from "@/components/ui/skeleton";
import { CardsGridSkeleton } from "@/components/skeletons";

export default function AssignmentsLoading() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <Skeleton className="h-7 w-7 rounded-md" />
          <div className="mr-2 h-4 w-px bg-border" />
          <Skeleton className="h-4 w-40" />
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        <CardsGridSkeleton count={6} />
      </div>
    </>
  );
}
