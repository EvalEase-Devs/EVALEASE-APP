"use client"

import * as React from "react"
import { IconUsers, IconUserCheck, IconSettings, IconChartBar, IconShieldCheck, IconBell } from "@tabler/icons-react"
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
      url: "/admin",
      icon: IconChartBar,
    },
    {
      title: "User Management",
      url: "/admin/users",
      icon: IconUsers,
      items: [
        {
          title: "All Users",
          url: "/admin/users/all",
        },
        {
          title: "Teachers",
          url: "/admin/users/teachers",
        },
        {
          title: "Students",
          url: "/admin/users/students",
        },
        {
          title: "Add User",
          url: "/admin/users/add",
        },
      ],
    },
    {
      title: "System",
      url: "/admin/system",
      icon: IconShieldCheck,
      items: [
        {
          title: "Overview",
          url: "/admin/system/overview",
        },
        {
          title: "Audit Logs",
          url: "/admin/system/logs",
        },
        {
          title: "Backups",
          url: "/admin/system/backups",
        },
      ],
    },
    {
      title: "Analytics",
      url: "/admin/analytics",
      icon: IconChartBar,
    },
    {
      title: "Notifications",
      url: "/admin/notifications",
      icon: IconBell,
    },
    {
      title: "Settings",
      url: "/admin/settings",
      icon: IconSettings,
    },
  ],
}

export function AppSidebarAdmin({
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
              <a href="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <IconShieldCheck className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">EvalEase</span>
                  <span className="truncate text-xs">Admin Portal</span>
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
