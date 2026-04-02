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
    adminTeachers: (search?: string) => ["admin-teachers", search] as const,
    adminObeCOs: (subId?: string) => ["admin-obe-cos", subId] as const,
    adminObeLOs: (subId?: string) => ["admin-obe-los", subId] as const,
    adminObeExperiments: (subId?: string) => ["admin-obe-experiments", subId] as const,
    adminObeTaskMappings: (subId?: string) => ["admin-obe-task-mappings", subId] as const,
    adminObeExperimentMappings: (subId?: string) => ["admin-obe-experiment-mappings", subId] as const,
    adminPerformanceOverview: (className?: string, semester?: string, subId?: string) =>
        ["admin-performance-overview", className, semester, subId] as const,
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

// ---- Admin Students ----

export interface AdminStudent {
    pid: number;
    stud_name: string;
    class_name: string;
    batch: number | null;
    roll_no: number | null;
    course: string | null;
    email_id: string | null;
    Academic_year: string | null;
}

export interface AdminBulkImportResult {
    success: boolean;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    inserted: number;
    rowErrors: Array<{ rowNumber: number; error: string }>;
}

export function useAdminStudents(search?: string, classFilter?: string, batchFilter?: string) {
    const queryClient = useQueryClient();

    const { data: students = [], isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: ["admin-students", search, classFilter, batchFilter] as const,
        queryFn: () => {
            let url = "/api/admin/students";
            const params = new URLSearchParams();
            if (search) params.append("search", search);
            if (classFilter) params.append("class_name", classFilter);
            if (batchFilter) params.append("batch", batchFilter);
            if (params.toString()) url += `?${params.toString()}`;
            return apiFetch<AdminStudent[]>(url);
        },
    });

    const error = queryError ? queryError.message : null;

    const createMutation = useMutation({
        mutationFn: (student: Omit<AdminStudent, "pid"> & { pid: string }) =>
            apiFetch<AdminStudent>("/api/admin/students", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(student),
            }),
        onSuccess: (newStudent) => {
            queryClient.setQueryData<AdminStudent[]>(
                ["admin-students", search, classFilter, batchFilter],
                (old) => (old ? [newStudent, ...old] : [newStudent])
            );
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ pid, ...data }: AdminStudent) =>
            apiFetch<AdminStudent>(`/api/admin/students?pid=${pid}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }),
        onSuccess: (updatedStudent) => {
            queryClient.setQueryData<AdminStudent[]>(
                ["admin-students", search, classFilter, batchFilter],
                (old) =>
                    old
                        ? old.map((s) =>
                            s.pid === updatedStudent.pid ? updatedStudent : s
                        )
                        : [updatedStudent],
            );
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (pid: number) =>
            apiFetch<void>(`/api/admin/students?pid=${pid}`, { method: "DELETE" }),
        onSuccess: (_data, pid) => {
            queryClient.setQueryData<AdminStudent[]>(
                ["admin-students", search, classFilter, batchFilter],
                (old) => (old ? old.filter((s) => s.pid !== pid) : [])
            );
        },
    });

    const bulkImportMutation = useMutation({
        mutationFn: (csvContent: string) =>
            apiFetch<AdminBulkImportResult>("/api/admin/students/bulk-import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ csvContent }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-students"] });
        },
    });

    const createStudent = async (student: Omit<AdminStudent, "pid"> & { pid: string }) =>
        createMutation.mutateAsync(student);

    const updateStudent = async (student: AdminStudent) =>
        updateMutation.mutateAsync(student);

    const deleteStudent = async (pid: number) =>
        deleteMutation.mutateAsync(pid);

    const bulkImport = async (csvContent: string) =>
        bulkImportMutation.mutateAsync(csvContent);

    const fetchStudents = async () => {
        await refetch();
    };

    return {
        students,
        loading,
        error,
        fetchStudents,
        createStudent,
        updateStudent,
        deleteStudent,
        bulkImport,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isBulkImporting: bulkImportMutation.isPending,
    };
}

// ---- Admin Teachers ----

export interface AdminTeacher {
    teacher_id: number;
    teacher_name: string;
    designation: string | null;
    department: string | null;
    email: string | null;
}

export interface AdminCO {
    sub_id: string;
    co_no: number;
    co_description: string;
}

export interface AdminLO {
    sub_id: string;
    lo_no: number;
    lo_description: string;
}

export interface AdminExperiment {
    sub_id: string;
    exp_no: number;
    exp_name: string;
}

export interface AdminTaskMapping {
    task_id: number;
    title: string;
    task_type: string;
    assessment_type: string | null;
    assessment_sub_type: string | null;
    sub_id: string;
    exp_no: number | null;
    max_marks: number;
    mapped_cos: number[];
}

export interface AdminTaskCOMappingsResponse {
    cos: AdminCO[];
    tasks: AdminTaskMapping[];
}

export interface AdminExperimentMapping {
    sub_id: string;
    exp_no: number;
    exp_name: string;
    mapped_los: number[];
}

export interface AdminExperimentLOMappingsResponse {
    los: AdminLO[];
    experiments: AdminExperimentMapping[];
}

export interface AdminObeUploadResult {
    success: boolean;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    inserted: number;
    rowErrors: Array<{ rowNumber: number; error: string }>;
}

export interface AdminPerformanceOverviewResponse {
    filters: {
        classes: string[];
        semesters: string[];
        subjects: Array<{ sub_id: string; sub_name: string }>;
    };
    metrics: {
        totalStudents: number;
        activeTeachers: number;
        totalTasks: number;
        submittedCount: number;
        pendingCount: number;
        submissionRate: number;
        averageScore: number;
    };
    classPerformance: Array<{
        class_name: string;
        average: number;
        submissions: number;
    }>;
    semesterPerformance: Array<{
        semester: string;
        average: number;
        submissions: number;
    }>;
    subjectPerformance: Array<{
        sub_id: string;
        sub_name: string;
        average: number;
        submissions: number;
    }>;
    trend: Array<{
        month: string;
        average: number;
        submissions: number;
    }>;
    scoreDistribution: Array<{
        label: string;
        min: number;
        max: number;
        count: number;
    }>;
    topPerformers: Array<{
        pid: number;
        stud_name: string;
        class_name: string;
        roll_no: number | null;
        average: number;
        submissions: number;
    }>;
}

export function useAdminTeachers(search?: string) {
    const queryClient = useQueryClient();
    const queryKey = queryKeys.adminTeachers(search);

    const { data: teachers = [], isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey,
        queryFn: () => {
            let url = "/api/admin/teachers";
            const params = new URLSearchParams();
            if (search) params.append("search", search);
            if (params.toString()) url += `?${params.toString()}`;
            return apiFetch<AdminTeacher[]>(url);
        },
    });

    const error = queryError ? queryError.message : null;

    const createMutation = useMutation({
        mutationFn: (teacher: Omit<AdminTeacher, "teacher_id"> & { teacher_id: string }) =>
            apiFetch<AdminTeacher>("/api/admin/teachers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(teacher),
            }),
        onSuccess: (newTeacher) => {
            queryClient.setQueryData<AdminTeacher[]>(queryKey, (old) =>
                old ? [newTeacher, ...old] : [newTeacher]
            );
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ teacher_id, ...data }: AdminTeacher) =>
            apiFetch<AdminTeacher>(`/api/admin/teachers?teacher_id=${teacher_id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }),
        onSuccess: (updatedTeacher) => {
            queryClient.setQueryData<AdminTeacher[]>(queryKey, (old) =>
                old
                    ? old.map((teacher) =>
                        teacher.teacher_id === updatedTeacher.teacher_id ? updatedTeacher : teacher
                    )
                    : [updatedTeacher]
            );
        },
    });

        const deleteMutation = useMutation({
            mutationFn: (teacher_id: number) =>
                apiFetch<{ success: boolean }>(`/api/admin/teachers?teacher_id=${teacher_id}`, {
                    method: "DELETE",
                }),
            onSuccess: (_data, teacher_id) => {
                queryClient.setQueryData<AdminTeacher[]>(queryKey, (old) =>
                    old ? old.filter((teacher) => teacher.teacher_id !== teacher_id) : []
                );
            },
        });

    const createTeacher = async (teacher: Omit<AdminTeacher, "teacher_id"> & { teacher_id: string }) =>
        createMutation.mutateAsync(teacher);

    const updateTeacher = async (teacher: AdminTeacher) =>
        updateMutation.mutateAsync(teacher);

    const deleteTeacher = async (teacher_id: number) =>
        deleteMutation.mutateAsync(teacher_id);

    const fetchTeachers = async () => {
        await refetch();
    };

    return {
        teachers,
        loading,
        error,
        fetchTeachers,
        createTeacher,
        updateTeacher,
        deleteTeacher,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}

