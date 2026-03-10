'use client';

import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface ExternalAssessmentReportProps {
    allotmentId: number;
}

interface CsvRowUpload {
    roll_no: number | null;
    pid: number | null;
    stud_name: string;
    obtained_marks: number;
    out_of: number;
    grade: string | null;
    gpa: number | null;
}

interface ReportRow {
    roll_no: number | null;
    stud_pid: number | null;
    stud_name: string;
    obtained_marks: number;
    out_of: number;
    percent: number;
    grade: string | null;
    gpa: number | null;
    status: string;
}

interface ReportResponse {
    allotment: {
        allotment_id: number;
        sub_id: string;
        sub_name?: string;
        class_name: string;
        current_sem: string;
        type: 'Lec' | 'Lab';
    };
    assessment_kind: 'ESE' | 'EXTERNAL_VIVA';
    outcome_type: 'CO' | 'LO';
    subject_target: number;
    upload_meta: {
        upload_id: number;
        file_name: string | null;
        uploaded_at: string;
        total_rows: number;
        valid_rows: number;
        invalid_rows: number;
    } | null;
    rows: ReportRow[];
    summary: {
        total_students: number;
        count_above_target: number;
        percentage_above_target: number;
        attainment: number;
    };
    outcomes_addressed: {
        label: string;
        attainment: number;
    }[];
}

