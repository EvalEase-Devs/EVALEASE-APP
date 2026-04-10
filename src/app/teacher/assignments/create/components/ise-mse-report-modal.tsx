'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ISEMSEReport } from './ise-mse-report';
import { ExternalAssessmentReport } from './external-assessment-report';
import { COPOMappingGrid } from './co-po-mapping-grid';

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

    useEffect(() => {
        if (open) {
            setActivePage('mappings');
            setIsMappingComplete(false);
            setMappings({});
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto overflow-x-auto p-2">
                <DialogHeader>
                    <DialogTitle className="text-lg">Lecture Attainment Reports - {subjectCode}</DialogTitle>
                </DialogHeader>
                <div className="mt-2 px-2 flex items-center gap-2">
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
                            onClose={() => onOpenChange(false)}
                        />
                    ) : activePage === 2 ? (
                        <ExternalAssessmentReport allotmentId={allotmentId} />
                    ) : (
                        <div className="p-4 text-sm text-muted-foreground">Summary Page Coming Soon</div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
