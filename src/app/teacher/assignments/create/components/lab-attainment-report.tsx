'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import { SUBJECT_TARGETS } from '../constants';

interface ExperimentData {
    exp_no: number;
    title: string;
    max_marks: number;
}

interface LoStructure {
    [loNo: number]: ExperimentData[];
}

interface StudentMark {
    obtained: number;
    max: number;
}

interface StudentData {
    pid: number;
    stud_name: string;
    roll_no: number;
    loMarks: Record<number, Record<number, StudentMark>>;
}

interface ReportResponse {
    allotment: {
        allotment_id: number;
        sub_id: string;
        sub_name?: string;
        class_name: string;
        batch_no: number;
        current_sem: string;
    };
    teacher: {
        teacher_name: string;
    };
    students: StudentData[];
    loStructure: LoStructure;
    loList: number[];
}

interface LabAttainmentReportProps {
    allotmentId: number;
    onClose?: () => void;
}

export const LabAttainmentReport: React.FC<LabAttainmentReportProps> = ({ allotmentId, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<ReportResponse | null>(null);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                const response = await fetch(`/api/reports/lab-attainment?allotment_id=${allotmentId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch report data');
                }

                const data: ReportResponse = await response.json();
                console.log('Lab Report Data:', data);
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

        try {
            setExporting(true);
            const { students, loStructure, loList, allotment } = reportData;
            const worksheetData: any[] = [];

            // Header section
            worksheetData.push(['ST. FRANCIS INSTITUTE OF TECHNOLOGY']);
            worksheetData.push(['Mount Poinsur, SVP Road, Borivali (W), MUMBAI - 400103.']);
            worksheetData.push([]);
            worksheetData.push(['LAB ATTAINMENT ANALYSIS']);
            worksheetData.push([
                `Subject: ${allotment.sub_id}`,
                `Class: ${allotment.class_name}`,
                `Batch: ${allotment.batch_no}`,
                `Semester: ${allotment.current_sem}`,
            ]);
            worksheetData.push([`Teacher: ${reportData.teacher.teacher_name}`]);
            worksheetData.push([]);

            // Build headers
            const level1Row = ['Roll No', 'PID', 'Name'];
            const level2Row: any[] = ['', '', ''];
            const level3Row = ['Roll No', 'PID', 'Name'];

            let colIndexForMerge = 3;
            const merges: any[] = [];

            loList.forEach((lo) => {
                const expCount = loStructure[lo].length;

                // Level 1: LO headers
                level1Row.push(`LO${lo}`);
                merges.push({
                    s: { r: 7, c: colIndexForMerge },
                    e: { r: 7, c: colIndexForMerge + expCount + 2 }, // +2 for Summary columns
                });

                // Level 2: Experiment headers and Summary
                loStructure[lo].forEach((exp) => {
                    level2Row.push(`Exp${exp.exp_no}`);
                });
                level2Row.push('Summary');
                merges.push({
                    s: { r: 8, c: colIndexForMerge },
                    e: { r: 8, c: colIndexForMerge + expCount - 1 },
                });

                // Level 3: Max marks for each experiment and Summary headers
                loStructure[lo].forEach((exp) => {
                    level3Row.push(`(${exp.max_marks})`);
                });
                level3Row.push('Obtained', 'Attempted', 'Percentage');

                colIndexForMerge += expCount + 3;
            });

            worksheetData.push(level1Row);
            worksheetData.push(level2Row);
            worksheetData.push(level3Row);

            // Student data rows
            students.forEach((student) => {
                const dataRow = [student.roll_no, student.pid, student.stud_name];

                loList.forEach((lo) => {
                    // Add experiment marks
                    loStructure[lo].forEach((exp) => {
                        const mark = student.loMarks[lo]?.[exp.exp_no];
                        dataRow.push(mark ? `${mark.obtained}` : '0');
                    });

                    // Add summary for LO
                    let totalObtained = 0;
                    let totalAttempted = 0;

                    loStructure[lo].forEach((exp) => {
                        const mark = student.loMarks[lo]?.[exp.exp_no];
                        if (mark) {
                            totalObtained += mark.obtained;
                            totalAttempted += mark.max;
                        }
                    });

                    const percentage = totalAttempted > 0 ? (totalObtained * 100) / totalAttempted : 0;
                    dataRow.push(totalObtained.toFixed(2), totalAttempted, percentage.toFixed(2));
                });

                worksheetData.push(dataRow);
            });

            // Add spacing
            worksheetData.push([]);
            worksheetData.push([]);

            // Students Scoring Above Target Summary Table
            const summaryStartRow = worksheetData.length;
            worksheetData.push(['Students Scoring Above ' + subjectTarget + '%']);
            worksheetData.push(['Criteria', ...loList.map((lo) => `LO${lo}`)]);

            // Count row
            const countRow = ['Count'];
            loList.forEach((lo) => {
                let countAboveTarget = 0;
                const totalStudents = students.length;

                students.forEach((student) => {
                    let totalObtained = 0;
                    let totalAttempted = 0;

                    loStructure[lo].forEach((exp) => {
                        const mark = student.loMarks[lo]?.[exp.exp_no];
                        if (mark) {
                            totalObtained += mark.obtained;
                            totalAttempted += mark.max;
                        }
                    });

                    const percentage = totalAttempted > 0 ? (totalObtained * 100) / totalAttempted : 0;
                    if (percentage >= subjectTarget) {
                        countAboveTarget++;
                    }
                });

                countRow.push(countAboveTarget.toString());
            });
            worksheetData.push(countRow);

            // Percentage row
            const percentageRow = ['Percentage'];
            loList.forEach((lo) => {
                let countAboveTarget = 0;
                const totalStudents = students.length;

                students.forEach((student) => {
                    let totalObtained = 0;
                    let totalAttempted = 0;

                    loStructure[lo].forEach((exp) => {
                        const mark = student.loMarks[lo]?.[exp.exp_no];
                        if (mark) {
                            totalObtained += mark.obtained;
                            totalAttempted += mark.max;
                        }
                    });

                    const percentage = totalAttempted > 0 ? (totalObtained * 100) / totalAttempted : 0;
                    if (percentage >= subjectTarget) {
                        countAboveTarget++;
                    }
                });

                const percentageAboveTarget = totalStudents > 0 ? (countAboveTarget * 100) / totalStudents : 0;
                percentageRow.push(percentageAboveTarget.toFixed(2));
            });
            worksheetData.push(percentageRow);

            // Add spacing
            worksheetData.push([]);
            worksheetData.push([]);

            // LO Attainment Scale Table
            const attainmentStartRow = worksheetData.length;
            worksheetData.push(['LO Attainment']);
            worksheetData.push(['Attainment', ...loList.map((lo) => `LO${lo}`)]);

            // Scale row
            const scaleRow = ['Scale (1-3)'];
            loList.forEach((lo) => {
                let countAboveTarget = 0;
                const totalStudents = students.length;

                students.forEach((student) => {
                    let totalObtained = 0;
                    let totalAttempted = 0;

                    loStructure[lo].forEach((exp) => {
                        const mark = student.loMarks[lo]?.[exp.exp_no];
                        if (mark) {
                            totalObtained += mark.obtained;
                            totalAttempted += mark.max;
                        }
                    });

                    const percentage = totalAttempted > 0 ? (totalObtained * 100) / totalAttempted : 0;
                    if (percentage >= subjectTarget) {
                        countAboveTarget++;
                    }
                });

                const percentageAboveTarget = totalStudents > 0 ? (countAboveTarget * 100) / totalStudents : 0;

                let attainment = 1;
                if (percentageAboveTarget >= 60) {
                    attainment = 3;
                } else if (percentageAboveTarget >= 50) {
                    attainment = 2;
                } else {
                    attainment = 1;
                }

                scaleRow.push(attainment.toString());
            });
            worksheetData.push(scaleRow);

            // Add spacing
            worksheetData.push([]);
            worksheetData.push([]);

            // Attainment Criteria Table
            worksheetData.push(['Attainment Criteria']);
            worksheetData.push(['Attainment', 'Condition (Students scoring above ' + subjectTarget + '%)']);
            worksheetData.push(['3', 'If 60% and above students have scored above ' + subjectTarget + '%']);
            worksheetData.push(['2', 'If 50% to 60% of students have scored above ' + subjectTarget + '%']);
            worksheetData.push(['1', 'If less than 50% students have scored above ' + subjectTarget + '%']);

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            worksheet['!merges'] = merges;

            // Define styling
            const thickBlackBorder = { style: 'thick', color: { rgb: '000000' } };
            const mediumBlackBorder = { style: 'medium', color: { rgb: '000000' } };
            const mediumBorder = { style: 'medium', color: { rgb: '000000' } };
            const slateHeader = { rgb: 'CBD5E1' };
            const slate300 = { rgb: 'CED4DC' };
            const slate200 = { rgb: 'E2E8F0' };
            const slate100 = { rgb: 'F1F5F9' };
            const amberSummary = { rgb: 'FCD34D' };
            const amberSummary100 = { rgb: 'FEF3C7' };
            const darkText = { rgb: '1E293B' };

            // Set row heights
            worksheet['!rows'] = [
                { hpx: 20 },
                { hpx: 20 },
                { hpx: 18 },
                { hpx: 18 },
                { hpx: 18 },
                { hpx: 18 },
                { hpx: 16 },
                { hpx: 25 },
                { hpx: 25 },
                { hpx: 30 },
            ];

            // Apply styling
            const headerStartRow = 7;
            const dataStartRow = 10;
            const lastDataRow = worksheetData.length - 1;

            for (let row in worksheet) {
                if (row === '!ref' || row === '!merges' || row === '!rows' || row === '!cols') continue;

                const cell = worksheet[row];
                if (!cell) continue;

                const rowMatch = row.match(/\d+/);
                if (!rowMatch) continue;

                const rowNum = parseInt(rowMatch[0]);
                const colStr = row.replace(/[0-9]/g, '');
                const colNum = XLSX.utils.decode_col(colStr);

                const getTopBorder = () => {
                    if (rowNum === headerStartRow) return thickBlackBorder;
                    if (rowNum === headerStartRow + 1 || rowNum === headerStartRow + 2) return mediumBlackBorder;
                    return mediumBorder;
                };

                const getBottomBorder = () => {
                    if (rowNum === lastDataRow) return thickBlackBorder;
                    if (rowNum === headerStartRow + 2) return mediumBlackBorder;
                    return mediumBorder;
                };

                cell.border = {
                    top: getTopBorder(),
                    bottom: getBottomBorder(),
                    left: colNum === 0 ? thickBlackBorder : mediumBorder,
                    right: mediumBorder,
                };

                if (rowNum === headerStartRow) {
                    cell.fill = { type: 'pattern', patternType: 'solid', fgColor: slateHeader };
                    cell.font = { bold: true, size: 12, color: darkText };
                    cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
                } else if (rowNum === headerStartRow + 1 || rowNum === headerStartRow + 2) {
                    if (cell.v === 'Summary') {
                        cell.fill = { type: 'pattern', patternType: 'solid', fgColor: amberSummary };
                    } else {
                        cell.fill = { type: 'pattern', patternType: 'solid', fgColor: slate300 };
                    }
                    cell.font = { bold: true, size: 11, color: darkText };
                    cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
                } else if (rowNum >= dataStartRow) {
                    cell.font = { size: 10, color: darkText };
                    if (colNum <= 2) {
                        cell.fill = { type: 'pattern', patternType: 'solid', fgColor: slate100 };
                    } else if (cell.v === 'Obtained' || cell.v === 'Attempted' || cell.v === 'Percentage') {
                        cell.fill = { type: 'pattern', patternType: 'solid', fgColor: amberSummary100 };
                    }
                    cell.alignment = { horizontal: 'center', vertical: 'center' };
                }
            }

            // Style summary tables
            const summaryTableStartRow = summaryStartRow + 2; // Skip title row
            const attainmentTableStartRow = attainmentStartRow + 2;
            const criteriaTableStartRow = attainmentTableStartRow + 3;

            for (let row in worksheet) {
                if (row === '!ref' || row === '!merges' || row === '!rows' || row === '!cols') continue;

                const cell = worksheet[row];
                if (!cell) continue;

                const rowMatch = row.match(/\d+/);
                if (!rowMatch) continue;

                const rowNum = parseInt(rowMatch[0]);
                const colStr = row.replace(/[0-9]/g, '');
                const colNum = XLSX.utils.decode_col(colStr);

                // Style summary tables (after main data table)
                if (rowNum >= summaryTableStartRow) {
                    cell.border = {
                        top: mediumBorder,
                        bottom: mediumBorder,
                        left: mediumBorder,
                        right: mediumBorder,
                    };

                    // Summary header row
                    if (rowNum === summaryTableStartRow) {
                        cell.fill = { type: 'pattern', patternType: 'solid', fgColor: slate300 };
                        cell.font = { bold: true, size: 10, color: darkText };
                        cell.alignment = { horizontal: 'center', vertical: 'center' };
                    }
                    // Count row
                    else if (rowNum === summaryTableStartRow + 1) {
                        cell.fill = { type: 'pattern', patternType: 'solid', fgColor: slate100 };
                        cell.font = { size: 10, color: darkText };
                        cell.alignment = { horizontal: 'center', vertical: 'center' };
                    }
                    // Percentage row
                    else if (rowNum === summaryTableStartRow + 2) {
                        cell.fill = { type: 'pattern', patternType: 'solid', fgColor: amberSummary100 };
                        cell.font = { size: 10, color: darkText };
                        cell.alignment = { horizontal: 'center', vertical: 'center' };
                    }
                    // Attainment table header
                    else if (rowNum === attainmentTableStartRow) {
                        cell.fill = { type: 'pattern', patternType: 'solid', fgColor: slate300 };
                        cell.font = { bold: true, size: 10, color: darkText };
                        cell.alignment = { horizontal: 'center', vertical: 'center' };
                    }
                    // Scale row
                    else if (rowNum === attainmentTableStartRow + 1) {
                        cell.fill = { type: 'pattern', patternType: 'solid', fgColor: { rgb: 'DBEAFE' } };
                        cell.font = { bold: true, size: 10, color: darkText };
                        cell.alignment = { horizontal: 'center', vertical: 'center' };
                    }
                    // Criteria table header
                    else if (rowNum === criteriaTableStartRow) {
                        cell.fill = { type: 'pattern', patternType: 'solid', fgColor: slate300 };
                        cell.font = { bold: true, size: 10, color: darkText };
                        cell.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
                    }
                    // Criteria rows
                    else if (rowNum > criteriaTableStartRow) {
                        if (colNum === 0) {
                            if (cell.v === '3') {
                                cell.fill = { type: 'pattern', patternType: 'solid', fgColor: { rgb: 'DCFCE7' } };
                            } else if (cell.v === '2') {
                                cell.fill = { type: 'pattern', patternType: 'solid', fgColor: { rgb: 'FEF3C7' } };
                            } else if (cell.v === '1') {
                                cell.fill = { type: 'pattern', patternType: 'solid', fgColor: { rgb: 'FECACA' } };
                            }
                            cell.font = { bold: true, size: 11, color: darkText };
                            cell.alignment = { horizontal: 'center', vertical: 'center' };
                        } else {
                            if (cell.value && cell.value.toString().includes(String(subjectTarget))) {
                                if (cell.value.toString().includes('60%')) {
                                    cell.fill = { type: 'pattern', patternType: 'solid', fgColor: { rgb: 'DCFCE7' } };
                                } else if (cell.value.toString().includes('50%')) {
                                    cell.fill = { type: 'pattern', patternType: 'solid', fgColor: { rgb: 'FEF3C7' } };
                                } else {
                                    cell.fill = { type: 'pattern', patternType: 'solid', fgColor: { rgb: 'FECACA' } };
                                }
                            }
                            cell.font = { size: 10, color: darkText };
                            cell.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
                        }
                    }
                }
            }

            // Set column widths
            const colWidths = [{ wch: 12 }, { wch: 12 }, { wch: 20 }];
            const numDataCols = loList.length * (loStructure[loList[0]].length + 3);
            for (let i = 0; i < numDataCols; i++) {
                colWidths.push({ wch: 12 });
            }
            worksheet['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Lab Attainment');

            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `Lab-Attainment-${allotment.sub_id}-Batch${allotment.batch_no}-${timestamp}.xlsx`;
            XLSX.writeFile(workbook, filename);
            toast.success('Report exported successfully');
        } catch (error) {
            console.error('Error exporting:', error);
            toast.error('Failed to export report');
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Lab Attainment Report</CardTitle>
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
                    <CardTitle>Lab Attainment Report</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-red-500">Failed to load report data</p>
                </CardContent>
            </Card>
        );
    }

    const { students, loStructure, loList, allotment, teacher } = reportData;
    const subjectTarget = SUBJECT_TARGETS[allotment.sub_id as keyof typeof SUBJECT_TARGETS] || 65;

    // Calculate LO summary
    const calculateLoSummary = (lo: number) => {
        let countAboveTarget = 0;
        const totalStudents = students.length;

        students.forEach((student) => {
            let totalObtained = 0;
            let totalAttempted = 0;

            loStructure[lo].forEach((exp) => {
                const mark = student.loMarks[lo]?.[exp.exp_no];
                if (mark) {
                    totalObtained += mark.obtained;
                    totalAttempted += mark.max;
                }
            });

            const percentage = totalAttempted > 0 ? (totalObtained * 100) / totalAttempted : 0;
            if (percentage >= subjectTarget) {
                countAboveTarget++;
            }
        });

        const percentageAboveTarget = totalStudents > 0 ? (countAboveTarget * 100) / totalStudents : 0;

        let attainment = 1;
        if (percentageAboveTarget >= 60) {
            attainment = 3;
        } else if (percentageAboveTarget >= 50) {
            attainment = 2;
        } else {
            attainment = 1;
        }

        return {
            count: countAboveTarget,
            percentage: parseFloat(percentageAboveTarget.toFixed(2)),
            attainment,
        };
    };

    return (
        <div className="space-y-2 w-full">
            {/* Header */}
            <Card className="py-2">
                <CardHeader className="py-2 px-4">
                    <CardTitle className="text-sm">LAB ATTAINMENT ANALYSIS</CardTitle>
                </CardHeader>
                <CardContent className="px-4 py-2 flex items-center justify-between">
                    <div className="text-xs space-y-1 flex-1">
                        <p className="font-bold text-xs">ST. FRANCIS INSTITUTE OF TECHNOLOGY</p>
                        <p className="text-xs">
                            Subject: {allotment.sub_id} {allotment.sub_name ? `(${allotment.sub_name})` : ''} | Class:{' '}
                            {allotment.class_name} | Batch: {allotment.batch_no} | Semester: {allotment.current_sem}
                        </p>
                        <p className="text-xs">Teacher: {teacher.teacher_name}</p>
                        <p className="text-xs font-semibold text-blue-600 border-t border-slate-300 pt-2 mt-2">
                            Subject Target: {subjectTarget}%
                        </p>
                    </div>
                    {/* <div className="flex-shrink-0 ml-4">
                        <Image src="/sfit_logo.png" alt="SFIT Logo" width={80} height={80} className="object-contain" />
                    </div> */}
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
                            {/* Level 1: LO Headers */}
                            <tr className="bg-gradient-to-r from-slate-400 to-slate-300 text-slate-900">
                                <th className="border-2 border-black px-2 py-1 h-10 font-bold text-center text-[9px]" rowSpan={3}>
                                    Roll No
                                </th>
                                <th className="border-2 border-black px-2 py-1 h-10 font-bold text-center text-[9px]" rowSpan={3}>
                                    PID
                                </th>
                                <th className="border-2 border-black px-2 py-1 h-10 font-bold text-center text-[9px]" rowSpan={3}>
                                    Name
                                </th>
                                {loList.map((lo) => (
                                    <th
                                        key={`lo-${lo}`}
                                        className="border-2 border-black px-1 py-1 font-bold text-center text-[9px]"
                                        colSpan={loStructure[lo].length + 3}
                                    >
                                        LO{lo}
                                    </th>
                                ))}
                            </tr>

                            {/* Level 2: Experiment Headers and Summary */}
                            <tr className="bg-slate-300 text-slate-900">
                                {loList.map((lo) => (
                                    <React.Fragment key={`exp-header-${lo}`}>
                                        {loStructure[lo].map((exp) => (
                                            <th
                                                key={`exp-${exp.exp_no}`}
                                                className="border-2 border-black px-1 py-1 font-semibold text-center text-[9px]"
                                            >
                                                Exp{exp.exp_no}
                                            </th>
                                        ))}
                                        <th
                                            className="border-2 border-black px-1 py-1 font-semibold text-center bg-amber-400 text-slate-900 text-[9px]"
                                            colSpan={3}
                                        >
                                            Summary
                                        </th>
                                    </React.Fragment>
                                ))}
                            </tr>

                            {/* Level 3: Max Marks and Summary Headers */}
                            <tr className="bg-slate-200 text-slate-900">
                                {loList.map((lo) => (
                                    <React.Fragment key={`marks-header-${lo}`}>
                                        {loStructure[lo].map((exp) => (
                                            <th
                                                key={`max-${exp.exp_no}`}
                                                className="border-2 border-black px-1 py-1 text-center font-semibold text-[8px]"
                                            >
                                                ({exp.max_marks})
                                            </th>
                                        ))}
                                        <th className="border-2 border-black px-1 py-1 text-center font-semibold bg-amber-300 text-slate-900 text-[8px]">
                                            Obtained
                                        </th>
                                        <th className="border-2 border-black px-1 py-1 text-center font-semibold bg-amber-300 text-slate-900 text-[8px]">
                                            Attempted
                                        </th>
                                        <th className="border-2 border-black px-1 py-1 text-center font-semibold bg-amber-300 text-slate-900 text-[8px]">
                                            Percentage
                                        </th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {students.map((student) => (
                                <tr key={student.pid} className="hover:bg-slate-100 border-b-2 border-black">
                                    <td className="border-2 border-black px-1 py-1 text-center font-bold bg-slate-100 text-[9px]">
                                        {student.roll_no}
                                    </td>
                                    <td className="border-2 border-black px-1 py-1 text-center bg-slate-100 text-[9px]">{student.pid}</td>
                                    <td className="border-2 border-black px-1 py-1 font-bold min-w-32 bg-slate-100 text-[9px]">
                                        {student.stud_name}
                                    </td>

                                    {loList.map((lo) => (
                                        <React.Fragment key={`data-${student.pid}-${lo}`}>
                                            {loStructure[lo].map((exp) => {
                                                const mark = student.loMarks[lo]?.[exp.exp_no];
                                                return (
                                                    <td
                                                        key={`exp-data-${student.pid}-${exp.exp_no}`}
                                                        className="border-2 border-black px-1 py-1 text-center font-semibold text-[9px]"
                                                    >
                                                        {mark ? `${mark.obtained.toFixed(1)}` : '0'}
                                                    </td>
                                                );
                                            })}

                                            {/* Summary for LO */}
                                            {(() => {
                                                let totalObtained = 0;
                                                let totalAttempted = 0;

                                                loStructure[lo].forEach((exp) => {
                                                    const mark = student.loMarks[lo]?.[exp.exp_no];
                                                    if (mark) {
                                                        totalObtained += mark.obtained;
                                                        totalAttempted += mark.max;
                                                    }
                                                });

                                                const percentage = totalAttempted > 0 ? (totalObtained * 100) / totalAttempted : 0;

                                                return (
                                                    <>
                                                        <td className="border-2 border-black px-1 py-1 text-center font-bold bg-amber-100 text-[9px]">
                                                            {totalObtained.toFixed(1)}
                                                        </td>
                                                        <td className="border-2 border-black px-1 py-1 text-center font-bold bg-amber-100 text-[9px]">
                                                            {totalAttempted}
                                                        </td>
                                                        <td className="border-2 border-black px-1 py-1 text-center font-bold bg-amber-100 text-[9px]">
                                                            {percentage.toFixed(2)}%
                                                        </td>
                                                    </>
                                                );
                                            })()}
                                        </React.Fragment>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* LO Attainment Summary Table */}
            <Card className="py-2">
                <CardHeader className="py-2 px-4">
                    <CardTitle className="text-xs">Students Scoring Above {subjectTarget}%</CardTitle>
                </CardHeader>
                <CardContent className="px-4">
                    <table className="w-full text-[10px] border-collapse border-2 border-black">
                        <thead>
                            <tr className="bg-slate-400">
                                <th className="border-2 border-black px-2 py-1 font-bold text-center">Criteria</th>
                                {loList.map((lo) => (
                                    <th key={`summary-lo-${lo}`} className="border-2 border-black px-2 py-1 font-bold text-center">
                                        LO{lo}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-slate-100">
                                <td className="border-2 border-black px-2 py-1 font-bold">Count</td>
                                {loList.map((lo) => (
                                    <td key={`count-${lo}`} className="border-2 border-black px-2 py-1 text-center font-bold">
                                        {calculateLoSummary(lo).count}
                                    </td>
                                ))}
                            </tr>
                            <tr className="bg-amber-100">
                                <td className="border-2 border-black px-2 py-1 font-bold">Percentage</td>
                                {loList.map((lo) => (
                                    <td key={`percentage-${lo}`} className="border-2 border-black px-2 py-1 text-center font-bold">
                                        {calculateLoSummary(lo).percentage.toFixed(2)}%
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* LO Attainment Scale Table */}
            <Card className="py-2">
                <CardHeader className="py-2 px-4">
                    <CardTitle className="text-xs">LO Attainment</CardTitle>
                </CardHeader>
                <CardContent className="px-4 space-y-4">
                    <table className="w-full text-[10px] border-collapse border-2 border-black">
                        <thead>
                            <tr className="bg-slate-400">
                                <th className="border-2 border-black px-2 py-1 font-bold text-center">Attainment</th>
                                {loList.map((lo) => (
                                    <th key={`attain-lo-${lo}`} className="border-2 border-black px-2 py-1 font-bold text-center">
                                        LO{lo}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-blue-100">
                                <td className="border-2 border-black px-2 py-1 font-bold text-center">Scale (1-3)</td>
                                {loList.map((lo) => (
                                    <td key={`attain-val-${lo}`} className="border-2 border-black px-2 py-1 text-center font-bold text-lg">
                                        {calculateLoSummary(lo).attainment}
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
                                <th className="border-2 border-black px-2 py-1 font-bold text-left">
                                    Condition (Students scoring above {subjectTarget}%)
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-green-100">
                                <td className="border-2 border-black px-2 py-1 text-center font-bold text-lg">3</td>
                                <td className="border-2 border-black px-2 py-1 text-xs">
                                    If 60% and above students have scored above {subjectTarget}%
                                </td>
                            </tr>
                            <tr className="bg-yellow-100">
                                <td className="border-2 border-black px-2 py-1 text-center font-bold text-lg">2</td>
                                <td className="border-2 border-black px-2 py-1 text-xs">
                                    If 50% to 60% of students have scored above {subjectTarget}%
                                </td>
                            </tr>
                            <tr className="bg-red-100">
                                <td className="border-2 border-black px-2 py-1 text-center font-bold text-lg">1</td>
                                <td className="border-2 border-black px-2 py-1 text-xs">
                                    If less than 50% students have scored above {subjectTarget}%
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
};
