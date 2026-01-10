"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Trash2,
    Plus,
    LayoutGrid,
    BarChart3,
    Users,
    MoreVertical,
    Loader2
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { AllottedSubject } from "./create-assignment-content";
import { parseSubject } from "@/app/teacher/assignments/create/utils";
import TaskModal from "./task-modal";
import TasksListModal from "./tasks-list-modal";
import { useTasks, Task as APITask } from "@/hooks/use-api";
import { Task as FormTask } from "@/lib/types";

interface AllottedSubjectsListProps {
    subjects: AllottedSubject[];
    onRemove: (id: number) => void;
}

export function AllottedSubjectsList({ subjects, onRemove }: AllottedSubjectsListProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [subjectToDelete, setSubjectToDelete] = useState<number | null>(null);

    // Task Creation Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSubjectForTask, setSelectedSubjectForTask] = useState<AllottedSubject | null>(null);

    // Tasks List Modal State
    const [isTasksListOpen, setIsTasksListOpen] = useState(false);
    const [selectedSubjectForList, setSelectedSubjectForList] = useState<AllottedSubject | null>(null);

    // Use API hook for tasks
    const { tasks: allTasks, loading: tasksLoading, createTask, deleteTask, fetchTasks } = useTasks();

    // 1. Group the subjects by "Semester - Class"
    const groupedSubjects = subjects.reduce((acc, subject) => {
        const key = `${subject.semester} - ${subject.class}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(subject);
        return acc;
    }, {} as Record<string, AllottedSubject[]>);

    const handleUnAllot = (id: number) => {
        setSubjectToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (subjectToDelete !== null) {
            onRemove(subjectToDelete);
            setSubjectToDelete(null);
        }
        setDeleteDialogOpen(false);
    };

    const handleOpenTaskModal = (allotment: AllottedSubject) => {
        setSelectedSubjectForTask(allotment);
        setIsModalOpen(true);
    };

    const handleOpenTasksList = (allotment: AllottedSubject) => {
        setSelectedSubjectForList(allotment);
        setIsTasksListOpen(true);
    };

    const handleAddTask = async (newTask: FormTask) => {
        if (!selectedSubjectForTask) return;

        try {
            // Map the frontend task (camelCase) to API format (snake_case)
            const apiTask = {
                allotment_id: selectedSubjectForTask.allotment_id,
                title: newTask.title,
                task_type: newTask.type as 'Lec' | 'Lab',
                assessment_type: (newTask.assessmentType as 'ISE' | 'MSE') || null,
                assessment_sub_type: (newTask.assessmentSubType as 'Subjective' | 'MCQ') || null,
                sub_id: selectedSubjectForTask.sub_id,
                exp_no: newTask.experimentNumber || null,
                max_marks: newTask.maxMarks,
                start_time: newTask.startTime || null,
                end_time: newTask.endTime || null,
                mcq_questions: newTask.mcqQuestions || null,
                sub_questions: newTask.subQuestions || null,
                mapped_cos: newTask.mappedCOs?.map((co: string) => parseInt(co.replace('CO', ''))) || []
            };

            await createTask(apiTask);
            toast.success(`Task "${newTask.title}" created successfully!`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create task");
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        try {
            await deleteTask(taskId);
            toast.success("Task deleted");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete task");
        }
    };

    const handlePublishTask = (taskId: number) => {
        toast.success("Task published");
    };

    // Get tasks for a specific allotment
    const getTasksForAllotment = (allotmentId: number) => {
        return allTasks.filter(t => t.allotment_id === allotmentId);
    };

    return (
        <>
            <div className="space-y-8">
                {Object.entries(groupedSubjects).map(([groupTitle, groupSubjects]) => (
                    <div key={groupTitle} className="space-y-4">

                        {/* Group Header */}
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-1 bg-primary rounded-full"></div>
                            <h3 className="text-lg font-bold text-foreground tracking-tight">
                                {groupTitle}
                            </h3>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                {groupSubjects.length} Subjects
                            </span>
                        </div>

                        {/* Grid of Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-3">
                            {groupSubjects.map((allotment) => {
                                const parsed = parseSubject(allotment.subject);
                                return (
                                    <Card key={allotment.id} className="group relative overflow-hidden border-l-4 border-l-primary/50 hover:border-l-primary transition-all hover:shadow-md">

                                        {/* Top Right Actions (Menu) */}
                                        <div className="absolute top-2 right-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleUnAllot(allotment.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <CardHeader className="pb-2">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    {/* Subject Name */}
                                                    <h4 className="font-bold text-lg leading-tight line-clamp-1" title={allotment.subject}>
                                                        {allotment.subject}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground font-mono mt-1">
                                                        {parsed.code}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="pb-4">
                                            {/* Badges Row */}
                                            <div className="flex flex-wrap gap-2 mt-2">

                                                {/* Type Badge (Lec/Lab) */}
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] uppercase font-bold border ${parsed.type.toLowerCase().includes('lab')
                                                        ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
                                                        : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                                                        }`}
                                                >
                                                    {parsed.type}
                                                </Badge>

                                                {/* Batch Badge */}
                                                <Badge variant="secondary" className="text-[10px] font-medium border bg-muted text-muted-foreground">
                                                    Batch: {allotment.batch}
                                                </Badge>

                                                {/* Incharge Badge */}
                                                {allotment.isIncharge && (
                                                    <Badge
                                                        variant="default"
                                                        className="text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 flex items-center gap-1"
                                                    >
                                                        <Users className="h-3 w-3" /> Incharge
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardContent>

                                        {/* Footer Actions - The "Control Panel" */}
                                        <CardFooter className="pt-0 gap-2">
                                            <Button
                                                className="flex-1"
                                                size="sm"
                                                onClick={() => handleOpenTaskModal(allotment)}
                                            >
                                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                Add Task
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm" className="px-2">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem onClick={() => handleOpenTasksList(allotment)}>
                                                        <LayoutGrid className="mr-2 h-4 w-4" /> View All Tasks
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => toast.info("View Students List")}>
                                                        <Users className="mr-2 h-4 w-4" /> Students List
                                                    </DropdownMenuItem>
                                                    {allotment.isIncharge && (
                                                        <DropdownMenuItem onClick={() => toast.info("View Reports")}>
                                                            <BarChart3 className="mr-2 h-4 w-4" /> Attainment Report
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Un-allot this subject?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the subject from your dashboard. You won't be able to add tasks to it anymore.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                            Un-Allot
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Task Creation Modal */}
            {selectedSubjectForTask && (
                <TaskModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedSubjectForTask(null);
                    }}
                    onAdd={handleAddTask}
                    currentSubject={parseSubject(selectedSubjectForTask.subject)}
                    currentClass={selectedSubjectForTask.class}
                    currentBatch={selectedSubjectForTask.batch}
                />
            )}

            {/* Tasks List Modal */}
            {selectedSubjectForList && (
                <TasksListModal
                    isOpen={isTasksListOpen}
                    onClose={() => {
                        setIsTasksListOpen(false);
                        setSelectedSubjectForList(null);
                    }}
                    tasks={getTasksForAllotment(selectedSubjectForList.allotment_id)}
                    onDeleteTask={handleDeleteTask}
                    onPublishTask={handlePublishTask}
                    subjectName={selectedSubjectForList.subject}
                />
            )}
        </>
    );
}
