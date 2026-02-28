import type { Metadata } from "next";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { IconSettings, IconHammer } from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "Settings",
};

export default function StudentSettingsPage() {
  return (
    <>
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
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6 relative">
            <IconSettings size={40} className="text-primary" />
            <IconHammer size={20} className="text-muted-foreground absolute -bottom-1 -right-1" />
        </div>
        <h2 className="text-page-title">Settings</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          Portal settings and preferences will be available in an upcoming release. You&apos;ll be able to customize your profile, notification preferences, and display options.
        </p>
      </div>
    </>
  );
}
