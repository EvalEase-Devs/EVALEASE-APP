'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LabAttainmentReport } from './lab-attainment-report';
import { ExternalAssessmentReport } from './external-assessment-report';

interface LabAttainmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    allotmentId: number;
}

export const LabAttainmentModal: React.FC<LabAttainmentModalProps> = ({ isOpen, onClose, allotmentId }) => {
    const [activePage, setActivePage] = useState<1 | 2>(1);

    useEffect(() => {
        if (isOpen) {
            setActivePage(1);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto overflow-x-auto p-2">
                <DialogHeader>
                    <DialogTitle className="text-lg">Lab Attainment Reports</DialogTitle>
                </DialogHeader>
                <div className="mt-2 px-2 flex items-center gap-2">
                    <Button
                        size="sm"
                        variant={activePage === 1 ? 'default' : 'outline'}
                        onClick={() => setActivePage(1)}
                    >
                        Page 1: Practical Attainment
                    </Button>
                    <Button
                        size="sm"
                        variant={activePage === 2 ? 'default' : 'outline'}
                        onClick={() => setActivePage(2)}
                    >
                        Page 2: External Viva
                    </Button>
                </div>
                <div className="mt-2">
                    {activePage === 1 ? (
                        <LabAttainmentReport allotmentId={allotmentId} onClose={onClose} />
                    ) : (
                        <ExternalAssessmentReport allotmentId={allotmentId} />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
