"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    IconPlus,
    IconTrash,
    IconCircleCheck,
    IconEdit,
    IconCheck,
} from "@tabler/icons-react";
import type { FieldErrors } from "react-hook-form";
import type { TaskModalFormValues } from "@/app/teacher/assignments/create/schemas/task-schema";
import { COS } from "@/app/teacher/assignments/create/constants";
import type { Question, SubQuestion } from "@/lib/types";
import { FieldError } from "../field-error";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepContentProps {
    isMCQ: boolean;
    assessmentType: string;
    isSubjective: boolean;
    questions: Question[];
    mseQuestions: SubQuestion[];
    maxMarks: number;
    errors: FieldErrors<TaskModalFormValues>;
    handleAddQuestion: (
        text: string,
        options: string[],
        correctOptionIndex: number,
        marks: number,
        editingId?: string | null,
    ) => string | null;
    handleRemoveQuestion: (id: string) => void;
    handleMseChange: (
        index: number,
        field: keyof SubQuestion,
        value: string | number,
    ) => void;
}

// ---------------------------------------------------------------------------
// Step Content
// ---------------------------------------------------------------------------

export function StepContent({
    isMCQ,
    assessmentType,
    isSubjective,
    questions,
    mseQuestions,
    maxMarks,
    errors,
    handleAddQuestion,
    handleRemoveQuestion,
    handleMseChange,
}: StepContentProps) {
    // Local state for the MCQ question builder — lives here, not in the hook
    const [qText, setQText] = useState("");
    const [options, setOptions] = useState(["", "", "", ""]);
    const [correctOpt, setCorrectOpt] = useState(0);
    const [qMarks, setQMarks] = useState(2);
    const [qError, setQError] = useState<string | null>(null);
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

    const resetBuilder = () => {
        setQText("");
        setOptions(["", "", "", ""]);
        setCorrectOpt(0);
        setQMarks(2);
        setQError(null);
        setEditingQuestionId(null);
    };

    const updateOption = (idx: number, val: string) => {
        const next = [...options];
        next[idx] = val;
        setOptions(next);
    };

    const handleEditQuestion = (q: Question) => {
        setQText(q.text);
        setOptions([...q.options]);
        setCorrectOpt(q.correctOptionIndex);
        setQMarks(q.marks);
        setEditingQuestionId(q.id);
        setQError(null);
    };

    const handleCancelEdit = () => resetBuilder();

    const handleSaveQuestion = () => {
        const err = handleAddQuestion(qText, options, correctOpt, qMarks, editingQuestionId);
        if (err) {
            setQError(err);
            return;
        }
        resetBuilder();
    };

    const mcqTotal = questions.reduce((sum, q) => sum + q.marks, 0);

    // ── MCQ Builder ────────────────────────────────────────────────────────

    if (isMCQ) {
        return (
            <div>
                <FieldError message={errors.questions?.message as string} />

                {/* Existing questions */}
                {questions.length > 0 && (
                    <div className="mb-6">
                        {questions.map((q, idx) => (
                            <div
                                key={q.id}
                                className={`flex items-center justify-between border-b py-3 ${
                                    editingQuestionId === q.id
                                        ? "bg-primary/5 -mx-1 px-1 rounded-md"
                                        : ""
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-semibold mr-2">
                                        Q{idx + 1}.
                                    </span>
                                    <span className="text-sm">{q.text}</span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                        ({q.marks} marks)
                                    </span>
                                </div>
                                <div className="flex items-center shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditQuestion(q)}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <IconEdit size={14} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveQuestion(q.id)}
                                        className="text-destructive"
                                    >
                                        <IconTrash size={14} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <div className="flex justify-between items-center py-3 border-b-2 border-primary/20">
                            <span className="text-sm font-semibold">
                                Total MCQ Marks
                            </span>
                            <span className="text-sm font-semibold text-primary">
                                {mcqTotal}
                            </span>
                        </div>
                    </div>
                )}

                {/* Add question form */}
                <div className="rounded-xl border border-border/50 p-5 bg-muted/20">
                    <p className="text-sm font-medium mb-3">
                        {editingQuestionId ? "Edit Question" : "Add Question"}
                    </p>
                    <FieldError message={qError ?? undefined} />
                    <div className="flex gap-3 mt-2">
                        <Input
                            type="text"
                            placeholder="Question text"
                            value={qText}
                            onChange={(e) => setQText(e.target.value)}
                            className="flex-1"
                        />
                        <Input
                            type="number"
                            className="w-24"
                            placeholder="Marks"
                            value={qMarks}
                            onChange={(e) =>
                                setQMarks(parseInt(e.target.value) || 1)
                            }
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                        {options.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <span className="text-xs font-semibold w-5">
                                    {String.fromCharCode(65 + idx)}.
                                </span>
                                <Input
                                    type="text"
                                    className={
                                        correctOpt === idx
                                            ? "border-primary ring-1 ring-primary"
                                            : ""
                                    }
                                    placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                    value={opt}
                                    onChange={(e) =>
                                        updateOption(idx, e.target.value)
                                    }
                                />
                                <input
                                    type="radio"
                                    name="correctOpt"
                                    className="h-4 w-4"
                                    checked={correctOpt === idx}
                                    onChange={() => setCorrectOpt(idx)}
                                    title="Mark as correct"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                        {editingQuestionId && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEdit}
                                className="w-full"
                            >
                                Cancel Edit
                            </Button>
                        )}
                        <Button
                            variant="default"
                            size="sm"
                            className="w-full"
                            onClick={handleSaveQuestion}
                        >
                            {editingQuestionId ? (
                                <IconCheck size={16} className="mr-2" />
                            ) : (
                                <IconPlus size={16} className="mr-2" />
                            )}
                            {editingQuestionId ? "Update Question" : "Add Question"}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ── MSE Table ──────────────────────────────────────────────────────────

    if (assessmentType === "MSE") {
        return (
            <div>
                <FieldError
                    message={errors.mseQuestions?.message as string}
                />
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Q. Label</TableHead>
                            <TableHead>CO Mapping</TableHead>
                            <TableHead className="w-28">Marks</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mseQuestions.map((q, idx) => (
                            <TableRow key={idx}>
                                <TableCell className="font-semibold">
                                    {q.label}
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={q.co}
                                        onValueChange={(v) =>
                                            handleMseChange(idx, "co", v)
                                        }
                                    >
                                        <SelectTrigger className="h-8 w-28">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COS.map((co) => (
                                                <SelectItem
                                                    key={co}
                                                    value={co}
                                                >
                                                    {co}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        className="h-8 w-20"
                                        value={q.marks}
                                        onChange={(e) =>
                                            handleMseChange(
                                                idx,
                                                "marks",
                                                parseInt(e.target.value) || 0,
                                            )
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="flex justify-between items-center mt-3 py-3 border-t-2 border-primary/20">
                    <span className="text-sm font-semibold">
                        Total Max Marks
                    </span>
                    <span className="text-sm font-semibold text-primary">
                        {maxMarks}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Mapped COs are auto-calculated from your selections above.
                </p>
            </div>
        );
    }

    // ── ISE Subjective — should not normally render (wizard skips Step 3) ──

    if (isSubjective) {
        return (
            <div className="flex items-center gap-3 py-8 text-muted-foreground">
                <IconCircleCheck size={20} className="text-primary" />
                <span className="text-sm">
                    Subjective tasks don&apos;t require question setup. Review
                    and publish.
                </span>
            </div>
        );
    }

    return null;
}
