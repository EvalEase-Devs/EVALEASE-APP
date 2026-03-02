"use client";

import {
    useQuery,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

// ============ SHARED FETCHER ============

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed: ${res.status}`);
    }
    return res.json();
}

// ============ QUERY KEY FACTORY ============
// Centralised keys make cache invalidation predictable.

export const queryKeys = {
    allotments: ["allotments"] as const,
    tasks: (allotmentId?: number) =>
        allotmentId ? (["tasks", allotmentId] as const) : (["tasks"] as const),
    students: (className?: string, batch?: number | null) =>
        ["students", className, batch] as const,
    marks: (taskId?: number) => ["marks", taskId] as const,
    studentTasks: ["student-tasks"] as const,
    studentTask: (taskId: number) => ["student-task", taskId] as const,
    experiments: (subId: string) => ["experiments", subId] as const,
    experimentLOs: (subId: string, expNo: string | number | null) =>
        ["experiment-los", subId, expNo] as const,
    studentAssignments: (status?: string) =>
        status
            ? (["student-assignments", status] as const)
            : (["student-assignments"] as const),
    batchMarksReport: (allotmentId: number | null) =>
        ["batch-marks-report", allotmentId] as const,
};

// ============ TYPES (unchanged) ============

export interface Allotment {
    allotment_id: number;
    teacher_id: number;
    sub_id: string;
    sub_name: string;
    class_name: string;
    batch_no: number | null;
    is_subject_incharge: boolean;
    course: string | null;
    type: "Lec" | "Lab";
    current_sem?: string;
}

export interface TaskCOMapping {
    co_no: number;
    sub_id?: string;
    co?: {
        co_no: number;
        co_description: string;
    };
}

export interface Task {
    task_id: number;
    allotment_id: number;
    title: string;
    task_type: "Lec" | "Lab";
    assessment_type: "ISE" | "MSE" | null;
    assessment_sub_type: "Subjective" | "MCQ" | null;
    sub_id: string;
    exp_no: number | null;
    max_marks: number;
    start_time: string | null;
    end_time: string | null;
    created_at: string;
    mcq_questions: any[] | null;
    sub_questions: any[] | null;
    allotment?: Allotment;
    mapped_cos?: number[];
    task_co_mapping?: TaskCOMapping[];
}

export interface Student {
    pid: number;
    stud_name: string;
    roll_no: number;
    batch: number | null;
    class_name: string;
}

export interface MarksEntry {
    mark_id?: number;
    task_id: number;
    stud_pid: number;
    total_marks_obtained: number;
    question_marks: Record<string, number> | null;
    status: string;
    submitted_at?: string | null;
    student?: Student;
}

export interface Experiment {
    sub_id: string;
    exp_no: number;
    exp_name: string;
}

export interface ExperimentLO {
    lo_no: number;
    lo?: {
        lo_no: number;
        lo_description: string;
    };
}

export interface StudentAssignment {
    mark_id: number;
    task_id: number;
    total_marks_obtained: number | null;
    status: "Pending" | "Submitted";
    submitted_at: string | null;
    task: {
        task_id: number;
        title: string;
        task_type: "Lec" | "Lab";
        assessment_type: "ISE" | "MSE" | null;
        assessment_sub_type: "Subjective" | "MCQ" | null;
        sub_id: string;
        exp_no: number | null;
        max_marks: number;
        start_time: string | null;
        end_time: string | null;
        sub_questions?: any[];
        allotment: {
            sub_name: string;
            class_name: string;
            batch_no: number | null;
        };
    };
}

export interface BatchMarksReportData {
    allotment: Allotment;
    students: {
        pid: number;
        stud_name: string;
        roll_no: number;
        batch: number | null;
    }[];
    experiments: {
        exp_no: number;
        exp_name: string;
        los: string[];
    }[];
    marksMatrix: Record<
        number,
        Record<
            number,
            {
                mark_id: number;
                marks: number;
                max_marks: number;
                status: string;
            }
        >
    >;
}

// ============ HOOKS ============

// ---- Allotments ----

export function useAllotments() {
    const queryClient = useQueryClient();

    const { data: allotments = [], isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: queryKeys.allotments,
        queryFn: () => apiFetch<Allotment[]>("/api/allotments"),
    });

    const error = queryError ? queryError.message : null;

    const createMutation = useMutation({
        mutationFn: (allotment: Omit<Allotment, "allotment_id" | "teacher_id">) =>
            apiFetch<Allotment>("/api/allotments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(allotment),
            }),
        onSuccess: (newAllotment) => {
            queryClient.setQueryData<Allotment[]>(queryKeys.allotments, (old) =>
                old ? [...old, newAllotment] : [newAllotment]
            );
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) =>
            apiFetch<void>(`/api/allotments/${id}`, { method: "DELETE" }),
        onSuccess: (_data, id) => {
            queryClient.setQueryData<Allotment[]>(queryKeys.allotments, (old) =>
                old ? old.filter((a) => a.allotment_id !== id) : []
            );
        },
    });

    const createAllotment = async (
        allotment: Omit<Allotment, "allotment_id" | "teacher_id">
    ) => createMutation.mutateAsync(allotment);

    const deleteAllotment = async (id: number) =>
        deleteMutation.mutateAsync(id);

    const fetchAllotments = async () => {
        await refetch();
    };

    return { allotments, loading, error, fetchAllotments, createAllotment, deleteAllotment };
}

// ---- Tasks ----

export function useTasks(allotmentId?: number) {
    const queryClient = useQueryClient();

    const { data: tasks = [], isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: queryKeys.tasks(allotmentId),
        queryFn: () => {
            const url = allotmentId
                ? `/api/tasks?allotment_id=${allotmentId}`
                : "/api/tasks";
            return apiFetch<Task[]>(url);
        },
    });

    const error = queryError ? queryError.message : null;

    const createMutation = useMutation({
        mutationFn: (task: any) =>
            apiFetch<Task>("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(task),
            }),
        onSuccess: (newTask) => {
            queryClient.setQueryData<Task[]>(
                queryKeys.tasks(allotmentId),
                (old) => (old ? [newTask, ...old] : [newTask])
            );
            // Also invalidate the unfiltered tasks list
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) =>
            apiFetch<void>(`/api/tasks/${id}`, { method: "DELETE" }),
        onSuccess: (_data, id) => {
            queryClient.setQueryData<Task[]>(
                queryKeys.tasks(allotmentId),
                (old) => (old ? old.filter((t) => t.task_id !== id) : [])
            );
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });

    const createTask = async (task: any) => createMutation.mutateAsync(task);

    const deleteTask = async (id: number) => deleteMutation.mutateAsync(id);

    const fetchTasks = async () => {
        await refetch();
    };

    return { tasks, loading, error, fetchTasks, createTask, deleteTask };
}

// ---- Students ----

export function useStudents(className?: string, batch?: number | null) {
    const { data: students = [], isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: queryKeys.students(className, batch),
        queryFn: () => {
            let url = `/api/students?class_name=${encodeURIComponent(className!)}`;
            if (batch) url += `&batch=${batch}`;
            return apiFetch<Student[]>(url);
        },
        enabled: !!className,
    });

    const error = queryError ? queryError.message : null;

    const fetchStudents = async () => {
        await refetch();
    };

    return { students, loading, error, fetchStudents };
}

// ---- Marks ----

export function useMarks(taskId?: number) {
    const queryClient = useQueryClient();

    const { data: marks = [], isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: queryKeys.marks(taskId),
        queryFn: () => apiFetch<MarksEntry[]>(`/api/marks?task_id=${taskId}`),
        enabled: !!taskId,
    });

    const error = queryError ? queryError.message : null;

    const saveMutation = useMutation({
        mutationFn: ({
            taskId,
            marksEntries,
        }: {
            taskId: number;
            marksEntries: any[];
        }) =>
            apiFetch<MarksEntry[]>("/api/marks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ task_id: taskId, marks_entries: marksEntries }),
            }),
        // Optimistic update: reflect marks in the cache immediately
        onMutate: async ({ taskId: tid, marksEntries }) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.marks(tid) });
            const previous = queryClient.getQueryData<MarksEntry[]>(
                queryKeys.marks(tid)
            );
            queryClient.setQueryData<MarksEntry[]>(
                queryKeys.marks(tid),
                (old) => {
                    if (!old) return old;
                    const map = new Map(old.map((m) => [m.stud_pid, m]));
                    for (const entry of marksEntries) {
                        const existing = map.get(entry.stud_pid);
                        if (existing) {
                            map.set(entry.stud_pid, { ...existing, ...entry });
                        } else {
                            map.set(entry.stud_pid, entry);
                        }
                    }
                    return Array.from(map.values());
                }
            );
            return { previous };
        },
        onError: (_err, { taskId: tid }, context) => {
            // Rollback on error
            if (context?.previous) {
                queryClient.setQueryData(queryKeys.marks(tid), context.previous);
            }
        },
        onSettled: (_data, _error, { taskId: tid }) => {
            // Refetch to ensure consistency
            queryClient.invalidateQueries({ queryKey: queryKeys.marks(tid) });
        },
    });

    const saveMarks = async (taskId: number, marksEntries: any[]) =>
        saveMutation.mutateAsync({ taskId, marksEntries });

    const fetchMarks = async () => {
        await refetch();
    };

    return { marks, loading, error, fetchMarks, saveMarks };
}

// ---- Student Tasks ----

export function useStudentTasks() {
    const { data: tasks = [], isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: queryKeys.studentTasks,
        queryFn: () => apiFetch<any[]>("/api/student/tasks"),
    });

    const error = queryError ? queryError.message : null;

    const fetchTasks = async () => {
        await refetch();
    };

    return { tasks, loading, error, fetchTasks };
}

export function useStudentTask(taskId: number) {
    const queryClient = useQueryClient();

    const { data: task = null, isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: queryKeys.studentTask(taskId),
        queryFn: () => apiFetch<any>(`/api/student/tasks/${taskId}`),
        enabled: !!taskId,
    });

    const error = queryError ? queryError.message : null;

    const submitMCQMutation = useMutation({
        mutationFn: (answers: Record<string, number>) =>
            apiFetch<any>("/api/marks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ task_id: taskId, answers }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.studentTask(taskId),
            });
            queryClient.invalidateQueries({
                queryKey: ["student-assignments"],
            });
        },
    });

    const submitMCQ = async (answers: Record<string, number>) =>
        submitMCQMutation.mutateAsync(answers);

    const fetchTask = async () => {
        await refetch();
    };

    return { task, loading, error, fetchTask, submitMCQ };
}

// ---- Experiments ----

export function useExperiments(subId: string) {
    const { data: experiments = [], isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: queryKeys.experiments(subId),
        queryFn: () => apiFetch<Experiment[]>(`/api/experiments?sub_id=${subId}`),
        enabled: !!subId,
    });

    const error = queryError ? queryError.message : null;

    const fetchExperiments = async () => {
        await refetch();
    };

    return { experiments, loading, error, fetchExperiments };
}

// ---- Experiment LOs ----

export function useExperimentLOs(
    subId: string,
    expNo: string | number | null
) {
    const { data: los = [], isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: queryKeys.experimentLOs(subId, expNo),
        queryFn: () =>
            apiFetch<ExperimentLO[]>(
                `/api/experiments/${subId}?exp_no=${expNo}`
            ),
        enabled: !!subId && expNo !== null && expNo !== undefined,
    });

    const error = queryError ? queryError.message : null;

    const fetchExperimentLOs = async () => {
        await refetch();
    };

    return { los, loading, error, fetchExperimentLOs };
}

// ---- Student Assignments ----

export function useStudentAssignments(status?: "Pending" | "Submitted") {
    const { data: assignments = [], isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: queryKeys.studentAssignments(status),
        queryFn: () => {
            const url = status
                ? `/api/student/assignments?status=${status}`
                : "/api/student/assignments";
            return apiFetch<StudentAssignment[]>(url);
        },
    });

    const error = queryError ? queryError.message : null;

    return { assignments, loading, error, refetch };
}

// ---- Submit Assignment Marks ----

export function useSubmitAssignmentMarks() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: ({
            marksId,
            marksObtained,
            questionMarks,
        }: {
            marksId: number;
            marksObtained: number;
            questionMarks?: Record<string, number> | null;
        }) =>
            apiFetch<any>(`/api/student/assignments/${marksId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    marks_obtained: marksObtained,
                    question_marks: questionMarks,
                }),
            }),
        onSuccess: () => {
            // Invalidate all student-assignment queries to refresh lists
            queryClient.invalidateQueries({
                queryKey: ["student-assignments"],
            });
        },
    });

    const submitMarks = async (
        marksId: number,
        marksObtained: number,
        questionMarks?: Record<string, number> | null
    ) => mutation.mutateAsync({ marksId, marksObtained, questionMarks });

    return { submitMarks, loading: mutation.isPending, error: mutation.error?.message ?? null };
}

// ---- Batch Marks Report ----

export function useBatchMarksReport(allotmentId: number | null) {
    const { data = null, isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: queryKeys.batchMarksReport(allotmentId),
        queryFn: () =>
            apiFetch<BatchMarksReportData>(
                `/api/marks/batch-report?allotment_id=${allotmentId}`
            ),
        enabled: !!allotmentId,
    });

    const error = queryError ? queryError.message : null;

    return { data, loading, error, refetch };
}
