import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { AppSidebarStudent } from "@/components/app-sidebar-student";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
