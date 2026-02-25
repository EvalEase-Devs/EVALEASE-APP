import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { AppSidebarAdmin } from "@/components/app-sidebar-admin";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ScrollText, Hammer } from "lucide-react";

export default async function AuditLogsPage() {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const session = await auth();
  const user = {
    name: session?.user?.name || "Admin",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebarAdmin user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/admin/system">System</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Audit Logs</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6 relative">
            <ScrollText className="h-10 w-10 text-primary" />
            <Hammer className="h-5 w-5 text-muted-foreground absolute -bottom-1 -right-1" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>Audit Logs</h2>
          <p className="text-muted-foreground mt-2 max-w-md">
            The audit log viewer is under development. You&apos;ll soon be able to review all administrative actions, login events, and data changes.
          </p>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
