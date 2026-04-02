"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconAlertCircle, IconCircleCheck, IconUpload } from "@tabler/icons-react";
import { toast } from "sonner";
import { type AdminBulkImportResult } from "@/hooks/use-api";

interface CSVUploadModalProps {
  onSubmit: (csvContent: string) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  summary: AdminBulkImportResult | null;
}

interface ValidateResult {
  valid: boolean;
  headers?: string[];
  missingHeaders?: string[];
}

export default function CSVUploadModal({
  onSubmit,
  onCancel,
  isLoading,
  summary,
}: CSVUploadModalProps) {
  const [csvContent, setCsvContent] = useState("");
  const [fileName, setFileName] = useState("");

  const expectedHeaders = [
    "pid",
    "stud_name",
    "class_name",
    "batch",
    "roll_no",
    "course",
    "email_id",
    "Academic_year",
  ];

  const validateCSV = (content: string): ValidateResult => {
    if (!content.trim()) {
      return { valid: false };
    }

    const lines = content.split("\n").filter((line) => line.trim());
    if (lines.length === 0) {
      return { valid: false };
    }

    const headerRow = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const missingHeaders = expectedHeaders.filter((h) => !headerRow.includes(h));

    return {
      valid: missingHeaders.length === 0,
      headers: headerRow,
      missingHeaders,
    };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    setFileName(file.name);
    try {
      const content = await file.text();
      setCsvContent(content);
    } catch {
      toast.error("Failed to read file");
    }
  };

  const handleSubmit = async () => {
    const result = validateCSV(csvContent);
    if (!result.valid) {
      toast.error(
        `Invalid CSV headers. Expected: ${expectedHeaders.join(", ")}`
      );
      return;
    }

    if (!csvContent.trim()) {
      toast.error("Please select a CSV file");
      return;
    }

    try {
      await onSubmit(csvContent);
      setCsvContent("");
      setFileName("");
    } catch {
      // Error handled by parent
    }
  };

  const result = validateCSV(csvContent);

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Students from CSV</DialogTitle>
          <DialogDescription>
            Student upload should contain all fields from student schema: pid, stud_name, class_name, batch, roll_no, course, email_id, Academic_year.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Expected Headers */}
          <div className="border border-blue-200 bg-blue-50 p-4 rounded-lg">
            <div className="flex gap-3">
              <IconAlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <div className="font-semibold text-blue-900">Expected CSV columns:</div>
                <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                  {expectedHeaders.map((header) => (
                    <div key={header} className="flex items-center gap-2">
                      <span className="text-blue-600">•</span>
                      <code className="bg-blue-100 px-2 py-1 rounded text-blue-900">{header}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* File Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select CSV File</label>
            <div className="relative">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={isLoading}
                className="cursor-pointer"
              />
              <IconUpload className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            {fileName && (
              <p className="text-xs text-muted-foreground">
                Selected: <span className="font-medium">{fileName}</span>
              </p>
            )}
          </div>

          {/* CSV Content Preview */}
          {csvContent && (
            <div className="space-y-2">
              <label className="text-sm font-medium">CSV Preview</label>
              <div className="bg-muted p-3 rounded border border-border max-h-40 overflow-auto font-mono text-xs">
                {csvContent.split("\n").slice(0, 5).map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap break-words">
                    {line}
                  </div>
                ))}
                {csvContent.split("\n").length > 5 && (
                  <div className="text-muted-foreground">
                    ... and {csvContent.split("\n").length - 5} more lines
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Validation Result */}
          {csvContent && (
            <div
              className={
                result.valid
                  ? "border-2 border-green-200 bg-green-50 rounded-lg p-4"
                  : "border-2 border-red-200 bg-red-50 rounded-lg p-4"
              }
            >
              <div className="flex items-start gap-3">
                {result.valid ? (
                  <>
                    <IconCircleCheck className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-green-900">Valid CSV Format</div>
                      <div className="space-y-2 text-sm text-green-800 mt-2">
                        <div className="flex gap-4">
                          <div>
                            <span className="font-medium">
                              {csvContent.split("\n").filter((l) => l.trim()).length - 1}
                            </span>
                            <span className="ml-2">rows to import</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <IconAlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-red-900">Invalid CSV Format</div>
                      <div className="space-y-2 text-sm text-red-800 mt-2">
                        <div>
                          <span className="font-medium">Missing columns:</span>
                          <div className="ml-4 mt-1">
                            {result.missingHeaders?.map((h) => (
                              <div key={h}>• {h}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upload Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>Total rows: <span className="font-medium">{summary.totalRows}</span></div>
                  <div>Valid rows: <span className="font-medium text-green-700">{summary.validRows}</span></div>
                  <div>Invalid rows: <span className="font-medium text-red-700">{summary.invalidRows}</span></div>
                  <div>Inserted: <span className="font-medium">{summary.inserted}</span></div>
                </div>

                {summary.rowErrors.length > 0 && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3">
                    <p className="font-medium text-red-900">Row-level errors</p>
                    <div className="mt-2 max-h-40 overflow-auto space-y-1 text-red-800">
                      {summary.rowErrors.map((rowErr, index) => (
                        <p key={`${rowErr.rowNumber}-${index}`}>
                          Row {rowErr.rowNumber}: {rowErr.error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !result.valid || !csvContent.trim()}
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Importing...
              </>
            ) : (
              <>
                <IconUpload className="mr-2 h-4 w-4" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
