"use client"

import * as React from "react"
import Link from "next/link"
import { LayoutDashboard, Users, ShieldCheck, ChartBar, Bell, Settings } from "lucide-react"
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
      icon: LayoutDashboard,
    },
    {
      title: "User Management",
      url: "/admin/users",
      icon: Users,
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
      icon: ShieldCheck,
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
      icon: ChartBar,
    },
    {
      title: "Notifications",
      url: "/admin/notifications",
      icon: Bell,
    },
    {
      title: "Settings",
      url: "/admin/settings",
      icon: Settings,
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
            <SidebarMenuButton
              size="lg"
              asChild
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-hover:bg-sidebar-accent/50 transition-colors"
            >
              <Link href="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
                  <ShieldCheck className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-bold text-base tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>EvalEase</span>
                  <span className="inline-flex items-center w-fit px-2 py-0.5 rounded-full bg-muted/80 text-[9px] uppercase tracking-wider font-medium text-muted-foreground">Admin Portal</span>
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