// ---- Admin OBE Master Data & Mappings ----

export function useAdminCOs(subId?: string) {
    const queryClient = useQueryClient();
    const queryKey = queryKeys.adminObeCOs(subId);

    const { data: cos = [], isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey,
        queryFn: () => apiFetch<AdminCO[]>(`/api/admin/obe/co?sub_id=${encodeURIComponent(subId!)}`),
        enabled: !!subId,
    });

    const error = queryError ? queryError.message : null;

    const createMutation = useMutation({
        mutationFn: (co: AdminCO) =>
            apiFetch<AdminCO>("/api/admin/obe/co", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(co),
            }),
        onSuccess: (newCo) => {
            queryClient.setQueryData<AdminCO[]>(queryKey, (old) =>
                old ? [...old, newCo].sort((a, b) => a.co_no - b.co_no) : [newCo]
            );
        },
    });

    const updateMutation = useMutation({
        mutationFn: (co: AdminCO) =>
            apiFetch<AdminCO>(`/api/admin/obe/co?sub_id=${encodeURIComponent(co.sub_id)}&co_no=${co.co_no}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ co_description: co.co_description }),
            }),
        onSuccess: (updatedCo) => {
            queryClient.setQueryData<AdminCO[]>(queryKey, (old) =>
                old
                    ? old.map((co) =>
                        co.sub_id === updatedCo.sub_id && co.co_no === updatedCo.co_no ? updatedCo : co
                    )
                    : [updatedCo]
            );
        },
    });

    const deleteMutation = useMutation({
        mutationFn: ({ sub_id, co_no }: Pick<AdminCO, "sub_id" | "co_no">) =>
            apiFetch<{ success: boolean }>(
                `/api/admin/obe/co?sub_id=${encodeURIComponent(sub_id)}&co_no=${co_no}`,
                { method: "DELETE" }
            ),
        onSuccess: (_data, variables) => {
            queryClient.setQueryData<AdminCO[]>(queryKey, (old) =>
                old ? old.filter((co) => !(co.sub_id === variables.sub_id && co.co_no === variables.co_no)) : []
            );
        },
    });

    const uploadMutation = useMutation({
        mutationFn: (csvContent: string) =>
            apiFetch<AdminObeUploadResult>("/api/admin/obe/co/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ csvContent, sub_id: subId }),
            }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey });
        },
    });

    return {
        cos,
        loading,
        error,
        refetchCos: async () => {
            await refetch();
        },
        createCO: async (co: AdminCO) => createMutation.mutateAsync(co),
        updateCO: async (co: AdminCO) => updateMutation.mutateAsync(co),
        deleteCO: async (co: Pick<AdminCO, "sub_id" | "co_no">) => deleteMutation.mutateAsync(co),
        uploadCOs: async (csvContent: string) => uploadMutation.mutateAsync(csvContent),
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isUploading: uploadMutation.isPending,
    };
}

export function useAdminLOs(subId?: string) {
    const queryClient = useQueryClient();
    const queryKey = queryKeys.adminObeLOs(subId);
    const mappingQueryKey = queryKeys.adminObeExperimentMappings(subId);

    const { data: los = [], isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey,
        queryFn: () => apiFetch<AdminLO[]>(`/api/admin/obe/lo?sub_id=${encodeURIComponent(subId!)}`),
        enabled: !!subId,
    });

    const error = queryError ? queryError.message : null;

    const createMutation = useMutation({
        mutationFn: (lo: AdminLO) =>
            apiFetch<AdminLO>("/api/admin/obe/lo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(lo),
            }),
        onSuccess: async (newLo) => {
            queryClient.setQueryData<AdminLO[]>(queryKey, (old) =>
                old ? [...old, newLo].sort((a, b) => a.lo_no - b.lo_no) : [newLo]
            );
            await queryClient.invalidateQueries({ queryKey: mappingQueryKey });
        },
    });

    const updateMutation = useMutation({
        mutationFn: (lo: AdminLO) =>
            apiFetch<AdminLO>(`/api/admin/obe/lo?sub_id=${encodeURIComponent(lo.sub_id)}&lo_no=${lo.lo_no}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lo_description: lo.lo_description }),
            }),
        onSuccess: async (updatedLo) => {
            queryClient.setQueryData<AdminLO[]>(queryKey, (old) =>
                old
                    ? old.map((lo) =>
                        lo.sub_id === updatedLo.sub_id && lo.lo_no === updatedLo.lo_no ? updatedLo : lo
                    )
                    : [updatedLo]
            );
            await queryClient.invalidateQueries({ queryKey: mappingQueryKey });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: ({ sub_id, lo_no }: Pick<AdminLO, "sub_id" | "lo_no">) =>
            apiFetch<{ success: boolean }>(
                `/api/admin/obe/lo?sub_id=${encodeURIComponent(sub_id)}&lo_no=${lo_no}`,
                { method: "DELETE" }
            ),
        onSuccess: async (_data, variables) => {
            queryClient.setQueryData<AdminLO[]>(queryKey, (old) =>
                old ? old.filter((lo) => !(lo.sub_id === variables.sub_id && lo.lo_no === variables.lo_no)) : []
            );
            await queryClient.invalidateQueries({ queryKey: mappingQueryKey });
        },
    });

    const uploadMutation = useMutation({
        mutationFn: (csvContent: string) =>
            apiFetch<AdminObeUploadResult>("/api/admin/obe/lo/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ csvContent, sub_id: subId }),
            }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey });
            await queryClient.invalidateQueries({ queryKey: mappingQueryKey });
        },
    });

    return {
        los,
        loading,
        error,
        refetchLOs: async () => {
            await refetch();
        },
        createLO: async (lo: AdminLO) => createMutation.mutateAsync(lo),
        updateLO: async (lo: AdminLO) => updateMutation.mutateAsync(lo),
        deleteLO: async (lo: Pick<AdminLO, "sub_id" | "lo_no">) => deleteMutation.mutateAsync(lo),
        uploadLOs: async (csvContent: string) => uploadMutation.mutateAsync(csvContent),
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isUploading: uploadMutation.isPending,
    };
}

