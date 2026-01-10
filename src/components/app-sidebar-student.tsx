"use client"

import * as React from "react"
import { IconBook, IconFileText, IconChartBar, IconBell, IconSettings } from "@tabler/icons-react"
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
      url: "/student",
      icon: IconChartBar,
    },
    {
      title: "Assignments",
      url: "/student/assignments",
      icon: IconFileText,
      items: [
        {
          title: "Pending",
          url: "/student/assignments/pending",
        },
        {
          title: "Submitted",
          url: "/student/assignments/submitted",
        },
      ],
    },
    {
      title: "My Courses",
      url: "/student/courses",
      icon: IconBook,
    },
    {
      title: "Notifications",
      url: "/student/notifications",
      icon: IconBell,
    },
    {
      title: "Settings",
      url: "/student/settings",
      icon: IconSettings,
    },
  ],
}

export function AppSidebarStudent({
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
              <a href="/student">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <IconBook className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">EvalEase</span>
                  <span className="truncate text-xs">Student Portal</span>
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
