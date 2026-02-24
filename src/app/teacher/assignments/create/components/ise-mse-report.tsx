'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { exportISEMSEViaWorker } from '../utils/excel-worker-client';
import { SUBJECT_TARGETS, ATTAINMENT_CRITERIA } from '../constants';

interface ISETask {
    task_id: number;
    title: string;
    max_marks: number;
}

interface MSEQuestion {
    task_id: number;
    question_label: string;
    max_marks: number;
}

interface ColumnStructure {
    [coNo: number]: {
        ise: ISETask[];
        mse: MSEQuestion[];
    };
}

interface StudentMark {
    task_title?: string;
    label?: string;
    obtained: number;
    max: number;
}

interface StudentData {
    pid: number;
    stud_name: string;
    roll_no: number;
    coMarks: Record<number, {
        ise: Record<string | number, StudentMark>;
        mse: Record<string, StudentMark>;
    }>;
}

interface ReportResponse {
    allotment: {
        allotment_id: number;
        sub_id: string;
        class_name: string;
        current_sem: string;
    };
    teacher: {
        teacher_name: string;
    };
    students: StudentData[];
    columnStructure: ColumnStructure;
    coList: number[];
}

interface ISEMSEReportProps {
    allotmentId: number;
    onClose?: () => void;
}

