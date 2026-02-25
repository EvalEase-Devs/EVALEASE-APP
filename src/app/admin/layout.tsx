import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { AppSidebarAdmin } from "@/components/app-sidebar-admin";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
