"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { AppSidebarTeacher } from "@/components/app-sidebar-teacher";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateAssignmentContent } from "@/app/teacher/assignments/create/components/create-assignment-content";

export default function CreateAssignmentPage() {
  const { data: session } = useSession();

  const user = {
    name: session?.user?.name || "Teacher",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  return (
    <SidebarProvider>
      <AppSidebarTeacher user={user} />
      <SidebarInset>
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
                  <BreadcrumbPage>Create Assignment</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <CreateAssignmentContent />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
