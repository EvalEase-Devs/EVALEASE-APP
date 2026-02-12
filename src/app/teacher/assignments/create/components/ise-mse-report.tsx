'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
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
                console.log('Report Data:', data);
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
            const { students, columnStructure, coList, allotment } = reportData;
            const worksheetData: any[] = [];

            // Helper function for Excel export
            const formatISETitleForExport = (title: string) => {
                return title.split('-').slice(-1)[0].toUpperCase();
            };

            // Header section
            worksheetData.push(['ST. FRANCIS INSTITUTE OF TECHNOLOGY']);
            worksheetData.push(['Mount Poinsur, SVP Road, Borivali (W), MUMBAI - 400103.']);
            worksheetData.push([]);
            worksheetData.push(['ISE-MSE ANALYSIS']);
            worksheetData.push([`Subject: ${allotment.sub_id}`, `Class: ${allotment.class_name}`, `Semester: ${allotment.current_sem}`]);
            worksheetData.push([`Teacher: ${reportData.teacher.teacher_name}`]);
            worksheetData.push([]);

            // Build column structure mapping - track which columns are summary
            const summaryColumnIndices = new Set<number>();
            let currentColIndex = 3; // Start after Roll No, PID, Name

            // Level 1: Roll No, PID, Name, CO headers
            const level1Row = ['Roll No', 'PID', 'Name'];
            coList.forEach(co => {
                level1Row.push(`CO${co}`);
                currentColIndex++;
            });
            worksheetData.push(level1Row);

            // Reset column index for detailed header rows
            currentColIndex = 3;
            const merges: any[] = [];

            // Build Level 2 and 3 properly with column tracking
            const level2Row: any[] = ['', '', ''];
            const level3Row = ['Roll No', 'PID', 'Name'];

            let colIndexForMerge = 3;
            coList.forEach(co => {
                const iseCount = columnStructure[co].ise.length;
                const mseCount = columnStructure[co].mse.length;

                // Level 2: ISE header
                if (iseCount > 0) {
                    level2Row.push('ISE');
                    merges.push({ s: { r: 8, c: colIndexForMerge }, e: { r: 8, c: colIndexForMerge + iseCount - 1 } });

                    // Add level 3 headers for ISE
                    columnStructure[co].ise.forEach(iseTask => {
                        level3Row.push(`${formatISETitleForExport(iseTask.title)}\n(${iseTask.max_marks})`);
                    });
                    colIndexForMerge += iseCount;
                }

                // Level 2: MSE header
                if (mseCount > 0) {
                    level2Row.push('MSE');
                    merges.push({ s: { r: 8, c: colIndexForMerge }, e: { r: 8, c: colIndexForMerge + mseCount - 1 } });

                    // Add level 3 headers for MSE
                    columnStructure[co].mse.forEach(mseQuestion => {
                        level3Row.push(`${mseQuestion.question_label}\n(${mseQuestion.max_marks})`);
                    });
                    colIndexForMerge += mseCount;
                }

                // Level 2: Summary header (spans 3 columns)
                level2Row.push('Summary');
                merges.push({ s: { r: 8, c: colIndexForMerge }, e: { r: 8, c: colIndexForMerge + 2 } });

                // Track summary column indices
                summaryColumnIndices.add(colIndexForMerge);
                summaryColumnIndices.add(colIndexForMerge + 1);
                summaryColumnIndices.add(colIndexForMerge + 2);

                // Level 3: Summary subheaders
                level3Row.push('Obtained', 'Attempted', '%');
                colIndexForMerge += 3;
            });

            // Add merge for CO headers (row 7)
            let coMergeStartCol = 3;
            coList.forEach(co => {
                const colSpan = columnStructure[co].ise.length + columnStructure[co].mse.length + 3;
                merges.push({ s: { r: 7, c: coMergeStartCol }, e: { r: 7, c: coMergeStartCol + colSpan - 1 } });
                coMergeStartCol += colSpan;
            });

            worksheetData.push(level2Row);
            worksheetData.push(level3Row);

            // Student data rows
            students.forEach(student => {
                const dataRow = [student.roll_no, student.pid, student.stud_name];

                coList.forEach(co => {
                    // ISE marks
                    columnStructure[co].ise.forEach(iseTask => {
                        const mark = student.coMarks[co]?.ise[iseTask.task_id];
                        dataRow.push(mark ? `${mark.obtained}` : '0');
                    });

                    // MSE marks
                    columnStructure[co].mse.forEach(mseQuestion => {
                        const mark = student.coMarks[co]?.mse[mseQuestion.question_label];
                        dataRow.push(mark ? `${mark.obtained}` : '0');
                    });

                    // Summary values
                    let totalObtained = 0;
                    let totalAttempted = 0;
                    columnStructure[co].ise.forEach(iseTask => {
                        const mark = student.coMarks[co]?.ise[iseTask.task_id];
                        if (mark) {
                            totalObtained += mark.obtained;
                            totalAttempted += mark.max;
                        }
                    });
                    columnStructure[co].mse.forEach(mseQuestion => {
                        const mark = student.coMarks[co]?.mse[mseQuestion.question_label];
                        if (mark) {
                            totalObtained += mark.obtained;
                            totalAttempted += mark.max;
                        }
                    });

                    const percentage = totalAttempted > 0 ? (totalObtained * 100) / totalAttempted : 0;
                    dataRow.push(totalObtained, totalAttempted, percentage.toFixed(2));
                });

                worksheetData.push(dataRow);
            });

            // Add blank rows for spacing
            worksheetData.push([]);
            worksheetData.push([]);

            // Calculate attainment summary for Excel
            const subjectTarget = SUBJECT_TARGETS[allotment.sub_id as keyof typeof SUBJECT_TARGETS] || 65;
            const excelAttainmentSummary: Record<number, { count: number; percentage: number; attainment: number }> = {};

            coList.forEach(co => {
                let countAboveTarget = 0;
                const totalStudents = students.length;

                students.forEach(student => {
                    let totalObtained = 0;
                    let totalAttempted = 0;
                    columnStructure[co].ise.forEach(iseTask => {
                        const mark = student.coMarks[co]?.ise[iseTask.task_id];
                        if (mark) {
                            totalObtained += mark.obtained;
                            totalAttempted += mark.max;
                        }
                    });
                    columnStructure[co].mse.forEach(mseQuestion => {
                        const mark = student.coMarks[co]?.mse[mseQuestion.question_label];
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

                // Determine attainment level
                let attainment = 1;
                if (percentageAboveTarget >= 60) {
                    attainment = 3;
                } else if (percentageAboveTarget >= 50) {
                    attainment = 2;
                } else {
                    attainment = 1;
                }

                excelAttainmentSummary[co] = {
                    count: countAboveTarget,
                    percentage: parseFloat(percentageAboveTarget.toFixed(2)),
                    attainment
                };
            });

            // Add Students Above Target Summary Table
            worksheetData.push([`Students scoring above ${subjectTarget}%`]);
            const summaryHeaderRow: any[] = ['Criteria'];
            coList.forEach(co => summaryHeaderRow.push(`CO${co}`));
            worksheetData.push(summaryHeaderRow);

            const countRow: any[] = ['Count'];
            coList.forEach(co => countRow.push(excelAttainmentSummary[co].count));
            worksheetData.push(countRow);

            const percentageRow: any[] = ['Percentage'];
            coList.forEach(co => percentageRow.push(excelAttainmentSummary[co].percentage));
            worksheetData.push(percentageRow);

            // Add blank rows for spacing
            worksheetData.push([]);

            // Add CO Attainment Table
            worksheetData.push(['CO Attainment']);
            const attainmentHeaderRow: any[] = ['Attainment'];
            coList.forEach(co => attainmentHeaderRow.push(`CO${co}`));
            worksheetData.push(attainmentHeaderRow);

            const attainmentValueRow: any[] = ['Scale (1-3)'];
            coList.forEach(co => attainmentValueRow.push(excelAttainmentSummary[co].attainment));
            worksheetData.push(attainmentValueRow);

            // Add blank rows for spacing
            worksheetData.push([]);

            // Add Attainment Criteria Legend
            const excelSubjectTarget = SUBJECT_TARGETS[allotment.sub_id as keyof typeof SUBJECT_TARGETS] || 65;
            worksheetData.push(['Attainment Criteria']);
            worksheetData.push(['Attainment', `Condition (Students scoring above ${excelSubjectTarget}%)`]);
            worksheetData.push(['3', `If 60% and above students have scored above ${excelSubjectTarget}%`]);
            worksheetData.push(['2', `If 50% to 60% of students have scored above ${excelSubjectTarget}%`]);
            worksheetData.push(['1', `If less than 50% students have scored above ${excelSubjectTarget}%`]);

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            worksheet['!merges'] = merges;

            // Define border styles - make them much thicker and visible
            const thickBlackBorder = { style: 'thick', color: { rgb: '000000' } }; // Very thick outer border
            const mediumBlackBorder = { style: 'medium', color: { rgb: '000000' } }; // Medium inner borders
            const thickBorder = { style: 'thick', color: { rgb: '000000' } };
            const mediumBorder = { style: 'medium', color: { rgb: '000000' } };
            const slateHeader = { rgb: 'CBD5E1' }; // slate-400
            const slate300 = { rgb: 'CED4DC' }; // slate-300
            const slate200 = { rgb: 'E2E8F0' }; // slate-200
            const slate100 = { rgb: 'F1F5F9' }; // slate-100
            const amberSummary = { rgb: 'FCD34D' }; // amber-400
            const amberSummary300 = { rgb: 'FDE047' }; // amber-300
            const amberSummary100 = { rgb: 'FEF3C7' }; // amber-100
            const darkText = { rgb: '1E293B' }; // Dark gray text
            const whiteText = { rgb: 'FFFFFF' }; // White text

            // Set row heights for better visibility
            worksheet['!rows'] = [
                { hpx: 20 }, // Row 0
                { hpx: 20 }, // Row 1
                { hpx: 18 }, // Row 2
                { hpx: 18 }, // Row 3
                { hpx: 18 }, // Row 4
                { hpx: 18 }, // Row 5
                { hpx: 16 }, // Row 6
                { hpx: 25 }, // Row 7 - Level 1 headers
                { hpx: 25 }, // Row 8 - Level 2 headers
                { hpx: 30 }, // Row 9 - Level 3 headers
            ];

            // Apply styling to cells
            const headerStartRow = 7; // Row index for Level 1 headers (0-based)
            const dataStartRow = 10; // Row index where data starts
            const lastDataRow = worksheetData.length - 1; // Last row of data
            const lastColNum = level3Row.length - 1;

            for (let row in worksheet) {
                if (row === '!ref' || row === '!merges' || row === '!rows' || row === '!cols') continue;

                const cell = worksheet[row];
                if (!cell) continue;

                const rowMatch = row.match(/\d+/);
                if (!rowMatch) continue;

                const rowNum = parseInt(rowMatch[0]);
                const colStr = row.replace(/[0-9]/g, '');
                const colNum = XLSX.utils.decode_col(colStr);

                // Determine the border style for each cell
                // Use thick borders for table outline and medium for internal borders
                const isTopBorder = rowNum === headerStartRow; // Top of table
                const isBottomBorder = rowNum === lastDataRow; // Bottom of table
                const isLeftBorder = colNum === 0; // Left edge
                const isRightBorder = colNum === lastColNum; // Right edge
                const isHeaderRegion = rowNum >= headerStartRow && rowNum <= headerStartRow + 2;

                // Determine border thickness
                const getTopBorder = () => {
                    if (isTopBorder || rowNum === headerStartRow) return thickBlackBorder;
                    if (rowNum === headerStartRow + 1 || rowNum === headerStartRow + 2) return mediumBlackBorder;
                    return mediumBorder;
                };
                const getBottomBorder = () => {
                    if (isBottomBorder) return thickBlackBorder;
                    if (rowNum === headerStartRow + 2) return mediumBlackBorder; // Strong bottom for header section
                    return mediumBorder;
                };
                const getLeftBorder = () => {
                    if (isLeftBorder) return thickBlackBorder;
                    return mediumBorder;
                };
                const getRightBorder = () => {
                    if (isRightBorder) return thickBlackBorder;
                    return mediumBorder;
                };

                // Apply borders
                cell.border = {
                    top: getTopBorder(),
                    bottom: getBottomBorder(),
                    left: getLeftBorder(),
                    right: getRightBorder(),
                };

                // Style based on row
                if (rowNum === headerStartRow) {
                    // Level 1 - CO headers
                    cell.fill = { type: 'pattern', patternType: 'solid', fgColor: slateHeader };
                    cell.font = { bold: true, size: 12, color: darkText };
                    cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
                } else if (rowNum === headerStartRow + 1) {
                    // Level 2 - ISE/MSE/Summary
                    if (colNum > 2) { // After Name column
                        if (cell.v === 'Summary') {
                            cell.fill = { type: 'pattern', patternType: 'solid', fgColor: amberSummary };
                            cell.font = { bold: true, size: 11, color: darkText };
                        } else if (cell.v === 'ISE' || cell.v === 'MSE') {
                            cell.fill = { type: 'pattern', patternType: 'solid', fgColor: slate300 };
                            cell.font = { bold: true, size: 11, color: darkText };
                        } else {
                            cell.font = { bold: true, size: 11, color: darkText };
                        }
                    } else {
                        // Roll No, PID, Name area
                        cell.fill = { type: 'pattern', patternType: 'solid', fgColor: slate300 };
                        cell.font = { bold: true, size: 11, color: darkText };
                    }
                    cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
                } else if (rowNum === headerStartRow + 2) {
                    // Level 3 - Task names and column headers
                    cell.font = { bold: true, size: 10, color: darkText };
                    cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };

                    if (colNum > 2) { // After Name column
                        if (summaryColumnIndices.has(colNum)) {
                            cell.fill = { type: 'pattern', patternType: 'solid', fgColor: amberSummary300 };
                        } else {
                            cell.fill = { type: 'pattern', patternType: 'solid', fgColor: slate200 };
                        }
                    } else {
                        cell.fill = { type: 'pattern', patternType: 'solid', fgColor: slate200 };
                    }
                } else if (rowNum >= dataStartRow) {
                    // Data rows
                    cell.font = { size: 10, color: darkText };

                    if (colNum <= 2) {
                        // Student info columns - light gray background
                        cell.fill = { type: 'pattern', patternType: 'solid', fgColor: slate100 };
                        cell.alignment = { horizontal: 'left', vertical: 'center' };
                    } else if (summaryColumnIndices.has(colNum)) {
                        // Summary columns - light amber background
                        cell.fill = { type: 'pattern', patternType: 'solid', fgColor: amberSummary100 };
                        cell.alignment = { horizontal: 'center', vertical: 'center' };

                        // Number formatting for summary values
                        if (cell.v && typeof cell.v === 'number') {
                            cell.num_fmt = '0.00'; // Two decimal places
                        }
                    } else {
                        // Regular data cells
                        cell.alignment = { horizontal: 'center', vertical: 'center' };
                    }
                } else {
                    // Header information rows (school name, subject, etc.)
                    cell.font = { size: 10, color: darkText };
                    cell.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
                }
            }

            // Set column widths
            const colWidths = [
                { wch: 12 }, // Roll No
                { wch: 12 }, // PID
                { wch: 20 }, // Name
            ];
            const numDataCols = (level3Row.length - 3);
            for (let i = 0; i < numDataCols; i++) {
                colWidths.push({ wch: 14 });
            }
            worksheet['!cols'] = colWidths;

            // Freeze panes - freeze headers and first 3 columns (Roll No, PID, Name)
            worksheet['!freeze'] = { xSplit: 3, ySplit: 10 };

            XLSX.utils.book_append_sheet(workbook, worksheet, 'ISE-MSE Attainment');

            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `ISE-MSE-Attainment-${allotment.sub_id}-${timestamp}.xlsx`;
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
