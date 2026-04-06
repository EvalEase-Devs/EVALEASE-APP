"use client";

import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import { IconEdit, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import TeacherForm from "@/components/admin/teachers/teacher-form";
import { useAdminTeachers, type AdminTeacher } from "@/hooks/use-api";

type DialogState = "none" | "add" | "edit";

export default function TeachersList() {
  const [search, setSearch] = useState("");
  const [dialogState, setDialogState] = useState<DialogState>("none");
  const [selectedTeacher, setSelectedTeacher] = useState<AdminTeacher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminTeacher | null>(null);

  const {
    teachers,
    loading,
    error,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    isCreating,
    isUpdating,
    isDeleting,
  } = useAdminTeachers(search);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleAdd = () => {
    setSelectedTeacher(null);
    setDialogState("add");
  };

  const handleEdit = (teacher: AdminTeacher) => {
    setSelectedTeacher(teacher);
    setDialogState("edit");
  };

  const handleDeleteClick = (teacher: AdminTeacher) => {
    setDeleteTarget(teacher);
  };

  const handleSaveTeacher = async (data: {
    teacher_id: string;
    teacher_name: string;
    designation: string;
    department: string;
    email: string;
  }) => {
    const normalized = {
      teacher_id: Number(data.teacher_id),
      teacher_name: data.teacher_name.trim(),
      designation: data.designation.trim() || null,
      department: data.department.trim() || null,
      email: data.email.trim() || null,
    };

    try {
      if (selectedTeacher) {
        await updateTeacher(normalized as AdminTeacher);
        toast.success("Teacher updated successfully");
      } else {
        await createTeacher({ ...normalized, teacher_id: String(normalized.teacher_id) });
        toast.success("Teacher added successfully");
      }
      setDialogState("none");
      setSelectedTeacher(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save teacher");
      console.error(error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteTeacher(deleteTarget.teacher_id);
      toast.success(`Teacher ${deleteTarget.teacher_name} deleted successfully`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete teacher");
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Teachers</h2>
          <p className="text-sm text-muted-foreground">Manage faculty records and contact details</p>
        </div>
        <Button onClick={handleAdd} size="sm">
          <IconPlus className="mr-2 h-4 w-4" />
          Add Teacher
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search Teachers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-xl">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, department, designation, or ID..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Teachers ({teachers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading teachers...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-destructive">{error}</p>
            </div>
          ) : teachers.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No teachers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher.teacher_id}>
                      <TableCell className="font-medium">{teacher.teacher_id}</TableCell>
                      <TableCell>{teacher.teacher_name}</TableCell>
                      <TableCell>
                        {teacher.designation ? (
                          <Badge variant="secondary">{teacher.designation}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{teacher.department || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{teacher.email || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(teacher)}>
                            <IconEdit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(teacher)}>
                            <IconTrash className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {(dialogState === "add" || dialogState === "edit") && (
        <TeacherForm
          teacher={selectedTeacher}
          onSave={handleSaveTeacher}
          onCancel={() => setDialogState("none")}
          isLoading={isCreating || isUpdating}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.teacher_name}</strong> (ID: {deleteTarget?.teacher_id})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}