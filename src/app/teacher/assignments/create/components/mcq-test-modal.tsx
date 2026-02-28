"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { IconPlus, IconTrash, IconDeviceFloppy } from "@tabler/icons-react";
import { Question } from "@/lib/types";

interface MCQTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (testData: any) => void;
}

export function MCQTestModal({ isOpen, onClose, onSubmit }: MCQTestModalProps) {
    const [title, setTitle] = useState("");
    const [duration, setDuration] = useState("60");
    const [totalMarks, setTotalMarks] = useState("20");
    const [questions, setQuestions] = useState<Question[]>([
        {
            id: "1",
            text: "",
            options: ["", "", "", ""],
            correctOptionIndex: 0,
            marks: 1,
        },
    ]);

    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                id: (questions.length + 1).toString(),
                text: "",
                options: ["", "", "", ""],
                correctOptionIndex: 0,
                marks: 1,
            },
        ]);
    };

    const removeQuestion = (index: number) => {
        if (questions.length > 1) {
            const newQuestions = [...questions];
            newQuestions.splice(index, 1);
            setQuestions(newQuestions);
        }
    };

    const updateQuestion = (index: number, field: keyof Question, value: any) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        const newOptions = [...newQuestions[qIndex].options];
        newOptions[oIndex] = value;
        newQuestions[qIndex] = { ...newQuestions[qIndex], options: newOptions };
        setQuestions(newQuestions);
    };

    const handleSubmit = () => {
        onSubmit({
            title,
            duration: parseInt(duration),
            totalMarks: parseInt(totalMarks),
            questions,
            type: "mcq",
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Create MCQ Test</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="space-y-2">
                        <Label>Test Title</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Unit Test 1"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Duration (minutes)</Label>
                        <Input
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Total Marks</Label>
                        <Input
                            type="number"
                            value={totalMarks}
                            onChange={(e) => setTotalMarks(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-4">
                    <div className="space-y-6">
                        {questions.map((q, qIndex) => (
                            <div key={q.id} className="p-4 border rounded-lg space-y-4">
                                <div className="flex justify-between items-start">
                                    <Label className="text-base font-semibold">
                                        Question {qIndex + 1}
                                    </Label>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeQuestion(qIndex)}
                                        disabled={questions.length === 1}
                                    >
                                        <IconTrash size={16} className="text-destructive" />
                                    </Button>
                                </div>

                                <textarea
                                    placeholder="Enter question text"
                                    value={q.text}
                                    onChange={(e) => updateQuestion(qIndex, "text", e.target.value)}
                                    className="w-full min-h-24 px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    {q.options.map((option, oIndex) => (
                                        <div key={oIndex} className="flex gap-2 items-center">
                                            <RadioGroup
                                                value={q.correctOptionIndex.toString()}
                                                onValueChange={(val: string) =>
                                                    updateQuestion(qIndex, "correctOptionIndex", parseInt(val))
                                                }
                                            >
                                                <RadioGroupItem
                                                    value={oIndex.toString()}
                                                    id={`q${qIndex}-opt${oIndex}`}
                                                />
                                            </RadioGroup>
                                            <Input
                                                placeholder={`Option ${oIndex + 1}`}
                                                value={option}
                                                onChange={(e) =>
                                                    updateOption(qIndex, oIndex, e.target.value)
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2 w-32">
                                    <Label>Marks</Label>
                                    <Input
                                        type="number"
                                        value={q.marks}
                                        onChange={(e) =>
                                            updateQuestion(qIndex, "marks", parseInt(e.target.value))
                                        }
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter className="mt-4 gap-2">
                    <Button variant="outline" onClick={addQuestion} className="w-full sm:w-auto">
                        <IconPlus size={16} className="mr-2" /> Add Question
                    </Button>
                    <div className="flex-1" />
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        <IconDeviceFloppy size={16} className="mr-2" /> Save Test
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}