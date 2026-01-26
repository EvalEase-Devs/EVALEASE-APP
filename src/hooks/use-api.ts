"use client";

import { useState, useEffect, useCallback } from 'react';

// Types
export interface Allotment {
    allotment_id: number;
    teacher_id: number;
    sub_id: string;
    sub_name: string;
    class_name: string;
    batch_no: number | null;
    is_subject_incharge: boolean;
    course: string | null;
    type: 'Lec' | 'Lab';
    current_sem?: string;
}

export interface TaskCOMapping {
    co_id: number;
    co?: {
        co_id: number;
        co_name: string;
    };
}

export interface Task {
    task_id: number;
    allotment_id: number;
    title: string;
    task_type: 'Lec' | 'Lab';
    assessment_type: 'ISE' | 'MSE' | null;
    assessment_sub_type: 'Subjective' | 'MCQ' | null;
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
    student?: Student;
}

// Fetch Allotments
export function useAllotments() {
    const [allotments, setAllotments] = useState<Allotment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAllotments = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/allotments');
            if (!res.ok) throw new Error('Failed to fetch allotments');
            const data = await res.json();
            setAllotments(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllotments();
    }, [fetchAllotments]);

    const createAllotment = async (allotment: Omit<Allotment, 'allotment_id' | 'teacher_id'>) => {
        const res = await fetch('/api/allotments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(allotment)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create allotment');
        }
        const newAllotment = await res.json();
        setAllotments(prev => [...prev, newAllotment]);
        return newAllotment;
    };

    const deleteAllotment = async (id: number) => {
        const res = await fetch(`/api/allotments/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete allotment');
        }
        setAllotments(prev => prev.filter(a => a.allotment_id !== id));
    };

    return { allotments, loading, error, fetchAllotments, createAllotment, deleteAllotment };
}

// Fetch Tasks
export function useTasks(allotmentId?: number) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const url = allotmentId
                ? `/api/tasks?allotment_id=${allotmentId}`
                : '/api/tasks';
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch tasks');
            const data = await res.json();
            setTasks(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [allotmentId]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const createTask = async (task: any) => {
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create task');
        }
        const newTask = await res.json();
        setTasks(prev => [newTask, ...prev]);
        return newTask;
    };

    const deleteTask = async (id: number) => {
        const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete task');
        }
        setTasks(prev => prev.filter(t => t.task_id !== id));
    };

    return { tasks, loading, error, fetchTasks, createTask, deleteTask };
}

// Fetch Students by class
export function useStudents(className?: string, batch?: number | null) {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStudents = useCallback(async () => {
        if (!className) return;

        try {
            setLoading(true);
            let url = `/api/students?class_name=${encodeURIComponent(className)}`;
            if (batch) {
                url += `&batch=${batch}`;
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch students');
            const data = await res.json();
            setStudents(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [className, batch]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    return { students, loading, error, fetchStudents };
}

// Fetch Marks for a task
export function useMarks(taskId?: number) {
    const [marks, setMarks] = useState<MarksEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchMarks = useCallback(async () => {
        if (!taskId) return;

        try {
            setLoading(true);
            const res = await fetch(`/api/marks?task_id=${taskId}`);
            if (!res.ok) throw new Error('Failed to fetch marks');
            const data = await res.json();
            setMarks(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        fetchMarks();
    }, [fetchMarks]);

    const saveMarks = async (taskId: number, marksEntries: any[]) => {
        const res = await fetch('/api/marks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: taskId, marks_entries: marksEntries })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to save marks');
        }
        const savedMarks = await res.json();
        await fetchMarks();
        return savedMarks;
    };

    return { marks, loading, error, fetchMarks, saveMarks };
}

// Student hooks
export function useStudentTasks() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/student/tasks');
            if (!res.ok) throw new Error('Failed to fetch tasks');
            const data = await res.json();
            setTasks(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    return { tasks, loading, error, fetchTasks };
}

export function useStudentTask(taskId: number) {
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTask = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/student/tasks/${taskId}`);
            if (!res.ok) throw new Error('Failed to fetch task');
            const data = await res.json();
            setTask(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        fetchTask();
    }, [fetchTask]);

    const submitMCQ = async (answers: Record<string, number>) => {
        const res = await fetch('/api/marks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: taskId, answers })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to submit');
        }
        const result = await res.json();
        await fetchTask();
        return result;
    };

    return { task, loading, error, fetchTask, submitMCQ };
}

