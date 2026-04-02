"use client";

import React, { useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { IconTrash, IconEdit, IconPlus, IconUpload, IconSearch } from "@tabler/icons-react";
import {
  useAdminStudents,
  type AdminStudent,
  type AdminBulkImportResult,
} from "@/hooks/use-api";
import StudentForm from "@/components/admin/students/student-form";
import CSVUploadModal from "@/components/admin/students/csv-upload-modal";

type DialogState = "none" | "add" | "edit" | "delete" | "bulkImport";

export default function StudentsList() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [dialogState, setDialogState] = useState<DialogState>("none");
  const [selectedStudent, setSelectedStudent] = useState<AdminStudent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminStudent | null>(null);
  const [bulkImportSummary, setBulkImportSummary] = useState<AdminBulkImportResult | null>(null);

  const {
    students,
    loading,
    error,
    createStudent,
    updateStudent,
    deleteStudent,
    bulkImport,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkImporting,
  } = useAdminStudents(search, classFilter, batchFilter);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleAdd = () => {
    setSelectedStudent(null);
    setDialogState("add");
  };

  const handleEdit = (student: AdminStudent) => {
    setSelectedStudent(student);
    setDialogState("edit");
  };

  const handleDeleteClick = (student: AdminStudent) => {
    setDeleteTarget(student);
    setDialogState("delete");
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStudent(deleteTarget.pid);
      toast.success(`Student ${deleteTarget.stud_name} deleted successfully`);
      setDialogState("none");
      setDeleteTarget(null);
    } catch (error) {
      toast.error("Failed to delete student");
      console.error(error);
    }
  };

  const handleSaveStudent = async (data: {
    pid: string;
    stud_name: string;
    class_name: string;
    batch: string;
    roll_no: string;
    course: string;
    email_id: string;
    Academic_year: string;
  }) => {
    const normalized = {
      pid: Number(data.pid),
      stud_name: data.stud_name.trim(),
      class_name: data.class_name.trim(),
      batch: data.batch.trim() ? Number(data.batch) : null,
      roll_no: data.roll_no.trim() ? Number(data.roll_no) : null,
      course: data.course.trim() || null,
      email_id: data.email_id.trim() || null,
      Academic_year: data.Academic_year.trim() || null,
    };

    try {
      if (selectedStudent) {
        await updateStudent(normalized as AdminStudent);
        toast.success("Student updated successfully");
      } else {
        await createStudent({ ...normalized, pid: String(normalized.pid) });
        toast.success("Student added successfully");
      }
      setDialogState("none");
      setSelectedStudent(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save student");
      console.error(error);
    }
  };

  const handleBulkImportClick = () => {
    setBulkImportSummary(null);
    setDialogState("bulkImport");
  };

  const handleBulkImportSubmit = async (csvContent: string) => {
    try {
      const result = await bulkImport(csvContent);
      setBulkImportSummary(result);

      if (result.inserted > 0) {
        toast.success(`${result.inserted} students imported successfully`);
      }
      if (result.invalidRows > 0) {
        toast.error(`${result.invalidRows} rows rejected. Check summary for details.`);
      }

      if (result.invalidRows === 0) {
        setDialogState("none");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import students");
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Students</h2>
          <p className="text-sm text-muted-foreground">Manage student database</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleBulkImportClick} variant="outline" size="sm">
            <IconUpload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={handleAdd} size="sm">
            <IconPlus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or PID..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Input
              placeholder="Class (e.g., TE CMPN A)"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Batch"
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="flex-1"
              type="number"
            />
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Students ({students.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading students...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-destructive">{error}</p>
            </div>
          ) : students.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No students found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">PID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="w-12">Batch</TableHead>
                    <TableHead className="w-14">Roll No</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.pid}>
                      <TableCell className="font-medium">{student.pid}</TableCell>
                      <TableCell>{student.stud_name}</TableCell>
                      <TableCell>{student.class_name}</TableCell>
                      <TableCell>{student.batch || "-"}</TableCell>
                      <TableCell>{student.roll_no || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {student.email_id || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(student)}
                          >
                            <IconEdit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(student)}
                          >
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

      {/* Student Form Dialog */}
      {(dialogState === "add" || dialogState === "edit") && (
        <StudentForm
          student={selectedStudent}
          onSave={handleSaveStudent}
          onCancel={() => setDialogState("none")}
          isLoading={isCreating || isUpdating}
        />
      )}

      {/* CSV Upload Modal */}
      {dialogState === "bulkImport" && (
        <CSVUploadModal
          onSubmit={handleBulkImportSubmit}
          onCancel={() => setDialogState("none")}
          isLoading={isBulkImporting}
          summary={bulkImportSummary}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={dialogState === "delete"} onOpenChange={() => setDialogState("none")}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.stud_name}</strong> (PID:{" "}
              {deleteTarget?.pid})? This action cannot be undone.
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