export const ISEMSEReport: React.FC<ISEMSEReportProps> = ({ allotmentId, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<ReportResponse | null>(null);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                const response = await fetch(`/api/reports/ise-mse?allotment_id=${allotmentId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch report data');
                }

                const data: ReportResponse = await response.json();
                setReportData(data);
            } catch (error) {
                console.error('Error fetching report:', error);
                toast.error('Failed to load report data');
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, [allotmentId]);

    const exportToExcel = async () => {
        if (!reportData) return;
        setExporting(true);
        toast.promise(
            exportISEMSEViaWorker(reportData),
            {
                loading: 'Generating ISE-MSE report...',
                success: 'Report downloaded successfully',
                error: 'Failed to export report',
                finally: () => setExporting(false),
            }
        );
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>ISE-MSE Attainment Report</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!reportData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>ISE-MSE Attainment Report</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-red-500">Failed to load report data</p>
                </CardContent>
            </Card>
        );
    }

    const { students, columnStructure, coList, allotment, teacher } = reportData;

    // Calculate total columns span for each CO (includes 3 summary columns)
    const coColSpans = coList.map(co =>
        columnStructure[co].ise.length + columnStructure[co].mse.length + 3
    );

    // Helper function to format ISE title
    const formatISETitle = (title: string) => {
        return title.split('-').slice(-1)[0].toUpperCase();
    };

    // Calculate CO summary for a student
    const calculateCOSummary = (student: StudentData, co: number) => {
        let totalObtained = 0;
        let totalAttempted = 0;

        // Sum ISE marks
        columnStructure[co].ise.forEach(iseTask => {
            const mark = student.coMarks[co]?.ise[iseTask.task_id];
            if (mark) {
                totalObtained += mark.obtained;
                totalAttempted += mark.max;
            }
        });

        // Sum MSE marks
        columnStructure[co].mse.forEach(mseQuestion => {
            const mark = student.coMarks[co]?.mse[mseQuestion.question_label];
            if (mark) {
                totalObtained += mark.obtained;
                totalAttempted += mark.max;
            }
        });

        const percentage = totalAttempted > 0 ? ((totalObtained * 100) / totalAttempted).toFixed(2) : '0.00';
        return { totalObtained, totalAttempted, percentage };
    };

    // Calculate attainment summary for all COs
    const calculateAttainmentSummary = () => {
        const subjectTarget = SUBJECT_TARGETS[allotment.sub_id as keyof typeof SUBJECT_TARGETS] || 65;
        const summary: Record<number, { count: number; percentage: number; attainment: number }> = {};

        coList.forEach(co => {
            let countAboveTarget = 0;
            const totalStudents = students.length;

            students.forEach(student => {
                const coSummary = calculateCOSummary(student, co);
                const percentage = parseFloat(coSummary.percentage as string);
                if (percentage >= subjectTarget) {
                    countAboveTarget++;
                }
            });

            const percentageAboveTarget = totalStudents > 0 ? (countAboveTarget * 100) / totalStudents : 0;

            // Determine attainment level
            let attainment = 1; // Default
            if (percentageAboveTarget >= 60) {
                attainment = 3;
            } else if (percentageAboveTarget >= 50) {
                attainment = 2;
            } else {
                attainment = 1;
            }

            summary[co] = {
                count: countAboveTarget,
                percentage: parseFloat(percentageAboveTarget.toFixed(2)),
                attainment
            };
        });

        return summary;
    };

    const attainmentSummary = calculateAttainmentSummary();

    const subjectTarget = SUBJECT_TARGETS[allotment.sub_id as keyof typeof SUBJECT_TARGETS] || 65;

    return (
        <div className="space-y-2 w-full">
            {/* Header */}
            <Card className="py-2">
                <CardHeader className="py-2 px-4">
                    <CardTitle className="text-sm">ISE-MSE ANALYSIS</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1 px-4 py-2">
                    <p className="font-bold text-xs">ST. FRANCIS INSTITUTE OF TECHNOLOGY</p>
                    <p className="text-xs">Subject: {allotment.sub_id} | Class: {allotment.class_name} | Semester: {allotment.current_sem}</p>
                    <p className="text-xs">Teacher: {teacher.teacher_name}</p>
                    <p className="text-xs font-semibold text-blue-600 border-t border-slate-300 pt-2 mt-2">Subject Target: {subjectTarget}%</p>
                </CardContent>

            </Card>

            {/* Download Button */}
            <div className="flex gap-2 justify-end px-2">
                <Button onClick={exportToExcel} disabled={exporting} size="sm" className="text-xs h-8">
                    {exporting ? 'Exporting...' : 'Download Excel Report'}
                </Button>
            </div>

            {/* Data Table */}
            <Card className="py-2">
                <CardContent className="pt-2 px-2 overflow-auto" style={{ maxHeight: 'calc(95vh - 280px)' }}>
                    <table className="w-full text-[10px] border-collapse border-4 border-black">
                        <thead>
                            {/* Level 1: CO Headers */}
                            <tr className="bg-gradient-to-r from-slate-400 to-slate-300 text-slate-900">
                                <th className="border-2 border-black px-2 py-1 h-10 font-bold text-center text-[9px]" rowSpan={3}>Roll No</th>
                                <th className="border-2 border-black px-2 py-1 h-10 font-bold text-center text-[9px]" rowSpan={3}>PID</th>
                                <th className="border-2 border-black px-2 py-1 h-10 font-bold text-center text-[9px]" rowSpan={3}>Name</th>
                                {coList.map(co => (
                                    <th
                                        key={`co-${co}`}
                                        className="border-2 border-black px-1 py-1 font-bold text-center text-[9px]"
                                        colSpan={coColSpans[coList.indexOf(co)]}
                                    >
                                        CO{co}
                                    </th>
                                ))}
                            </tr>

                            {/* Level 2: ISE/MSE Headers */}
                            <tr className="bg-slate-300 text-slate-900">
                                {coList.map(co => (
                                    <React.Fragment key={`ise-mse-${co}`}>
                                        {columnStructure[co].ise.length > 0 && (
                                            <th
                                                className="border-2 border-black px-1 py-1 font-semibold text-center text-[9px]"
                                                colSpan={columnStructure[co].ise.length}
                                            >
                                                ISE
                                            </th>
                                        )}
                                        {columnStructure[co].mse.length > 0 && (
                                            <th
                                                className="border-2 border-black px-1 py-1 font-semibold text-center text-[9px]"
                                                colSpan={columnStructure[co].mse.length}
                                            >
                                                MSE
                                            </th>
                                        )}
                                        <th
                                            className="border-2 border-black px-1 py-1 font-semibold text-center bg-amber-400 text-slate-900 text-[9px]"
                                            colSpan={3}
                                        >
                                            Summary
                                        </th>
                                    </React.Fragment>
                                ))}
                            </tr>

                            {/* Level 3: Task/Question Names */}
                            <tr className="bg-slate-200 text-slate-900">
                                {coList.map(co => (
                                    <React.Fragment key={`tasks-${co}`}>
                                        {columnStructure[co].ise.map(iseTask => (
                                            <th
                                                key={`ise-${iseTask.task_id}`}
                                                className="border-2 border-black px-1 py-1 text-center font-semibold text-[8px]"
                                            >
                                                <div>{formatISETitle(iseTask.title)}</div>
                                                <div className="text-[7px] text-slate-600 font-normal">({iseTask.max_marks})</div>
                                            </th>
                                        ))}
                                        {columnStructure[co].mse.map(mseQuestion => (
                                            <th
                                                key={`mse-${mseQuestion.question_label}`}
                                                className="border-2 border-black px-1 py-1 text-center font-semibold text-[8px]"
                                            >
                                                <div>{mseQuestion.question_label}</div>
                                                <div className="text-[7px] text-slate-600 font-normal">({mseQuestion.max_marks})</div>
                                            </th>
                                        ))}
                                        <th className="border-2 border-black px-1 py-1 text-center font-semibold bg-amber-300 text-slate-900">
                                            <div className="text-[8px]">Obtained</div>
                                        </th>
                                        <th className="border-2 border-black px-1 py-1 text-center font-semibold bg-amber-300 text-slate-900">
                                            <div className="text-[8px]">Attempted</div>
                                        </th>
                                        <th className="border-2 border-black px-1 py-1 text-center font-semibold bg-amber-300 text-slate-900">
                                            <div className="text-[8px]">%</div>
                                        </th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {students.map(student => (
                                <tr key={student.pid} className="hover:bg-slate-100 border-b-2 border-black">
                                    <td className="border-2 border-black px-1 py-1 text-center font-bold bg-slate-100 text-[9px]">{student.roll_no}</td>
                                    <td className="border-2 border-black px-1 py-1 text-center bg-slate-100 text-[9px]">{student.pid}</td>
                                    <td className="border-2 border-black px-1 py-1 font-bold min-w-32 bg-slate-100 text-[9px]">{student.stud_name}</td>

                                    {/* Data cells */}
                                    {coList.map(co => {
                                        const summary = calculateCOSummary(student, co);
                                        return (
                                            <React.Fragment key={`data-${student.pid}-${co}`}>
                                                {/* ISE marks */}
                                                {columnStructure[co].ise.map(iseTask => {
                                                    const mark = student.coMarks[co]?.ise[iseTask.task_id];
                                                    return (
                                                        <td
                                                            key={`ise-data-${student.pid}-${iseTask.task_id}`}
                                                            className="border-2 border-black px-1 py-1 text-center font-semibold text-[9px]"
                                                        >
                                                            {mark ? `${mark.obtained}` : '0'}
                                                        </td>
                                                    );
                                                })}

                                                {/* MSE marks */}
                                                {columnStructure[co].mse.map(mseQuestion => {
                                                    const mark = student.coMarks[co]?.mse[mseQuestion.question_label];
                                                    return (
                                                        <td
                                                            key={`mse-data-${student.pid}-${mseQuestion.question_label}`}
                                                            className="border-2 border-black px-1 py-1 text-center font-semibold text-[9px]"
                                                        >
                                                            {mark ? `${mark.obtained}` : '0'}
                                                        </td>
                                                    );
                                                })}

                                                {/* Summary columns */}
                                                <td className="border-2 border-black px-1 py-1 text-center font-bold bg-amber-100 text-[9px]">
                                                    {summary.totalObtained}
                                                </td>
                                                <td className="border-2 border-black px-1 py-1 text-center font-bold bg-amber-100 text-[9px]">
                                                    {summary.totalAttempted}
                                                </td>
                                                <td className="border-2 border-black px-1 py-1 text-center font-bold bg-amber-100 text-[9px]">
                                                    {summary.percentage}%
                                                </td>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* Subject Target Summary Table */}
            <Card className="py-2">
                <CardHeader className="py-2 px-4">
                    <CardTitle className="text-xs">Students Scoring Above {SUBJECT_TARGETS[allotment.sub_id as keyof typeof SUBJECT_TARGETS] || 65}%</CardTitle>
                </CardHeader>
                <CardContent className="px-4">
                    <table className="w-full text-[10px] border-collapse border-2 border-black">
                        <thead>
                            <tr className="bg-slate-400">
                                <th className="border-2 border-black px-2 py-1 font-bold text-center">Criteria</th>
                                {coList.map(co => (
                                    <th key={`summary-co-${co}`} className="border-2 border-black px-2 py-1 font-bold text-center">
                                        CO{co}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-slate-100">
                                <td className="border-2 border-black px-2 py-1 font-bold">Count</td>
                                {coList.map(co => (
                                    <td key={`count-${co}`} className="border-2 border-black px-2 py-1 text-center font-bold">
                                        {attainmentSummary[co].count}
                                    </td>
                                ))}
                            </tr>
                            <tr className="bg-amber-100">
                                <td className="border-2 border-black px-2 py-1 font-bold">Percentage</td>
                                {coList.map(co => (
                                    <td key={`percentage-${co}`} className="border-2 border-black px-2 py-1 text-center font-bold">
                                        {attainmentSummary[co].percentage.toFixed(2)}%
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* CO Attainment Table */}
            <Card className="py-2">
                <CardHeader className="py-2 px-4">
                    <CardTitle className="text-xs">CO Attainment</CardTitle>
                </CardHeader>
                <CardContent className="px-4 space-y-4">
                    <table className="w-full text-[10px] border-collapse border-2 border-black">
                        <thead>
                            <tr className="bg-slate-400">
                                <th className="border-2 border-black px-2 py-1 font-bold text-center">Attainment</th>
                                {coList.map(co => (
                                    <th key={`attain-co-${co}`} className="border-2 border-black px-2 py-1 font-bold text-center">
                                        CO{co}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-blue-100">
                                <td className="border-2 border-black px-2 py-1 font-bold text-center">Scale (1-3)</td>
                                {coList.map(co => (
                                    <td key={`attain-val-${co}`} className="border-2 border-black px-2 py-1 text-center font-bold text-lg">
                                        {attainmentSummary[co].attainment}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>

                    {/* Attainment Criteria Legend */}
                    <table className="w-full text-[10px] border-collapse border-2 border-black">
                        <thead>
                            <tr className="bg-slate-400">
                                <th className="border-2 border-black px-2 py-1 font-bold text-center">Attainment</th>
                                <th className="border-2 border-black px-2 py-1 font-bold text-left">Condition (Students scoring above {subjectTarget}%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-green-100">
                                <td className="border-2 border-black px-2 py-1 text-center font-bold text-lg">3</td>
                                <td className="border-2 border-black px-2 py-1 text-xs">If 60% and above students have scored above {subjectTarget}%</td>
                            </tr>
                            <tr className="bg-yellow-100">
                                <td className="border-2 border-black px-2 py-1 text-center font-bold text-lg">2</td>
                                <td className="border-2 border-black px-2 py-1 text-xs">If 50% to 60% of students have scored above {subjectTarget}%</td>
                            </tr>
                            <tr className="bg-red-100">
                                <td className="border-2 border-black px-2 py-1 text-center font-bold text-lg">1</td>
                                <td className="border-2 border-black px-2 py-1 text-xs">If less than 50% students have scored above {subjectTarget}%</td>
                            </tr>
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
};
