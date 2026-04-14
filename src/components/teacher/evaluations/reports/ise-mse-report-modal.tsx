'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ISEMSEReport } from './ise-mse-report';
import { ExternalAssessmentReport } from './external-assessment-report';
import { COPOMappingGrid } from './co-po-mapping-grid';
import { COPOPSOSummary } from './co-po-pso-summary';
import { exportISEMSEViaWorker } from '@/components/teacher/evaluations/reports/utils/excel-worker-client';

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

interface ExternalReportRow {
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

interface ExternalReportResponse {
    assessment_kind: 'ESE' | 'EXTERNAL_VIVA';
    subject_target: number;
    rows: ExternalReportRow[];
    summary: {
        total_students: number;
        count_above_target: number;
        percentage_above_target: number;
        attainment: number;
    };
}

interface ISEMSEReportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    allotmentId: number;
    subjectCode: string;
}

export const ISEMSEReportModal: React.FC<ISEMSEReportModalProps> = ({
    open,
    onOpenChange,
    allotmentId,
    subjectCode
}) => {
    const [activePage, setActivePage] = useState<'mappings' | 1 | 2 | 3>('mappings');
    const [isMappingComplete, setIsMappingComplete] = useState(false);
    const [mappings, setMappings] = useState<Record<string, Record<string, number>>>({});
    const [exporting, setExporting] = useState(false);
    const [externalReport, setExternalReport] = useState<ExternalReportResponse | null>(null);

    useEffect(() => {
        if (open) {
            setActivePage('mappings');
            setIsMappingComplete(false);
            setMappings({});
            setExporting(false);
            setExternalReport(null);
        }
    }, [open]);

    useEffect(() => {
        if (!open || !isMappingComplete) return;

        const fetchExternal = async () => {
            try {
                const response = await fetch(`/api/reports/external-assessment?allotment_id=${allotmentId}`);
                if (!response.ok) {
                    setExternalReport(null);
                    return;
                }
                const data: ExternalReportResponse = await response.json();
                setExternalReport(data);
            } catch {
                setExternalReport(null);
            }
        };

        void fetchExternal();
    }, [allotmentId, isMappingComplete, open]);

    const handleDownload = async () => {
        setExporting(true);
        toast.promise(
            (async () => {
                const response = await fetch(`/api/reports/ise-mse?allotment_id=${allotmentId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch report data');
                }
                const data: ReportResponse = await response.json();
                await exportISEMSEViaWorker(data, mappings, externalReport ?? undefined);
            })(),
            {
                loading: 'Generating ISE-MSE report...',
                success: 'Report downloaded successfully',
                error: 'Failed to export report',
                finally: () => setExporting(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto overflow-x-auto p-2">
                <DialogHeader>
                    <DialogTitle className="text-lg">Lecture Attainment Reports - {subjectCode}</DialogTitle>
                </DialogHeader>
                <div className="mt-2 px-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant={activePage === 'mappings' ? 'default' : 'outline'}
                        onClick={() => setActivePage('mappings')}
                    >
                        Mappings
                    </Button>
                    <Button
                        size="sm"
                        variant={activePage === 1 ? 'default' : 'outline'}
                        onClick={() => setActivePage(1)}
                        disabled={!isMappingComplete}
                    >
                        Page 1: ISE-MSE
                    </Button>
                    <Button
                        size="sm"
                        variant={activePage === 2 ? 'default' : 'outline'}
                        onClick={() => setActivePage(2)}
                        disabled={!isMappingComplete}
                    >
                        Page 2: ESE
                    </Button>
                    <Button
                        size="sm"
                        variant={activePage === 3 ? 'default' : 'outline'}
                        onClick={() => setActivePage(3)}
                        disabled={!isMappingComplete}
                    >
                        Page 3: Summary
                    </Button>
                    </div>
                    <Button
                        size="sm"
                        onClick={handleDownload}
                        disabled={!isMappingComplete || exporting}
                    >
                        {exporting ? 'Exporting...' : 'Download Excel Report'}
                    </Button>
                </div>
                <div className="mt-2">
                    {activePage === 'mappings' ? (
                        <COPOMappingGrid
                            subjectCode={subjectCode}
                            initialMappings={mappings}
                            onSave={(data) => {
                                setMappings(data);
                                setIsMappingComplete(true);
                                setActivePage(1);
                            }}
                        />
                    ) : activePage === 1 ? (
                        <ISEMSEReport
                            allotmentId={allotmentId}
                            mappings={mappings}
                            onClose={() => onOpenChange(false)}
                        />
                    ) : activePage === 2 ? (
                        <ExternalAssessmentReport allotmentId={allotmentId} />
                    ) : (
                        <COPOPSOSummary mappings={mappings} externalSummary={externalReport} />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
