"use client";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { UseFormSetValue, FieldErrors } from "react-hook-form";
import type { TaskModalFormValues } from "@/app/teacher/assignments/create/schemas/task-schema";
import type { Experiment, ExperimentLO } from "@/hooks/use-api";
import { FieldError } from "../field-error";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepBlueprintProps {
    isLab: boolean;
    assessmentType: string;
    assessmentSubType: string;
    selectedExp: string;
    errors: FieldErrors<TaskModalFormValues>;
    setValue: UseFormSetValue<TaskModalFormValues>;
    // Lab-specific
    experiments: Experiment[];
    experimentsLoading: boolean;
    experimentLOs: ExperimentLO[];
    loLoading: boolean;
}

interface RadioCardProps {
    selected: boolean;
    onClick: () => void;
    title: string;
    subtitle: string;
}

// ---------------------------------------------------------------------------
// Radio Card (local sub-component)
// ---------------------------------------------------------------------------

function RadioCard({ selected, onClick, title, subtitle }: RadioCardProps) {
    return (
        <label
            onClick={onClick}
            className={`flex-1 max-w-[200px] cursor-pointer rounded-xl p-4 text-center transition-all ${
                selected
                    ? "border-2 border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
        >
            <span className="text-sm font-semibold block">{title}</span>
            <span className="text-xs opacity-80 mt-0.5 block">{subtitle}</span>
        </label>
    );
}

// ---------------------------------------------------------------------------
// Step Blueprint
// ---------------------------------------------------------------------------

export function StepBlueprint({
    isLab,
    assessmentType,
    assessmentSubType,
    selectedExp,
    errors,
    setValue,
    experiments,
    experimentsLoading,
    experimentLOs,
    loLoading,
}: StepBlueprintProps) {
    if (isLab) {
        return (
            <div className="max-w-3xl">
                <Label className="text-label">
                    Select Experiment{" "}
                    <span className="text-destructive">*</span>
                </Label>

                {experimentsLoading ? (
                    <div className="mt-2 flex h-10 w-full items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground animate-pulse">
                        Loading experiments...
                    </div>
                ) : experiments.length > 0 ? (
                    <>
                        <Select
                            value={selectedExp}
                            onValueChange={(val) =>
                                setValue("selectedExp", val)
                            }
                        >
                            <SelectTrigger className="mt-2 w-full">
                                <SelectValue placeholder="Choose an experiment..." />
                            </SelectTrigger>
                            <SelectContent className="w-[--radix-select-trigger-width]">
                                {experiments.map((exp) => (
                                    <SelectItem
                                        key={exp.exp_no}
                                        value={`${exp.exp_no}`}
                                    >
                                        Exp {exp.exp_no} — {exp.exp_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {selectedExp && (
                            <div className="mt-4">
                                <Label className="text-label">
                                    Associated Lab Outcomes
                                </Label>
                                {loLoading ? (
                                    <div className="text-xs text-muted-foreground animate-pulse mt-1">
                                        Fetching LOs...
                                    </div>
                                ) : experimentLOs.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {experimentLOs.map((lo) => (
                                            <Badge
                                                key={lo.lo_no}
                                                variant="secondary"
                                            >
                                                LO{lo.lo_no}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground mt-1 italic">
                                        No LOs associated with this experiment
                                    </p>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="mt-2 flex h-10 w-full items-center justify-center rounded-md border border-dashed border-border bg-muted px-3 text-sm text-muted-foreground">
                        No experiments available
                    </div>
                )}

                <FieldError message={errors.selectedExp?.message as string} />
            </div>
        );
    }

    return (
        <div>
            <Label className="text-label">Assessment Type</Label>
            <div className="flex gap-3 mt-2">
                <RadioCard
                    selected={assessmentType === "ISE"}
                    onClick={() => setValue("assessmentType", "ISE")}
                    title="ISE"
                    subtitle="Internal Assessment"
                />
                <RadioCard
                    selected={assessmentType === "MSE"}
                    onClick={() => setValue("assessmentType", "MSE")}
                    title="MSE"
                    subtitle="Mid-Semester Exam"
                />
            </div>

            {assessmentType === "ISE" && (
                <div className="mt-6">
                    <Label className="text-label">Format</Label>
                    <div className="flex gap-3 mt-2">
                        <RadioCard
                            selected={assessmentSubType === "Subjective"}
                            onClick={() =>
                                setValue("assessmentSubType", "Subjective")
                            }
                            title="Subjective"
                            subtitle="Written answers"
                        />
                        <RadioCard
                            selected={assessmentSubType === "MCQ"}
                            onClick={() =>
                                setValue("assessmentSubType", "MCQ")
                            }
                            title="MCQ (Quiz)"
                            subtitle="Multiple choice"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
