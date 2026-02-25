import { Skeleton } from "@/components/ui/skeleton";
import { StatsSkeleton, CardsGridSkeleton } from "@/components/skeletons";

export default function TeacherLoading() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <Skeleton className="h-7 w-7 rounded-md" />
          <div className="mr-2 h-4 w-px bg-border" />
          <Skeleton className="h-4 w-36" />
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <StatsSkeleton count={4} />
        <CardsGridSkeleton count={3} />
      </div>
    </>
  );
}
