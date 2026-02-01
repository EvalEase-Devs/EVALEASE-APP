import React, { useState, useEffect } from 'react';
import { Task, Subject, Question, SubQuestion } from '@/lib/types';
import { Experiment, useExperimentCOs } from '@/hooks/use-api';
import { EXPERIMENTS, COS } from '@/app/teacher/assignments/create/constants';
import { Plus, Trash, Calendar, Clock, CheckCircle2, X, AlertCircle, BookOpen, Settings, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    validateTitle,
    validateStartTime,
    validateEndTime,
    validateMaxMarks,
    validateCOs,
    validateMcqQuestion,
} from '../schemas/task-schema';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (task: Task) => void;
    currentSubject: Subject | undefined;
    currentClass: string;
    currentBatch: string;
    experiments?: Experiment[];
    experimentsLoading?: boolean;
}

const DEFAULT_MSE_QUESTIONS = [
    { label: 'Q1A', co: COS[0], marks: 5 },
    { label: 'Q1B', co: COS[0], marks: 5 },
    { label: 'Q2A', co: COS[0], marks: 5 },
    { label: 'Q2B', co: COS[0], marks: 5 },
    { label: 'Q3A', co: COS[0], marks: 5 },
    { label: 'Q3B', co: COS[0], marks: 5 },
];

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onAdd, currentSubject, currentClass, currentBatch, experiments = [], experimentsLoading = false }) => {
    // General State
    const [title, setTitle] = useState('');
    const [selectedExp, setSelectedExp] = useState<string>('');
    const [assessmentType, setAssessmentType] = useState<'ISE' | 'MSE'>('ISE');
    const [assessmentSubType, setAssessmentSubType] = useState<'Subjective' | 'MCQ'>('Subjective');
    const [selectedCOs, setSelectedCOs] = useState<string[]>([]);

    // Fetch COs for the selected experiment
    const { cos: experimentCOs, loading: cosLoading } = useExperimentCOs(
        currentSubject?.code || '',
        selectedExp ? parseInt(selectedExp) : null
    );

    // Initialize selectedExp when experiments are loaded
    useEffect(() => {
        if (experiments.length > 0 && !selectedExp) {
            setSelectedExp(`${experiments[0].exp_no}`);
        }
    }, [experiments, selectedExp]);

    // Scheduling State
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    const [maxMarks, setMaxMarks] = useState<number>(15);

    // MCQ Builder State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQText, setCurrentQText] = useState('');
    const [currentOptions, setCurrentOptions] = useState<string[]>(['', '', '', '']);
    const [currentCorrectOpt, setCurrentCorrectOpt] = useState(0);
    const [currentQMarks, setCurrentQMarks] = useState(2);

    // MSE Builder State
    const [mseQuestions, setMseQuestions] = useState<SubQuestion[]>(DEFAULT_MSE_QUESTIONS);

    // Validation Error State
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Auto-calculate MSE Max Marks & COs
    useEffect(() => {
        if (assessmentType === 'MSE') {
            const total = mseQuestions.reduce((sum, q) => sum + q.marks, 0);
            setMaxMarks(total);

            const uniqueCOs = Array.from(new Set(mseQuestions.map(q => q.co)));
            setSelectedCOs(uniqueCOs);
        }
    }, [mseQuestions, assessmentType]);

    // Clear errors when form type changes
    useEffect(() => {
        setErrors({});
        setTouched({});
    }, [assessmentType, assessmentSubType]);

    // Field blur handler to mark fields as touched
    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        validateField(field);
    };

    // Single field validation
    const validateField = (field: string): boolean => {
        let error: string | null = null;

        switch (field) {
            case 'title':
                if (!isLab && assessmentType !== 'MSE') {
                    error = validateTitle(title);
                }
                break;
            case 'startTime':
                error = validateStartTime(startTime);
                break;
            case 'endTime':
                if (isMCQ) {
                    error = validateEndTime(startTime, endTime);
                }
                break;
            case 'maxMarks':
                if (!isLab && assessmentType !== 'MSE') {
                    error = validateMaxMarks(maxMarks);
                }
                break;
            case 'selectedCOs':
                if (assessmentType !== 'MSE') {
                    error = validateCOs(selectedCOs);
                }
                break;
        }

        setErrors(prev => {
            if (error) {
                return { ...prev, [field]: error };
            } else {
                const { [field]: _, ...rest } = prev;
                return rest;
            }
        });

        return error === null;
    };

    // Full form validation
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Start Time validation (required for all)
        const startTimeError = validateStartTime(startTime);
        if (startTimeError) newErrors.startTime = startTimeError;

        if (isLab) {
            // Lab only needs startTime and experiment selection
            if (!selectedExp) newErrors.selectedExp = "Select an experiment";
        } else if (assessmentType === 'MSE') {
            // MSE - COs and marks auto-calculated
            const total = mseQuestions.reduce((sum, q) => sum + q.marks, 0);
            if (total <= 0) newErrors.mseQuestions = "Total marks must be greater than 0";
        } else if (assessmentType === 'ISE') {
            // Title validation
            const titleError = validateTitle(title);
            if (titleError) newErrors.title = titleError;

            // COs validation
            const cosError = validateCOs(selectedCOs);
            if (cosError) newErrors.selectedCOs = cosError;

            // Max marks validation for subjective
            if (assessmentSubType === 'Subjective') {
                const marksError = validateMaxMarks(maxMarks);
                if (marksError) newErrors.maxMarks = marksError;
            }

            // MCQ specific validation
            if (assessmentSubType === 'MCQ') {
                const endTimeError = validateEndTime(startTime, endTime);
                if (endTimeError) newErrors.endTime = endTimeError;

                if (questions.length === 0) {
                    newErrors.questions = "Add at least one question";
                }

                // Check total MCQ marks
                const totalMCQMarks = questions.reduce((sum, q) => sum + q.marks, 0);
                if (totalMCQMarks <= 0) {
                    newErrors.questions = "Total marks must be greater than 0";
                }
            }
        }

        setErrors(newErrors);
        // Mark all fields as touched
        const touchedFields: Record<string, boolean> = {};
        Object.keys(newErrors).forEach(key => touchedFields[key] = true);
        setTouched(prev => ({ ...prev, ...touchedFields }));

        return Object.keys(newErrors).length === 0;
    };

    if (!isOpen || !currentSubject) return null;

    const isLab = currentSubject.type === 'Lab';
    const isMCQ = !isLab && assessmentType === 'ISE' && assessmentSubType === 'MCQ';

    // Error display helper component
    const FieldError = ({ field }: { field: string }) => {
        if (!touched[field] || !errors[field]) return null;
        return (
            <div className="flex items-center gap-1 text-destructive text-xs mt-1">
                <AlertCircle size={12} />
                <span>{errors[field]}</span>
            </div>
        );
    };

    const handleMseChange = (index: number, field: keyof SubQuestion, value: any) => {
        const updated = [...mseQuestions];
        updated[index] = { ...updated[index], [field]: value };
        setMseQuestions(updated);
    };

    const handleAddQuestion = () => {
        const questionError = validateMcqQuestion(currentQText, currentOptions);
        if (questionError) {
            setErrors(prev => ({ ...prev, currentQuestion: questionError }));
            setTouched(prev => ({ ...prev, currentQuestion: true }));
            return;
        }
        // Clear any previous question error
        setErrors(prev => {
            const { currentQuestion, ...rest } = prev;
            return rest;
        });

        const newQ: Question = {
            id: Date.now().toString(),
            text: currentQText,
            options: [...currentOptions],
            correctOptionIndex: currentCorrectOpt,
            marks: currentQMarks
        };
        setQuestions([...questions, newQ]);

        // Clear the questions error if we now have at least one
        if (errors.questions) {
            setErrors(prev => {
                const { questions: _, ...rest } = prev;
                return rest;
            });
        }

        // Reset inputs
        setCurrentQText('');
        setCurrentOptions(['', '', '', '']);
        setCurrentCorrectOpt(0);
    };

    const handleRemoveQuestion = (id: string) => {
        setQuestions(prev => prev.filter(q => q.id !== id));
    };

    const handleSubmit = () => {
        // Run full validation
        if (!validateForm()) {
            return;
        }

        // Get the selected experiment details
        const selectedExperiment = experiments.find(exp => exp.exp_no === parseInt(selectedExp));

        // Construct Title
        let finalTitle = title;

        if (isLab) {
            finalTitle = `${currentSubject.code} - Exp ${selectedExp}: ${selectedExperiment?.exp_name || 'Experiment'}`;
        } else if (assessmentType === 'MSE') {
            finalTitle = `${currentSubject.code} - MSE`;
        } else {
            // ISE
            finalTitle = `${currentSubject.code} - ${assessmentType} ${assessmentSubType === 'MCQ' ? '(MCQ)' : ''} - ${title}`;
        }

        // Auto-calculate maxMarks for MCQ from sum of all question marks
        let calculatedMaxMarks = maxMarks;
        if (isMCQ) {
            calculatedMaxMarks = questions.reduce((sum, q) => sum + q.marks, 0);
        }

        // Convert local time to IST ISO string (preserve the local time, just add IST offset)
        const convertToIST = (localDateTime: string) => {
            if (!localDateTime) return undefined;
            // datetime-local gives us: "2026-01-10T20:00"
            // We want to keep this time and explicitly mark it as IST: "2026-01-10T20:00:00+05:30"
            return localDateTime.replace('T', 'T') + ':00+05:30';
        };

        const newTask: Task = {
            id: Math.random().toString(36).substr(2, 9),
            title: finalTitle,
            startTime: convertToIST(startTime),
            endTime: endTime ? convertToIST(endTime) : undefined,
            type: currentSubject.type,
            experimentNumber: isLab ? parseInt(selectedExp) : undefined,
            assessmentType: !isLab ? assessmentType : undefined,
            assessmentSubType: (!isLab && assessmentType === 'ISE') ? assessmentSubType : undefined,
            mcqQuestions: (isMCQ) ? questions : undefined,
            subQuestions: (!isLab && assessmentType === 'MSE') ? mseQuestions : undefined,
            maxMarks: calculatedMaxMarks,
            mappedCOs: selectedCOs,
            subjectCode: currentSubject.code,
            classStr: currentClass,
            batch: currentBatch
        };
        onAdd(newTask);
        handleClose();
    };

    const handleClose = () => {
        // Reset form
        setTitle('');
        setSelectedCOs([]);
        setQuestions([]);
        setStartTime('');
        setEndTime('');
        setMaxMarks(15);
        setErrors({});
        setTouched({});
        setMseQuestions(DEFAULT_MSE_QUESTIONS);
        onClose();
    };

    const toggleCO = (co: string) => {
        setSelectedCOs(prev => prev.includes(co) ? prev.filter(c => c !== co) : [...prev, co]);
    };

    const updateOption = (index: number, val: string) => {
        const newOpts = [...currentOptions];
        newOpts[index] = val;
        setCurrentOptions(newOpts);
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-[1000px] p-0 flex flex-col">
                {/* Header */}
                <SheetHeader className="px-6 pt-4 pb-3 border-b shrink-0">
                    <SheetTitle className="text-xl">
                        Create {isLab ? 'Lab Experiment' : 'Theory Assessment'}
                    </SheetTitle>
                    <SheetDescription>
                        Adding to: <span className="font-semibold text-foreground">{currentSubject.fullName}</span> ({currentClass}, Batch: {currentBatch})
                    </SheetDescription>
                </SheetHeader>

                {/* Main Content - Scrollable Area */}
                <div className="flex-1 overflow-y-auto">
                    <div className="px-6 py-4">
                        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                            {/* LAB LOGIC - Full Width */}
                            {isLab && (
                                <div className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-3">
                                    <div className="flex items-center gap-2 mb-3">
                                        <BookOpen className="h-5 w-5 text-primary" />
                                        <h3 className="font-semibold text-base">Laboratory Experiment Selection</h3>
                                    </div>

                                    {experimentsLoading ? (
                                        <div className="flex h-12 w-full items-center justify-center rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground animate-pulse">
                                            Loading experiments...
                                        </div>
                                    ) : experiments.length > 0 ? (
                                        <>
                                            <div className="space-y-2">
                                                <Label>Select Experiment <span className="text-destructive">*</span></Label>
                                                <Select value={selectedExp} onValueChange={setSelectedExp}>
                                                    <SelectTrigger className="h-11">
                                                        <SelectValue placeholder="Choose an experiment..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {experiments.map(exp => (
                                                            <SelectItem
                                                                key={exp.exp_no}
                                                                value={`${exp.exp_no}`}
                                                                className="cursor-pointer"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold">Exp {exp.exp_no}</span>
                                                                    <span className="text-muted-foreground">—</span>
                                                                    <span>{exp.exp_name}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Display COs associated with selected experiment */}
                                            {selectedExp && (
                                                <div className="mt-4 space-y-3 p-3 bg-background rounded-md border">
                                                    <Label className="text-sm font-medium">Associated Course Outcomes</Label>
                                                    {cosLoading ? (
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                                                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
                                                            Fetching COs...
                                                        </div>
                                                    ) : experimentCOs.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {experimentCOs.map((co) => (
                                                                <Badge
                                                                    key={co.co_no}
                                                                    variant="secondary"
                                                                >
                                                                    CO{co.co_no}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-muted-foreground italic">No COs associated with this experiment</div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex h-12 w-full items-center justify-center rounded-md border border-dashed border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                                            No experiments available for this subject
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* THEORY LOGIC - Responsive Grid */}
                            {!isLab && (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                    {/* LEFT COLUMN: Logistics & Settings */}
                                    <div className="lg:col-span-5 space-y-4">
                                        <div className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Settings className="h-5 w-5 text-primary" />
                                                <h3 className="font-semibold text-base">Step 1: Logistics</h3>
                                            </div>

                                            {/* Type Selection */}
                                            <div className="space-y-2">
                                                <Label>Assessment Type</Label>
                                                <div className="flex gap-4 bg-muted p-3 rounded-md">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            className="h-4 w-4"
                                                            checked={assessmentType === 'ISE'}
                                                            onChange={() => setAssessmentType('ISE')}
                                                        />
                                                        <span className="text-sm font-medium">ISE</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            className="h-4 w-4"
                                                            checked={assessmentType === 'MSE'}
                                                            onChange={() => setAssessmentType('MSE')}
                                                        />
                                                        <span className="text-sm font-medium">MSE</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Mode Selection (Only for ISE) */}
                                            {assessmentType === 'ISE' && (
                                                <div className="space-y-2">
                                                    <Label>Mode</Label>
                                                    <div className="flex gap-4 bg-muted p-3 rounded-md">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                className="h-4 w-4"
                                                                checked={assessmentSubType === 'Subjective'}
                                                                onChange={() => setAssessmentSubType('Subjective')}
                                                            />
                                                            <span className="text-sm font-medium">Subjective</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                className="h-4 w-4"
                                                                checked={assessmentSubType === 'MCQ'}
                                                                onChange={() => setAssessmentSubType('MCQ')}
                                                            />
                                                            <span className="text-sm font-medium">MCQ (Quiz)</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Topic / Title - Only for ISE */}
                                            {assessmentType !== 'MSE' && (
                                                <div className="space-y-2">
                                                    <Label>Topic / Title <span className="text-destructive">*</span></Label>
                                                    <Input
                                                        type="text"
                                                        placeholder="e.g. Module 1 Test"
                                                        value={title}
                                                        onChange={(e) => setTitle(e.target.value)}
                                                        onBlur={() => handleBlur('title')}
                                                        className={errors.title && touched.title ? 'border-destructive' : ''}
                                                    />
                                                    <FieldError field="title" />
                                                </div>
                                            )}

                                            {/* Time Configuration */}
                                            {isMCQ ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="flex items-center gap-1">
                                                            <Clock size={14} /> Start <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Input
                                                            type="datetime-local"
                                                            value={startTime}
                                                            onChange={(e) => setStartTime(e.target.value)}
                                                            onBlur={() => handleBlur('startTime')}
                                                            className={errors.startTime && touched.startTime ? 'border-destructive' : ''}
                                                        />
                                                        <FieldError field="startTime" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="flex items-center gap-1">
                                                            <Calendar size={14} /> End <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Input
                                                            type="datetime-local"
                                                            value={endTime}
                                                            onChange={(e) => setEndTime(e.target.value)}
                                                            onBlur={() => handleBlur('endTime')}
                                                            className={errors.endTime && touched.endTime ? 'border-destructive' : ''}
                                                        />
                                                        <FieldError field="endTime" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-1">
                                                        <Calendar size={14} /> Start Time <span className="text-destructive">*</span>
                                                    </Label>
                                                    <Input
                                                        type="datetime-local"
                                                        value={startTime}
                                                        onChange={(e) => setStartTime(e.target.value)}
                                                        onBlur={() => handleBlur('startTime')}
                                                        className={errors.startTime && touched.startTime ? 'border-destructive' : ''}
                                                    />
                                                    <FieldError field="startTime" />
                                                </div>
                                            )}

                                            {/* Max Marks for Subjective */}
                                            {!isMCQ && assessmentType !== 'MSE' && (
                                                <div className="space-y-2">
                                                    <Label>Max Marks <span className="text-destructive">*</span></Label>
                                                    <Input
                                                        type="number"
                                                        value={maxMarks}
                                                        onChange={(e) => setMaxMarks(parseInt(e.target.value) || 0)}
                                                        onBlur={() => handleBlur('maxMarks')}
                                                        className={errors.maxMarks && touched.maxMarks ? 'border-destructive' : ''}
                                                    />
                                                    <FieldError field="maxMarks" />
                                                </div>
                                            )}

                                            {/* Manual CO Map - Only show if NOT MSE */}
                                            {assessmentType !== 'MSE' && (
                                                <div className="space-y-2">
                                                    <Label>Map COs <span className="text-destructive">*</span></Label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {COS.map(co => (
                                                            <label key={co} className="flex items-center gap-2 cursor-pointer border border-border rounded-md px-3 py-2 hover:bg-muted transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-4 w-4 rounded"
                                                                    checked={selectedCOs.includes(co)}
                                                                    onChange={() => {
                                                                        toggleCO(co);
                                                                        setTouched(prev => ({ ...prev, selectedCOs: true }));
                                                                    }}
                                                                />
                                                                <span className="text-sm">{co}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                    <FieldError field="selectedCOs" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* RIGHT COLUMN: Content & Questions */}
                                    <div className="lg:col-span-7 space-y-4">
                                        <div className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <FileText className="h-5 w-5 text-primary" />
                                                <h3 className="font-semibold text-base">Step 2: Content</h3>
                                            </div>

                                            {/* MCQ BUILDER */}
                                            {isMCQ && (
                                                <div className="space-y-4">
                                                    <h4 className="font-semibold text-sm">Build MCQ Quiz</h4>
                                                    <FieldError field="questions" />

                                                    {/* List Existing Questions */}
                                                    {questions.length > 0 && (
                                                        <div className="space-y-2">
                                                            {questions.map((q, idx) => (
                                                                <div key={q.id} className="bg-background p-3 rounded-lg border flex justify-between items-center">
                                                                    <div className="flex-1">
                                                                        <span className="font-bold mr-2">Q{idx + 1}.</span>
                                                                        {q.text} <span className="text-xs text-muted-foreground">({q.marks} Marks)</span>
                                                                    </div>
                                                                    <Button variant="ghost" size="sm" onClick={() => handleRemoveQuestion(q.id)} className="text-destructive">
                                                                        <Trash size={14} />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                            {/* Total Marks Summary */}
                                                            <div className="mt-3 p-3 bg-primary/10 rounded-md border border-primary/20 flex justify-between items-center">
                                                                <span className="text-sm font-semibold">Total MCQ Marks:</span>
                                                                <span className="text-lg font-bold text-primary">{questions.reduce((sum, q) => sum + q.marks, 0)}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Add New Question Form */}
                                                    <div className="bg-background p-4 rounded-lg border space-y-3">
                                                        <FieldError field="currentQuestion" />
                                                        <div className="flex gap-2">
                                                            <Input
                                                                type="text"
                                                                placeholder="Question Text"
                                                                value={currentQText}
                                                                onChange={(e) => setCurrentQText(e.target.value)}
                                                                className={errors.currentQuestion && touched.currentQuestion ? 'border-destructive' : ''}
                                                            />
                                                            <Input
                                                                type="number"
                                                                className="w-24"
                                                                placeholder="Marks"
                                                                value={currentQMarks}
                                                                onChange={(e) => setCurrentQMarks(parseInt(e.target.value) || 1)}
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {currentOptions.map((opt, idx) => (
                                                                <div key={idx} className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold w-5">{String.fromCharCode(65 + idx)}.</span>
                                                                    <Input
                                                                        type="text"
                                                                        className={`text-sm ${currentCorrectOpt === idx ? 'border-primary ring-1 ring-primary' : ''}`}
                                                                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                                                        value={opt}
                                                                        onChange={(e) => updateOption(idx, e.target.value)}
                                                                    />
                                                                    <input
                                                                        type="radio"
                                                                        name="correctOpt"
                                                                        className="h-4 w-4"
                                                                        checked={currentCorrectOpt === idx}
                                                                        onChange={() => setCurrentCorrectOpt(idx)}
                                                                        title="Mark as correct"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <Button variant="outline" size="sm" className="w-full" onClick={handleAddQuestion}>
                                                            <Plus size={16} className="mr-2" /> Add Question
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* MSE BUILDER */}
                                            {assessmentType === 'MSE' && (
                                                <div className="space-y-3">
                                                    <h4 className="font-semibold text-sm">MSE Question Breakdown</h4>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead className="text-xs uppercase bg-muted">
                                                                <tr>
                                                                    <th className="px-3 py-1.5 text-left">Q. Label</th>
                                                                    <th className="px-3 py-1.5 text-left">CO Mapping</th>
                                                                    <th className="px-3 py-1.5 text-left w-24">Marks</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {mseQuestions.map((q, idx) => (
                                                                    <tr key={idx} className="border-b bg-background">
                                                                        <td className="px-3 py-1.5 font-bold">{q.label}</td>
                                                                        <td className="px-3 py-1.5">
                                                                            <select
                                                                                className="flex h-8 w-full items-center rounded-md border border-input bg-background px-2 py-1 text-sm"
                                                                                value={q.co}
                                                                                onChange={(e) => handleMseChange(idx, 'co', e.target.value)}
                                                                            >
                                                                                {COS.map(co => <option key={co} value={co}>{co}</option>)}
                                                                            </select>
                                                                        </td>
                                                                        <td className="px-3 py-1.5">
                                                                            <Input
                                                                                type="number"
                                                                                className="h-8"
                                                                                value={q.marks}
                                                                                onChange={(e) => handleMseChange(idx, 'marks', parseInt(e.target.value) || 0)}
                                                                            />
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                            <tfoot>
                                                                <tr className="bg-muted/50">
                                                                    <td colSpan={2} className="px-3 py-1.5 text-right font-bold">Total Max Marks:</td>
                                                                    <td className="px-3 py-1.5 font-bold text-lg text-primary">{maxMarks}</td>
                                                                </tr>
                                                            </tfoot>
                                                        </table>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        * Mapped COs will be auto-calculated based on unique COs selected above.
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TIME CONFIGURATION FOR LAB */}
                            {isLab && (
                                <div className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="h-5 w-5 text-primary" />
                                        <h3 className="font-semibold text-base">Scheduling</h3>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-1">
                                            <Clock size={14} /> Start Time <span className="text-destructive">*</span>
                                            <span className="text-xs text-muted-foreground">(IST)</span>
                                        </Label>
                                        <Input
                                            type="datetime-local"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            onBlur={() => handleBlur('startTime')}
                                            className={errors.startTime && touched.startTime ? 'border-destructive' : ''}
                                        />
                                        <FieldError field="startTime" />
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                {/* Footer - Fixed at Bottom */}
                <SheetFooter className="px-6 py-3 border-t bg-background shrink-0">
                    <div className="flex items-center justify-between w-full">
                        <div className="text-sm text-muted-foreground">
                            Total Marks: <span className="font-bold text-foreground">{isMCQ ? questions.reduce((sum, q) => sum + q.marks, 0) : maxMarks}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleClose}>Cancel</Button>
                            <Button onClick={handleSubmit}>
                                {isMCQ ? <Clock size={18} className="mr-2" /> : <CheckCircle2 size={18} className="mr-2" />}
                                {isMCQ ? 'Schedule Task' : 'Create Task'}
                            </Button>
                        </div>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};

export default TaskModal;
