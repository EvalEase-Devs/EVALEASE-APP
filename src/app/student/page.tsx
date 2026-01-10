"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { AppSidebarStudent } from "@/components/app-sidebar-student";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconBook, IconFileText, IconChartBar, IconClock, IconCheck, IconPlayerPlay } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import StudentSubmitModal from "@/components/student-submit-modal";
import StudentTestModal from "@/components/student-test-modal";
import { useStudentTasks } from "@/hooks/use-api";

export default function StudentDashboard() {
  const { data: session } = useSession();
  const { tasks, loading, error, fetchTasks } = useStudentTasks();
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const user = {
    name: session?.user?.name || "Student",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  // Calculate stats
  const pendingTasks = tasks.filter((t: any) => !t.submission);
  const completedTasks = tasks.filter((t: any) => t.submission);
  const avgGrade = completedTasks.length > 0
    ? (completedTasks.reduce((sum: number, t: any) => sum + (t.submission?.marks_obtained || 0), 0) / completedTasks.length).toFixed(1)
    : '--';

  const handleStartMCQ = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsTestModalOpen(true);
  };

  const handleViewTask = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsSubmitModalOpen(true);
  };

  const getTaskStatus = (task: any) => {
    if (task.submission) {
      return { label: 'Completed', variant: 'default' as const, icon: IconCheck };
    }
    if (task.end_time && new Date(task.end_time) < new Date()) {
      return { label: 'Missed', variant: 'destructive' as const, icon: IconClock };
    }
    if (task.start_time && new Date(task.start_time) > new Date()) {
      return { label: 'Upcoming', variant: 'secondary' as const, icon: IconClock };
    }
    return { label: 'Pending', variant: 'outline' as const, icon: IconClock };
  };

  return (
    <SidebarProvider>
      <AppSidebarStudent user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Student Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Quick Stats */}
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Assignments</CardTitle>
                <IconFileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingTasks.length}</div>
                <p className="text-xs text-muted-foreground">
                  {pendingTasks.length === 0 ? 'No pending work' : 'Awaiting submission'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <IconBook className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedTasks.length}</div>
                <p className="text-xs text-muted-foreground">Assignments submitted</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
                <IconChartBar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgGrade}</div>
                <p className="text-xs text-muted-foreground">
                  {avgGrade === '--' ? 'No grades yet' : 'Average marks'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tasks List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Your Tasks</h2>

            {loading ? (
              <div className="min-h-[200px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="min-h-[200px] flex items-center justify-center">
                <p className="text-destructive">{error}</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="min-h-[200px] flex-1 rounded-xl bg-muted/50 flex items-center justify-center">
                <p className="text-muted-foreground">No tasks assigned yet</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tasks.map((task: any) => {
                  const status = getTaskStatus(task);
                  const isMCQ = task.assessment_sub_type === 'MCQ';
                  const canAttempt = !task.submission &&
                    (!task.start_time || new Date(task.start_time) <= new Date()) &&
                    (!task.end_time || new Date(task.end_time) >= new Date());

                  return (
                    <Card key={task.task_id} className="flex flex-col">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-base">{task.title}</CardTitle>
                            <CardDescription>{task.sub_id}</CardDescription>
                          </div>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Type:</span>
                            <span>{task.task_type === 'Lab' ? 'Lab' : task.assessment_type || 'Theory'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Max Marks:</span>
                            <span>{task.max_marks}</span>
                          </div>
                          {task.submission && (
                            <div className="flex justify-between font-medium">
                              <span className="text-muted-foreground">Your Score:</span>
                              <span className="text-green-600">
                                {task.submission.marks_obtained}/{task.max_marks}
                              </span>
                            </div>
                          )}
                          {task.end_time && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Due:</span>
                              <span>{new Date(task.end_time).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter>
                        {isMCQ && canAttempt ? (
                          <Button
                            className="w-full"
                            onClick={() => handleStartMCQ(task.task_id)}
                          >
                            <IconPlayerPlay className="mr-2 h-4 w-4" />
                            Start Test
                          </Button>
                        ) : task.submission ? (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleViewTask(task.task_id)}
                          >
                            View Result
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            className="w-full"
                            disabled={!canAttempt}
                          >
                            {canAttempt ? 'View Details' : 'Not Available'}
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SidebarInset>

      {/* MCQ Test Modal */}
      {selectedTaskId && (
        <StudentTestModal
          isOpen={isTestModalOpen}
          onClose={() => {
            setIsTestModalOpen(false);
            setSelectedTaskId(null);
            fetchTasks();
          }}
          taskId={selectedTaskId}
        />
      )}

      {/* Submit/View Modal */}
      {selectedTaskId && (
        <StudentSubmitModal
          isOpen={isSubmitModalOpen}
          onClose={() => {
            setIsSubmitModalOpen(false);
            setSelectedTaskId(null);
          }}
          taskId={selectedTaskId}
        />
      )}
    </SidebarProvider>
  );
}
