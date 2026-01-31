"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppSidebarStudent } from "@/components/app-sidebar-student";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { IconClock, IconCheck, IconChartBar, IconAlertCircle, IconArrowRight, IconLoader2, IconAlertTriangle } from "@tabler/icons-react";
import StudentTestModal from "@/components/student-test-modal";
import { useStudentAssignments } from "@/hooks/use-api";
import {
  WelcomeCard,
  StatCard,
  PendingTaskCard,
  EmptyState,
  DashboardFooter,
} from "@/components/student";
import { FadeIn } from "@/components/ui/fade-in";

// Get urgency level for sorting and styling
function getUrgency(dateString: string | null): "critical" | "warning" | "normal" {
  if (!dateString) return "normal";
  const now = new Date();
  const deadline = new Date(dateString);
  const diffMs = deadline.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) return "critical"; // Overdue
  if (diffHours < 24) return "critical"; // Less than 24 hours
  if (diffHours < 72) return "warning"; // Less than 3 days
  return "normal";
}

export default function StudentDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const { assignments, loading, error } = useStudentAssignments();
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const user = {
    name: session?.user?.name || "Student",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  // Get first name for greeting
  const firstName = user.name.split(" ")[0];

  // Calculate stats from assignments
  const stats = useMemo(() => {
    const pending = assignments.filter((a) => a.status === "Pending");
    const completed = assignments.filter((a) => a.status === "Submitted");
    const total = assignments.length;
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
    const avgScore =
      completed.length > 0
        ? Math.round(
          completed.reduce((sum, a) => {
            const obtained = a.total_marks_obtained || 0;
            const max = a.task?.max_marks || 1;
            return sum + (obtained / max) * 100;
          }, 0) / completed.length
        )
        : 0;

    return {
      pending: pending.length,
      completed: completed.length,
      total,
      completionRate,
      avgScore,
    };
  }, [assignments]);

  // Get top 3 urgent pending assignments sorted by deadline
  const urgentPending = useMemo(() => {
    return assignments
      .filter((a) => a.status === "Pending")
      .sort((a, b) => {
        const aTime = a.task?.end_time ? new Date(a.task.end_time).getTime() : Infinity;
        const bTime = b.task?.end_time ? new Date(b.task.end_time).getTime() : Infinity;
        return aTime - bTime;
      })
      .slice(0, 3);
  }, [assignments]);

  const handleStartMCQ = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsTestModalOpen(true);
  };

  return (
    <SidebarProvider>
      <AppSidebarStudent user={user} />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium">Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Top Section: Welcome + Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <FadeIn delay={0.1}>
              <WelcomeCard
                firstName={firstName}
                pendingCount={stats.pending}
                completionRate={stats.completionRate}
              />
            </FadeIn>
            <FadeIn delay={0.2}>
              <StatCard
                icon={IconClock}
                value={stats.pending}
                label="Pending"
                variant="destructive"
              />
            </FadeIn>
            <FadeIn delay={0.3}>
              <StatCard
                icon={IconCheck}
                value={stats.completed}
                label="Submitted"
                variant="accent"
              />
            </FadeIn>
            <FadeIn delay={0.4}>
              <StatCard
                icon={IconChartBar}
                value={stats.avgScore > 0 ? `${stats.avgScore}%` : "--"}
                label="Avg Score"
                variant="primary"
              />
            </FadeIn>
          </div>

          {/* Middle Section: Pending Tasks */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <IconAlertCircle className="h-5 w-5 text-destructive" />
                Needs Your Attention
              </h2>
              {stats.pending > 3 && (
                <Button variant="ghost" size="sm" onClick={() => router.push("/student/assignments/pending")}>
                  View all ({stats.pending}) <IconArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-xl">
                <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center bg-destructive/5 rounded-xl border border-destructive/20">
                <div className="text-center">
                  <IconAlertTriangle className="h-10 w-10 text-destructive mx-auto mb-2" />
                  <p className="text-destructive font-medium">Unable to load assignments</p>
                  <p className="text-sm text-muted-foreground mt-1">Please refresh or try again later</p>
                </div>
              </div>
            ) : urgentPending.length === 0 ? (
              <EmptyState
                title="All Caught Up!"
                description="No pending assignments. Great job!"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                {urgentPending.map((assignment: any) => (
                  <PendingTaskCard
                    key={assignment.mark_id}
                    assignment={assignment}
                    urgency={getUrgency(assignment.task?.end_time)}
                    onStartMCQ={handleStartMCQ}
                    onSubmitMarks={() => router.push("/student/assignments")}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <DashboardFooter
            onViewAll={() => router.push("/student/assignments")}
            onViewSubmitted={() => router.push("/student/assignments/submitted")}
          />
        </div>
      </SidebarInset>

      {/* MCQ Test Modal */}
      {selectedTaskId && (
        <StudentTestModal
          isOpen={isTestModalOpen}
          onClose={() => {
            setIsTestModalOpen(false);
            setSelectedTaskId(null);
          }}
          taskId={selectedTaskId}
        />
      )}
    </SidebarProvider>
  );
}
