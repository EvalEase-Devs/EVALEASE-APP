"use client"

import * as React from "react"
import Link from "next/link"
import { IconLayoutDashboard, IconClipboardList, IconFileCheck, IconChartLine, IconBell, IconSettings } from "@tabler/icons-react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/teacher",
      icon: IconLayoutDashboard,
    },
    {
      title: "Assignments",
      url: "/teacher/assignments/create",
      icon: IconClipboardList,
    },
    {
      title: "Evaluations",
      url: "/teacher/evaluations",
      icon: IconFileCheck,
    },
    {
      title: "Analytics",
      url: "/teacher/analytics",
      icon: IconChartLine,
    },
    {
      title: "Notifications",
      url: "/teacher/notifications",
      icon: IconBell,
    },
    {
      title: "Settings",
      url: "/teacher/settings",
      icon: IconSettings,
    },
  ],
}

export function AppSidebarTeacher({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
    avatar?: string | null
  }
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-hover:bg-sidebar-accent/50 transition-colors"
            >
              <Link href="/teacher">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
                  <IconFileCheck className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-bold text-base tracking-tight font-heading">EvalEase</span>
                  <span className="inline-flex items-center w-fit px-2 py-0.5 rounded-full bg-muted/80 text-[9px] uppercase tracking-wider font-medium text-muted-foreground">Teacher Portal</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ ...user, avatar: user.avatar || "" }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
