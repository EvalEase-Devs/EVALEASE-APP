import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { AppSidebarStudent } from "@/components/app-sidebar-student";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Bell, Hammer } from "lucide-react";

export default async function StudentNotificationsPage() {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const session = await auth();

  const user = {
    name: session?.user?.name || "Student",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebarStudent user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/student">Student</BreadcrumbLink>
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
          <h2 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>Notifications</h2>
          <p className="text-muted-foreground mt-2 max-w-md">
            We are currently building the notification center to keep you updated on assignment deadlines and submission confirmations. This feature will be available in an upcoming release.
          </p>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
