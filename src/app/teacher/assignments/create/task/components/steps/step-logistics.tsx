"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { IconClock } from "@tabler/icons-react";
import type { UseFormRegister, FieldErrors } from "react-hook-form";
import type { TaskModalFormValues } from "@/app/teacher/assignments/create/schemas/task-schema";
import { COS } from "@/app/teacher/assignments/create/constants";
import { FieldError } from "../field-error";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepLogisticsProps {
    isLab: boolean;
    assessmentType: string;
    isMCQ: boolean;
    register: UseFormRegister<TaskModalFormValues>;
    errors: FieldErrors<TaskModalFormValues>;
    selectedCOs: string[];
    toggleCO: (co: string) => void;
    maxMarks: number;
}

// ---------------------------------------------------------------------------
// Step Logistics
// ---------------------------------------------------------------------------

export function StepLogistics({
    isLab,
    assessmentType,
    isMCQ,
    register,
    errors,
    selectedCOs,
    toggleCO,
    maxMarks,
}: StepLogisticsProps) {
    return (
        <div>
            {/* Title — theory non-MSE only */}
            {!isLab && assessmentType !== "MSE" && (
                <div className="max-w-lg mb-6">
                    <Label className="text-label">
                        Topic / Title{" "}
                        <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        type="text"
                        placeholder="e.g. Module 1 Test"
                        {...register("title")}
                        className={`mt-2 ${errors.title ? "border-destructive" : ""}`}
                    />
                    <FieldError message={errors.title?.message as string} />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Start Time */}
                <div className="flex flex-col gap-2">
                    <Label className="text-label flex items-center gap-1">
                        <IconClock size={14} />
                        Start Time{" "}
                        <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        type="datetime-local"
                        {...register("startTime")}
                        className={
                            errors.startTime ? "border-destructive" : ""
                        }
                    />
                    <FieldError
                        message={errors.startTime?.message as string}
                    />
                </div>

                {/* End Time — MCQ only */}
                {isMCQ && (
                    <div className="flex flex-col gap-2">
                        <Label className="text-label flex items-center gap-1">
                            <IconClock size={14} />
                            End Time{" "}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            type="datetime-local"
                            {...register("endTime")}
                            className={
                                errors.endTime ? "border-destructive" : ""
                            }
                        />
                        <FieldError
                            message={errors.endTime?.message as string}
                        />
                    </div>
                )}

                {/* Max Marks — lab or non-MCQ theory */}
                {(isLab || (!isMCQ && assessmentType !== "MSE")) && (
                    <div className="flex flex-col gap-2">
                        <Label className="text-label">
                            Max Marks{" "}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            type="number"
                            {...register("maxMarks", {
                                valueAsNumber: true,
                            })}
                            className={
                                errors.maxMarks ? "border-destructive" : ""
                            }
                        />
                        <FieldError
                            message={errors.maxMarks?.message as string}
                        />
                    </div>
                )}
            </div>

            {/* CO Mapping — not for MSE or Lab */}
            {!isLab && assessmentType !== "MSE" && (
                <div className="mt-6">
                    <Label className="text-label">
                        Map Course Outcomes{" "}
                        <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {COS.map((co) => (
                            <button
                                type="button"
                                key={co}
                                onClick={() => toggleCO(co)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    selectedCOs.includes(co)
                                        ? "bg-primary text-primary-foreground font-semibold"
                                        : "bg-muted text-muted-foreground border border-border"
                                }`}
                            >
                                {co}
                            </button>
                        ))}
                    </div>
                    <FieldError
                        message={errors.selectedCOs?.message as string}
                    />
                </div>
            )}

            {/* MSE info banner */}
            {assessmentType === "MSE" && (
                <div className="mt-4 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                        MSE max marks and CO mapping are auto-calculated from
                        the question breakdown in the next step.{" "}
                        <span className="font-semibold text-foreground">
                            Current total: {maxMarks}
                        </span>
                    </p>
                </div>
            )}
        </div>
    );
}
