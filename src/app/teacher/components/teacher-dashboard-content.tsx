"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { IconUsers, IconFileCheck, IconClipboardList, IconChartLine } from "@tabler/icons-react";

export function TeacherDashboardContent() {
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {/* Quick Stats */}
            <div className="grid auto-rows-min gap-4 md:grid-cols-4">
                <FadeIn delay={0.1}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                            <IconUsers className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0</div>
                            <p className="text-xs text-muted-foreground">Enrolled students</p>
                        </CardContent>
                    </Card>
                </FadeIn>
                <FadeIn delay={0.2}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                            <IconFileCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0</div>
                            <p className="text-xs text-muted-foreground">Awaiting evaluation</p>
                        </CardContent>
                    </Card>
                </FadeIn>
                <FadeIn delay={0.3}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
                            <IconClipboardList className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0</div>
                            <p className="text-xs text-muted-foreground">Active assignments</p>
                        </CardContent>
                    </Card>
                </FadeIn>
                <FadeIn delay={0.4}>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                            <IconChartLine className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">--</div>
                            <p className="text-xs text-muted-foreground">Average completion</p>
                        </CardContent>
                    </Card>
                </FadeIn>
            </div>
            {/* Main Content */}
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-8 text-center">
                <p className="text-label">More features coming soon</p>
                <p className="text-caption mt-1">This area will show recent activity and quick actions</p>
            </div>
        </div>
    );
}
