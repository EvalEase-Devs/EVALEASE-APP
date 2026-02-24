import { z } from "zod";

// Base schema for common fields
const baseTaskSchema = z.object({
    title: z
        .string()
        .min(1, "Title is required")
        .max(100, "Title must be less than 100 characters"),
    maxMarks: z
        .number({ message: "Please enter a valid number" })
        .min(1, "Marks must be at least 1")
        .max(100, "Marks cannot exceed 100"),
    startTime: z
        .string()
        .min(1, "Start time is required"),
    endTime: z
        .string()
        .optional(),
    selectedCOs: z
        .array(z.string())
        .min(1, "Select at least one Course Outcome"),
});

// Schema for MCQ Question
export const mcqQuestionSchema = z.object({
    id: z.string(),
    text: z.string().min(1, "Question text is required"),
    options: z
        .array(z.string().min(1, "Option cannot be empty"))
        .length(4, "Must have exactly 4 options"),
    correctOptionIndex: z.number().min(0).max(3),
    marks: z.number().min(1, "Marks must be at least 1"),
});

// Schema for MSE Sub-question
export const mseQuestionSchema = z.object({
    label: z.string().min(1, "Label is required"),
    co: z.string().min(1, "CO is required"),
    marks: z.number().min(0, "Marks cannot be negative"),
});

// ── Unified flat schema used by react-hook-form ──────────────────────────────
// All fields are present; conditional validation is handled by superRefine.

export const taskModalSchema = z.object({
    // Discriminators (always present)
    assessmentType: z.enum(['ISE', 'MSE']),
    assessmentSubType: z.enum(['Subjective', 'MCQ']),

    // Common
    title: z.string().max(100, "Title must be less than 100 characters"),
    startTime: z.string(),
    endTime: z.string(),
    maxMarks: z.number(),
    selectedCOs: z.array(z.string()),

    // Lab-specific
    selectedExp: z.string(),

    // MCQ builder
    questions: z.array(mcqQuestionSchema),

    // MSE builder
    mseQuestions: z.array(mseQuestionSchema),
}).superRefine((data, ctx) => {
    // startTime is required for all
    if (!data.startTime) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Start time is required", path: ["startTime"] });
    }
    // The rest of the validation is conditional on isLab (checked at component level)
    // since the schema doesn't know about the Subject type.
});

export type TaskModalFormValues = z.infer<typeof taskModalSchema>;

// Lab Task Schema
export const labTaskSchema = z.object({
    taskType: z.literal("lab"),
    selectedExp: z.string().min(1, "Select an experiment"),
    startTime: z.string().min(1, "Start time is required"),
    maxMarks: z.number().min(1).max(100),
    selectedCOs: z.array(z.string()).min(1, "Select at least one CO"),
});

// ISE Subjective Schema
export const iseSubjectiveSchema = z.object({
    taskType: z.literal("ise-subjective"),
    title: z.string().min(1, "Title is required").max(100),
    startTime: z.string().min(1, "Start time is required"),
    maxMarks: z.number().min(1).max(100),
    selectedCOs: z.array(z.string()).min(1, "Select at least one CO"),
});

// ISE MCQ Schema
export const iseMcqSchema = z.object({
    taskType: z.literal("ise-mcq"),
    title: z.string().min(1, "Title is required").max(100),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required for MCQ"),
    questions: z.array(mcqQuestionSchema).min(1, "Add at least one question"),
    selectedCOs: z.array(z.string()).min(1, "Select at least one CO"),
}).refine((data) => {
    if (data.startTime && data.endTime) {
        return new Date(data.endTime) > new Date(data.startTime);
    }
    return true;
}, {
    message: "End time must be after start time",
    path: ["endTime"],
});

// MSE Schema
export const mseSchema = z.object({
    taskType: z.literal("mse"),
    startTime: z.string().min(1, "Start time is required"),
    mseQuestions: z.array(mseQuestionSchema).min(1, "Add at least one question"),
    // COs and maxMarks are auto-calculated from mseQuestions
});

// Union schema for all task types
export const taskFormSchema = z.discriminatedUnion("taskType", [
    labTaskSchema,
    iseSubjectiveSchema,
    iseMcqSchema,
    mseSchema,
]);

// Individual field validation helpers
export const validateTitle = (title: string): string | null => {
    if (!title.trim()) return "Title is required";
    if (title.length > 100) return "Title must be less than 100 characters";
    return null;
};

export const validateStartTime = (startTime: string): string | null => {
    if (!startTime) return "Start time is required";
    return null;
};

export const validateEndTime = (startTime: string, endTime: string): string | null => {
    if (!endTime) return "End time is required";
    if (new Date(endTime) <= new Date(startTime)) {
        return "End time must be after start time";
    }
    return null;
};

export const validateMaxMarks = (marks: number): string | null => {
    if (marks < 1) return "Marks must be at least 1";
    if (marks > 100) return "Marks cannot exceed 100";
    return null;
};

export const validateCOs = (cos: string[]): string | null => {
    if (cos.length === 0) return "Select at least one Course Outcome";
    return null;
};

export const validateMcqQuestion = (text: string, options: string[]): string | null => {
    if (!text.trim()) return "Question text is required";
    if (options.some(opt => !opt.trim())) return "All options must be filled";
    return null;
};

// Types
export type LabTaskFormValues = z.infer<typeof labTaskSchema>;
export type IseSubjectiveFormValues = z.infer<typeof iseSubjectiveSchema>;
export type IseMcqFormValues = z.infer<typeof iseMcqSchema>;
export type MseFormValues = z.infer<typeof mseSchema>;
export type TaskFormValues = z.infer<typeof taskFormSchema>;
export type McqQuestion = z.infer<typeof mcqQuestionSchema>;
export type MseQuestion = z.infer<typeof mseQuestionSchema>;
