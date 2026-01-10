'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { useStudentTask } from '@/hooks/use-api';
import { toast } from 'sonner';

interface Question {
    id: string;
    text: string;
    options: string[];
    correctOptionIndex?: number; // Hidden from student
    marks: number;
}

// Main wrapper that uses API
interface StudentTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskId: number;
}

export default function StudentTestModal({ isOpen, onClose, taskId }: StudentTestModalProps) {
    const { task, loading, error, submitMCQ } = useStudentTask(taskId);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (!task.canAttempt) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{task.title}</DialogTitle>
                        <DialogDescription>{task.message || 'You cannot attempt this test'}</DialogDescription>
                    </DialogHeader>
                    {task.submission && (
                        <div className="py-4">
                            <p className="text-lg font-semibold">
                                Your Score: {task.submission.marks_obtained}/{task.max_marks}
                            </p>
                        </div>
                    )}
                    <Button onClick={onClose}>Close</Button>
                </DialogContent>
            </Dialog>
        );
    }

    const handleSubmit = async (answers: Record<string, number>) => {
        setIsSubmitting(true);
        try {
            const result = await submitMCQ(answers);
            toast.success(`Test submitted! Score: ${result.score}/${result.maxMarks}`);
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to submit');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate time limit from start and end time
    const timeLimit = task.start_time && task.end_time
        ? Math.floor((new Date(task.end_time).getTime() - new Date().getTime()) / 60000)
        : 60;

    return (
        <StudentTestModalInner
            isOpen={isOpen}
            onClose={onClose}
            testTitle={task.title}
            questions={task.mcq_questions || []}
            totalMarks={task.max_marks}
            timeLimit={Math.max(1, timeLimit)}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
        />
    );
}

// Inner component with actual test UI
interface StudentTestModalInnerProps {
    isOpen: boolean;
    onClose: () => void;
    testTitle: string;
    questions: Question[];
    totalMarks: number;
    timeLimit?: number; // in minutes
    onSubmit?: (answers: Record<string, number>) => void;
    isSubmitting?: boolean;
}

function StudentTestModalInner({
    isOpen,
    onClose,
    testTitle,
    questions,
    totalMarks,
    timeLimit = 60,
    onSubmit,
    isSubmitting = false,
}: StudentTestModalInnerProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [showReview, setShowReview] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60); // in seconds
    const [violations, setViolations] = useState(0);
    const [showWarning, setShowWarning] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const violationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const currentQuestion = questions[currentQuestionIndex];
    const answeredCount = Object.keys(answers).length;
    const progressPercent = (answeredCount / questions.length) * 100;

    // Handle violations (tab switch, screenshot, copy, text selection)
    useEffect(() => {
        if (!isOpen || submitted) return;

        const handleViolation = (message: string) => {
            const newViolations = violations + 1;
            setViolations(newViolations);
            setWarningMessage(message);
            setShowWarning(true);

            if (violationTimeoutRef.current) {
                clearTimeout(violationTimeoutRef.current);
            }
            violationTimeoutRef.current = setTimeout(() => {
                setShowWarning(false);
            }, 3000);

            if (newViolations >= 2) {
                // Auto-submit on second violation
                setTimeout(() => {
                    handleSubmitTest();
                }, 500);
            }
        };

        // Prevent text selection on the test modal
        const handleSelectStart = (e: Event) => {
            e.preventDefault();
            return false;
        };

        // Prevent tab switching
        const handleVisibilityChange = () => {
            if (document.hidden) {
                handleViolation('⚠️ Tab switching detected! This is your warning. Next violation will auto-submit.');
            }
        };

        // Prevent right-click (screenshots/inspect)
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            handleViolation('⚠️ Right-click is disabled during test! This is your warning. Next violation will auto-submit.');
            return false;
        };

        // Prevent copying
        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault();
            handleViolation('⚠️ Copying is not allowed! This is your warning. Next violation will auto-submit.');
            return false;
        };

        // Prevent keyboard shortcuts (Ctrl+C, Ctrl+Shift+I, PrintScreen, etc)
        const handleKeyDown = (e: KeyboardEvent) => {
            // PrintScreen key
            if (e.key === 'PrintScreen') {
                e.preventDefault();
                handleViolation('⚠️ Screenshots are not allowed! This is your warning. Next violation will auto-submit.');
            }
            // Ctrl+C or Cmd+C
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
                handleViolation('⚠️ Copying is not allowed! This is your warning. Next violation will auto-submit.');
            }
            // Ctrl+Shift+I (DevTools)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
                e.preventDefault();
                handleViolation('⚠️ Developer tools are not allowed! This is your warning. Next violation will auto-submit.');
            }
            // F12 (DevTools)
            if (e.key === 'F12') {
                e.preventDefault();
                handleViolation('⚠️ Developer tools are not allowed! This is your warning. Next violation will auto-submit.');
            }
            // Ctrl+Shift+S (Screenshot)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
                e.preventDefault();
                handleViolation('⚠️ Screenshots are not allowed! This is your warning. Next violation will auto-submit.');
            }
            // Shift+PrintScreen (Alt+PrintScreen on some systems)
            if (e.shiftKey && e.key === 'PrintScreen') {
                e.preventDefault();
                handleViolation('⚠️ Screenshots are not allowed! This is your warning. Next violation will auto-submit.');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('selectstart', handleSelectStart);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('selectstart', handleSelectStart);
            if (violationTimeoutRef.current) {
                clearTimeout(violationTimeoutRef.current);
            }
        };
    }, [isOpen, submitted, violations]);

    const handleSubmitTest = () => {
        setSubmitted(true);
        if (onSubmit) {
            onSubmit(answers);
        }
        console.log('Test submitted with answers:', answers);
        if (violations >= 2) {
            alert(`⚠️ TEST AUTO-SUBMITTED due to malpractice detection!\n\nAnswered ${answeredCount} out of ${questions.length} questions.\n\nViolations detected: ${violations}`);
        } else {
            alert(`Test submitted! Answered ${answeredCount} out of ${questions.length} questions.\nCheck console for details.`);
        }
    };

    const handleClose = () => {
        if (!submitted && answeredCount > 0) {
            if (confirm('You have unsaved answers. Are you sure you want to close?')) {
                resetTest();
                onClose();
            }
        } else {
            resetTest();
            onClose();
        }
    };

    const resetTest = () => {
        setCurrentQuestionIndex(0);
        setAnswers({});
        setShowReview(false);
        setSubmitted(false);
        setTimeRemaining(timeLimit * 60);
        setViolations(0);
        setShowWarning(false);
    };

    const handleSelectAnswer = (optionIndex: number) => {
        setAnswers((prev) => ({
            ...prev,
            [currentQuestion.id]: optionIndex,
        }));
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent
                className="max-w-2xl max-h-[90vh] overflow-y-auto select-none"
                style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none' } as any}
                onCopy={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
            >
                {/* Violation Warning Banner */}
                {showWarning && (
                    <div className="fixed top-0 left-0 right-0 bg-red-500 text-white py-3 px-4 flex items-center gap-2 z-50 animate-pulse">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-semibold">{warningMessage}</span>
                        <span className="ml-auto text-sm">Violations: {violations}/2</span>
                    </div>
                )}

                <DialogHeader>
                    <DialogTitle className="text-2xl select-none">{testTitle}</DialogTitle>
                    <DialogDescription className="select-none">
                        Answer all questions carefully. Total Marks: {totalMarks}
                    </DialogDescription>
                </DialogHeader>

                {/* Header with Progress and Timer */}
                <div className="space-y-4 bg-slate-50 p-4 rounded-lg select-none">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-slate-600">
                                Question {currentQuestionIndex + 1} of {questions.length}
                            </p>
                            <p className="text-sm text-slate-500">
                                Answered: {answeredCount}/{questions.length}
                            </p>
                            {violations > 0 && (
                                <p className="text-sm text-red-600 font-semibold mt-1">
                                    ⚠️ Violations: {violations}/2
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-lg font-semibold text-red-600">
                            <Clock className="w-5 h-5" />
                            {formatTime(timeRemaining)}
                        </div>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                </div>

                {!showReview ? (
                    <>
                        {/* Question */}
                        <div className="space-y-6 py-6">
                            <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 select-none">
                                <h3 className="text-lg font-semibold text-slate-800 mb-2 select-none">
                                    Q{currentQuestionIndex + 1}. {currentQuestion.text}
                                </h3>
                                <p className="text-sm text-slate-600 select-none">
                                    Marks: <span className="font-semibold">{currentQuestion.marks}</span>
                                </p>
                            </Card>

                            {/* Options */}
                            <div className="space-y-3">
                                <p className="text-sm font-medium text-slate-700 select-none">Select your answer:</p>
                                <RadioGroup
                                    value={answers[currentQuestion.id]?.toString() ?? ''}
                                    onValueChange={(value) => handleSelectAnswer(parseInt(value))}
                                >
                                    <div className="space-y-3">
                                        {currentQuestion.options.map((option, index) => (
                                            <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50 transition cursor-pointer select-none">
                                                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                                                <Label
                                                    htmlFor={`option-${index}`}
                                                    className="cursor-pointer flex-1 text-slate-700 font-medium select-none"
                                                >
                                                    {String.fromCharCode(65 + index)}. {option}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex justify-between items-center gap-4 py-4 border-t">
                            <Button
                                variant="outline"
                                onClick={handlePrevious}
                                disabled={currentQuestionIndex === 0}
                                className="gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => setShowReview(true)}
                                className="text-slate-700"
                            >
                                Review All ({answeredCount}/{questions.length})
                            </Button>

                            <Button
                                onClick={handleNext}
                                disabled={currentQuestionIndex === questions.length - 1}
                                className="gap-2"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Submit Button */}
                        <Button
                            onClick={handleSubmitTest}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold"
                            disabled={answeredCount === 0}
                        >
                            Submit Test ({answeredCount}/{questions.length} Answered)
                        </Button>
                    </>
                ) : (
                    <>
                        {/* Review Section */}
                        <div className="space-y-4 py-6 select-none">
                            <h3 className="font-semibold text-lg text-slate-800 select-none">Review Your Answers</h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {questions.map((question, index) => (
                                    <Card
                                        key={question.id}
                                        className={`p-4 cursor-pointer transition select-none ${answers[question.id] !== undefined
                                            ? 'bg-green-50 border-green-300'
                                            : 'bg-yellow-50 border-yellow-300'
                                            }`}
                                        onClick={() => {
                                            setCurrentQuestionIndex(index);
                                            setShowReview(false);
                                        }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-800">
                                                    Q{index + 1}. {question.text}
                                                </p>
                                                {answers[question.id] !== undefined && (
                                                    <p className="text-sm text-green-700 mt-1">
                                                        ✓ Your Answer: {String.fromCharCode(65 + answers[question.id])}. {question.options[answers[question.id]]}
                                                    </p>
                                                )}
                                                {answers[question.id] === undefined && (
                                                    <p className="text-sm text-yellow-700 mt-1">
                                                        ⚠ Not answered
                                                    </p>
                                                )}
                                            </div>
                                            <span className={`text-sm font-semibold px-3 py-1 rounded ${answers[question.id] !== undefined
                                                ? 'bg-green-200 text-green-800'
                                                : 'bg-yellow-200 text-yellow-800'
                                                }`}>
                                                {question.marks}M
                                            </span>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            <div className="flex gap-4 py-4 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowReview(false)}
                                    className="flex-1"
                                >
                                    Continue Answering
                                </Button>
                                <Button
                                    onClick={handleSubmitTest}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    disabled={answeredCount === 0}
                                >
                                    Submit Test
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
