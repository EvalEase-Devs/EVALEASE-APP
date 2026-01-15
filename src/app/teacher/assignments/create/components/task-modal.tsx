import React, { useState, useEffect } from 'react';
import { Task, Subject, Question, SubQuestion } from '@/lib/types';
import { Experiment, useExperimentCOs } from '@/hooks/use-api';
import { EXPERIMENTS, COS } from '@/app/teacher/assignments/create/constants';
import { Plus, Trash, Calendar, Clock, CheckCircle2, X, AlertCircle, BookOpen } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col relative border">
                <div className="flex justify-between items-center mb-4 p-6 pb-0 flex-shrink-0">
                    <div>
                        <h3 className="font-bold text-lg">
                            Create {isLab ? 'Lab Experiment' : 'Theory Assessment'}
                        </h3>
                        <div className="text-sm text-muted-foreground">
                            Adding to: <span className="font-semibold">{currentSubject.fullName}</span> ({currentClass}, Batch: {currentBatch})
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="overflow-y-auto flex-1 px-6 pt-4">
                    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4 pb-6">

                        {/* LAB LOGIC */}
                        {isLab && (
                            <div className="space-y-4 p-4 bg-card rounded-lg border border-border">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="h-5 w-5 text-primary" />
                                        <Label className="font-semibold text-base">Select Laboratory Experiment</Label>
                                    </div>

                                    {experimentsLoading ? (
                                        <div className="flex h-10 w-full items-center justify-center rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground animate-pulse">
                                            Loading experiments...
                                        </div>
                                    ) : experiments.length > 0 ? (
                                        <>
                                            <div className="relative z-50">
                                                <Select value={selectedExp} onValueChange={setSelectedExp}>
                                                    <SelectTrigger className="h-11">
                                                        <SelectValue placeholder="Choose an experiment..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="z-[1000]">
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
                                                <div className="mt-4 space-y-3 p-3 bg-muted rounded-md border border-border">
                                                    <Label className="text-sm font-medium text-foreground">Associated Course Outcomes</Label>
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
                                        <div className="flex h-10 w-full items-center justify-center rounded-md border border-dashed border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                                            No experiments available for this subject
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* LEC LOGIC */}
                        {!isLab && (
                            <>
                                {/* Type Selection */}
                                <div className="flex gap-4">
                                    <div className="w-1/2 space-y-2">
                                        <Label>Assessment Type</Label>
                                        <div className="flex gap-4 bg-muted p-2 rounded-md">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    className="aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    checked={assessmentType === 'ISE'}
                                                    onChange={() => setAssessmentType('ISE')}
                                                />
                                                <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">ISE</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    className="aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    checked={assessmentType === 'MSE'}
                                                    onChange={() => setAssessmentType('MSE')}
                                                />
                                                <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">MSE</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* SubType Selection (Only for ISE) */}
                                    {assessmentType === 'ISE' && (
                                        <div className="w-1/2 space-y-2">
                                            <Label>Mode</Label>
                                            <div className="flex gap-4 bg-muted p-2 rounded-md">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        className="aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        checked={assessmentSubType === 'Subjective'}
                                                        onChange={() => setAssessmentSubType('Subjective')}
                                                    />
                                                    <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Subjective</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        className="aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        checked={assessmentSubType === 'MCQ'}
                                                        onChange={() => setAssessmentSubType('MCQ')}
                                                    />
                                                    <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">MCQ (Quiz)</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>

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
                                            required
                                        />
                                        <FieldError field="title" />
                                    </div>
                                )}

                                {/* MCQ BUILDER */}
                                {isMCQ ? (
                                    <div className="bg-muted p-4 rounded-md border border-border">
                                        <h4 className="font-bold text-sm mb-2">Build MCQ Quiz</h4>

                                        {/* Questions Error */}
                                        <FieldError field="questions" />

                                        {/* List Existing Questions */}
                                        {questions.length > 0 && (
                                            <div className="space-y-2 mb-4">
                                                {questions.map((q, idx) => (
                                                    <div key={q.id} className="bg-background p-2 rounded shadow-sm text-sm flex justify-between items-center border">
                                                        <div>
                                                            <span className="font-bold mr-2">Q{idx + 1}.</span>
                                                            {q.text} <span className="text-xs text-muted-foreground">({q.marks} Marks)</span>
                                                        </div>
                                                        <Button variant="ghost" size="sm" onClick={() => handleRemoveQuestion(q.id)} className="text-destructive hover:text-destructive">
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
                                        <div className="bg-background p-3 rounded border border-border">
                                            <FieldError field="currentQuestion" />
                                            <div className="flex gap-2 mb-2">
                                                <Input
                                                    type="text"
                                                    className={`h-8 ${errors.currentQuestion && touched.currentQuestion ? 'border-destructive' : ''}`}
                                                    placeholder="Question Text"
                                                    value={currentQText}
                                                    onChange={(e) => setCurrentQText(e.target.value)}
                                                />
                                                <Input
                                                    type="number"
                                                    className="h-8 w-20"
                                                    placeholder="Marks"
                                                    value={currentQMarks}
                                                    onChange={(e) => setCurrentQMarks(parseInt(e.target.value) || 1)}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                {currentOptions.map((opt, idx) => (
                                                    <div key={idx} className="flex items-center gap-1">
                                                        <span className="text-xs font-bold w-4">{String.fromCharCode(65 + idx)}.</span>
                                                        <Input
                                                            type="text"
                                                            className={`h-7 text-xs ${currentCorrectOpt === idx ? 'border-primary ring-1 ring-primary' : ''}`}
                                                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                                            value={opt}
                                                            onChange={(e) => updateOption(idx, e.target.value)}
                                                        />
                                                        <input
                                                            type="radio"
                                                            name="correctOpt"
                                                            className="aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                            checked={currentCorrectOpt === idx}
                                                            onChange={() => setCurrentCorrectOpt(idx)}
                                                            title="Mark as correct answer"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <Button variant="outline" size="sm" className="w-full" onClick={handleAddQuestion}>
                                                <Plus size={16} className="mr-2" /> Add Question
                                            </Button>
                                        </div>
                                    </div>
                                ) : assessmentType === 'MSE' ? (
                                    // MSE SPECIFIC BUILDER
                                    <div className="bg-muted p-4 rounded-md border border-border">
                                        <h4 className="font-bold text-sm mb-3">MSE Question Breakdown</h4>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs uppercase bg-muted">
                                                    <tr>
                                                        <th className="px-4 py-2">Q. Label</th>
                                                        <th className="px-4 py-2">CO Mapping</th>
                                                        <th className="px-4 py-2 w-24">Marks</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {mseQuestions.map((q, idx) => (
                                                        <tr key={idx} className="border-b bg-background">
                                                            <td className="px-4 py-2 font-bold">{q.label}</td>
                                                            <td className="px-4 py-2">
                                                                <select
                                                                    className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                    value={q.co}
                                                                    onChange={(e) => handleMseChange(idx, 'co', e.target.value)}
                                                                >
                                                                    {COS.map(co => <option key={co} value={co}>{co}</option>)}
                                                                </select>
                                                            </td>
                                                            <td className="px-4 py-2">
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
                                                    <tr>
                                                        <td colSpan={2} className="px-4 py-2 text-right font-bold">Total Max Marks:</td>
                                                        <td className="px-4 py-2 font-bold text-lg text-primary">{maxMarks}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                        <div className="mt-2 text-xs text-muted-foreground">
                                            * Mapped COs will be auto-calculated based on unique COs selected above.
                                        </div>
                                    </div>
                                ) : (
                                    // Standard Subjective Max Marks Input
                                    <div className="space-y-2 max-w-xs">
                                        <Label>Max Marks <span className="text-destructive">*</span></Label>
                                        <Input
                                            type="number"
                                            value={maxMarks}
                                            onChange={(e) => setMaxMarks(parseInt(e.target.value) || 0)}
                                            onBlur={() => handleBlur('maxMarks')}
                                            className={errors.maxMarks && touched.maxMarks ? 'border-destructive' : ''}
                                            required
                                        />
                                        <FieldError field="maxMarks" />
                                    </div>
                                )}

                                {/* Manual CO Map - Only show if NOT MSE (MSE is auto-mapped) */}
                                {assessmentType !== 'MSE' && (
                                    <div className="space-y-2">
                                        <Label>Map COs <span className="text-destructive">*</span></Label>
                                        <div className="flex flex-wrap gap-2">
                                            {COS.map(co => (
                                                <label key={co} className="flex items-center gap-2 cursor-pointer border border-border rounded-md px-3 py-1 hover:bg-muted transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
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
                            </>
                        )}

                        {/* TIME CONFIGURATION */}
                        {isMCQ ? (
                            /* Scheduling for MCQ */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        required
                                    />
                                    <FieldError field="startTime" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1">
                                        <Calendar size={14} /> End Time <span className="text-destructive">*</span>
                                        <span className="text-xs text-muted-foreground">(IST)</span>
                                    </Label>
                                    <Input
                                        type="datetime-local"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        onBlur={() => handleBlur('endTime')}
                                        className={errors.endTime && touched.endTime ? 'border-destructive' : ''}
                                        required
                                    />
                                    <FieldError field="endTime" />
                                </div>
                            </div>
                        ) : (
                            /* Start Time for Others */
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1">
                                    <Calendar size={14} /> Start Time <span className="text-destructive">*</span>
                                    <span className="text-xs text-muted-foreground">(IST)</span>
                                </Label>
                                <Input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    onBlur={() => handleBlur('startTime')}
                                    className={errors.startTime && touched.startTime ? 'border-destructive' : ''}
                                    required
                                />
                                <FieldError field="startTime" />
                            </div>
                        )}

                        {/* Summary Footer */}
                        <div className="flex justify-between items-center mt-4 pt-4 border-t">
                            <div className="text-sm">
                                Total Marks: <span className="font-bold">{isMCQ ? questions.reduce((sum, q) => sum + q.marks, 0) : maxMarks}</span>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                                <Button onClick={handleSubmit}>
                                    {isMCQ ? <Clock size={18} className="mr-2" /> : <CheckCircle2 size={18} className="mr-2" />}
                                    {isMCQ ? 'Schedule Task' : 'Create Task'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TaskModal;
