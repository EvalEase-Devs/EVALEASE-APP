"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
    taskModalSchema,
    type TaskModalFormValues,
    validateMcqQuestion,
} from "@/app/teacher/assignments/create/schemas/task-schema";
import { COS } from "@/app/teacher/assignments/create/constants";
import { useTasks } from "@/hooks/use-api";
import type { Allotment, Experiment } from "@/hooks/use-api";
import type { Task, Question, SubQuestion } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_MSE_QUESTIONS: SubQuestion[] = [
    { label: "Q1A", co: COS[0], marks: 5 },
    { label: "Q1B", co: COS[0], marks: 5 },
    { label: "Q2A", co: COS[0], marks: 5 },
    { label: "Q2B", co: COS[0], marks: 5 },
    { label: "Q3A", co: COS[0], marks: 5 },
    { label: "Q3B", co: COS[0], marks: 5 },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const convertToIST = (localDateTime: string) => {
    if (!localDateTime) return undefined;
    return localDateTime + ":00+05:30";
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTaskForm(
    allotment: Allotment | undefined,
    experiments: Experiment[],
) {
    const router = useRouter();
    const isLab = allotment?.type === "Lab";
    const { createTask } = useTasks(allotment?.allotment_id);
    const [submitting, setSubmitting] = useState(false);

    // ── Form setup ─────────────────────────────────────────────────────────
    const form = useForm<TaskModalFormValues>({
        resolver: zodResolver(taskModalSchema),
        defaultValues: {
            assessmentType: "ISE",
            assessmentSubType: "Subjective",
            title: "",
            startTime: "",
            endTime: "",
            maxMarks: 15,
            selectedCOs: [],
            selectedExp: "",
            questions: [],
            mseQuestions: DEFAULT_MSE_QUESTIONS,
        },
        mode: "onTouched",
    });

    const { setValue, getValues, watch } = form;

    // ── Watched values ─────────────────────────────────────────────────────
    const assessmentType = watch("assessmentType");
    const assessmentSubType = watch("assessmentSubType");
    const selectedExp = watch("selectedExp");
    const maxMarks = watch("maxMarks");
    const selectedCOs = watch("selectedCOs");
    const questions = watch("questions");
    const mseQuestions = watch("mseQuestions");

    const isMCQ =
        !isLab && assessmentType === "ISE" && assessmentSubType === "MCQ";

    // ── Effects ────────────────────────────────────────────────────────────

    // Auto-select the first experiment for lab tasks
    useEffect(() => {
        if (experiments.length > 0 && !selectedExp) {
            setValue("selectedExp", `${experiments[0].exp_no}`);
        }
    }, [experiments, selectedExp, setValue]);

    // Auto-calculate MSE total marks and CO mapping
    useEffect(() => {
        if (assessmentType === "MSE") {
            const total = mseQuestions.reduce((sum, q) => sum + q.marks, 0);
            setValue("maxMarks", total);
            const uniqueCOs = Array.from(
                new Set(mseQuestions.map((q) => q.co)),
            );
            setValue("selectedCOs", uniqueCOs);
        }
    }, [mseQuestions, assessmentType, setValue]);

    // ── Handlers ───────────────────────────────────────────────────────────

    const toggleCO = (co: string) => {
        const current = getValues("selectedCOs");
        const next = current.includes(co)
            ? current.filter((c) => c !== co)
            : [...current, co];
        setValue("selectedCOs", next, { shouldValidate: true });
    };

    const handleMseChange = (
        index: number,
        field: keyof SubQuestion,
        value: string | number,
    ) => {
        const updated = [...mseQuestions];
        updated[index] = { ...updated[index], [field]: value };
        setValue("mseQuestions", updated, { shouldValidate: true });
    };

    /**
     * Adds or updates an MCQ question.
     * Pass `editingId` to update an existing question instead of appending.
     * Returns an error string on validation failure, or null on success.
     */
    const handleAddQuestion = (
        text: string,
        options: string[],
        correctOptionIndex: number,
        marks: number,
        editingId?: string | null,
    ): string | null => {
        const error = validateMcqQuestion(text, options);
        if (error) return error;

        const current = getValues("questions");

        if (editingId) {
            const updated = current.map((q) =>
                q.id === editingId
                    ? { ...q, text, options: [...options], correctOptionIndex, marks }
                    : q,
            );
            setValue("questions", updated, { shouldValidate: true });
        } else {
            const newQ: Question = {
                id: Date.now().toString(),
                text,
                options: [...options],
                correctOptionIndex,
                marks,
            };
            setValue("questions", [...current, newQ], { shouldValidate: true });
        }
        return null;
    };

    const handleRemoveQuestion = (id: string) => {
        setValue(
            "questions",
            getValues("questions").filter((q) => q.id !== id),
            { shouldValidate: true },
        );
    };

    // ── Submit ─────────────────────────────────────────────────────────────

    /**
     * Runs final validation and submits the task.
     * @param setCurrentStep — wizard callback used to navigate back to the
     *   failing step when a validation error is detected post-navigation.
     */
    const handleSubmit = async (setCurrentStep: (step: number) => void) => {
        if (!allotment) return;

        const values = getValues();

        if (!values.startTime) {
            form.setError("startTime", { message: "Start time is required" });
            setCurrentStep(2);
            return;
        }

        if (isLab) {
            if (!values.selectedExp) {
                form.setError("selectedExp", {
                    message: "Select an experiment",
                });
                setCurrentStep(1);
                return;
            }
        } else if (values.assessmentType === "MSE") {
            const total = values.mseQuestions.reduce(
                (s, q) => s + q.marks,
                0,
            );
            if (total <= 0) {
                form.setError("mseQuestions", {
                    message: "Total marks must be greater than 0",
                });
                return;
            }
        } else {
            if (!values.title.trim()) {
                form.setError("title", { message: "Title is required" });
                setCurrentStep(2);
                return;
            }
            if (values.selectedCOs.length === 0) {
                form.setError("selectedCOs", {
                    message: "Select at least one CO",
                });
                setCurrentStep(2);
                return;
            }
            if (
                values.assessmentSubType === "Subjective" &&
                values.maxMarks < 1
            ) {
                form.setError("maxMarks", {
                    message: "Marks must be at least 1",
                });
                setCurrentStep(2);
                return;
            }
            if (values.assessmentSubType === "MCQ") {
                if (!values.endTime) {
                    form.setError("endTime", {
                        message: "End time is required for MCQ",
                    });
                    setCurrentStep(2);
                    return;
                }
                if (
                    new Date(values.endTime) <= new Date(values.startTime)
                ) {
                    form.setError("endTime", {
                        message: "End time must be after start time",
                    });
                    setCurrentStep(2);
                    return;
                }
                if (values.questions.length === 0) {
                    form.setError("questions", {
                        message: "Add at least one question",
                    });
                    return;
                }
            }
        }

        // ── Build final title ──────────────────────────────────────────────
        const selectedExperiment = experiments.find(
            (exp) => exp.exp_no === parseInt(values.selectedExp),
        );

        let finalTitle: string;
        if (isLab) {
            finalTitle = `${allotment.sub_id} - Exp ${values.selectedExp}: ${selectedExperiment?.exp_name || "Experiment"}`;
        } else if (values.assessmentType === "MSE") {
            finalTitle = `${allotment.sub_id} - MSE`;
        } else {
            finalTitle = `${allotment.sub_id} - ${values.assessmentType} ${values.assessmentSubType === "MCQ" ? "(MCQ)" : ""} - ${values.title}`;
        }

        const calculatedMaxMarks = isMCQ
            ? values.questions.reduce((sum, q) => sum + q.marks, 0)
            : values.maxMarks;

        // ── Build Task object ──────────────────────────────────────────────
        const newTask: Task = {
            id: Math.random().toString(36).substr(2, 9),
            title: finalTitle,
            startTime: convertToIST(values.startTime),
            endTime: values.endTime
                ? convertToIST(values.endTime)
                : undefined,
            type: allotment.type,
            experimentNumber: isLab
                ? parseInt(values.selectedExp)
                : undefined,
            assessmentType: !isLab ? values.assessmentType : undefined,
            assessmentSubType:
                !isLab && values.assessmentType === "ISE"
                    ? values.assessmentSubType
                    : undefined,
            mcqQuestions: isMCQ ? values.questions : undefined,
            subQuestions:
                !isLab && values.assessmentType === "MSE"
                    ? values.mseQuestions
                    : undefined,
            maxMarks: calculatedMaxMarks,
            mappedCOs: values.selectedCOs,
            subjectCode: allotment.sub_id,
            classStr: allotment.class_name,
            batch: allotment.batch_no
                ? `Batch ${allotment.batch_no}`
                : "All",
        };

        // ── Map to API shape ───────────────────────────────────────────────
        const apiTask = {
            allotment_id: allotment.allotment_id,
            title: newTask.title,
            task_type: newTask.type,
            assessment_type: newTask.assessmentType || null,
            assessment_sub_type: newTask.assessmentSubType || null,
            sub_id: newTask.subjectCode,
            exp_no: newTask.experimentNumber || null,
            max_marks: newTask.maxMarks,
            start_time: newTask.startTime || null,
            end_time: newTask.endTime || null,
            mcq_questions: newTask.mcqQuestions || null,
            sub_questions: newTask.subQuestions || null,
            mapped_cos: newTask.mappedCOs.map((co) =>
                parseInt(co.replace("CO", "")),
            ),
        };

        setSubmitting(true);
        try {
            await toast.promise(createTask(apiTask), {
                loading: "Publishing task...",
                success: "Task published successfully!",
                error: (err) =>
                    err instanceof Error
                        ? err.message
                        : "Failed to publish task",
            });
            router.push("/teacher/assignments/create");
        } catch {
            // toast handles error display
        } finally {
            setSubmitting(false);
        }
    };

    return {
        form,
        isLab,
        isMCQ,
        submitting,
        // Watched form values
        assessmentType,
        assessmentSubType,
        selectedExp,
        maxMarks,
        selectedCOs,
        questions,
        mseQuestions,
        // Handlers
        toggleCO,
        handleMseChange,
        handleAddQuestion,
        handleRemoveQuestion,
        handleSubmit,
    };
}
