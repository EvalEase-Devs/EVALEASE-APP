"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import {
    useAllotments,
    useTasks,
    useMarks,
    type Task,
    type MarksEntry,
    type Allotment,
} from "@/hooks/use-api";
import {
    IconClock,
    IconClipboardCheck,
    IconChevronRight,
    IconCircleCheck,
    IconFlask,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

function timeAgo(date: string): string {
    const seconds = Math.floor(
        (Date.now() - new Date(date).getTime()) / 1000,
    );
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function isOverdue(submittedAt: string): boolean {
    return Date.now() - new Date(submittedAt).getTime() > 48 * 60 * 60 * 1000;
}

const MAX_VISIBLE_ROWS = 5;

// ---------------------------------------------------------------------------
// TaskMarksFetcher — preserves existing per-task fetch pattern
// ---------------------------------------------------------------------------

function TaskMarksFetcher({
    task,
    onPendingMarksLoaded,
}: {
    task: Task;
    onPendingMarksLoaded: (taskId: number, marks: MarksEntry[]) => void;
}) {
    const { marks, loading } = useMarks(task.task_id);

    useEffect(() => {
        if (!loading && marks) {
            const pending = marks.filter(
                (m: MarksEntry) => m.status === "Pending",
            );
            onPendingMarksLoaded(task.task_id, pending);
        }
    }, [marks, loading, task.task_id, onPendingMarksLoaded]);

    return null;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TeacherDashboardContent() {
    const { user } = useUser();
    const { allotments, loading: allotmentsLoading } = useAllotments();
    const { tasks, loading: tasksLoading } = useTasks();

    const [pendingMarksByTask, setPendingMarksByTask] = useState<
        Record<number, MarksEntry[]>
    >({});

    const handlePendingMarksLoaded = useCallback(
        (taskId: number, pendingMarks: MarksEntry[]) => {
            setPendingMarksByTask((prev) => {
                if (prev[taskId]?.length === pendingMarks.length) return prev;
                return { ...prev, [taskId]: pendingMarks };
            });
        },
        [],
    );

    // Combine all pending marks with their parent task info
    const allPendingMarks = useMemo(() => {
        const combined: (MarksEntry & { task: Task })[] = [];
        for (const [taskIdStr, marks] of Object.entries(pendingMarksByTask)) {
            const taskId = parseInt(taskIdStr);
            const task = tasks.find((t: Task) => t.task_id === taskId);
            if (task) {
                marks.forEach((m) => combined.push({ ...m, task }));
            }
        }
        // Oldest first — most urgent at top
        return combined.sort((a, b) => {
            const dateA = a.submitted_at
                ? new Date(a.submitted_at).getTime()
                : a.task?.created_at
                  ? new Date(a.task.created_at).getTime()
                  : 0;
            const dateB = b.submitted_at
                ? new Date(b.submitted_at).getTime()
                : b.task?.created_at
                  ? new Date(b.task.created_at).getTime()
                  : 0;
            return dateA - dateB;
        });
    }, [pendingMarksByTask, tasks]);

    const pendingCount = allPendingMarks.length;
    const firstName = user?.name?.split(" ")[0] || "Teacher";
    const greeting = getGreeting();
    const visibleMarks = allPendingMarks.slice(0, MAX_VISIBLE_ROWS);
    const hiddenCount = pendingCount - visibleMarks.length;
    const isLoading = tasksLoading;

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <div className="flex flex-col gap-0">
            {/* Invisibly render fetchers to aggregate pending marks */}
            {!tasksLoading &&
                tasks.map((task: Task) => (
                    <TaskMarksFetcher
                        key={task.task_id}
                        task={task}
                        onPendingMarksLoaded={handlePendingMarksLoaded}
                    />
                ))}

            {/* ============================================================= */}
            {/* ZONE 1 — Status Bar                                           */}
            {/* ============================================================= */}
            <div className="bg-muted/40 px-8 py-6 border-b border-border/50">
                {isLoading ? (
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                ) : (
                    <>
                        <p className="text-page-title">
                            {greeting}, {firstName}
                        </p>
                        <p className="text-body text-muted-foreground mt-1">
                            {pendingCount > 0 ? (
                                <>
                                    You have{" "}
                                    <span className="font-bold text-warning">
                                        {pendingCount}
                                    </span>{" "}
                                    pending submission
                                    {pendingCount !== 1 ? "s" : ""} waiting for
                                    evaluation.
                                </>
                            ) : (
                                "You're all caught up. No pending evaluations."
                            )}
                        </p>
                    </>
                )}
            </div>

            {/* ============================================================= */}
            {/* ZONE 2 + 3 — Main Content Grid                               */}
            {/* ============================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 p-8">
                {/* --------------------------------------------------------- */}
                {/* ZONE 2 — Action Column (Needs Evaluation)                 */}
                {/* --------------------------------------------------------- */}
                <div className="lg:col-span-3 flex flex-col gap-4">
                    {/* Section header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <IconClock
                                size={16}
                                className="text-warning"
                            />
                            <h2 className="text-section-title">
                                Needs Evaluation
                            </h2>
                        </div>
                        <Link
                            href="/teacher/evaluations"
                            className="flex items-center gap-1 text-caption text-muted-foreground hover:text-foreground transition-colors"
                        >
                            View all
                            <IconChevronRight size={14} />
                        </Link>
                    </div>

                    {/* Evaluation rows */}
                    {isLoading ? (
                        /* Loading skeleton — 3 rows matching real row height */
                        <div className="flex flex-col">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="py-3 border-b border-border/50 flex items-start justify-between border-l-2 border-l-transparent pl-3"
                                >
                                    <div className="flex flex-col gap-1.5">
                                        <Skeleton className="h-4 w-36" />
                                        <Skeleton className="h-3 w-48" />
                                        <Skeleton className="h-3 w-28" />
                                    </div>
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            ))}
                        </div>
                    ) : pendingCount === 0 ? (
                        /* Empty state — inline, not a box */
                        <div className="flex items-center gap-2 py-3">
                            <IconCircleCheck
                                size={16}
                                className="text-success"
                            />
                            <span className="text-body text-muted-foreground">
                                All caught up — no pending evaluations
                            </span>
                        </div>
                    ) : (
                        /* Pending evaluation rows */
                        <div className="flex flex-col">
                            {visibleMarks.map((mark) => {
                                const overdue = mark.submitted_at
                                    ? isOverdue(mark.submitted_at)
                                    : false;
                                return (
                                    <div
                                        key={
                                            mark.mark_id ||
                                            `${mark.task_id}-${mark.stud_pid}`
                                        }
                                        className={`py-3 border-b border-border/50 flex items-start justify-between border-l-2 pl-3 ${
                                            overdue
                                                ? "border-l-warning"
                                                : "border-l-transparent"
                                        }`}
                                    >
                                        {/* Left — student + task info */}
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <span className="text-body font-medium">
                                                {mark.student?.stud_name ||
                                                    `PID: ${mark.stud_pid}`}
                                            </span>
                                            <span className="text-caption">
                                                {mark.task?.title}
                                            </span>
                                            <span className="text-meta text-muted-foreground">
                                                {mark.task?.allotment
                                                    ?.sub_name ||
                                                    mark.task?.sub_id}
                                            </span>
                                        </div>

                                        {/* Right — elapsed time */}
                                        <span
                                            className={`text-caption whitespace-nowrap ml-4 mt-0.5 ${
                                                overdue
                                                    ? "text-warning"
                                                    : "text-muted-foreground"
                                            }`}
                                        >
                                            {mark.submitted_at
                                                ? timeAgo(mark.submitted_at)
                                                : "—"}
                                        </span>
                                    </div>
                                );
                            })}

                            {/* "View X more" link */}
                            {hiddenCount > 0 && (
                                <Link
                                    href="/teacher/evaluations"
                                    className="py-3 text-caption text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    View {hiddenCount} more →
                                </Link>
                            )}
                        </div>
                    )}
                </div>

                {/* --------------------------------------------------------- */}
                {/* ZONE 3 — Context Column (My Allotments)                   */}
                {/* --------------------------------------------------------- */}
                <div className="lg:col-span-2">
                    <Card className="p-6">
                        {/* Section header */}
                        <div className="flex items-center gap-2 mb-4">
                            <IconClipboardCheck
                                size={16}
                                className="text-success"
                            />
                            <h2 className="text-section-title">
                                My Allotments
                            </h2>
                        </div>

                        {allotmentsLoading ? (
                            /* Loading skeleton inside card */
                            <div className="flex flex-col gap-4">
                                {[1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className="flex flex-col gap-1.5"
                                    >
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-3 w-28" />
                                    </div>
                                ))}
                                <Skeleton className="h-9 w-full mt-2" />
                            </div>
                        ) : allotments.length === 0 ? (
                            <div className="py-4">
                                <p className="text-body text-muted-foreground">
                                    No subjects allotted yet.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Allotment list */}
                                <div className="flex flex-col">
                                    {allotments.map(
                                        (
                                            allotment: Allotment,
                                            index: number,
                                        ) => (
                                            <div
                                                key={allotment.allotment_id}
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-body font-semibold">
                                                            {allotment.sub_name ||
                                                                allotment.sub_id}
                                                        </span>
                                                        {allotment.type ===
                                                            "Lab" && (
                                                            <IconFlask
                                                                size={13}
                                                                className="inline text-muted-foreground"
                                                            />
                                                        )}
                                                        {allotment.is_subject_incharge && (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-meta border-border/60 text-muted-foreground shadow-none ml-1"
                                                            >
                                                                Incharge
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-caption text-muted-foreground">
                                                        <span>
                                                            {
                                                                allotment.class_name
                                                            }
                                                        </span>
                                                        {allotment.batch_no ? (
                                                            <>
                                                                <span>
                                                                    ·
                                                                </span>
                                                                <span>
                                                                    Batch{" "}
                                                                    {
                                                                        allotment.batch_no
                                                                    }
                                                                </span>
                                                            </>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                {index <
                                                    allotments.length -
                                                        1 && (
                                                    <Separator className="my-3" />
                                                )}
                                            </div>
                                        ),
                                    )}
                                </div>

                                {/* CTA */}
                                <Button
                                    className="w-full mt-4"
                                    asChild
                                >
                                    <Link href="/teacher/assignments/create">
                                        Create New Task
                                    </Link>
                                </Button>
                            </>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
