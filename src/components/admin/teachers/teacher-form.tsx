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
import { type AdminTeacher } from "@/hooks/use-api";

type TeacherFormValues = {
  teacher_id: string;
  teacher_name: string;
  designation: string;
  department: string;
  email: string;
};

interface TeacherFormProps {
  teacher: AdminTeacher | null;
  onSave: (data: TeacherFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export default function TeacherForm({
  teacher,
  onSave,
  onCancel,
  isLoading,
}: TeacherFormProps) {
  const form = useForm<TeacherFormValues>({
    defaultValues: {
      teacher_id: teacher?.teacher_id.toString() || "",
      teacher_name: teacher?.teacher_name || "",
      designation: teacher?.designation || "",
      department: teacher?.department || "",
      email: teacher?.email || "",
    },
  });

  const isEdit = !!teacher;

  const handleSubmit = async (data: TeacherFormValues) => {
    try {
      await onSave(data);
      form.reset();
    } catch {
      // handled in parent
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Teacher" : "Add New Teacher"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update teacher details"
              : "Register a new teacher in the admin directory"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="teacher_id"
                rules={{
                  required: "Teacher ID is required",
                  pattern: {
                    value: /^\d+$/,
                    message: "Teacher ID must be a number",
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teacher ID *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="1001"
                        {...field}
                        disabled={isEdit}
                        type="number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="teacher_name"
                rules={{ required: "Teacher name is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teacher Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Prof. Sharma" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="designation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Assistant Professor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Computer Engineering" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                rules={{
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address",
                  },
                }}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., teacher@sfit.ac.in" {...field} type="email" />
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
                    <span className="mr-2 animate-spin">⏳</span>
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