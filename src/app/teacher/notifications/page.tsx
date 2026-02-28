import type { Metadata } from "next";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Bell, Hammer } from "lucide-react";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function NotificationsPage() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/teacher">Teacher</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Notifications</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6 relative">
          <Bell className="h-10 w-10 text-primary" />
          <Hammer className="h-5 w-5 text-muted-foreground absolute -bottom-1 -right-1" />
        </div>
        <h2 className="text-page-title">Notifications</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          We are currently building the notification center to keep you updated on student submissions, deadlines, and alerts. This feature will be available in an upcoming release.
        </p>
      </div>
    </>
  );
}
