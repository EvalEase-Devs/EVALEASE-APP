"use client";

import { useState, useMemo } from "react";
import {
    IconPlus,
    IconFlask,
    IconChevronRight,
    IconBookOff,
    IconArrowRight,
    IconLoader2,
    IconDotsVertical,
    IconUsers,
    IconList,
    IconFileSpreadsheet,
    IconChartBar,
    IconTrash,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { toast } from "sonner";
import {
    SUBJECT_MAP,
    SEMESTERS,
    CLASS_BY_SEM,
    BATCHES,
} from "@/app/teacher/assignments/create/constants";
import { useTasks } from "@/hooks/use-api";
import type { Semester, AllottedSubject } from "./create-assignment-content";
import TasksListModal from "./tasks-list-modal";
import { BatchMarksReportModal } from "./batch-marks-report-modal";
import { ISEMSEReportModal } from "./ise-mse-report-modal";
import { LabAttainmentModal } from "./lab-attainment-modal";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AllottedSubjectsListProps {
    subjects: AllottedSubject[];
    onAllot: (
        allotment: Omit<AllottedSubject, "id" | "allotment_id">,
    ) => Promise<void>;
    onRemove: (id: number) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Allot Subject Form (rendered inside a Dialog)
// ---------------------------------------------------------------------------

function AllotSubjectForm({
    onAllot,
    onClose,
}: {
    onAllot: (
        allotment: Omit<AllottedSubject, "id" | "allotment_id">,
    ) => Promise<void>;
    onClose: () => void;
}) {
    const [selectedSemester, setSelectedSemester] = useState<Semester | "">("");
    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedBatch, setSelectedBatch] = useState("");
    const [courseType, setCourseType] = useState<"Lec" | "Lab">("Lec");
    const [isIncharge, setIsIncharge] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const availableSubjects =
        selectedSemester && selectedSemester in SUBJECT_MAP
            ? SUBJECT_MAP[selectedSemester as keyof typeof SUBJECT_MAP]
            : [];

    const availableClasses =
        selectedSemester && selectedSemester in CLASS_BY_SEM
            ? CLASS_BY_SEM[selectedSemester as keyof typeof CLASS_BY_SEM]
            : [];

    // Derive subject code and name from selected subject string
    const getSubjectCode = (): string => selectedSubject.split(" ")[0];
    const getSubjectName = (): string => {
        const withoutType = selectedSubject.replace(/\s*\([^)]*\)$/, "");
        const parts = withoutType.split(" ");
        return parts.slice(1).join(" ");
    };

    const handleSubmit = async () => {
        if (
            !selectedSemester ||
            !selectedSubject ||
            !selectedClass ||
            !selectedBatch
        ) {
            toast.error("Please fill all fields");
            return;
        }

        setIsLoading(true);
        try {
            await onAllot({
                semester: selectedSemester,
                subject: selectedSubject,
                subjectName: getSubjectName(),
                class: selectedClass,
                batch:
                    selectedBatch === "All"
                        ? "All"
                        : `Batch ${selectedBatch}`,
                isIncharge,
                sub_id: getSubjectCode(),
                type: courseType,
            });
            onClose();
        } catch {
            // Error handled by parent toast
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-5">
            {/* Semester + Subject (cascading) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <Label className="text-label">Semester</Label>
                    <Select
                        value={selectedSemester}
                        onValueChange={(v) => {
                            setSelectedSemester(v as Semester);
                            setSelectedSubject("");
                            setSelectedClass("");
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                        <SelectContent>
                            {SEMESTERS.map((sem) => (
                                <SelectItem key={sem} value={sem}>
                                    {sem}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col gap-2">
                    <Label className="text-label">Subject</Label>
                    <Select
                        value={selectedSubject}
                        onValueChange={setSelectedSubject}
                        disabled={!selectedSemester}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableSubjects.map((s) => {
                                const val = `${s.code} ${s.fullName} (${s.type === "Lab" ? "Lab" : "Lec"})`;
                                return (
                                    <SelectItem key={s.code} value={val}>
                                        {s.code} — {s.fullName}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Class + Batch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <Label className="text-label">Class</Label>
                    <Select
                        value={selectedClass}
                        onValueChange={setSelectedClass}
                        disabled={!selectedSemester}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableClasses.map((cls) => (
                                <SelectItem key={cls} value={cls}>
                                    {cls}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col gap-2">
                    <Label className="text-label">Batch</Label>
                    <Select
                        value={selectedBatch}
                        onValueChange={setSelectedBatch}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select batch" />
                        </SelectTrigger>
                        <SelectContent>
                            {BATCHES.map((b) => (
                                <SelectItem key={b} value={b}>
                                    {b === "All" ? "All Batches" : `Batch ${b}`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Course Type (Radio) */}
            <div className="flex flex-col gap-2">
                <Label className="text-label">Course Type</Label>
                <RadioGroup
                    value={courseType}
                    onValueChange={(v) => setCourseType(v as "Lec" | "Lab")}
                    className="flex items-center gap-6"
                >
                    <div className="flex items-center gap-2">
                        <RadioGroupItem value="Lec" id="type-lec" />
                        <Label htmlFor="type-lec" className="text-body">
                            Lecture
                        </Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <RadioGroupItem value="Lab" id="type-lab" />
                        <Label htmlFor="type-lab" className="text-body">
                            Lab
                        </Label>
                    </div>
                </RadioGroup>
            </div>

            {/* Incharge checkbox */}
            <div className="flex items-center gap-2">
                <Checkbox
                    id="allot-incharge"
                    checked={isIncharge}
                    onCheckedChange={(c) => setIsIncharge(c as boolean)}
                />
                <Label htmlFor="allot-incharge" className="text-body">
                    I am the Subject In-Charge
                </Label>
            </div>

            {/* Submit */}
            <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full"
            >
                {isLoading ? (
                    <IconLoader2
                        size={16}
                        className="mr-2 animate-spin"
                    />
                ) : (
                    <IconArrowRight size={16} className="mr-2" />
                )}
                {isLoading ? "Allotting..." : "Allot Subject"}
            </Button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Subject Row (with 3-dots dropdown)
// ---------------------------------------------------------------------------

function SubjectRow({
    allotment,
    onRemove,
}: {
    allotment: AllottedSubject;
    onRemove: (id: number) => Promise<void>;
}) {
    const [tasksModalOpen, setTasksModalOpen] = useState(false);
    const [marksModalOpen, setMarksModalOpen] = useState(false);
    const [iseMseModalOpen, setIseMseModalOpen] = useState(false);
    const [labAttainmentOpen, setLabAttainmentOpen] = useState(false);
    const [removingId, setRemovingId] = useState<number | null>(null);

    const { tasks, deleteTask } = useTasks(allotment.allotment_id);

    const handleRemove = async () => {
        setRemovingId(allotment.allotment_id);
        try {
            await onRemove(allotment.allotment_id);
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between p-4 border border-border/50 rounded-xl bg-background hover:bg-muted/20 transition-colors">
                {/* Left — Subject Info */}
                <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-body font-semibold">
                            {allotment.subjectName || allotment.sub_id}
                        </span>
                        {allotment.type === "Lab" && (
                            <IconFlask
                                size={13}
                                className="text-muted-foreground"
                            />
                        )}
                        {allotment.isIncharge && (
                            <Badge
                                variant="default"
                                className="bg-primary text-primary-foreground shadow-sm flex items-center gap-1"
                            >
                                <IconUsers size={12} />
                                Incharge
                            </Badge>
                        )}
                    </div>
                    <span className="text-caption text-muted-foreground">
                        {allotment.batch === "All"
                            ? "All Batches"
                            : allotment.batch}
                        {allotment.semester &&
                            ` · Computer Engineering ${allotment.semester}`}
                    </span>
                </div>

                {/* Right — Create Task + 3-dots Dropdown */}
                <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Button size="sm" asChild>
                        <Link
                            href={`/teacher/assignments/create?allotmentId=${allotment.allotment_id}`}
                        >
                            Create Task
                            <IconChevronRight size={16} className="ml-1" />
                        </Link>
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                            >
                                <IconDotsVertical size={16} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => setTasksModalOpen(true)}
                            >
                                <IconList size={14} className="mr-2" />
                                View All Tasks
                            </DropdownMenuItem>

                            {allotment.type === "Lab" && (
                                <DropdownMenuItem
                                    onClick={() => setMarksModalOpen(true)}
                                >
                                    <IconFileSpreadsheet
                                        size={14}
                                        className="mr-2"
                                    />
                                    All Marks
                                </DropdownMenuItem>
                            )}

                            {allotment.isIncharge &&
                                allotment.type === "Lec" && (
                                    <DropdownMenuItem
                                        onClick={() =>
                                            setIseMseModalOpen(true)
                                        }
                                    >
                                        <IconChartBar
                                            size={14}
                                            className="mr-2"
                                        />
                                        ISE-MSE Attainment Report
                                    </DropdownMenuItem>
                                )}

                            {allotment.isIncharge &&
                                allotment.type === "Lab" && (
                                    <DropdownMenuItem
                                        onClick={() =>
                                            setLabAttainmentOpen(true)
                                        }
                                    >
                                        <IconChartBar
                                            size={14}
                                            className="mr-2"
                                        />
                                        Lab Attainment Report
                                    </DropdownMenuItem>
                                )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                className="text-destructive"
                                disabled={
                                    removingId === allotment.allotment_id
                                }
                                onClick={handleRemove}
                            >
                                <IconTrash size={14} className="mr-2" />
                                {removingId === allotment.allotment_id
                                    ? "Removing..."
                                    : "Un-allot Subject"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Modals (rendered outside the row for proper portaling) */}
            {tasksModalOpen && (
                <TasksListModal
                    isOpen={tasksModalOpen}
                    onClose={() => setTasksModalOpen(false)}
                    tasks={tasks}
                    onDeleteTask={deleteTask}
                    onPublishTask={() => {}}
                    subjectName={allotment.subjectName || allotment.sub_id}
                />
            )}

            <BatchMarksReportModal
                open={marksModalOpen}
                onOpenChange={setMarksModalOpen}
                allotmentId={allotment.allotment_id}
                subjectName={allotment.subjectName || allotment.sub_id}
                className={allotment.class}
                batch={allotment.batch}
            />

            <ISEMSEReportModal
                open={iseMseModalOpen}
                onOpenChange={setIseMseModalOpen}
                allotmentId={allotment.allotment_id}
                subjectCode={allotment.sub_id}
            />

            <LabAttainmentModal
                isOpen={labAttainmentOpen}
                onClose={() => setLabAttainmentOpen(false)}
                allotmentId={allotment.allotment_id}
            />
        </>
    );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AllottedSubjectsList({
    subjects,
    onAllot,
    onRemove,
}: AllottedSubjectsListProps) {
    const [allotDialogOpen, setAllotDialogOpen] = useState(false);

    // Group subjects by Semester + Class
    const groupedBySemAndClass = useMemo(() => {
        const groups: Record<string, AllottedSubject[]> = {};
        for (const s of subjects) {
            const key = `${s.semester} • ${s.class}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(s);
        }
        return Object.entries(groups).sort(([a], [b]) =>
            a.localeCompare(b),
        );
    }, [subjects]);

    // Shared dialog content
    const allotDialog = (
        <Dialog open={allotDialogOpen} onOpenChange={setAllotDialogOpen}>
            <DialogTrigger asChild>
                {/* Trigger is injected per-context below */}
                <span />
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-section-title">
                        Allot New Subject
                    </DialogTitle>
                </DialogHeader>
                <AllotSubjectForm
                    onAllot={onAllot}
                    onClose={() => setAllotDialogOpen(false)}
                />
            </DialogContent>
        </Dialog>
    );

    // -----------------------------------------------------------------------
    // Empty State
    // -----------------------------------------------------------------------
    if (subjects.length === 0) {
        return (
            <>
                {allotDialog}
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <IconBookOff
                        size={48}
                        className="text-muted-foreground"
                    />
                    <p className="text-body text-muted-foreground text-center">
                        You haven&apos;t allotted any subjects to yourself yet.
                    </p>
                    <Button onClick={() => setAllotDialogOpen(true)}>
                        <IconPlus size={16} className="mr-2" />
                        Allot Subject
                    </Button>
                </div>
            </>
        );
    }

    // -----------------------------------------------------------------------
    // Normal State — Header + Grouped Action Rows
    // -----------------------------------------------------------------------
    return (
        <>
            {allotDialog}

            <div className="flex flex-col gap-8">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-page-title">My Subjects</h1>
                    <Button
                        size="default"
                        onClick={() => setAllotDialogOpen(true)}
                    >
                        <IconPlus size={16} className="mr-2" />
                        Allot Subject
                    </Button>
                </div>

                {/* Grouped Rows — by Semester + Class */}
                {groupedBySemAndClass.map(([groupKey, groupSubjects]) => {
                    // Sort: alphabetical by subject → Lec before Lab → batch ascending
                    groupSubjects.sort((a, b) => {
                        const nameA = (a.subjectName || a.sub_id).toLowerCase();
                        const nameB = (b.subjectName || b.sub_id).toLowerCase();
                        if (nameA < nameB) return -1;
                        if (nameA > nameB) return 1;

                        if (a.type === "Lec" && b.type === "Lab") return -1;
                        if (a.type === "Lab" && b.type === "Lec") return 1;

                        const getBatchNum = (batchStr: string | null | undefined) => {
                            if (!batchStr || batchStr === "All") return 0;
                            const num = parseInt(batchStr.toString().replace(/\D/g, ""));
                            return isNaN(num) ? 0 : num;
                        };
                        return getBatchNum(a.batch) - getBatchNum(b.batch);
                    });

                    return (
                    <div key={groupKey} className="flex flex-col">
                        <h2 className="text-section-title">{groupKey}</h2>
                        <Separator className="my-2" />

                        <div className="flex flex-col gap-2">
                            {groupSubjects.map((allotment) => (
                                <SubjectRow
                                    key={allotment.allotment_id}
                                    allotment={allotment}
                                    onRemove={onRemove}
                                />
                            ))}
                        </div>
                    </div>
                    );
                })}
            </div>
        </>
    );
}
