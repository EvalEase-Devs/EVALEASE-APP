'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ISEMSEReport } from './ise-mse-report';

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
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto overflow-x-auto p-2">
                <DialogHeader>
                    <DialogTitle className="text-lg">ISE-MSE Attainment Report - {subjectCode}</DialogTitle>
                </DialogHeader>
                <div className="mt-2">
                    <ISEMSEReport
                        allotmentId={allotmentId}
                        onClose={() => onOpenChange(false)}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};
