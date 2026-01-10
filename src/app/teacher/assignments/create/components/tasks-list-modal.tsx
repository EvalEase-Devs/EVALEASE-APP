import React from 'react';
import { Task as APITask } from '@/hooks/use-api';
import { Trash2, X, Clock, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TasksListModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: APITask[];
    onDeleteTask: (id: number) => void;
    onPublishTask: (id: number) => void;
    subjectName: string;
}

const TasksListModal: React.FC<TasksListModalProps> = ({ isOpen, onClose, tasks, onDeleteTask, subjectName }) => {
    if (!isOpen) return null;

    const getTaskStatus = (task: APITask) => {
        if (!task.start_time || !task.end_time) return 'ACTIVE';
        const now = new Date();
        const start = new Date(task.start_time);
        const end = new Date(task.end_time);

        if (now < start) return 'SCHEDULED';
        if (now > end) return 'CLOSED';
        return 'ACTIVE';
    };

    return (
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
                <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {tasks.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed border-muted rounded-lg">
                                <p>No tasks found for this subject.</p>
                                <Button className="mt-4" onClick={onClose}>Close & Add Task</Button>
                            </div>
                        )}
                        {tasks.map(task => {
                            const status = getTaskStatus(task);
                            const taskType = task.task_type === 'Lab' ? 'Lab' : 'Theory';
                            const mappedCOs = task.task_co_mapping?.map(m => m.co?.co_name).filter(Boolean) || [];
                            return (
                                <Card key={task.task_id} className={`shadow-md hover:shadow-lg transition-shadow ${status === 'SCHEDULED' ? 'border-blue-400 border-dashed' : ''}`}>
                                    <CardHeader className="p-5 pb-2">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-base line-clamp-1" title={task.title}>{task.title}</CardTitle>
                                            <div className="flex gap-1 flex-wrap justify-end">
                                                {status === 'SCHEDULED' && <Badge variant="secondary" className="bg-blue-500 text-white hover:bg-blue-600">Scheduled</Badge>}
                                                {status === 'ACTIVE' && <Badge variant="secondary" className="bg-green-500 text-white hover:bg-green-600">Active</Badge>}
                                                {status === 'CLOSED' && <Badge variant="secondary" className="bg-gray-500 text-white hover:bg-gray-600">Closed</Badge>}
                                                <Badge variant="outline" className={`${taskType === 'Lab' ? 'border-pink-500 text-pink-500' : 'border-purple-500 text-purple-500'}`}>
                                                    {taskType}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-5 pt-0 pb-2">
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {mappedCOs.map(co => (
                                                <Badge key={co} variant="secondary" className="text-[10px] h-5">{co}</Badge>
                                            ))}
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
                                    <CardFooter className="p-5 pt-2 flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
            </div>
        </div>
    );
};

export default TasksListModal;