// Fetch Experiments
export interface Experiment {
    sub_id: string;
    exp_no: number;
    exp_name: string;
}

export function useExperiments(subId: string) {
    const [experiments, setExperiments] = useState<Experiment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchExperiments = useCallback(async () => {
        if (!subId) {
            setExperiments([]);
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`/api/experiments?sub_id=${subId}`);
            if (!res.ok) throw new Error('Failed to fetch experiments');
            const data = await res.json();
            setExperiments(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setExperiments([]);
        } finally {
            setLoading(false);
        }
    }, [subId]);

    useEffect(() => {
        fetchExperiments();
    }, [fetchExperiments]);

    return { experiments, loading, error, fetchExperiments };
}

// Fetch COs for a specific experiment
export interface ExperimentCO {
    co_no: number;
    co?: {
        co_no: number;
        co_description: string;
    };
}

export function useExperimentCOs(subId: string, expNo: string | number | null) {
    const [cos, setCos] = useState<ExperimentCO[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchExperimentCOs = useCallback(async () => {
        if (!subId || !expNo) {
            setCos([]);
            return;
        }

        try {
            setLoading(true);
            const url = `/api/experiments/${subId}?exp_no=${expNo}`;
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Failed to fetch experiment COs: ${res.status}`);
            }
            const data = await res.json();
            setCos(data);
            setError(null);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'An error occurred';
            console.error('Error in useExperimentCOs:', errorMsg);
            setError(errorMsg);
            setCos([]);
        } finally {
            setLoading(false);
        }
    }, [subId, expNo]);

    useEffect(() => {
        fetchExperimentCOs();
    }, [fetchExperimentCOs]);

    return { cos, loading, error, fetchExperimentCOs };
}

// ============ STUDENT ASSIGNMENTS ============

export interface StudentAssignment {
    mark_id: number;
    task_id: number;
    total_marks_obtained: number | null;
    status: 'Pending' | 'Submitted';
    submitted_at: string | null;
    task: {
        task_id: number;
        title: string;
        task_type: 'Lec' | 'Lab';
        assessment_type: 'ISE' | 'MSE' | null;
        assessment_sub_type: 'Subjective' | 'MCQ' | null;
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

// Hook: Get student's assignments
export function useStudentAssignments(status?: 'Pending' | 'Submitted') {
    const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAssignments = useCallback(async () => {
        try {
            setLoading(true);
            const url = status ? `/api/student/assignments?status=${status}` : '/api/student/assignments';
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Failed to fetch assignments: ${res.status}`);
            }
            const data = await res.json();
            setAssignments(data);
            setError(null);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'An error occurred';
            console.error('Error in useStudentAssignments:', errorMsg);
            setError(errorMsg);
            setAssignments([]);
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        fetchAssignments();
    }, [fetchAssignments]);

    return { assignments, loading, error, refetch: fetchAssignments };
}

// Hook: Submit marks for an assignment
export function useSubmitAssignmentMarks() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submitMarks = useCallback(async (marksId: number, marksObtained: number, questionMarks?: Record<string, number> | null) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/student/assignments/${marksId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    marks_obtained: marksObtained,
                    question_marks: questionMarks
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `Failed to submit marks: ${res.status}`);
            }

            const data = await res.json();
            setError(null);
            return data;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'An error occurred';
            console.error('Error in useSubmitAssignmentMarks:', errorMsg);
            setError(errorMsg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { submitMarks, loading, error };
}

// Hook to fetch batch marks report
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
        cos: string[];
    }[];
    marksMatrix: Record<number, Record<number, {
        mark_id: number;
        marks: number;
        max_marks: number;
        status: string;
    }>>;
}

export function useBatchMarksReport(allotmentId: number | null) {
    const [data, setData] = useState<BatchMarksReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReport = useCallback(async () => {
        if (!allotmentId) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/marks/batch-report?allotment_id=${allotmentId}`);

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to fetch batch marks report');
            }

            const reportData = await res.json();
            setData(reportData);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'An error occurred';
            console.error('Error fetching batch marks report:', errorMsg);
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [allotmentId]);

    useEffect(() => {
        if (allotmentId) {
            fetchReport();
        }
    }, [allotmentId, fetchReport]);

    return { data, loading, error, refetch: fetchReport };
}
