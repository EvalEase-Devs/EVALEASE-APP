"use client"

import * as React from "react"
import Link from "next/link"
import { IconLayoutDashboard, IconClipboardList, IconBell, IconSettings, IconBook } from "@tabler/icons-react"
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
      icon: IconLayoutDashboard,
    },
    {
      title: "Assignments",
      url: "/student/assignments",
      icon: IconClipboardList,
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
            <SidebarMenuButton
              size="lg"
              asChild
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-hover:bg-sidebar-accent/50 transition-colors"
            >
              <Link href="/student">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
                  <IconBook className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-bold text-base tracking-tight font-heading">EvalEase</span>
                  <span className="inline-flex items-center w-fit px-2 py-0.5 rounded-full bg-muted/80 text-[9px] uppercase tracking-wider font-medium text-muted-foreground">Student Portal</span>
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
