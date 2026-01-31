"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconPlayerPlay, IconClipboardText, IconClock } from "@tabler/icons-react";

interface Task {
  task_id: number;
  title: string;
  task_type: string;
  assessment_type?: string;
  assessment_sub_type?: string;
  exp_no?: number;
  max_marks: number;
  start_time?: string;
  end_time?: string;
  allotment?: {
    sub_name?: string;
  };
  sub_id?: string;
}

interface Assignment {
  mark_id: number;
  status: string;
  task: Task;
}

interface PendingTaskCardProps {
  assignment: Assignment;
  urgency: "critical" | "warning" | "normal";
  onStartMCQ: (taskId: number) => void;
  onSubmitMarks: () => void;
}

function getTimeUntil(dateString: string): string {
  const now = new Date();
  const deadline = new Date(dateString);
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs < 0) return "Overdue";

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d left`;
  if (diffHours > 0) return `${diffHours}h left`;
  return "Due soon";
}

export function PendingTaskCard({ assignment, urgency, onStartMCQ, onSubmitMarks }: PendingTaskCardProps) {
  const task = assignment.task;
  const isMCQ = task.assessment_sub_type === "MCQ";

  const canAttempt =
    assignment.status === "Pending" &&
    (!task.start_time || new Date(task.start_time) <= new Date()) &&
    (!task.end_time || new Date(task.end_time) >= new Date());

  const urgencyStyles = {
    critical: "border-destructive/50 bg-destructive/5",
    warning: "border-secondary/50 bg-secondary/5",
    normal: "",
  };

  const urgencyTextStyles = {
    critical: "text-destructive",
    warning: "text-secondary-foreground",
    normal: "",
  };

  return (
    <Card className={`flex flex-col ${urgencyStyles[urgency]}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold line-clamp-1">{task.title}</CardTitle>
            <CardDescription className="line-clamp-1 mt-1">
              {task.allotment?.sub_name || task.sub_id}
            </CardDescription>
          </div>
          {urgency === "critical" && (
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Type</span>
            <Badge variant="outline" className="text-xs">
              {task.task_type === "Lab" ? `Lab${task.exp_no ? ` - Exp ${task.exp_no}` : ""}` : task.assessment_type || "Theory"}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Max Marks</span>
            <span className="font-medium">{task.max_marks}</span>
          </div>
          {task.end_time && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Deadline</span>
              <span className={`font-medium ${urgencyTextStyles[urgency]}`}>{getTimeUntil(task.end_time)}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        {isMCQ && canAttempt ? (
          <Button className="w-full" onClick={() => onStartMCQ(task.task_id)}>
            <IconPlayerPlay className="mr-2 h-4 w-4" />
            Start Test
          </Button>
        ) : canAttempt ? (
          <Button className="w-full" onClick={onSubmitMarks}>
            <IconClipboardText className="mr-2 h-4 w-4" />
            Submit Marks
          </Button>
        ) : (
          <Button variant="secondary" className="w-full" disabled>
            <IconClock className="mr-2 h-4 w-4" />
            Not Available Yet
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
