"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SUBJECT_MAP, SEMESTERS, CLASSES, BATCHES } from "@/app/teacher/assignments/create/constants";
import type { Semester, AllottedSubject } from "./create-assignment-content";

interface SubjectFilterBarProps {
    onAllot: (allotment: Omit<AllottedSubject, "id" | "allotment_id">) => Promise<void>;
    onClose: () => void;
}

export function SubjectFilterBar({ onAllot, onClose }: SubjectFilterBarProps) {
    const [selectedSemester, setSelectedSemester] = useState<Semester | "">("");
    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedBatch, setSelectedBatch] = useState("");
    const [isIncharge, setIsIncharge] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Extract subject type from selection
    const getSubjectType = (): 'Lec' | 'Lab' => {
        if (selectedSubject.includes('(Lab)')) return 'Lab';
        return 'Lec';
    };

    // Extract subject code from selection
    const getSubjectCode = (): string => {
        return selectedSubject.split(' ')[0];
    };

    const handleAllot = async () => {
        if (!selectedSemester || !selectedSubject || !selectedClass || !selectedBatch) {
            toast.error("Please fill all fields");
            return;
        }

        setIsLoading(true);
        try {
            await onAllot({
                semester: selectedSemester,
                subject: selectedSubject,
                class: selectedClass,
                batch: selectedBatch,
                isIncharge,
                sub_id: getSubjectCode(),
                type: getSubjectType()
            });

            // Reset form
            setSelectedSemester("");
            setSelectedSubject("");
            setSelectedClass("");
            setSelectedBatch("");
            setIsIncharge(false);
        } catch (error) {
            // Error is handled in parent
        } finally {
            setIsLoading(false);
        }
    };

    const availableSubjects =
        selectedSemester && selectedSemester in SUBJECT_MAP
            ? SUBJECT_MAP[selectedSemester]
            : [];

    return (
        <Card className="p-6 bg-muted/50">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Semester Select */}
                    <div className="space-y-2">
                        <Label htmlFor="semester">Semester</Label>
                        <Select
                            value={selectedSemester}
                            onValueChange={(value) => {
                                setSelectedSemester(value as Semester);
                                setSelectedSubject("");
                            }}
                        >
                            <SelectTrigger id="semester">
                                <SelectValue placeholder="Select Semester" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {SEMESTERS.map((sem) => (
                                    <SelectItem key={sem} value={sem} className="cursor-pointer">
                                        {sem}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Subject Select (Cascading) */}
                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Select
                            value={selectedSubject}
                            onValueChange={setSelectedSubject}
                            disabled={!selectedSemester}
                        >
                            <SelectTrigger id="subject">
                                <SelectValue placeholder="Select Subject" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {availableSubjects.map((subject: any) => {
                                    const typeLabel = subject.type === 'Lab' ? 'Lab' : 'Lec';
                                    const subjectString = `${subject.code} ${subject.fullName} (${typeLabel})`;
                                    return (
                                        <SelectItem key={subject.code} value={subjectString} className="cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <span>{subject.code} {subject.fullName}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${subject.type === 'Lab' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {typeLabel}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Class Select */}
                    <div className="space-y-2">
                        <Label htmlFor="class">Class</Label>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger id="class">
                                <SelectValue placeholder="Select Class" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {CLASSES.map((cls) => (
                                    <SelectItem key={cls} value={cls} className="cursor-pointer">
                                        {cls}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Batch Select */}
                    <div className="space-y-2">
                        <Label htmlFor="batch">Batch</Label>
                        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                            <SelectTrigger id="batch">
                                <SelectValue placeholder="Select Batch" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {BATCHES.map((batch) => (
                                    <SelectItem key={batch} value={batch} className="cursor-pointer">
                                        {batch}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Allot Button */}
                    <div className="space-y-2">
                        <Label>&nbsp;</Label>
                        <Button onClick={handleAllot} className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <ArrowRight className="mr-2 h-4 w-4" />
                            )}
                            {isLoading ? 'Allotting...' : 'Allot'}
                        </Button>
                    </div>
                </div>

                {/* Incharge Checkbox */}
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="incharge"
                        checked={isIncharge}
                        onCheckedChange={(checked) => setIsIncharge(checked as boolean)}
                    />
                    <Label
                        htmlFor="incharge"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Designate as Subject Incharge?
                    </Label>
                </div>
            </div>
        </Card>
    );
}
