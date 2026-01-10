"use client";

import { FilterState } from "@/lib/types";
import {
    SEMESTERS,
    SUBJECTS_DATA,
    CLASSES,
    BATCHES,
} from "@/app/teacher/assignments/create/constants";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface FilterBarProps {
    filter: FilterState;
    setFilter: (filter: FilterState) => void;
    onClear: () => void;
}

export function FilterBar({ filter, setFilter, onClear }: FilterBarProps) {
    return (
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/50 rounded-lg border">
            <div className="w-[200px]">
                <Select
                    value={filter.semester}
                    onValueChange={(val) =>
                        setFilter({ ...filter, semester: val, subjectCode: "" })
                    }
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Semester" />
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

            <div className="w-[200px]">
                <Select
                    value={filter.subjectCode}
                    onValueChange={(val) => setFilter({ ...filter, subjectCode: val })}
                    disabled={!filter.semester}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent>
                        {filter.semester &&
                            SUBJECTS_DATA[filter.semester as keyof typeof SUBJECTS_DATA]?.map(
                                (s) => (
                                    <SelectItem key={s.code} value={s.code}>
                                        {s.fullName} ({s.type})
                                    </SelectItem>
                                )
                            )}
                    </SelectContent>
                </Select>
            </div>

            <div className="w-[200px]">
                <Select
                    value={filter.classStr}
                    onValueChange={(val) => setFilter({ ...filter, classStr: val })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                        {CLASSES.map((cls) => (
                            <SelectItem key={cls} value={cls}>
                                {cls}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="w-[200px]">
                <Select
                    value={filter.batch}
                    onValueChange={(val) => setFilter({ ...filter, batch: val })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Batch" />
                    </SelectTrigger>
                    <SelectContent>
                        {BATCHES.map((batch) => (
                            <SelectItem key={batch} value={batch}>
                                Batch {batch}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Button
                variant="ghost"
                size="icon"
                onClick={onClear}
                className="ml-auto"
                title="Clear Filters"
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}