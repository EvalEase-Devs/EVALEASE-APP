"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SubjectFilterBar } from "./subject-filter-bar";
import { AllottedSubjectsList } from "./allotted-subjects-list";
import { Plus, Loader2 } from "lucide-react";
import { useAllotments } from "@/hooks/use-api";
import { toast } from "sonner";

export type Semester = "SEM 5" | "SEM 6" | "SEM 7" | "SEM 8";

export interface AllottedSubject {
    id: number;
    allotment_id: number;
    semester: Semester;
    subject: string;
    subjectName: string;
    class: string;
    batch: string;
    isIncharge: boolean;
    sub_id: string;
    type: 'Lec' | 'Lab';
}

// Map semester from class name (e.g., "TE CMPN A" -> "SEM 5")
function getSemesterFromClass(className: string): Semester {
    if (className.startsWith("TE")) return "SEM 5";
    if (className.startsWith("BE")) return "SEM 7";
    return "SEM 5";
}

export function CreateAssignmentContent() {
    const [showFilterBar, setShowFilterBar] = useState(false);
    const { allotments, loading, createAllotment, deleteAllotment, fetchAllotments } = useAllotments();

    // Transform API allotments to component format
    const allottedSubjects: AllottedSubject[] = allotments.map(a => ({
        id: a.allotment_id,
        allotment_id: a.allotment_id,
        semester: (a.current_sem as Semester) || getSemesterFromClass(a.class_name),
        subject: a.sub_id, // Just the subject code
        subjectName: a.sub_name, // Full subject name
        class: a.class_name,
        batch: a.batch_no ? `Batch ${a.batch_no}` : 'All',
        isIncharge: a.is_subject_incharge,
        sub_id: a.sub_id,
        type: a.type
    }));

    const handleAddAllotment = async (allotment: Omit<AllottedSubject, "id" | "allotment_id">) => {
        try {
            await createAllotment({
                sub_id: allotment.sub_id || allotment.subject.split(' - ')[0],
                sub_name: allotment.subjectName,
                class_name: allotment.class,
                batch_no: allotment.batch === 'All' ? null : parseInt(allotment.batch.replace('Batch ', '')),
                is_subject_incharge: allotment.isIncharge,
                course: 'Computer Engineering',
                type: allotment.type,
                current_sem: allotment.semester
            });
            toast.success("Subject allotted successfully");
            setShowFilterBar(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to allot subject");
        }
    };

    const handleRemoveAllotment = async (id: number) => {
        try {
            await deleteAllotment(id);
            toast.success("Subject un-allotted successfully");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to remove allotment");
        }
    };

    if (loading) {
        return (
            <div className="min-h-[50vh] flex-1 rounded-xl bg-muted/50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <>
            {/* Allot Subject Button */}
            {!showFilterBar && allottedSubjects.length > 0 && (
                <Button
                    onClick={() => setShowFilterBar(true)}
                    size="lg"
                    className="w-fit"
                >
                    <Plus className="mr-2 h-5 w-5" />
                    Allot Subject
                </Button>
            )}

            {/* Filter Bar */}
            {showFilterBar && (
                <SubjectFilterBar
                    onAllot={handleAddAllotment}
                    onClose={() => setShowFilterBar(false)}
                />
            )}

            {/* Allotted Subjects List */}
            {allottedSubjects.length > 0 && (
                <AllottedSubjectsList
                    subjects={allottedSubjects}
                    onRemove={handleRemoveAllotment}
                />
            )}

            {/* Empty State */}
            {allottedSubjects.length === 0 && !showFilterBar && (
                <div className="min-h-[50vh] flex-1 rounded-xl bg-muted/50 flex items-center justify-center">
                    <div className="text-center space-y-3">
                        <p className="text-muted-foreground">No subjects allotted yet</p>
                        <Button onClick={() => setShowFilterBar(true)} size="lg">
                            <Plus className="mr-2 h-4 w-4" />
                            Allot Your First Subject
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}
