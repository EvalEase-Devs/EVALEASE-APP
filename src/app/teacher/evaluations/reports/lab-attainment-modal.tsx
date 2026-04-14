'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LabAttainmentReport } from './lab-attainment-report';
import { ExternalAssessmentReport } from './external-assessment-report';
import { COPOMappingGrid } from './co-po-mapping-grid';
import { exportLabViaWorker } from '@/app/teacher/evaluations/reports/utils/excel-worker-client';
import type { LabReportResponse } from '@/app/teacher/evaluations/reports/utils/generate-lab-excel';

interface LabAttainmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    allotmentId: number;
}

export const LabAttainmentModal: React.FC<LabAttainmentModalProps> = ({ isOpen, onClose, allotmentId }) => {
    const [activePage, setActivePage] = useState<'mappings' | 1 | 2 | 3>('mappings');
    const [isMappingComplete, setIsMappingComplete] = useState(false);
    const [mappings, setMappings] = useState<Record<string, Record<string, number>>>({});
    const [loNumbers, setLoNumbers] = useState<number[]>([]);
    const [isLoadingLOs, setIsLoadingLOs] = useState(false);
    const [loLoadError, setLoLoadError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setActivePage('mappings');
            setIsMappingComplete(false);
            setMappings({});
            setLoNumbers([]);
            setIsLoadingLOs(true);
            setLoLoadError(null);
            setExporting(false);
        }
    }, [isOpen]);

    const handleDownload = () => {
        setExporting(true);
        toast.promise(
            (async () => {
                const [labResponse, extResponse] = await Promise.all([
                    fetch(`/api/reports/lab-attainment?allotment_id=${allotmentId}`),
                    fetch(`/api/reports/external-assessment?allotment_id=${allotmentId}`),
                ]);
                if (!labResponse.ok) throw new Error('Failed to fetch lab report data');
                const labData: LabReportResponse = await labResponse.json();
                const extData = extResponse.ok ? await extResponse.json() : undefined;
                await exportLabViaWorker(labData, mappings, extData);
            })(),
            {
                loading: 'Generating Lab Attainment report...',
                success: 'Report downloaded successfully',
                error: 'Failed to export report',
                finally: () => setExporting(false),
            },
        );
    };

    useEffect(() => {
        if (!isOpen) return;

        const fetchLoNumbers = async () => {
            try {
                setIsLoadingLOs(true);
                setLoLoadError(null);
                const response = await fetch(`/api/reports/lab-attainment?allotment_id=${allotmentId}`);
                if (!response.ok) {
                    setLoLoadError('Failed to load LOs for this subject.');
                    return;
                }

                const data = await response.json() as { loList?: number[] };
                const normalized = Array.from(
                    new Set((data.loList ?? []).filter((n) => Number.isFinite(n) && n > 0)),
                ).sort((a, b) => a - b);

                setLoNumbers(normalized);

                if (normalized.length === 0) {
                    setLoLoadError('No LOs are configured for this subject.');
                }
            } catch {
                setLoLoadError('Failed to load LOs for this subject.');
            } finally {
                setIsLoadingLOs(false);
            }
        };

        void fetchLoNumbers();
    }, [allotmentId, isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] flex flex-col overflow-hidden p-2">
                <DialogHeader>
                    <DialogTitle className="text-lg">Lab Attainment Reports</DialogTitle>
                </DialogHeader>
                <div className="sticky top-0 z-20 mt-2 rounded-md bg-background/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
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
                            Page 1: Practical
                        </Button>
                        <Button
                            size="sm"
                            variant={activePage === 2 ? 'default' : 'outline'}
                            onClick={() => setActivePage(2)}
                            disabled={!isMappingComplete}
                        >
                            Page 2: External Viva
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
                <div className="mt-2 overflow-auto flex-1">
                    {activePage === 'mappings' ? (
                        isLoadingLOs ? (
                            <div className="p-4 text-sm text-muted-foreground">Loading LOs...</div>
                        ) : loLoadError ? (
                            <div className="p-4 text-sm text-destructive">{loLoadError}</div>
                        ) : (
                            <COPOMappingGrid
                                subjectCode={allotmentId.toString()}
                                outcomeLabel="LO"
                                outcomeNumbers={loNumbers}
                                initialMappings={mappings}
                                onSave={(data) => {
                                    setMappings(data);
                                    setIsMappingComplete(true);
                                    setActivePage(1);
                                }}
                            />
                        )
                    ) : activePage === 1 ? (
                        <LabAttainmentReport
                            allotmentId={allotmentId}
                            onClose={onClose}
                            mappings={mappings}
                            showDownloadButton={false}
                        />
                    ) : activePage === 2 ? (
                        <ExternalAssessmentReport allotmentId={allotmentId} />
                    ) : (
                        <LabAttainmentReport
                            allotmentId={allotmentId}
                            onClose={onClose}
                            mappings={mappings}
                            view="summary"
                            showDownloadButton={false}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
