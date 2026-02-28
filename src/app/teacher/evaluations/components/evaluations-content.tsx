"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/fade-in";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IconChartBar, IconFileText, IconMicroscope } from "@tabler/icons-react";
import { ISEMSEReportModal } from "@/app/teacher/assignments/create/components/ise-mse-report-modal";
import { LabAttainmentModal } from "@/app/teacher/assignments/create/components/lab-attainment-modal";
import { useAllotments } from "@/hooks/use-api";

interface AllotmentData {
    allotment_id: number;
    sub_id: string;
    subjectName: string;
    sub_name?: string;
    class_name: string;
    current_sem: string;
    teacher_id: number;
    type: 'Lec' | 'Lab';
    semester: string;
    subject: string;
    is_subject_incharge: boolean;
}

export function EvaluationsContent() {
    const { allotments: rawAllotments, loading } = useAllotments();
    const allotments = useMemo(
        () => (rawAllotments as unknown as AllotmentData[]) ?? [],
        [rawAllotments]
    );
    const [selectedReportAllotment, setSelectedReportAllotment] = useState<AllotmentData | null>(null);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [selectedLabReportAllotment, setSelectedLabReportAllotment] = useState<AllotmentData | null>(null);
    const [isLabReportOpen, setIsLabReportOpen] = useState(false);

    const handleGenerateReport = (allotment: AllotmentData) => {
        setSelectedReportAllotment(allotment);
        setIsReportOpen(true);
    };

    const handleGenerateLabReport = (allotment: AllotmentData) => {
        setSelectedLabReportAllotment(allotment);
        setIsLabReportOpen(true);
    };

    // Filter allotments
    const lecAllotments = allotments.filter(a => a.type === 'Lec');
    // Only subject incharge teachers can generate lab attainment reports
    const labAllotments = allotments.filter(a => a.type === 'Lab' && a.is_subject_incharge);

    return (
        <>
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                {/* Header Section */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Evaluations & Reports</h1>
                    <p className="text-muted-foreground">
                        Generate comprehensive attainment reports for your allotted subjects
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <FadeIn delay={0.1}>
                        <Card className="hover-lift">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Allotted Subjects</CardTitle>
                                <IconFileText size={16} className="text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {loading ? <Skeleton className="h-8 w-12" /> : allotments.length}
                                </div>
                                <p className="text-xs text-muted-foreground">Available for evaluation</p>
                            </CardContent>
                        </Card>
                    </FadeIn>
                    <FadeIn delay={0.2}>
                        <Card className="hover-lift">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Lecture Reports</CardTitle>
                                <IconChartBar size={16} className="text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {loading ? <Skeleton className="h-8 w-12" /> : lecAllotments.length}
                                </div>
                                <p className="text-xs text-muted-foreground">ISE-MSE Attainment</p>
                            </CardContent>
                        </Card>
                    </FadeIn>
                    <FadeIn delay={0.3}>
                        <Card className="hover-lift">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Lab Reports</CardTitle>
                                <IconMicroscope size={16} className="text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {loading ? <Skeleton className="h-8 w-12" /> : labAllotments.length}
                                </div>
                                <p className="text-xs text-muted-foreground">LO Attainment</p>
                            </CardContent>
                        </Card>
                    </FadeIn>
                </div>

                {/* ISE-MSE Reports Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>ISE-MSE Attainment Reports</CardTitle>
                        <CardDescription>
                            Click on a lecture subject to generate its comprehensive attainment report
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        ) : lecAllotments.length === 0 ? (
                            <div className="py-8 text-center">
                                <IconFileText size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
                                <p className="text-muted-foreground">
                                    No lecture subjects allotted yet.{" "}
                                    <a href="/teacher/assignments/create" className="text-primary hover:underline">
                                        Go to assignments to allot subjects
                                    </a>
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {lecAllotments.map((allotment, index) => (
                                    <FadeIn key={allotment.allotment_id} delay={index * 0.05}>
                                        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <p className="font-semibold">{allotment.subjectName}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {allotment.sub_name ? `${allotment.sub_id} (${allotment.sub_name})` : allotment.sub_id} • {allotment.class_name} • {allotment.current_sem}
                                                        </p>
                                                    </div>
                                                    <Badge variant="default">
                                                        Lecture
                                                    </Badge>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => handleGenerateReport(allotment)}
                                                size="sm"
                                            >
                                                <IconChartBar size={16} className="mr-2" />
                                                View Report
                                            </Button>
                                        </div>
                                    </FadeIn>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Lab Reports Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Lab Attainment Reports</CardTitle>
                        <CardDescription>
                            Click on a lab subject to generate its comprehensive attainment report
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        ) : labAllotments.length === 0 ? (
                            <div className="py-8 text-center">
                                <IconMicroscope size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
                                <p className="text-muted-foreground">
                                    No lab subjects allotted yet.{" "}
                                    <a href="/teacher/assignments/create" className="text-primary hover:underline">
                                        Go to assignments to allot subjects
                                    </a>
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {labAllotments.map((allotment, index) => (
                                    <FadeIn key={allotment.allotment_id} delay={index * 0.05}>
                                        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <p className="font-semibold">{allotment.subjectName}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {allotment.sub_name ? `${allotment.sub_id} (${allotment.sub_name})` : allotment.sub_id} • {allotment.class_name} • {allotment.current_sem}
                                                        </p>
                                                    </div>
                                                    <Badge variant="secondary">
                                                        Lab
                                                    </Badge>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => handleGenerateLabReport(allotment)}
                                                size="sm"
                                            >
                                                <IconMicroscope size={16} className="mr-2" />
                                                View Report
                                            </Button>
                                        </div>
                                    </FadeIn>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-info-subtle border-info dark:bg-blue-950 dark:border-blue-800">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <IconChartBar size={20} />
                                About ISE-MSE Attainment Reports
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                            <p>
                                <strong>ISE-MSE Attainment Reports</strong> provide a comprehensive analysis of student performance against course outcomes (COs):
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                <li>CO-wise marks allocation based on ISE and MSE assessments</li>
                                <li>Student performance tracking with percentage calculations</li>
                                <li>Attainment levels (1-3 scale) based on percentage of students meeting targets</li>
                                <li>Downloadable Excel reports for record keeping and analysis</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="bg-success-subtle border-success dark:bg-emerald-950 dark:border-emerald-800">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <IconMicroscope size={20} />
                                About Lab Attainment Reports
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                            <p>
                                <strong>Lab Attainment Reports</strong> provide a comprehensive analysis of student performance against learning outcomes (LOs):
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                <li>LO-wise marks allocation based on lab experiment assessments</li>
                                <li>Experiment-level tracking with multiple LOs per experiment</li>
                                <li>Attainment levels (1-3 scale) based on percentage of students meeting targets</li>
                                <li>Downloadable Excel reports for record keeping and analysis</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ISE-MSE Report Modal */}
            {selectedReportAllotment && (
                <ISEMSEReportModal
                    open={isReportOpen}
                    onOpenChange={(open: boolean) => {
                        setIsReportOpen(open);
                        if (!open) setSelectedReportAllotment(null);
                    }}
                    allotmentId={selectedReportAllotment.allotment_id}
                    subjectCode={selectedReportAllotment.sub_id}
                />
            )}

            {/* Lab Attainment Report Modal */}
            {selectedLabReportAllotment && (
                <LabAttainmentModal
                    isOpen={isLabReportOpen}
                    onClose={() => {
                        setIsLabReportOpen(false);
                        setSelectedLabReportAllotment(null);
                    }}
                    allotmentId={selectedLabReportAllotment.allotment_id}
                />
            )}
        </>
    );
}
