"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { IconUsers, IconUserCheck, IconShieldCheck, IconChartBar, IconArrowRight } from "@tabler/icons-react";
import { useAdminPerformanceOverview } from "@/hooks/use-api";

export function AdminDashboardContent() {
    const { data, loading } = useAdminPerformanceOverview();

    const totalUsers = (data?.metrics.totalStudents || 0) + (data?.metrics.activeTeachers || 0);
    const topClasses = (data?.classPerformance || []).slice(0, 3);

    return (
        <>
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                {/* Quick Stats */}
                <div className="grid auto-rows-min gap-4 md:grid-cols-4">
                    <FadeIn delay={0.1}>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                                <IconUsers className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalUsers}</div>
                                <p className="text-xs text-muted-foreground">System users</p>
                            </CardContent>
                        </Card>
                    </FadeIn>
                    <FadeIn delay={0.2}>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
                                <IconUserCheck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{data?.metrics.activeTeachers ?? 0}</div>
                                <p className="text-xs text-muted-foreground">Teaching staff</p>
                            </CardContent>
                        </Card>
                    </FadeIn>
                    <FadeIn delay={0.3}>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Students</CardTitle>
                                <IconUsers className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{data?.metrics.totalStudents ?? 0}</div>
                                <p className="text-xs text-muted-foreground">Enrolled students</p>
                            </CardContent>
                        </Card>
                    </FadeIn>
                    <FadeIn delay={0.4}>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                                <IconShieldCheck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-success">✓</div>
                                <p className="text-xs text-muted-foreground">All systems operational</p>
                            </CardContent>
                        </Card>
                    </FadeIn>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Performance Snapshot</CardTitle>
                            <IconChartBar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {loading ? (
                                <p className="text-sm text-muted-foreground">Loading analytics overview...</p>
                            ) : (
                                <>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div className="rounded-lg border border-border/60 p-3">
                                            <p className="text-xs text-muted-foreground">Average Score</p>
                                            <p className="text-xl font-semibold">{data?.metrics.averageScore ?? 0}%</p>
                                        </div>
                                        <div className="rounded-lg border border-border/60 p-3">
                                            <p className="text-xs text-muted-foreground">Submission Rate</p>
                                            <p className="text-xl font-semibold">{data?.metrics.submissionRate ?? 0}%</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {topClasses.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No class performance data available yet.</p>
                                        ) : (
                                            topClasses.map((item) => (
                                                <div key={item.class_name} className="space-y-1">
                                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                        <span>{item.class_name}</span>
                                                        <span>{item.average}%</span>
                                                    </div>
                                                    <Progress value={item.average} />
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Next Action</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Open advanced analytics for filter-based insights by class, semester, and subject.
                            </p>
                            <Button asChild className="w-full">
                                <Link href="/admin/analytics">
                                    Open Analytics
                                    <IconArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
