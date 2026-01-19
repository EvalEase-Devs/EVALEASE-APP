"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBatchMarksReport } from "@/hooks/use-api";
import { IconDownload, IconFileSpreadsheet, IconDeviceFloppy } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface BatchMarksReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allotmentId: number;
  subjectName: string;
  className: string;
  batch: string;
}

export function BatchMarksReportModal({
  open,
  onOpenChange,
  allotmentId,
  subjectName,
  className,
  batch,
}: BatchMarksReportModalProps) {
  const { data, loading, error } = useBatchMarksReport(open ? allotmentId : null);
  const [editedMarks, setEditedMarks] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  // Reset edited marks when modal closes or data changes
  useEffect(() => {
    if (!open) {
      setEditedMarks({});
    }
  }, [open]);

  const handleMarkChange = (pid: number, expNo: number, value: string) => {
    const key = `${pid}-${expNo}`;
    const numValue = parseFloat(value);
    
    if (value === "" || isNaN(numValue)) {
      const newEdited = { ...editedMarks };
      delete newEdited[key];
      setEditedMarks(newEdited);
    } else {
      setEditedMarks({ ...editedMarks, [key]: numValue });
    }
  };

  const getMarkValue = (pid: number, expNo: number): number | undefined => {
    const key = `${pid}-${expNo}`;
    if (editedMarks[key] !== undefined) {
      return editedMarks[key];
    }
    return data?.marksMatrix[pid]?.[expNo]?.marks;
  };

  const handleSaveMarks = async () => {
    if (Object.keys(editedMarks).length === 0) {
      toast.info("No changes to save");
      return;
    }

    setSaving(true);
    try {
      // Prepare marks updates
      const updates = Object.entries(editedMarks).map(([key, marks]) => {
        const [pid, expNo] = key.split("-").map(Number);
        const originalMark = data?.marksMatrix[pid]?.[expNo];
        
        return {
          marksId: originalMark?.mark_id,
          marks,
        };
      }).filter(update => update.marksId);

      // Send updates to API
      for (const update of updates) {
        const response = await fetch(`/api/marks/${update.marksId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ total_marks_obtained: update.marks }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Failed to update marks:", errorData);
          throw new Error(errorData.error || "Failed to update marks");
        }
      }

      toast.success("Marks updated successfully");
      setEditedMarks({});
      
      // Optionally refresh the data
      window.location.reload();
    } catch (err) {
      console.error("Error saving marks:", err);
      toast.error("Failed to save marks");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!data || !data.experiments.length) {
      toast.error("No data to download");
      return;
    }

    try {
      // Prepare data for Excel
      const excelData: any[] = [];

      // Header row 1: Experiment names
      const headerRow1 = ["PID", "Name", "Roll No"];
      data.experiments.forEach((exp) => {
        headerRow1.push(`EXP ${exp.exp_no}`);
      });
      headerRow1.push("Total");
      excelData.push(headerRow1);

      // Header row 2: COs
      const headerRow2 = ["", "", ""];
      data.experiments.forEach((exp) => {
        headerRow2.push(exp.cos.join(", ") || "-");
      });
      headerRow2.push("");
      excelData.push(headerRow2);

      // Data rows
      data.students.forEach((student) => {
        const row = [
          student.pid,
          student.stud_name,
          student.roll_no || "-",
        ];

        let totalMarks = 0;
        let totalMaxMarks = 0;

        data.experiments.forEach((exp) => {
          const mark = data.marksMatrix[student.pid]?.[exp.exp_no];
          if (mark) {
            row.push(`${mark.marks}/${mark.max_marks}`);
            totalMarks += mark.marks;
            totalMaxMarks += mark.max_marks;
          } else {
            row.push("-");
          }
        });

        row.push(totalMaxMarks > 0 ? `${totalMarks}/${totalMaxMarks}` : "-");
        excelData.push(row);
      });

      // Create workbook
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Marks Report");

      // Add metadata sheet
      const metaData = [
        ["Subject", subjectName],
        ["Class", className],
        ["Batch", batch],
        ["Generated On", new Date().toLocaleDateString()],
        ["Total Students", data.students.length],
        ["Total Experiments", data.experiments.length],
      ];
      const metaWs = XLSX.utils.aoa_to_sheet(metaData);
      XLSX.utils.book_append_sheet(wb, metaWs, "Info");

      // Download
      const fileName = `${subjectName}_${className}_${batch}_Marks.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success("Excel file downloaded successfully");
    } catch (err) {
      console.error("Error downloading Excel:", err);
      toast.error("Failed to download Excel file");
    }
  };

  const calculateTotal = (pid: number) => {
    if (!data) return { total: 0, max: 0 };
    
    let total = 0;
    let max = 0;

    data.experiments.forEach((exp) => {
      const mark = data.marksMatrix[pid]?.[exp.exp_no];
      if (mark) {
        total += mark.marks;
        max += mark.max_marks;
      }
    });

    return { total, max };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>Batch Marks Report</span>
            <div className="flex gap-2">
              {Object.keys(editedMarks).length > 0 && (
                <Button
                  onClick={handleSaveMarks}
                  disabled={saving}
                  size="sm"
                  variant="default"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <IconDeviceFloppy className="mr-2 h-4 w-4" />
                  )}
                  Save Changes ({Object.keys(editedMarks).length})
                </Button>
              )}
              <Button
                onClick={handleDownloadExcel}
                disabled={loading || !data?.experiments.length}
                size="sm"
                variant="outline"
              >
                <IconDownload className="mr-2 h-4 w-4" />
                Download Excel
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            {subjectName} • {className} • {batch}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12 px-6 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="text-center py-8 px-6 text-destructive flex-1">
            Error: {error}
          </div>
        )}

        {!loading && !error && data && (
          <div className="flex flex-col gap-4 px-6 pb-6 overflow-hidden flex-1">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 flex-shrink-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.students.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Experiments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.experiments.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.values(data.marksMatrix).reduce(
                      (sum, studentMarks) => sum + Object.keys(studentMarks).length,
                      0
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Marks Table */}
            {data.experiments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground flex-1">
                No lab tasks have been created yet
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden flex-1 min-h-0">
                <ScrollArea className="h-full">
                  <div className="min-w-max">
                    <Table>
                      <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10 w-[100px]">
                          PID
                        </TableHead>
                        <TableHead className="sticky left-[100px] bg-background z-10 min-w-[180px]">
                          Name
                        </TableHead>
                        <TableHead className="sticky left-[280px] bg-background z-10 w-[80px]">
                          Roll
                        </TableHead>
                        {data.experiments.map((exp) => (
                          <TableHead key={exp.exp_no} className="text-center min-w-[150px]">
                            <div className="font-semibold">EXP {exp.exp_no}</div>
                            <div className="flex gap-1 justify-center mt-1 flex-wrap">
                              {exp.cos.map((co) => (
                                <Badge key={co} variant="secondary" className="text-xs">
                                  {co}
                                </Badge>
                              ))}
                            </div>
                          </TableHead>
                        ))}
                        <TableHead className="text-center font-semibold w-[100px]">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.students.map((student) => {
                        const totals = calculateTotal(student.pid);
                        return (
                          <TableRow key={student.pid}>
                            <TableCell className="sticky left-0 bg-background font-medium">
                              {student.pid}
                            </TableCell>
                            <TableCell className="sticky left-[100px] bg-background">
                              {student.stud_name}
                            </TableCell>
                            <TableCell className="sticky left-[280px] bg-background">
                              {student.roll_no || "-"}
                            </TableCell>
                            {data.experiments.map((exp) => {
                              const mark = data.marksMatrix[student.pid]?.[exp.exp_no];
                              const currentValue = getMarkValue(student.pid, exp.exp_no);
                              const isEdited = editedMarks[`${student.pid}-${exp.exp_no}`] !== undefined;
                              
                              return (
                                <TableCell key={exp.exp_no} className="text-center">
                                  {mark ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <Input
                                        type="number"
                                        value={currentValue ?? ""}
                                        onChange={(e) => handleMarkChange(student.pid, exp.exp_no, e.target.value)}
                                        className={`w-16 h-8 text-center ${
                                          isEdited ? 'border-yellow-500 bg-yellow-50' : ''
                                        }`}
                                        min={0}
                                        max={mark.max_marks}
                                        step={0.5}
                                      />
                                      <span className="text-muted-foreground">/ {mark.max_marks}</span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center font-semibold">
                              {totals.max > 0 ? (
                                <span>{totals.total}/{totals.max}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
