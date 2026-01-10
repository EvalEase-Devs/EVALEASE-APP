"use client"

import * as React from "react"
import { IconUsers, IconFileCheck, IconClipboardList, IconChartLine, IconSettings, IconBell } from "@tabler/icons-react"
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
      icon: IconChartLine,
    },
    {
      title: "Assignments",
      url: "/teacher/assignments",
      icon: IconClipboardList,
      items: [
        {
          title: "Create New",
          url: "/teacher/assignments/create",
        },
        {
          title: "Active",
          url: "/teacher/assignments/active",
        },
        {
          title: "Expired",
          url: "/teacher/assignments/expired",
        },
      ],
    },
    {
      title: "Evaluations",
      url: "/teacher/evaluations",
      icon: IconFileCheck,
      items: [
        {
          title: "Pending Review",
          url: "/teacher/evaluations/pending",
        },
        {
          title: "Completed",
          url: "/teacher/evaluations/completed",
        },
      ],
    },
    {
      title: "Students",
      url: "/teacher/students",
      icon: IconUsers,
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
            <SidebarMenuButton size="lg" asChild>
              <a href="/teacher">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <IconFileCheck className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">EvalEase</span>
                  <span className="truncate text-xs">Teacher Portal</span>
                </div>
              </a>
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
