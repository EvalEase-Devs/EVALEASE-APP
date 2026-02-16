'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LabAttainmentReport } from './lab-attainment-report';

interface LabAttainmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    allotmentId: number;
}

export const LabAttainmentModal: React.FC<LabAttainmentModalProps> = ({ isOpen, onClose, allotmentId }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto overflow-x-auto p-2">
                <DialogHeader>
                    <DialogTitle className="text-lg">Lab Attainment Report</DialogTitle>
                </DialogHeader>
                <div className="mt-2">
                    <LabAttainmentReport allotmentId={allotmentId} onClose={onClose} />
                </div>
            </DialogContent>
        </Dialog>
    );
};
