"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStudentAssignments } from "@/hooks/use-api";
import { IconLoader2, IconBook, IconCircleCheck, IconFileText } from "@tabler/icons-react";
import type { StudentAssignment } from "@/hooks/use-api";

export default function SubmittedAssignmentsPage() {
    const { assignments: allAssignments, loading: assignmentsLoading } = useStudentAssignments();

    // Filter only submitted assignments
    const submittedAssignments = allAssignments.filter(a => a.status === 'Submitted');

    if (assignmentsLoading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <IconLoader2 size={32} className="animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* SUBMITTED ASSIGNMENTS */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-1 bg-secondary rounded-full"></div>
                    <h2 className="text-xl font-bold text-foreground">Submitted Assignments</h2>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                        {submittedAssignments.length}
                    </span>
                </div>

                {submittedAssignments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/50 p-8 text-center">
                        <p className="text-muted-foreground">No submitted assignments</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {submittedAssignments.map((assignment) => (
                            <SubmittedAssignmentCard
                                key={assignment.mark_id}
                                assignment={assignment}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Submitted Assignment Card
function SubmittedAssignmentCard({ assignment }: { assignment: StudentAssignment }) {
    const getTaskTypeIcon = (type: string) => {
        switch (type) {
            case "Lab":
                return <IconBook size={16} />;
            case "Lec":
                return <IconFileText size={16} />;
            default:
                return null;
        }
    };

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-3">
                <div className="space-y-2">
                    <h3 className="font-bold text-sm line-clamp-2" title={assignment.task.title.split("-").slice(-1)[0]}>
                          {assignment.task.title.split("-").slice(-1)[0]}
                    </h3>
                    <h3 className="font-bold text-sm line-clamp-2" title={assignment.task.allotment.sub_name}>
                         {assignment.task.allotment.sub_name}
                    </h3>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Task Type & Assessment */}
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-[10px]">
                        {getTaskTypeIcon(assignment.task.task_type)}
                        <span className="ml-1">{assignment.task.task_type}</span>
                    </Badge>

                    {assignment.task.assessment_type && (
                        <Badge variant="secondary" className="text-[10px]">
                            {assignment.task.assessment_type}
                        </Badge>
                    )}

                    {assignment.task.assessment_sub_type && (
                        <Badge variant="outline" className="text-[10px]">
                            {assignment.task.assessment_sub_type}
                        </Badge>
                    )}
                </div>

                {/* Marks Display */}
                <div className="space-y-2 p-3 bg-muted rounded-md">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Marks Obtained:</span>
                        <span className="font-bold text-lg">
                            {assignment.total_marks_obtained}/{assignment.task.max_marks}
                        </span>
                    </div>
                    {assignment.submitted_at && (
                        <div className="text-xs text-muted-foreground">
                            Submitted: {new Date(assignment.submitted_at).toLocaleDateString()}
                        </div>
                    )}
                </div>

                {/* Status Badge */}
                <Badge variant="secondary" className="w-full justify-center">
                    <IconCircleCheck size={12} className="mr-1" />
                    Submitted
                </Badge>
            </CardContent>
        </Card>
    );
}
