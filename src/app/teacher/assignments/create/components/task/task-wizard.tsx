"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    IconCircleCheck,
    IconChevronRight,
    IconLoader2,
    IconAlertCircle,
    IconArrowLeft,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbLink,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import {
    useAllotments,
    useExperiments,
    useExperimentLOs,
} from "@/hooks/use-api";
import { useTaskForm } from "../hooks/use-task-form";
import { StepBlueprint } from "./steps/step-blueprint";
import { StepLogistics } from "./steps/step-logistics";
import { StepContent } from "./steps/step-content";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEP_NAMES = ["Blueprint", "Logistics", "Content"] as const;

// ---------------------------------------------------------------------------
// TaskWizard
// ---------------------------------------------------------------------------

export function TaskWizard() {
    const searchParams = useSearchParams();
    const allotmentId = searchParams.get("allotmentId");
    const numericAllotmentId = allotmentId ? parseInt(allotmentId) : null;

    // ── Data fetching ──────────────────────────────────────────────────────
    const { allotments, loading: allotmentsLoading } = useAllotments();

    const allotment = useMemo(
        () => allotments.find((a) => a.allotment_id === numericAllotmentId),
        [allotments, numericAllotmentId],
    );

    const { experiments, loading: experimentsLoading } = useExperiments(
        allotment?.sub_id || "",
    );

    // ── Form + handlers ────────────────────────────────────────────────────
    const {
        form,
        isLab,
        isMCQ,
        submitting,
        assessmentType,
        assessmentSubType,
        selectedExp,
        maxMarks,
        selectedCOs,
        questions,
        mseQuestions,
        toggleCO,
        handleMseChange,
        handleAddQuestion,
        handleRemoveQuestion,
        handleSubmit,
    } = useTaskForm(allotment, experiments);

    const {
        register,
        formState: { errors },
    } = form;

    // ── Wizard state ───────────────────────────────────────────────────────
    const [currentStep, setCurrentStep] = useState(1);

    const totalSteps = isLab
        ? 2
        : assessmentType === "ISE" && assessmentSubType === "Subjective"
          ? 2
          : 3;

    const isFinalStep = currentStep === totalSteps;

    const isSubjective =
        !isLab &&
        assessmentType === "ISE" &&
        assessmentSubType === "Subjective";

    const stepLabel = isLab
        ? currentStep === 1
            ? "Experiment Selection"
            : "Scheduling"
        : STEP_NAMES[currentStep - 1];

    const mcqTotal = questions.reduce((sum, q) => sum + q.marks, 0);

    // ── Experiment LOs ─────────────────────────────────────────────────────
    const { los: experimentLOs, loading: loLoading } = useExperimentLOs(
        allotment?.sub_id || "",
        selectedExp ? parseInt(selectedExp) : null,
    );

    // ── Step validation before advancing ──────────────────────────────────
    const handleNextStep = async () => {
        if (currentStep === 1) {
            if (isLab && !form.getValues("selectedExp")) {
                form.setError("selectedExp", {
                    message: "Select an experiment",
                });
                return;
            }
            setCurrentStep(2);
            return;
        }

        if (currentStep === 2) {
            const values = form.getValues();
            let valid = true;

            if (!values.startTime) {
                form.setError("startTime", {
                    message: "Start time is required",
                });
                valid = false;
            }

            if (!isLab && assessmentType !== "MSE") {
                if (!values.title.trim()) {
                    form.setError("title", { message: "Title is required" });
                    valid = false;
                }
                if (values.selectedCOs.length === 0) {
                    form.setError("selectedCOs", {
                        message: "Select at least one CO",
                    });
                    valid = false;
                }
                if (!isMCQ && values.maxMarks < 1) {
                    form.setError("maxMarks", {
                        message: "Marks must be at least 1",
                    });
                    valid = false;
                }
            }

            if (isMCQ) {
                if (!values.endTime) {
                    form.setError("endTime", {
                        message: "End time is required for MCQ",
                    });
                    valid = false;
                } else if (
                    values.startTime &&
                    new Date(values.endTime) <= new Date(values.startTime)
                ) {
                    form.setError("endTime", {
                        message: "End time must be after start time",
                    });
                    valid = false;
                }
            }

            if (isLab && values.maxMarks < 1) {
                form.setError("maxMarks", {
                    message: "Marks must be at least 1",
                });
                valid = false;
            }

            if (!valid) return;
            setCurrentStep(3);
        }
    };

    // ── Loading state ──────────────────────────────────────────────────────
    if (allotmentsLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <IconLoader2
                    size={24}
                    className="animate-spin text-muted-foreground"
                />
            </div>
        );
    }

    // ── Allotment not found ────────────────────────────────────────────────
    if (!allotment) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <IconAlertCircle size={48} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                    Allotment not found. It may have been removed.
                </p>
                <Button variant="outline" asChild>
                    <Link href="/teacher/assignments/create">
                        <IconArrowLeft size={16} className="mr-2" />
                        Back to Subjects
                    </Link>
                </Button>
            </div>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full relative">
            {/* Standard sticky header */}
            <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/teacher">
                                Teacher
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/teacher/assignments/create">
                                Assignments
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Create Task</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </header>

            {/* Main scrollable content */}
            <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
                {/* Hero */}
                <h1 className="text-page-title">
                    Create New {isLab ? "Lab Experiment" : "Task"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {allotment.sub_name} · {allotment.class_name} ·{" "}
                    {allotment.batch_no
                        ? `Batch ${allotment.batch_no}`
                        : "All Batches"}
                </p>

                {/* Step indicator */}
                <div className="flex items-center gap-3 mt-6 mb-8">
                    {Array.from({ length: totalSteps }, (_, i) => i + 1).map(
                        (step) => (
                            <div
                                key={step}
                                className="flex items-center gap-2"
                            >
                                <div
                                    className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-semibold transition-colors ${
                                        step === currentStep
                                            ? "bg-primary text-primary-foreground"
                                            : step < currentStep
                                              ? "bg-primary/20 text-primary"
                                              : "bg-muted text-muted-foreground"
                                    }`}
                                >
                                    {step < currentStep ? (
                                        <IconCircleCheck size={14} />
                                    ) : (
                                        step
                                    )}
                                </div>
                                <span
                                    className={`text-xs ${
                                        step === currentStep
                                            ? "font-semibold text-foreground"
                                            : "text-muted-foreground"
                                    }`}
                                >
                                    {isLab
                                        ? step === 1
                                            ? "Experiment"
                                            : "Scheduling"
                                        : STEP_NAMES[step - 1]}
                                </span>
                                {step < totalSteps && (
                                    <IconChevronRight
                                        size={14}
                                        className="text-muted-foreground"
                                    />
                                )}
                            </div>
                        ),
                    )}
                </div>

                <h2 className="text-section-title mb-6">
                    Step {currentStep}: {stepLabel}
                </h2>

                {/* Step panels */}
                {currentStep === 1 && (
                    <StepBlueprint
                        isLab={isLab}
                        assessmentType={assessmentType}
                        assessmentSubType={assessmentSubType}
                        selectedExp={selectedExp}
                        errors={errors}
                        setValue={form.setValue}
                        experiments={experiments}
                        experimentsLoading={experimentsLoading}
                        experimentLOs={experimentLOs}
                        loLoading={loLoading}
                    />
                )}

                {currentStep === 2 && (
                    <StepLogistics
                        isLab={isLab}
                        assessmentType={assessmentType}
                        isMCQ={isMCQ}
                        register={register}
                        errors={errors}
                        selectedCOs={selectedCOs}
                        toggleCO={toggleCO}
                        maxMarks={maxMarks}
                    />
                )}

                {currentStep === 3 && !isLab && (
                    <StepContent
                        isMCQ={isMCQ}
                        assessmentType={assessmentType}
                        isSubjective={isSubjective}
                        questions={questions}
                        mseQuestions={mseQuestions}
                        maxMarks={maxMarks}
                        errors={errors}
                        handleAddQuestion={handleAddQuestion}
                        handleRemoveQuestion={handleRemoveQuestion}
                        handleMseChange={handleMseChange}
                    />
                )}
            </main>

            {/* Sticky action bar */}
            <div className="sticky bottom-0 mt-8 border-t bg-background/80 backdrop-blur-md p-4 z-20 flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    Total Marks:{" "}
                    <span className="font-semibold text-foreground">
                        {isMCQ ? mcqTotal : maxMarks}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {currentStep === 1 ? (
                        <Button variant="outline" asChild>
                            <Link href="/teacher/assignments/create">
                                Cancel
                            </Link>
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={() =>
                                setCurrentStep((prev) => prev - 1)
                            }
                        >
                            Back
                        </Button>
                    )}

                    {isFinalStep ? (
                        <Button
                            onClick={() => handleSubmit(setCurrentStep)}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <IconLoader2
                                    size={16}
                                    className="mr-2 animate-spin"
                                />
                            ) : (
                                <IconCircleCheck
                                    size={16}
                                    className="mr-2"
                                />
                            )}
                            {submitting ? "Publishing..." : "Publish Task"}
                        </Button>
                    ) : (
                        <Button onClick={handleNextStep}>
                            Next Step
                            <IconChevronRight size={16} className="ml-1" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
