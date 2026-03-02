"use client";

import { AllottedSubjectsList } from "./allotted-subjects-list";
import { useAllotments } from "@/hooks/use-api";
import { CardsGridSkeleton } from "@/components/skeletons";
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
    const { allotments, loading, createAllotment, deleteAllotment } = useAllotments();

    // Transform API allotments to component format
    const allottedSubjects: AllottedSubject[] = allotments.map(a => ({
        id: a.allotment_id,
        allotment_id: a.allotment_id,
        semester: (a.current_sem as Semester) || getSemesterFromClass(a.class_name),
        subject: a.sub_id,
        subjectName: a.sub_name,
        class: a.class_name,
        batch: a.batch_no ? `Batch ${a.batch_no}` : 'All',
        isIncharge: a.is_subject_incharge,
        sub_id: a.sub_id,
        type: a.type
    }));

    const handleAddAllotment = async (allotment: Omit<AllottedSubject, "id" | "allotment_id">) => {
        toast.promise(
            createAllotment({
                sub_id: allotment.sub_id || allotment.subject.split(' - ')[0],
                sub_name: allotment.subjectName,
                class_name: allotment.class,
                batch_no: allotment.batch === 'All' ? null : parseInt(allotment.batch.replace('Batch ', '')),
                is_subject_incharge: allotment.isIncharge,
                course: 'Computer Engineering',
                type: allotment.type,
                current_sem: allotment.semester
            }),
            {
                loading: 'Allotting subject...',
                success: 'Subject allotted successfully',
                error: (err) => err instanceof Error ? err.message : 'Failed to allot subject',
            }
        );
    };

    const handleRemoveAllotment = async (id: number) => {
        toast.promise(deleteAllotment(id), {
            loading: "Removing subject...",
            success: "Subject removed successfully",
            error: (err) =>
                err instanceof Error ? err.message : "Failed to remove subject",
        });
    };

    if (loading) {
        return <CardsGridSkeleton count={3} />;
    }

    return (
        <AllottedSubjectsList
            subjects={allottedSubjects}
            onAllot={handleAddAllotment}
            onRemove={handleRemoveAllotment}
        />
    );
}
