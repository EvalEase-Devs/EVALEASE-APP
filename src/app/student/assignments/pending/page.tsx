"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStudentAssignments, useSubmitAssignmentMarks } from "@/hooks/use-api";
import { Loader2, BookOpen, CheckCircle2, Clock, FileText, ClipboardEdit, AlertTriangle, ArrowLeft, Play } from "lucide-react";
import { toast } from "sonner";
import StudentTestModal from "@/components/student-test-modal";
import type { StudentAssignment } from "@/hooks/use-api";

export default function PendingAssignmentsPage() {
    const { assignments: allAssignments, loading: assignmentsLoading, refetch } = useStudentAssignments();
    const { submitMarks, loading: submittingLoading } = useSubmitAssignmentMarks();

    const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignment | null>(null);
    const [marksInput, setMarksInput] = useState<string>("");
    const [questionMarks, setQuestionMarks] = useState<Record<string, string>>({});
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showTestModal, setShowTestModal] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

    // Filter only pending assignments
    const pendingAssignments = allAssignments.filter(a => a.status === 'Pending');

    const handleOpenSubmit = (assignment: StudentAssignment) => {
        const task = assignment.task;

        // For MCQ - open test modal instead
        if (task.assessment_sub_type === 'MCQ') {
            setSelectedTaskId(task.task_id);
            setShowTestModal(true);
            return;
        }

        // For MSE with sub_questions - reset question marks
        if (task.assessment_type === 'MSE' && task.sub_questions) {
            const initialMarks: Record<string, string> = {};
            task.sub_questions.forEach((q: any) => {
                initialMarks[q.label] = "";
            });
            setQuestionMarks(initialMarks);
        }

        setSelectedAssignment(assignment);
        setMarksInput("");
        setShowSubmitDialog(true);
        setShowConfirmDialog(false);
    };

    const handleProceedToVerify = () => {
        if (!selectedAssignment) return;

        const task = selectedAssignment.task;

        // For MSE with sub_questions - validate question-wise marks
        if (task.assessment_type === 'MSE' && task.sub_questions) {
            const subQuestions = task.sub_questions as any[];
            let totalMarks = 0;
            let hasError = false;

            for (const q of subQuestions) {
                const markStr = questionMarks[q.label];
                if (!markStr || markStr.trim() === "") {
                    toast.error(`Please enter marks for ${q.label}`);
                    hasError = true;
                    break;
                }

                const mark = parseFloat(markStr);
                if (isNaN(mark) || mark < 0) {
                    toast.error(`Invalid marks for ${q.label}`);
                    hasError = true;
                    break;
                }

                if (mark > q.marks) {
                    toast.error(`Marks for ${q.label} cannot exceed ${q.marks}`);
                    hasError = true;
                    break;
                }

                totalMarks += mark;
            }

            if (hasError) return;

            if (totalMarks > task.max_marks) {
                toast.error(`Total marks (${totalMarks}) cannot exceed ${task.max_marks}`);
                return;
            }

            // Set total marks for confirmation
            setMarksInput(totalMarks.toString());
        } else {
            // For other types (ISE, Lab) - simple total validation
            const marks = parseFloat(marksInput);
            if (isNaN(marks) || marks < 0) {
                toast.error("Please enter a valid marks value");
                return;
            }

            if (marks > task.max_marks) {
                toast.error(`Marks cannot exceed ${task.max_marks}`);
                return;
            }
        }

        // Move to confirmation dialog
        setShowSubmitDialog(false);
        setShowConfirmDialog(true);
    };

    const handleBackToEdit = () => {
        setShowConfirmDialog(false);
        setShowSubmitDialog(true);
    };

    const handleConfirmSubmit = async () => {
        if (!selectedAssignment) return;

        const marks = parseFloat(marksInput);
        const task = selectedAssignment.task;

        // Prepare question_marks JSON
        let questionMarksJson: Record<string, number> | null = null;
        if (task.assessment_type === 'MSE' && task.sub_questions) {
            questionMarksJson = {};
            Object.keys(questionMarks).forEach(label => {
                if (questionMarksJson) {
                    questionMarksJson[label] = parseFloat(questionMarks[label]);
                }
            });
        }

        toast.promise(
            submitMarks(selectedAssignment.mark_id, marks, questionMarksJson),
            {
                loading: 'Submitting marks...',
                success: () => {
                    setShowConfirmDialog(false);
                    setSelectedAssignment(null);
                    setMarksInput("");
                    setQuestionMarks({});
                    refetch();
                    return 'Marks submitted successfully!';
                },
                error: (err) => err instanceof Error ? err.message : 'Failed to submit marks',
            }
        );
    };

    if (assignmentsLoading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* PENDING ASSIGNMENTS */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-1 bg-primary rounded-full"></div>
                    <h2 className="text-xl font-bold text-foreground">Pending Assignments</h2>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                        {pendingAssignments.length}
                    </span>
                </div>

                {pendingAssignments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/50 p-8 text-center">
                        <p className="text-muted-foreground">No pending assignments</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingAssignments.map((assignment) => (
                            <AssignmentCard
                                key={assignment.mark_id}
                                assignment={assignment}
                                onSubmit={handleOpenSubmit}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* STEP 1: SUBMIT MARKS DIALOG */}
            <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-2">
                            <ClipboardEdit className="h-5 w-5" />
                            <AlertDialogTitle>Submit Assessment</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription asChild>
                            <div className="mt-4 space-y-3">
                                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                                    <div className="text-sm font-semibold text-foreground">TASK DETAILS</div>
                                    <div className="text-base font-bold text-foreground">
                                        {selectedAssignment?.task.title}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {selectedAssignment?.task.assessment_sub_type}
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs">Max: {selectedAssignment?.task.max_marks}</span>
                                        <Badge variant="outline" className="text-xs">
                                            {selectedAssignment?.task.assessment_type}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-3 py-2">
                        {selectedAssignment?.task.assessment_type === 'MSE' && selectedAssignment?.task.sub_questions ? (
                            // MSE Question-wise marks input
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Question-wise Marks</Label>
                                <div className="max-h-60 overflow-y-auto space-y-2 p-3 bg-muted/30 rounded-lg">
                                    {selectedAssignment.task.sub_questions.map((q: any) => (
                                        <div key={q.label} className="flex items-center gap-2 bg-background p-2 rounded">
                                            <Label htmlFor={`q-${q.label}`} className="min-w-[60px] font-medium">
                                                {q.label}
                                            </Label>
                                            <Input
                                                id={`q-${q.label}`}
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                max={q.marks}
                                                placeholder="0"
                                                value={questionMarks[q.label] || ""}
                                                onChange={(e) => setQuestionMarks(prev => ({
                                                    ...prev,
                                                    [q.label]: e.target.value
                                                }))}
                                                className="flex-1 h-9"
                                            />
                                            <span className="text-sm text-muted-foreground min-w-[50px]">/ {q.marks}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground">Enter marks for each question. Total will be calculated automatically.</p>
                            </div>
                        ) : (
                            // Regular total marks input (ISE, Lab)
                            <div className="space-y-2">
                                <Label htmlFor="marks" className="text-sm font-medium">Obtained Marks</Label>
                                <div className="relative">
                                    <Input
                                        id="marks"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        max={selectedAssignment?.task.max_marks || 100}
                                        placeholder="Enter your marks"
                                        value={marksInput}
                                        onChange={(e) => setMarksInput(e.target.value)}
                                        className="text-center text-2xl font-bold h-14"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
                                        / {selectedAssignment?.task.max_marks || 10}
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">Please enter the marks exactly as graded.</p>
                            </div>
                        )}
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button
                            onClick={handleProceedToVerify}
                            disabled={
                                selectedAssignment?.task.assessment_type === 'MSE' && selectedAssignment?.task.sub_questions
                                    ? !Object.values(questionMarks).every(v => v !== "")
                                    : !marksInput
                            }
                            className="bg-primary"
                        >
                            Proceed to Verify
                            <CheckCircle2 className="ml-2 h-4 w-4" />
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* STEP 2: CONFIRMATION DIALOG */}
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <div className="flex items-center justify-center mb-4">
                            <div className="rounded-full bg-warning-subtle p-3">
                                <AlertTriangle className="h-6 w-6 text-warning" />
                            </div>
                        </div>
                        <AlertDialogTitle className="text-center text-xl">Confirm Submission</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4 text-center">
                                <p className="text-sm">You are about to submit a score of:</p>
                                <div className="flex items-center justify-center">
                                    <span className="text-4xl font-bold text-primary">{marksInput}</span>
                                    <span className="text-xl text-muted-foreground ml-2">/ {selectedAssignment?.task.max_marks}</span>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="rounded-lg border-2 border-danger bg-danger-subtle p-4 space-y-2">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-danger mt-0.5 flex-shrink-0" />
                            <div className="space-y-1">
                                <div className="text-sm font-bold text-danger">Strict Warning: Academic Integrity</div>
                                <p className="text-xs text-danger leading-relaxed">
                                    You certify that the marks entered above match your actual graded paper. Any mismatch detected during verification will result in <span className="font-bold">0 marks</span> for this subject and strict disciplinary action will be taken.
                                </p>
                            </div>
                        </div>
                    </div>

                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={handleBackToEdit}
                            className="w-full sm:w-auto"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Edit
                        </Button>
                        <Button
                            onClick={handleConfirmSubmit}
                            disabled={submittingLoading}
                            className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                            {submittingLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                "I Understand, Confirm Submit"
                            )}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* MCQ Test Modal */}
            {selectedTaskId && (
                <StudentTestModal
                    isOpen={showTestModal}
                    onClose={() => {
                        setShowTestModal(false);
                        setSelectedTaskId(null);
                        refetch();
                    }}
                    taskId={selectedTaskId}
                />
            )}
        </div>
    );
}

// Assignment Card Component (Pending)
function AssignmentCard({
    assignment,
    onSubmit,
}: {
    assignment: StudentAssignment;
    onSubmit: (assignment: StudentAssignment) => void;
}) {
    const getTaskTypeIcon = (type: string) => {
        switch (type) {
            case "Lab":
                return <BookOpen className="h-4 w-4" />;
            case "Lec":
                return <FileText className="h-4 w-4" />;
            default:
                return null;
        }
    };

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-3">
                <div className="space-y-2">
                    <h4 className="font-bold text-sm line-clamp-2" title={assignment.task.title.split("-").slice(-1)[0].toUpperCase()}>
                          {assignment.task.title.split("-").slice(-1)[0].toUpperCase()}
                    </h4>
                    <h3 className="font-bold text-sm line-clamp-2">
                        {assignment.task.allotment.sub_name}
                    </h3>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Task Type & Assessment */}
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-[10px]">
                        {getTaskTypeIcon(assignment.task.task_type)}
                        <span className="ml-1">{assignment.task.task_type}</span>
                    </Badge>

                    {assignment.task.assessment_type && (
                        <Badge variant="secondary" className="text-[10px]">
                            {assignment.task.assessment_type}
                        </Badge>
                    )}

                    {assignment.task.assessment_sub_type && (
                        <Badge variant="outline" className="text-[10px]">
                            {assignment.task.assessment_sub_type}
                        </Badge>
                    )}
                </div>

                {/* Max Marks */}
                <div className="text-xs text-muted-foreground">
                    Max Marks: <span className="font-bold text-foreground">{assignment.task.max_marks}</span>
                </div>

                {/* Status Badge */}
                <Badge variant="default" className="w-full justify-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                </Badge>

                {/* Action Button */}
                {assignment.task.assessment_sub_type === 'MCQ' ? (
                    <Button
                        className="w-full"
                        size="sm"
                        onClick={() => onSubmit(assignment)}
                    >
                        <Play className="h-4 w-4 mr-2" />
                        Give Test
                    </Button>
                ) : (
                    <Button
                        className="w-full"
                        size="sm"
                        onClick={() => onSubmit(assignment)}
                    >
                        <ClipboardEdit className="h-4 w-4 mr-2" />
                        Add Marks
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
