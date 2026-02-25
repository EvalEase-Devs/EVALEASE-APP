import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { FileQuestion } from "lucide-react";

export default function TeacherNotFound() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm text-muted-foreground">Page Not Found</span>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 mb-6">
          <FileQuestion className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>Page Not Found</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Please check the URL or navigate back to the dashboard.
        </p>
        <Button asChild className="mt-6">
          <Link href="/teacher">Back to Dashboard</Link>
        </Button>
      </div>
    </>
  );
}
