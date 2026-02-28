import React, { useEffect, useState, useMemo } from 'react';
import { Task as APITask } from '@/hooks/use-api';
import { Trash2, X, Clock, AlertCircle, Pencil, Save, XCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface TasksListModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: APITask[];
    onDeleteTask: (id: number) => void;
    onPublishTask: (id: number) => void;
    subjectName: string;
    deletingTaskId?: number | null;
}

const TasksListModal: React.FC<TasksListModalProps> = ({ isOpen, onClose, tasks, onDeleteTask, subjectName, deletingTaskId }) => {
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [studentError, setStudentError] = useState<string | null>(null);
    const [editingMarkId, setEditingMarkId] = useState<number | null>(null);
    const [editedMarks, setEditedMarks] = useState<number | Record<string, number>>(0);
    const [savingMarks, setSavingMarks] = useState<boolean>(false);
    const [loMap, setLoMap] = useState<Record<string, number[]>>({});

    const selectedTask = tasks.find(t => t.task_id === selectedTaskId) || null;

    // Memoize lab tasks and subject filtering to prevent unnecessary re-renders
    const labTasksData = useMemo(() => {
        const labTasks = tasks.filter(t => t.task_type === 'Lab' && t.exp_no && t.sub_id);
        const uniqueSubjects = Array.from(new Set(labTasks.map(t => t.sub_id)));
        return { labTasks, uniqueSubjects };
    }, [tasks]);

    const fetchStudents = async (taskId: number) => {
        try {
            setLoadingStudents(true);
            const res = await fetch(`/api/tasks/${taskId}/students`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to fetch students');
            }
            const data = await res.json();
            setStudents(data);
            setStudentError(null);
        } catch (err) {
            setStudentError(err instanceof Error ? err.message : 'Failed to fetch students');
            setStudents([]);
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleEdit = (entry: any) => {
        const isMSE = selectedTask?.assessment_type === 'MSE';
        setEditingMarkId(entry.mark_id);
        if (isMSE && entry.question_marks) {
            setEditedMarks({ ...entry.question_marks });
        } else {
            setEditedMarks(entry.total_marks_obtained ?? 0);
        }
    };

    const handleCancel = () => {
        setEditingMarkId(null);
        setEditedMarks(0);
    };

    const handleSave = async (markId: number) => {
        if (!markId) {
            console.error('No markId provided');
            toast.error('Invalid mark ID');
            return;
        }

        setSavingMarks(true);

        const isMSE = selectedTask?.assessment_type === 'MSE';
        let totalMarks: number;
        let questionMarks: Record<string, number> | null = null;

        if (isMSE && typeof editedMarks === 'object') {
            questionMarks = editedMarks;
            totalMarks = Object.values(editedMarks).reduce((sum, val) => sum + (typeof val === 'number' ? val : parseFloat(val) || 0), 0);
        } else {
            totalMarks = typeof editedMarks === 'number' ? editedMarks : parseFloat(editedMarks as any) || 0;
        }

        toast.promise(
            (async () => {
                const response = await fetch(`/api/marks/${markId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        total_marks_obtained: totalMarks,
                        question_marks: questionMarks,
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to update marks');
                }

                setEditingMarkId(null);
                setEditedMarks(0);
                await fetchStudents(selectedTaskId!);
            })(),
            {
                loading: 'Updating marks...',
                success: 'Marks updated successfully',
                error: (err) => err instanceof Error ? err.message : 'Failed to update marks',
                finally: () => setSavingMarks(false),
            }
        );
    };

    const handleQuestionMarkChange = (label: string, value: string) => {
        if (typeof editedMarks === 'object') {
            setEditedMarks(prev => ({
                ...prev as Record<string, number>,
                [label]: parseFloat(value) || 0,
            }));
        }
    };

    useEffect(() => {
        if (selectedTaskId) {
            fetchStudents(selectedTaskId);
        }
    }, [selectedTaskId]);

    useEffect(() => {
        if (!isOpen) return;

        const { labTasks, uniqueSubjects } = labTasksData;

        if (uniqueSubjects.length === 0) return;

        (async () => {
            try {
                // Fetch all experiments for each subject in batch
                const results = await Promise.all(uniqueSubjects.map(async (subId) => {
                    const res = await fetch(`/api/experiments/batch?sub_id=${subId}`);
                    if (!res.ok) return { subId, experiments: [] };
                    const data = await res.json();
                    return { subId, experiments: data.experiments || [] };
                }));

                const nextMap: Record<string, number[]> = {};

                // Build the map from batch results
                results.forEach(({ subId, experiments }) => {
                    // For each task that uses this subject, find its experiment and extract LOs
                    labTasks
                        .filter(t => t.sub_id === subId && t.exp_no)
                        .forEach(task => {
                            const key = `${subId}-${task.exp_no}`;
                            const exp = experiments.find((e: any) => e.exp_no === task.exp_no);
                            const los = exp
                                ? (exp.experiment_lo_mapping || []).map((m: any) => m.lo_no).filter((n: any) => typeof n === 'number')
                                : [];
                            nextMap[key] = los;
                        });
                });

                setLoMap(nextMap);
            } catch {
                setLoMap({});
            }
        })();
    }, [isOpen, labTasksData]);
    const getTaskStatus = (task: APITask) => {
        if (!task.start_time || !task.end_time) return 'ACTIVE';
        const now = new Date();
        const start = new Date(task.start_time);
        const end = new Date(task.end_time);

        if (now < start) return 'SCHEDULED';
        if (now > end) return 'CLOSED';
        return 'ACTIVE';
    };

    // Group tasks by assessment type (MCQ, Subjective, MSE, Experiments)
    const groupedTasks = tasks.reduce((acc, task) => {
        let category = 'Other';

        if (task.assessment_sub_type === 'MCQ') {
            category = 'MCQ';
        } else if (task.assessment_sub_type === 'Subjective') {
            category = 'Subjective';
        } else if (task.assessment_type === 'MSE') {
            category = 'MSE';
        } else if (task.task_type === 'Lab' && task.exp_no) {
            category = 'Experiments';
        }

        if (!acc[category]) acc[category] = [];
        acc[category].push(task);
        return acc;
    }, {} as Record<string, APITask[]>);

    // Define order for categories
    const categoryOrder = ['MCQ', 'Subjective', 'MSE', 'Experiments', 'Other'];
    const orderedCategories = categoryOrder.filter(cat => groupedTasks[cat]);

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-background rounded-lg shadow-lg w-full max-w-7xl h-[85vh] flex flex-col p-0 border overflow-hidden">
                    {/* Header */}
                    <div className="p-4 bg-background border-b flex justify-between items-center sticky top-0 z-10 shadow-sm">
                        <div>
                            <h3 className="font-bold text-lg">Manage Tasks</h3>
                            <p className="text-xs text-muted-foreground">Subject: {subjectName}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X size={20} />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 bg-muted/10 space-y-8">
                        {tasks.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed border-muted rounded-lg">
                                <p>No tasks found for this subject.</p>
                                <Button className="mt-4" onClick={onClose}>Close & Add Task</Button>
                            </div>
                        )}

                        {tasks.length > 0 && orderedCategories.map((category) => {
                            const categoryTasks = groupedTasks[category];
                            const categoryColors: Record<string, string> = {
                                'MCQ': 'bg-info-subtle dark:bg-blue-900',
                                'Subjective': 'bg-success-subtle dark:bg-green-900',
                                'MSE': 'bg-purple-100 dark:bg-purple-900',
                                'Experiments': 'bg-orange-100 dark:bg-orange-900',
                                'Other': 'bg-muted dark:bg-gray-900'
                            };
                            const categoryBorders: Record<string, string> = {
                                'MCQ': 'border-l-info',
                                'Subjective': 'border-l-success',
                                'MSE': 'border-l-purple-500',
                                'Experiments': 'border-l-orange-500',
                                'Other': 'border-l-border'
                            };

                            return (
                                <div key={category} className="space-y-4">
                                    {/* Category Header */}
                                    <div className="flex items-center gap-2">
                                        <div className={`h-8 w-1 ${categoryBorders[category]} rounded-full`}></div>
                                        <h3 className="text-lg font-bold text-foreground tracking-tight">
                                            {category}
                                        </h3>
                                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                            {categoryTasks.length} Tasks
                                        </span>
                                    </div>

                                    {/* Grid of Task Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {categoryTasks.map(task => {
                                            const status = getTaskStatus(task);
                                            const taskType = task.task_type === 'Lab' ? 'Lab' : 'Theory';
                                            const mappedCOs = task.task_co_mapping?.map(m => `CO${m.co_no}`) || (task.mapped_cos || []).map((co) => `CO${co}`);
                                            const loKey = task.task_type === 'Lab' && task.exp_no ? `${task.sub_id}-${task.exp_no}` : null;
                                            const mappedLOs = loKey ? (loMap[loKey] || []).map((lo) => `LO${lo}`) : [];
                                            return (
                                                <Card key={task.task_id} className={`${status === 'SCHEDULED' ? 'opacity-75' : ''}`}>
                                                    <CardHeader className="p-5 pb-2">
                                                        <div className="flex justify-between items-start">
                                                            <CardTitle className="text-base line-clamp-1" title={task.title.split('-').slice(-1)[0].toUpperCase()}>{task.title.split('-').slice(-1)[0].toUpperCase()}</CardTitle>
                                                            <div className="flex gap-1 flex-wrap justify-end">
                                                                {status === 'SCHEDULED' && <Badge variant="secondary">Scheduled</Badge>}
                                                                {status === 'ACTIVE' && <Badge variant="default">Active</Badge>}
                                                                {status === 'CLOSED' && <Badge variant="outline">Closed</Badge>}
                                                                <Badge variant={taskType === 'Lab' ? 'secondary' : 'default'}>
                                                                    {taskType}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="p-5 pt-0 pb-2">
                                                        <div className="flex flex-wrap gap-1 mb-2">
                                                            {task.task_type === 'Lab' ? (
                                                                mappedLOs.length > 0 ? (
                                                                    mappedLOs.map(lo => (
                                                                        <Badge key={lo} variant="secondary" className="text-[10px] h-5">{lo}</Badge>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-[10px] text-muted-foreground">No LOs mapped</span>
                                                                )
                                                            ) : (
                                                                mappedCOs.length > 0 ? (
                                                                    mappedCOs.map(co => (
                                                                        <Badge key={co} variant="secondary" className="text-[10px] h-5">{co}</Badge>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-[10px] text-muted-foreground">No COs mapped</span>
                                                                )
                                                            )}
                                                        </div>
                                                        <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                                                            <span>Max Marks: {task.max_marks}</span>
                                                            {task.assessment_sub_type === 'MCQ' && <Badge variant="outline" className="text-[10px] h-5">MCQ</Badge>}
                                                            {task.assessment_type === 'MSE' && <Badge variant="outline" className="text-[10px] h-5">MSE</Badge>}
                                                        </div>

                                                        {/* Time Window Details */}
                                                        <div className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded">
                                                            <div className="flex items-center gap-1">
                                                                <Clock size={10} />
                                                                <span>Start: {task.start_time?.replace('T', ' ') || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <AlertCircle size={10} />
                                                                <span>End: {task.end_time?.replace('T', ' ') || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                    <CardFooter className="p-5 pt-2 flex justify-between gap-2 items-center">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setSelectedTaskId(task.task_id)}
                                                        >
                                                            View Students
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            disabled={deletingTaskId === task.task_id}
                                                            onClick={() => onDeleteTask(task.task_id)}
                                                            title="Delete Task"
                                                        >
                                                            <Trash2 size={18} />
                                                        </Button>
                                                        <Button variant="ghost" size="sm">Edit</Button>
                                                    </CardFooter>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Students Drawer */}
            {selectedTaskId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
                    <div className="bg-background w-full max-w-3xl rounded-xl border shadow-xl">
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <div>
                                <h4 className="font-semibold">Students (Roll No ascending)</h4>
                                <p className="text-xs text-muted-foreground">Task ID: {selectedTaskId}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => {
                                setSelectedTaskId(null);
                                setStudents([]);
                                setStudentError(null);
                            }}>
                                <X size={18} />
                            </Button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                            {loadingStudents && <p className="text-sm text-muted-foreground">Loading students...</p>}
                            {studentError && <p className="text-sm text-destructive">{studentError}</p>}
                            {!loadingStudents && !studentError && students.length === 0 && (
                                <p className="text-sm text-muted-foreground">No students found for this task.</p>
                            )}

                            {!loadingStudents && !studentError && students.length > 0 && (
                                <div className="space-y-2">
                                    {students.map((entry) => {
                                        const student = entry.student;
                                        const isMSE = selectedTask?.assessment_type === 'MSE';
                                        const hasSubmitted = entry.status === 'Submitted';
                                        const isEditing = editingMarkId === entry.mark_id;
                                        return (
                                            <div key={student?.pid} className="flex items-center justify-between bg-muted/50 rounded-md p-3">
                                                <div className="space-y-1">
                                                    <div className="font-semibold text-sm">{student?.stud_name || 'Unknown'}</div>
                                                    <div className="text-xs text-muted-foreground">Roll: {student?.roll_no ?? 'N/A'} | PID: {student?.pid}</div>
                                                    <div className="text-[11px] text-muted-foreground">Class: {student?.class_name} {student?.batch ? `Batch ${student.batch}` : ''}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {hasSubmitted ? (
                                                        isEditing ? (
                                                            // Edit mode
                                                            isMSE ? (
                                                                <div className="text-xs bg-background border rounded p-2 max-w-[280px]">
                                                                    <div className="font-semibold mb-1">Edit Question-wise:</div>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        {entry.question_marks && typeof editedMarks === 'object' ? Object.keys(editedMarks).map((label) => (
                                                                            <div key={label} className="flex items-center gap-1">
                                                                                <span className="text-muted-foreground text-[10px]">{label}:</span>
                                                                                <Input
                                                                                    type="number"
                                                                                    value={(editedMarks as Record<string, number>)[label]}
                                                                                    onChange={(e) => handleQuestionMarkChange(label, e.target.value)}
                                                                                    className="h-6 w-14 text-xs"
                                                                                    step="0.5"
                                                                                    min="0"
                                                                                />
                                                                            </div>
                                                                        )) : <span className="text-muted-foreground">No breakdown</span>}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs bg-background border rounded p-2 flex items-center gap-2">
                                                                    <span className="text-muted-foreground">Marks:</span>
                                                                    <Input
                                                                        type="number"
                                                                        value={typeof editedMarks === 'number' ? editedMarks : 0}
                                                                        onChange={(e) => setEditedMarks(parseFloat(e.target.value) || 0)}
                                                                        className="h-6 w-16 text-xs"
                                                                        step="0.5"
                                                                        min="0"
                                                                    />
                                                                </div>
                                                            )
                                                        ) : (
                                                            // View mode
                                                            isMSE ? (
                                                                <div className="text-xs bg-background border rounded p-2 max-w-[280px]">
                                                                    <div className="font-semibold mb-1">Question-wise:</div>
                                                                    <div className="grid grid-cols-2 gap-1">
                                                                        {entry.question_marks ? Object.entries(entry.question_marks).map(([label, val]: [string, any]) => (
                                                                            <div key={label} className="flex justify-between">
                                                                                <span className="text-muted-foreground">{label}</span>
                                                                                <span className="font-medium">{typeof val === 'number' ? val : parseFloat(val)}</span>
                                                                            </div>
                                                                        )) : <span className="text-muted-foreground">No breakdown</span>}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs bg-background border rounded p-2">
                                                                    <span className="text-muted-foreground">Marks:</span>
                                                                    <span className="ml-1 font-semibold">{entry.total_marks_obtained ?? '-'}</span>
                                                                </div>
                                                            )
                                                        )
                                                    ) : (
                                                        <div className="text-xs text-muted-foreground">Pending</div>
                                                    )}

                                                    {hasSubmitted && (
                                                        isEditing ? (
                                                            <div className="flex gap-1">
                                                                <Button
                                                                    variant="default"
                                                                    size="icon"
                                                                    className="h-7 w-7"
                                                                    onClick={() => handleSave(entry.mark_id)}
                                                                    disabled={savingMarks}
                                                                >
                                                                    <Save size={14} />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7"
                                                                    onClick={handleCancel}
                                                                    disabled={savingMarks}
                                                                >
                                                                    <XCircle size={14} />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => handleEdit(entry)}
                                                                disabled={editingMarkId !== null}
                                                            >
                                                                <Pencil size={14} />
                                                            </Button>
                                                        )
                                                    )}

                                                    <Badge variant={hasSubmitted ? 'default' : 'outline'}>
                                                        {entry.status || 'Pending'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <Separator />
                        <div className="p-3 flex justify-end">
                            <Button variant="secondary" onClick={() => {
                                setSelectedTaskId(null);
                                setStudents([]);
                                setStudentError(null);
                            }}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TasksListModal;
