import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { AppSidebarTeacher } from "@/components/app-sidebar-teacher";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const session = await auth();

  const user = {
    name: session?.user?.name || "Teacher",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebarTeacher user={user} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