export function useAdminExperiments(subId?: string) {
    const queryClient = useQueryClient();
    const queryKey = queryKeys.adminObeExperiments(subId);
    const mappingQueryKey = queryKeys.adminObeExperimentMappings(subId);

    const { data: experiments = [], isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey,
        queryFn: () => apiFetch<AdminExperiment[]>(`/api/admin/obe/experiments?sub_id=${encodeURIComponent(subId!)}`),
        enabled: !!subId,
    });

    const error = queryError ? queryError.message : null;

    const createMutation = useMutation({
        mutationFn: (experiment: AdminExperiment) =>
            apiFetch<AdminExperiment>("/api/admin/obe/experiments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(experiment),
            }),
        onSuccess: async (newExperiment) => {
            queryClient.setQueryData<AdminExperiment[]>(queryKey, (old) =>
                old ? [...old, newExperiment].sort((a, b) => a.exp_no - b.exp_no) : [newExperiment]
            );
            await queryClient.invalidateQueries({ queryKey: mappingQueryKey });
        },
    });

    const updateMutation = useMutation({
        mutationFn: (experiment: AdminExperiment) =>
            apiFetch<AdminExperiment>(
                `/api/admin/obe/experiments?sub_id=${encodeURIComponent(experiment.sub_id)}&exp_no=${experiment.exp_no}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ exp_name: experiment.exp_name }),
                }
            ),
        onSuccess: async (updatedExperiment) => {
            queryClient.setQueryData<AdminExperiment[]>(queryKey, (old) =>
                old
                    ? old.map((experiment) =>
                        experiment.sub_id === updatedExperiment.sub_id && experiment.exp_no === updatedExperiment.exp_no
                            ? updatedExperiment
                            : experiment
                    )
                    : [updatedExperiment]
            );
            await queryClient.invalidateQueries({ queryKey: mappingQueryKey });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: ({ sub_id, exp_no }: Pick<AdminExperiment, "sub_id" | "exp_no">) =>
            apiFetch<{ success: boolean }>(
                `/api/admin/obe/experiments?sub_id=${encodeURIComponent(sub_id)}&exp_no=${exp_no}`,
                { method: "DELETE" }
            ),
        onSuccess: async (_data, variables) => {
            queryClient.setQueryData<AdminExperiment[]>(queryKey, (old) =>
                old ? old.filter((experiment) => !(experiment.sub_id === variables.sub_id && experiment.exp_no === variables.exp_no)) : []
            );
            await queryClient.invalidateQueries({ queryKey: mappingQueryKey });
        },
    });

    const uploadMutation = useMutation({
        mutationFn: (csvContent: string) =>
            apiFetch<AdminObeUploadResult>("/api/admin/obe/experiments/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ csvContent, sub_id: subId }),
            }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey });
            await queryClient.invalidateQueries({ queryKey: mappingQueryKey });
        },
    });

    return {
        experiments,
        loading,
        error,
        refetchExperiments: async () => {
            await refetch();
        },
        createExperiment: async (experiment: AdminExperiment) => createMutation.mutateAsync(experiment),
        updateExperiment: async (experiment: AdminExperiment) => updateMutation.mutateAsync(experiment),
        deleteExperiment: async (experiment: Pick<AdminExperiment, "sub_id" | "exp_no">) => deleteMutation.mutateAsync(experiment),
        uploadExperiments: async (csvContent: string) => uploadMutation.mutateAsync(csvContent),
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isUploading: uploadMutation.isPending,
    };
}

export function useAdminTaskCOMappings(subId?: string) {
    const queryClient = useQueryClient();
    const queryKey = queryKeys.adminObeTaskMappings(subId);

    const { data: response, isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey,
        queryFn: () => apiFetch<AdminTaskCOMappingsResponse>(`/api/admin/obe/task-mappings?sub_id=${encodeURIComponent(subId!)}`),
        enabled: !!subId,
    });

    const error = queryError ? queryError.message : null;
    const cos = response?.cos ?? [];
    const tasks = response?.tasks ?? [];

    const saveMutation = useMutation({
        mutationFn: ({ taskId, coNos, subId: subjectCode }: { taskId: number; coNos: number[]; subId: string }) =>
            apiFetch<{ success: boolean }>("/api/admin/obe/task-mappings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ task_id: taskId, sub_id: subjectCode, co_nos: coNos }),
            }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey });
        },
    });

    return {
        cos,
        tasks,
        loading,
        error,
        refetchTaskMappings: async () => {
            await refetch();
        },
        saveTaskMapping: async (taskId: number, coNos: number[], subIdValue: string) =>
            saveMutation.mutateAsync({ taskId, coNos, subId: subIdValue }),
        isSaving: saveMutation.isPending,
    };
}

export function useAdminExperimentLOMappings(subId?: string) {
    const queryClient = useQueryClient();
    const queryKey = queryKeys.adminObeExperimentMappings(subId);

    const { data: response, isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey,
        queryFn: () => apiFetch<AdminExperimentLOMappingsResponse>(`/api/admin/obe/experiment-mappings?sub_id=${encodeURIComponent(subId!)}`),
        enabled: !!subId,
    });

    const error = queryError ? queryError.message : null;
    const los = response?.los ?? [];
    const experiments = response?.experiments ?? [];

    const saveMutation = useMutation({
        mutationFn: ({ expNo, loNos, subId: subjectCode }: { expNo: number; loNos: number[]; subId: string }) =>
            apiFetch<{ success: boolean }>("/api/admin/obe/experiment-mappings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ exp_no: expNo, sub_id: subjectCode, lo_nos: loNos }),
            }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey });
        },
    });

    return {
        los,
        experiments,
        loading,
        error,
        refetchExperimentMappings: async () => {
            await refetch();
        },
        saveExperimentMapping: async (expNo: number, loNos: number[], subIdValue: string) =>
            saveMutation.mutateAsync({ expNo, loNos, subId: subIdValue }),
        isSaving: saveMutation.isPending,
    };
}

// ---- Admin Performance Analytics ----

export function useAdminPerformanceOverview(filters?: {
    className?: string;
    semester?: string;
    subId?: string;
}) {
    const className = filters?.className || "all";
    const semester = filters?.semester || "all";
    const subId = filters?.subId || "all";

    const { data = null, isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: queryKeys.adminPerformanceOverview(className, semester, subId),
        queryFn: () => {
            const params = new URLSearchParams({
                class_name: className,
                semester,
                sub_id: subId,
            });
            return apiFetch<AdminPerformanceOverviewResponse>(`/api/admin/performance/overview?${params.toString()}`);
        },
    });

    const error = queryError ? queryError.message : null;

    return {
        data,
        loading,
        error,
        refetchOverview: async () => {
            await refetch();
        },
    };
}
