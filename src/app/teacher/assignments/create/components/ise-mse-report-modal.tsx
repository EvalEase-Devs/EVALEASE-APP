'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ISEMSEReport } from './ise-mse-report';
import { ExternalAssessmentReport } from './external-assessment-report';

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
    const [activePage, setActivePage] = useState<1 | 2>(1);

    useEffect(() => {
        if (open) {
            setActivePage(1);
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
                        variant={activePage === 1 ? 'default' : 'outline'}
                        onClick={() => setActivePage(1)}
                    >
                        Page 1: ISE-MSE
                    </Button>
                    <Button
                        size="sm"
                        variant={activePage === 2 ? 'default' : 'outline'}
                        onClick={() => setActivePage(2)}
                    >
                        Page 2: ESE
                    </Button>
                </div>
                <div className="mt-2">
                    {activePage === 1 ? (
                        <ISEMSEReport
                            allotmentId={allotmentId}
                            onClose={() => onOpenChange(false)}
                        />
                    ) : (
                        <ExternalAssessmentReport allotmentId={allotmentId} />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
