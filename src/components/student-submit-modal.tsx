"use client";

import React, { useState, useEffect } from 'react';
import { Task } from '@/lib/types';
import { Upload, X, ClipboardCheck, AlertTriangle, ArrowLeft, Calculator, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useStudentTask } from '@/hooks/use-api';

interface StudentSubmitModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskId: number;
}

const StudentSubmitModal: React.FC<StudentSubmitModalProps> = ({ isOpen, onClose, taskId }) => {
    const { task, loading, error } = useStudentTask(taskId);

    if (!isOpen) return null;

    if (loading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-md">
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (error || !task) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Error</DialogTitle>
                        <DialogDescription>{error || 'Task not found'}</DialogDescription>
                    </DialogHeader>
                    <Button onClick={onClose}>Close</Button>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{task.title}</DialogTitle>
                    <DialogDescription>View your task details and submission status</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">Subject:</span>
                            <span className="ml-2 font-medium">{task.sub_id}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Max Marks:</span>
                            <span className="ml-2 font-medium">{task.max_marks}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Type:</span>
                            <span className="ml-2 font-medium">
                                {task.task_type === 'Lab' ? 'Lab' : task.assessment_type || 'Theory'}
                            </span>
                        </div>
                        {task.end_time && (
                            <div>
                                <span className="text-muted-foreground">Due:</span>
                                <span className="ml-2 font-medium">
                                    {new Date(task.end_time).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>

                    {task.submission ? (
                        <Card className="bg-success-subtle border-success">
                            <CardContent className="pt-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Your Score</p>
                                        <p className="text-2xl font-bold text-success">
                                            {task.submission.marks_obtained}/{task.max_marks}
                                        </p>
                                    </div>
                                    <Badge variant="default" className="bg-success">
                                        {task.submission.status}
                                    </Badge>
                                </div>
                                {task.submission.submitted_at && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Submitted on {new Date(task.submission.submitted_at).toLocaleString()}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-warning-subtle border-warning">
                            <CardContent className="pt-4">
                                <p className="text-sm text-warning">
                                    This task has not been graded yet. Check back later for your marks.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="flex justify-end pt-4">
                    <Button onClick={onClose}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default StudentSubmitModal;
