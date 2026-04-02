"use client";

import React from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type AdminStudent } from "@/hooks/use-api";

type StudentFormValues = {
  pid: string;
  stud_name: string;
  class_name: string;
  batch: string;
  roll_no: string;
  course: string;
  email_id: string;
  Academic_year: string;
};

interface StudentFormProps {
  student: AdminStudent | null;
  onSave: (data: StudentFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export default function StudentForm({
  student,
  onSave,
  onCancel,
  isLoading,
}: StudentFormProps) {
  const form = useForm<StudentFormValues>({
    defaultValues: {
      pid: student?.pid.toString() || "",
      stud_name: student?.stud_name || "",
      class_name: student?.class_name || "",
      batch: student?.batch?.toString() || "",
      roll_no: student?.roll_no?.toString() || "",
      course: student?.course || "",
      email_id: student?.email_id || "",
      Academic_year: student?.Academic_year || "",
    },
  });

  const isEdit = !!student;

  const handleSubmit = async (data: StudentFormValues) => {
    try {
      await onSave(data);
      form.reset();
    } catch {
      // Error handled by parent
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Student" : "Add New Student"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update student information"
              : "Add a new student to the database"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* PID */}
              <FormField
                control={form.control}
                name="pid"
                rules={{
                  required: "PID is required",
                  pattern: {
                    value: /^\d+$/,
                    message: "PID must be a number",
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PID *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="12345"
                        {...field}
                        disabled={isEdit}
                        type="number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Student Name */}
              <FormField
                control={form.control}
                name="stud_name"
                rules={{ required: "Student name is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Class */}
              <FormField
                control={form.control}
                name="class_name"
                rules={{ required: "Class is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., TE CMPN A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Batch */}
              <FormField
                control={form.control}
                name="batch"
                rules={{
                  pattern: {
                    value: /^\d*$/,
                    message: "Batch must be a number",
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 1"
                        {...field}
                        type="number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Roll No */}
              <FormField
                control={form.control}
                name="roll_no"
                rules={{
                  pattern: {
                    value: /^\d*$/,
                    message: "Roll No must be a number",
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roll No</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 101"
                        {...field}
                        type="number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Course */}
              <FormField
                control={form.control}
                name="course"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Computer Engineering"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email_id"
                rules={{
                  pattern: {
                    value: /^[^\s@]*@?[^\s@]*$/,
                    message: "Enter a valid email",
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., john@example.com"
                        {...field}
                        type="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Academic Year */}
              <FormField
                control={form.control}
                name="Academic_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic Year</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 2023-2024"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    {isEdit ? "Updating..." : "Adding..."}
                  </>
                ) : isEdit ? (
                  "Update"
                ) : (
                  "Add"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
