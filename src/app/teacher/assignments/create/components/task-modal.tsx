import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Task, Subject, Question, SubQuestion } from '@/lib/types';
import { Experiment, useExperimentLOs } from '@/hooks/use-api';
import { EXPERIMENTS, COS } from '@/app/teacher/assignments/create/constants';
import { IconPlus, IconTrash, IconCalendar, IconClock, IconCircleCheck, IconX, IconAlertCircle, IconBook, IconSettings, IconFileText } from '@tabler/icons-react';
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
    taskModalSchema,
    type TaskModalFormValues,
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
    // ── React Hook Form ────────────────────────────────────────────────────────
    const form = useForm<TaskModalFormValues>({
        resolver: zodResolver(taskModalSchema),
        defaultValues: {
            assessmentType: 'ISE',
            assessmentSubType: 'Subjective',
            title: '',
            startTime: '',
            endTime: '',
            maxMarks: 15,
            selectedCOs: [],
            selectedExp: '',
            questions: [],
            mseQuestions: DEFAULT_MSE_QUESTIONS,
        },
        mode: 'onTouched', // validate on blur, re-validate on change
    });

    const { register, control, watch, setValue, getValues, reset, formState: { errors, touchedFields } } = form;

    // Watched values for conditional rendering
    const assessmentType = watch('assessmentType');
    const assessmentSubType = watch('assessmentSubType');
    const selectedExp = watch('selectedExp');
    const startTime = watch('startTime');
    const endTime = watch('endTime');
    const maxMarks = watch('maxMarks');
    const selectedCOs = watch('selectedCOs');
    const questions = watch('questions');
    const mseQuestions = watch('mseQuestions');

    // MCQ question builder — local state (not part of the validated form until "Add" is clicked)
    const [currentQText, setCurrentQText] = React.useState('');
    const [currentOptions, setCurrentOptions] = React.useState<string[]>(['', '', '', '']);
    const [currentCorrectOpt, setCurrentCorrectOpt] = React.useState(0);
    const [currentQMarks, setCurrentQMarks] = React.useState(2);
    const [currentQuestionError, setCurrentQuestionError] = React.useState<string | null>(null);

    // Fetch LOs for selected experiment
    const { los: experimentLOs, loading: loLoading } = useExperimentLOs(
        currentSubject?.code || '',
        selectedExp ? parseInt(selectedExp) : null
    );

    // Initialize selectedExp when experiments are loaded
    useEffect(() => {
        if (experiments.length > 0 && !selectedExp) {
            setValue('selectedExp', `${experiments[0].exp_no}`);
        }
    }, [experiments, selectedExp, setValue]);

    // Auto-calculate MSE Max Marks & COs
    useEffect(() => {
        if (assessmentType === 'MSE') {
            const total = mseQuestions.reduce((sum, q) => sum + q.marks, 0);
            setValue('maxMarks', total);
            const uniqueCOs = Array.from(new Set(mseQuestions.map(q => q.co)));
            setValue('selectedCOs', uniqueCOs);
        }
    }, [mseQuestions, assessmentType, setValue]);

    if (!isOpen || !currentSubject) return null;

    const isLab = currentSubject.type === 'Lab';
    const isMCQ = !isLab && assessmentType === 'ISE' && assessmentSubType === 'MCQ';

    // Error display helper component
    const FieldError = ({ field }: { field: keyof TaskModalFormValues | 'currentQuestion' }) => {
        if (field === 'currentQuestion') {
            if (!currentQuestionError) return null;
            return (
                <div className="flex items-center gap-1 text-destructive text-xs mt-1">
                    <IconAlertCircle size={12} />
                    <span>{currentQuestionError}</span>
                </div>
            );
        }
        const err = errors[field];
        if (!err) return null;
        return (
            <div className="flex items-center gap-1 text-destructive text-xs mt-1">
                <IconAlertCircle size={12} />
                <span>{err.message as string}</span>
            </div>
        );
    };

    const handleMseChange = (index: number, field: keyof SubQuestion, value: any) => {
        const updated = [...mseQuestions];
        updated[index] = { ...updated[index], [field]: value };
        setValue('mseQuestions', updated, { shouldValidate: true });
    };

    const handleAddQuestion = () => {
        const questionError = validateMcqQuestion(currentQText, currentOptions);
        if (questionError) {
            setCurrentQuestionError(questionError);
            return;
        }
        setCurrentQuestionError(null);

        const newQ: Question = {
            id: Date.now().toString(),
            text: currentQText,
            options: [...currentOptions],
            correctOptionIndex: currentCorrectOpt,
            marks: currentQMarks
        };
        setValue('questions', [...questions, newQ], { shouldValidate: true });

        // Reset inputs
        setCurrentQText('');
        setCurrentOptions(['', '', '', '']);
        setCurrentCorrectOpt(0);
    };

    const handleRemoveQuestion = (id: string) => {
        setValue('questions', questions.filter(q => q.id !== id), { shouldValidate: true });
    };

    const handleFormSubmit = () => {
        // Manual validation for conditional fields since Zod superRefine
        // doesn't know about isLab (external prop)
        const values = getValues();

        // startTime is required for all
        if (!values.startTime) {
            form.setError('startTime', { message: 'Start time is required' });
            return;
        }

        if (isLab) {
            if (!values.selectedExp) {
                form.setError('selectedExp', { message: 'Select an experiment' });
                return;
            }
        } else if (values.assessmentType === 'MSE') {
            const total = values.mseQuestions.reduce((s, q) => s + q.marks, 0);
            if (total <= 0) {
                form.setError('mseQuestions', { message: 'Total marks must be greater than 0' });
                return;
            }
        } else {
            // ISE
            if (!values.title.trim()) {
                form.setError('title', { message: 'Title is required' });
                return;
            }
            if (values.selectedCOs.length === 0) {
                form.setError('selectedCOs', { message: 'Select at least one CO' });
                return;
            }
            if (values.assessmentSubType === 'Subjective') {
                if (values.maxMarks < 1) {
                    form.setError('maxMarks', { message: 'Marks must be at least 1' });
                    return;
                }
            }
            if (values.assessmentSubType === 'MCQ') {
                if (!values.endTime) {
                    form.setError('endTime', { message: 'End time is required for MCQ' });
                    return;
                }
                if (new Date(values.endTime) <= new Date(values.startTime)) {
                    form.setError('endTime', { message: 'End time must be after start time' });
                    return;
                }
                if (values.questions.length === 0) {
                    form.setError('questions', { message: 'Add at least one question' });
                    return;
                }
            }
        }

        // Get the selected experiment details
        const selectedExperiment = experiments.find(exp => exp.exp_no === parseInt(values.selectedExp));

        // Construct Title
        let finalTitle = values.title;

        if (isLab) {
            finalTitle = `${currentSubject!.code} - Exp ${values.selectedExp}: ${selectedExperiment?.exp_name || 'Experiment'}`;
        } else if (values.assessmentType === 'MSE') {
            finalTitle = `${currentSubject!.code} - MSE`;
        } else {
            finalTitle = `${currentSubject!.code} - ${values.assessmentType} ${values.assessmentSubType === 'MCQ' ? '(MCQ)' : ''} - ${values.title}`;
        }

        // Auto-calculate maxMarks for MCQ from sum of all question marks
        let calculatedMaxMarks = values.maxMarks;
        if (isMCQ) {
            calculatedMaxMarks = values.questions.reduce((sum, q) => sum + q.marks, 0);
        }

        // Convert local time to IST ISO string (preserve the local time, just add IST offset)
        const convertToIST = (localDateTime: string) => {
            if (!localDateTime) return undefined;
            return localDateTime.replace('T', 'T') + ':00+05:30';
        };

        const newTask: Task = {
            id: Math.random().toString(36).substr(2, 9),
            title: finalTitle,
            startTime: convertToIST(values.startTime),
            endTime: values.endTime ? convertToIST(values.endTime) : undefined,
            type: currentSubject!.type,
            experimentNumber: isLab ? parseInt(values.selectedExp) : undefined,
            assessmentType: !isLab ? values.assessmentType : undefined,
            assessmentSubType: (!isLab && values.assessmentType === 'ISE') ? values.assessmentSubType : undefined,
            mcqQuestions: (isMCQ) ? values.questions : undefined,
            subQuestions: (!isLab && values.assessmentType === 'MSE') ? values.mseQuestions : undefined,
            maxMarks: calculatedMaxMarks,
            mappedCOs: values.selectedCOs,
            subjectCode: currentSubject!.code,
            classStr: currentClass,
            batch: currentBatch
        };
        onAdd(newTask);
        handleClose();
    };

    const handleClose = () => {
        reset();
        setCurrentQText('');
        setCurrentOptions(['', '', '', '']);
        setCurrentCorrectOpt(0);
        setCurrentQuestionError(null);
        onClose();
    };

    const toggleCO = (co: string) => {
        const current = getValues('selectedCOs');
        const next = current.includes(co) ? current.filter(c => c !== co) : [...current, co];
        setValue('selectedCOs', next, { shouldValidate: true });
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
                                        <IconBook size={20} className="text-primary" />
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
                                                <Select value={selectedExp} onValueChange={(val) => setValue('selectedExp', val)}>
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

                                            {/* Display LOs associated with selected experiment */}
                                            {selectedExp && (
                                                <div className="mt-4 space-y-3 p-3 bg-background rounded-md border">
                                                    <Label className="text-sm font-medium">Associated Lab Outcomes</Label>
                                                    {loLoading ? (
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                                                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
                                                            Fetching LOs...
                                                        </div>
                                                    ) : experimentLOs.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {experimentLOs.map((lo) => (
                                                                <Badge
                                                                    key={lo.lo_no}
                                                                    variant="secondary"
                                                                >
                                                                    LO{lo.lo_no}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-muted-foreground italic">No LOs associated with this experiment</div>
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
                                                <IconSettings size={20} className="text-primary" />
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
                                                            onChange={() => setValue('assessmentType', 'ISE')}
                                                        />
                                                        <span className="text-sm font-medium">ISE</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            className="h-4 w-4"
                                                            checked={assessmentType === 'MSE'}
                                                            onChange={() => setValue('assessmentType', 'MSE')}
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
                                                                onChange={() => setValue('assessmentSubType', 'Subjective')}
                                                            />
                                                            <span className="text-sm font-medium">Subjective</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                className="h-4 w-4"
                                                                checked={assessmentSubType === 'MCQ'}
                                                                onChange={() => setValue('assessmentSubType', 'MCQ')}
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
                                                        {...register('title')}
                                                        className={errors.title ? 'border-destructive' : ''}
                                                    />
                                                    <FieldError field="title" />
                                                </div>
                                            )}

                                            {/* Time Configuration */}
                                            {isMCQ ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="flex items-center gap-1">
                                                            <IconClock size={14} /> Start <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Input
                                                            type="datetime-local"
                                                            {...register('startTime')}
                                                            className={errors.startTime ? 'border-destructive' : ''}
                                                        />
                                                        <FieldError field="startTime" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="flex items-center gap-1">
                                                            <IconCalendar size={14} /> End <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Input
                                                            type="datetime-local"
                                                            {...register('endTime')}
                                                            className={errors.endTime ? 'border-destructive' : ''}
                                                        />
                                                        <FieldError field="endTime" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-1">
                                                        <IconCalendar size={14} /> Start Time <span className="text-destructive">*</span>
                                                    </Label>
                                                    <Input
                                                        type="datetime-local"
                                                        {...register('startTime')}
                                                        className={errors.startTime ? 'border-destructive' : ''}
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
                                                        {...register('maxMarks', { valueAsNumber: true })}
                                                        className={errors.maxMarks ? 'border-destructive' : ''}
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
                                                                    onChange={() => toggleCO(co)}
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
                                                <IconFileText size={20} className="text-primary" />
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
                                                                        <IconTrash size={14} />
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
                                                                className={currentQuestionError ? 'border-destructive' : ''}
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
                                                            <IconPlus size={16} className="mr-2" /> Add Question
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
                                        <IconCalendar size={20} className="text-primary" />
                                        <h3 className="font-semibold text-base">Scheduling</h3>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-1">
                                            <IconClock size={14} /> Start Time <span className="text-destructive">*</span>
                                            <span className="text-xs text-muted-foreground">(IST)</span>
                                        </Label>
                                        <Input
                                            type="datetime-local"
                                            {...register('startTime')}
                                            className={errors.startTime ? 'border-destructive' : ''}
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
                            <Button onClick={handleFormSubmit}>
                                {isMCQ ? <IconClock size={18} className="mr-2" /> : <IconCircleCheck size={18} className="mr-2" />}
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
