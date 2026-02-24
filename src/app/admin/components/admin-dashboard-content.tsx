"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { IconUsers, IconUserCheck, IconShieldCheck } from "@tabler/icons-react";

export function AdminDashboardContent() {
    return (
        <>
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                {/* Quick Stats */}
                <div className="grid auto-rows-min gap-4 md:grid-cols-4">
                    <FadeIn delay={0.1}>
                        <Card className="hover-lift">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                                <IconUsers className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">0</div>
                                <p className="text-xs text-muted-foreground">System users</p>
                            </CardContent>
                        </Card>
                    </FadeIn>
                    <FadeIn delay={0.2}>
                        <Card className="hover-lift">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
                                <IconUserCheck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">0</div>
                                <p className="text-xs text-muted-foreground">Teaching staff</p>
                            </CardContent>
                        </Card>
                    </FadeIn>
                    <FadeIn delay={0.3}>
                        <Card className="hover-lift">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Students</CardTitle>
                                <IconUsers className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">0</div>
                                <p className="text-xs text-muted-foreground">Enrolled students</p>
                            </CardContent>
                        </Card>
                    </FadeIn>
                    <FadeIn delay={0.4}>
                        <Card className="hover-lift">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                                <IconShieldCheck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">✓</div>
                                <p className="text-xs text-muted-foreground">All systems operational</p>
                            </CardContent>
                        </Card>
                    </FadeIn>
                </div>
            </div>
            {/* Main Content */}
            <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min">
                <h2 className="text-lg font-semibold mb-4">System Overview</h2>
                <p className="text-sm text-muted-foreground">
                    System analytics and management tools will be available here.
                </p>
            </div>
        </>
    );
}