function normalizeHeader(header: string): string {
    return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;
    const normalized = value.trim().replace(/,/g, '');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseCsvRows(rows: Record<string, unknown>[]): CsvRowUpload[] {
    return rows
        .map((row) => {
            const normalized: Record<string, unknown> = {};
            Object.entries(row).forEach(([key, value]) => {
                normalized[normalizeHeader(key)] = value;
            });

            const rollNo = toNumber(normalized.rollno ?? null);
            const pid = toNumber(normalized.pid ?? null);
            const obtained = toNumber(normalized.obtainedmarks ?? null);
            const outOf = toNumber(normalized.outof ?? null);
            const gpa = toNumber(normalized.gpa ?? null);
            const studName = String(normalized.studentname ?? '').trim();
            const grade = String(normalized.grade ?? '').trim();

            return {
                roll_no: rollNo,
                pid,
                stud_name: studName,
                obtained_marks: obtained ?? 0,
                out_of: outOf ?? 0,
                grade: grade || null,
                gpa,
            };
        })
        .filter((row) => row.stud_name.length > 0 || row.pid !== null);
}

export const ExternalAssessmentReport: React.FC<ExternalAssessmentReportProps> = ({ allotmentId }) => {
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [reportData, setReportData] = useState<ReportResponse | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/reports/external-assessment?allotment_id=${allotmentId}`);
            if (!response.ok) {
                const body = await response.json().catch(() => ({ error: 'Failed to fetch report' }));
                throw new Error(body.error || 'Failed to fetch report');
            }
            const data: ReportResponse = await response.json();
            setReportData(data);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load report data';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchReport();
    }, [allotmentId]);

    const handleUpload = async () => {
        if (!selectedFile) {
            toast.info('Please select a CSV file first');
            return;
        }

        try {
            setUploading(true);
            const fileBuffer = await selectedFile.arrayBuffer();
            const workbook = XLSX.read(fileBuffer, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
            const parsedRows = parseCsvRows(jsonRows);

            if (parsedRows.length === 0) {
                toast.error('CSV does not contain valid rows');
                return;
            }

            const response = await fetch('/api/reports/external-assessment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    allotment_id: allotmentId,
                    file_name: selectedFile.name,
                    rows: parsedRows,
                }),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({ error: 'Upload failed' }));
                throw new Error(body.error || 'Upload failed');
            }

            toast.success('CSV uploaded and report data updated');
            setSelectedFile(null);
            await fetchReport();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to upload CSV';
            toast.error(message);
        } finally {
            setUploading(false);
        }
    };

    const assessmentLabel = useMemo(() => {
        if (!reportData) return 'External Assessment';
        return reportData.assessment_kind === 'ESE' ? 'ESE Attainment' : 'External Viva Attainment';
    }, [reportData]);

    const outcomesLabel = reportData?.outcome_type === 'LO' ? 'LOs Addressed' : 'COs Addressed';

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>External Assessment Report</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className='space-y-3'>
                        <Skeleton className='h-5 w-1/3' />
                        <Skeleton className='h-10 w-full' />
                        <Skeleton className='h-64 w-full' />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!reportData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>External Assessment Report</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className='text-sm text-destructive'>Unable to load report data.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className='space-y-2 w-full'>
            <Card className='py-2'>
                <CardHeader className='py-2 px-4'>
                    <CardTitle className='text-sm'>{assessmentLabel} - PAGE 2</CardTitle>
                </CardHeader>
                <CardContent className='px-4 py-2 text-xs space-y-2'>
                    <p className='font-bold text-xs'>ST. FRANCIS INSTITUTE OF TECHNOLOGY</p>
                    <p className='text-xs'>
                        Subject: {reportData.allotment.sub_id}
                        {reportData.allotment.sub_name ? ` (${reportData.allotment.sub_name})` : ''}
                        {' '}| Class: {reportData.allotment.class_name}
                        {' '}| Semester: {reportData.allotment.current_sem}
                    </p>
                    <p className='text-xs font-semibold text-info border-t border-border pt-2 mt-2'>
                        Subject Target: {reportData.subject_target}%
                    </p>
                    <div className='flex items-center gap-2'>
                        <Input
                            type='file'
                            accept='.csv,text/csv,application/vnd.ms-excel'
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            className='text-xs h-8'
                        />
                        <Button size='sm' className='h-8 text-xs' onClick={handleUpload} disabled={uploading}>
                            {uploading ? 'Uploading...' : 'Upload CSV'}
                        </Button>
                    </div>
                    <p className='text-muted-foreground text-[11px]'>
                        Expected columns: Roll No, PID, Student Name, Obtained Marks, Out Of (Grade/GPA optional)
                    </p>
                    {reportData.upload_meta && (
                        <p className='text-muted-foreground text-[11px]'>
                            Last upload: {new Date(reportData.upload_meta.uploaded_at).toLocaleString()} ({reportData.upload_meta.valid_rows} valid / {reportData.upload_meta.total_rows} total)
                        </p>
                    )}
                </CardContent>
            </Card>

            {reportData.rows.length === 0 ? (
                <Card>
                    <CardContent className='py-8 text-sm text-muted-foreground'>
                        No CSV data uploaded yet for this report.
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Card className='py-2'>
                        <CardContent className='pt-2 px-2 overflow-auto' style={{ maxHeight: 'calc(95vh - 320px)' }}>
                            <table className='w-full text-[10px] border-collapse border-4 border-black'>
                                <thead>
                                    <tr className='bg-gradient-to-r from-primary/40 to-primary/30 text-foreground'>
                                        <th className='border-2 border-black px-2 py-1 h-10 font-bold text-center text-[9px]'>Roll No</th>
                                        <th className='border-2 border-black px-2 py-1 h-10 font-bold text-center text-[9px]'>PID</th>
                                        <th className='border-2 border-black px-2 py-1 h-10 font-bold text-center text-[9px]'>Name</th>
                                        <th className='border-2 border-black px-2 py-1 h-10 font-bold text-center text-[9px]'>Obtained</th>
                                        <th className='border-2 border-black px-2 py-1 h-10 font-bold text-center text-[9px]'>Out Of</th>
                                        <th className='border-2 border-black px-2 py-1 h-10 font-bold text-center text-[9px]'>%</th>
                                        <th className='border-2 border-black px-2 py-1 h-10 font-bold text-center text-[9px]'>Grade</th>
                                        <th className='border-2 border-black px-2 py-1 h-10 font-bold text-center text-[9px]'>GPA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.rows.map((row, index) => (
                                        <tr key={`${row.stud_pid}-${index}`} className='hover:bg-muted/50 border-b-2 border-black'>
                                            <td className='border-2 border-black px-1 py-1 text-center font-bold bg-muted/50 text-[9px]'>{row.roll_no ?? '-'}</td>
                                            <td className='border-2 border-black px-1 py-1 text-center bg-muted/50 text-[9px]'>{row.stud_pid ?? '-'}</td>
                                            <td className='border-2 border-black px-1 py-1 font-bold min-w-32 bg-muted/50 text-[9px]'>{row.stud_name}</td>
                                            <td className='border-2 border-black px-1 py-1 text-center font-semibold text-[9px]'>
                                                {Number(row.obtained_marks).toFixed(2)}
                                            </td>
                                            <td className='border-2 border-black px-1 py-1 text-center font-semibold text-[9px]'>
                                                {Number(row.out_of).toFixed(2)}
                                            </td>
                                            <td className='border-2 border-black px-1 py-1 text-center font-bold bg-warning-subtle text-[9px]'>
                                                {Number(row.percent).toFixed(2)}%
                                            </td>
                                            <td className='border-2 border-black px-1 py-1 text-center font-semibold text-[9px]'>{row.grade ?? '-'}</td>
                                            <td className='border-2 border-black px-1 py-1 text-center font-semibold text-[9px]'>
                                                {row.gpa === null || row.gpa === undefined ? '-' : Number(row.gpa).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>

                    <Card className='py-2'>
                        <CardHeader className='py-2 px-4'>
                            <CardTitle className='text-xs'>Students Scoring Above {reportData.subject_target}%</CardTitle>
                        </CardHeader>
                        <CardContent className='pt-2 px-2 overflow-auto'>
                            <table className='w-full text-[10px] border-collapse border-2 border-black'>
                                <tbody>
                                    <tr>
                                        <td className='border-2 border-black px-2 py-1 font-bold bg-primary/40'>Criteria of attainment</td>
                                        <td className='border-2 border-black px-2 py-1 bg-success-subtle'>If 60% and above students scored above {reportData.subject_target}%, degree is 3</td>
                                    </tr>
                                    <tr>
                                        <td className='border-2 border-black px-2 py-1 bg-primary/40' />
                                        <td className='border-2 border-black px-2 py-1 bg-info-subtle'>If 50% to less than 60% students scored above {reportData.subject_target}%, degree is 2</td>
                                    </tr>
                                    <tr>
                                        <td className='border-2 border-black px-2 py-1 bg-primary/40' />
                                        <td className='border-2 border-black px-2 py-1 bg-warning-subtle'>If less than 50% students scored above {reportData.subject_target}%, degree is 1</td>
                                    </tr>
                                    <tr>
                                        <td className='border-2 border-black px-2 py-1 font-bold bg-muted/50'>{outcomesLabel}</td>
                                        <td className='border-2 border-black px-2 py-1 font-semibold'>
                                            {reportData.outcomes_addressed.map((item) => item.label).join(', ') || '-'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className='border-2 border-black px-2 py-1 font-bold bg-muted/50'>Count students scoring above {reportData.subject_target}%</td>
                                        <td className='border-2 border-black px-2 py-1 font-bold'>{reportData.summary.count_above_target}</td>
                                    </tr>
                                    <tr>
                                        <td className='border-2 border-black px-2 py-1 font-bold bg-muted/50'>In percentage students scoring above {reportData.subject_target}%</td>
                                        <td className='border-2 border-black px-2 py-1 font-bold'>{reportData.summary.percentage_above_target.toFixed(2)}%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>

                    <Card className='py-2'>
                        <CardHeader className='py-2 px-4'>
                            <CardTitle className='text-xs'>Degree of Attainment</CardTitle>
                        </CardHeader>
                        <CardContent className='pt-2 px-2 overflow-auto'>
                            <table className='w-full text-[10px] border-collapse border-2 border-black'>
                                <thead>
                                    <tr className='bg-primary/40'>
                                        <th className='border-2 border-black px-2 py-1 font-bold text-center'>Attainment</th>
                                        {reportData.outcomes_addressed.map((item) => (
                                            <th key={`attain-${item.label}`} className='border-2 border-black px-2 py-1 font-bold text-center'>
                                                {item.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className='bg-warning-subtle'>
                                        <td className='border-2 border-black px-2 py-1 font-bold text-center'>Scale (1-3)</td>
                                        {reportData.outcomes_addressed.map((item) => (
                                            <td key={`attain-val-${item.label}`} className='border-2 border-black px-2 py-1 text-center font-bold text-lg'>
                                                {item.attainment}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
};
