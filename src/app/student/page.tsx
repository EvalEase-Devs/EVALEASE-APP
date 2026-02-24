import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { AppSidebarStudent } from "@/components/app-sidebar-student";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { StudentDashboardContent } from "./components/student-dashboard-content";

export default async function StudentDashboard() {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const session = await auth();

  const user = {
    name: session?.user?.name || "Student",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  // Get first name for greeting
  const firstName = user.name.split(" ")[0];

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebarStudent user={user} />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium">Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <StudentDashboardContent firstName={firstName} />
      </SidebarInset>
    </SidebarProvider>
  );
}
