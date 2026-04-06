"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { IconDatabase, IconEdit, IconPlus, IconTrash, IconUpload } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUBJECTS_DATA } from "@/app/teacher/assignments/create/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  AdminCO,
  AdminExperiment,
  AdminLO,
  AdminObeUploadResult,
  AdminExperimentMapping,
  AdminTaskMapping,
  useAdminCOs,
  useAdminExperiments,
  useAdminExperimentLOMappings,
  useAdminLOs,
  useAdminTaskCOMappings,
} from "@/hooks/use-api";

type SubjectOption = {
  code: string;
  fullName: string;
  type: "Lec" | "Lab";
};

const SUBJECT_GROUPS = Object.values(SUBJECTS_DATA) as ReadonlyArray<ReadonlyArray<SubjectOption>>;

const BASE_SUBJECT_OPTIONS: SubjectOption[] = SUBJECT_GROUPS.flatMap((subjects) => subjects).reduce<SubjectOption[]>(
  (acc, subject) => {
    if (!acc.some((item) => item.code === subject.code)) {
      acc.push({ code: subject.code, fullName: subject.fullName, type: subject.type });
    }
    return acc;
  },
  []
);

const LECTURE_SUBJECT_OPTIONS = BASE_SUBJECT_OPTIONS
  .filter((subject) => subject.type === "Lec")
  .sort((a, b) => a.code.localeCompare(b.code));

const LAB_SUBJECT_OPTIONS = BASE_SUBJECT_OPTIONS
  .filter((subject) => subject.type === "Lab")
  .sort((a, b) => a.code.localeCompare(b.code));

function parseCsvForPreview(csvContent: string): string[][] {
  const content = csvContent.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = index + 1 < content.length ? content[index + 1] : "";

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      currentRow.push(currentValue.trim());
      currentValue = "";

      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentValue += char;
  }

  currentRow.push(currentValue.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

function NumberBadgeList({ values }: { values: number[] }) {
  if (!values.length) {
    return <span className="text-xs text-muted-foreground">None</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {values.map((value) => (
        <Badge key={value} variant="secondary">
          {value}
        </Badge>
      ))}
    </div>
  );
}

function CsvUploadDialog({
  open,
  title,
  description,
  template,
  loading,
  onOpenChange,
  onUpload,
}: {
  open: boolean;
  title: string;
  description: string;
  template: string;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (csvContent: string) => Promise<AdminObeUploadResult>;
}) {
  const [csvContent, setCsvContent] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isReadingFile, setIsReadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parsedRows = useMemo(() => parseCsvForPreview(csvContent), [csvContent]);
  const previewRows = parsedRows.slice(0, 6);
  const expectedColumns = template
    .split(/\r?\n/)[0]
    ?.split(",")
    .map((column) => column.trim())
    .filter(Boolean);

  const handleUpload = async () => {
    if (!csvContent.trim()) {
      toast.error("Paste CSV content before uploading");
      return;
    }

    try {
      const result = await onUpload(csvContent);
      toast.success(`Upload complete. Inserted ${result.inserted} rows.`);

      if (result.rowErrors.length > 0) {
        toast.error(`${result.invalidRows} rows were rejected. Check CSV and retry.`);
      }

      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    }
  };

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsReadingFile(true);
    try {
      const text = await file.text();
      if (!text.trim()) {
        toast.error("Selected file is empty");
        setSelectedFileName("");
        return;
      }

      setCsvContent(text);
      setSelectedFileName(file.name);
      toast.success(`Loaded ${file.name}`);
    } catch {
      toast.error("Failed to read CSV file");
      setSelectedFileName("");
    } finally {
      setIsReadingFile(false);
      event.target.value = "";
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setCsvContent("");
          setSelectedFileName("");
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">Expected CSV format</p>
          <div className="flex flex-wrap gap-2 rounded-md border bg-muted/40 p-3">
            {expectedColumns?.map((column) => (
              <Badge key={column} variant="secondary">
                {column}
              </Badge>
            ))}
          </div>
          <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{template}</pre>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-medium">CSV Content</label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button type="button" variant="outline" size="sm" onClick={handleSelectFile} disabled={isReadingFile || loading}>
                {isReadingFile ? "Reading..." : "Upload CSV File"}
              </Button>
            </div>
          </div>
          {selectedFileName ? (
            <p className="text-xs text-muted-foreground">Selected file: {selectedFileName}</p>
          ) : null}
          <Textarea
            value={csvContent}
            onChange={(event) => setCsvContent(event.target.value)}
            rows={10}
            placeholder={template}
          />
        </div>

        {previewRows.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Preview before upload</p>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewRows[0].map((column, index) => (
                      <TableHead key={`preview-head-${index}`}>{column || `Column ${index + 1}`}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.slice(1).map((row, rowIndex) => (
                    <TableRow key={`preview-row-${rowIndex}`}>
                      {previewRows[0].map((_, cellIndex) => (
                        <TableCell key={`preview-cell-${rowIndex}-${cellIndex}`}>
                          {row[cellIndex] || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedRows.length > 6 ? (
              <p className="text-xs text-muted-foreground">Showing first 5 rows out of {parsedRows.length - 1} data rows.</p>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleUpload} disabled={loading}>
            {loading ? "Uploading..." : "Upload CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CoTaskSection() {
  const [subjectCode, setSubjectCode] = useState("");
  const [coDialogOpen, setCoDialogOpen] = useState(false);
  const [coNumber, setCoNumber] = useState("");
  const [coDescription, setCoDescription] = useState("");
  const [editingCo, setEditingCo] = useState<AdminCO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCO | null>(null);
  const [mappingTarget, setMappingTarget] = useState<AdminTaskMapping | null>(null);
  const [selectedCoNos, setSelectedCoNos] = useState<number[]>([]);
  const [coUploadOpen, setCoUploadOpen] = useState(false);



  const {
    cos,
    loading: cosLoading,
    error: cosError,
    createCO,
    updateCO,
    deleteCO,
    uploadCOs,
    isCreating: isCreatingCo,
    isUpdating: isUpdatingCo,
    isDeleting: isDeletingCo,
    isUploading: isUploadingCo,
  } = useAdminCOs(subjectCode);

  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    saveTaskMapping,
    isSaving: isSavingTaskMapping,
  } = useAdminTaskCOMappings(subjectCode);

  useEffect(() => {
    if (editingCo) {
      setCoNumber(String(editingCo.co_no));
      setCoDescription(editingCo.co_description);
    } else {
      setCoNumber("");
      setCoDescription("");
    }
  }, [editingCo]);

  useEffect(() => {
    if (mappingTarget) {
      setSelectedCoNos(mappingTarget.mapped_cos || []);
    } else {
      setSelectedCoNos([]);
    }
  }, [mappingTarget]);

  const loadedTasks = tasks.filter((task) => task.task_type === "Lec" || task.assessment_type !== null);

  const openAddCoDialog = () => {
    if (!subjectCode) {
      toast.error("Load a subject code first");
      return;
    }

    setEditingCo(null);
    setCoDialogOpen(true);
  };

  const openEditCoDialog = (co: AdminCO) => {
    setEditingCo(co);
    setCoDialogOpen(true);
  };

  const closeCoDialog = () => {
    setCoDialogOpen(false);
    setEditingCo(null);
    setCoNumber("");
    setCoDescription("");
  };

  const handleSaveCo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const numberValue = Number(coNumber);
    const descriptionValue = coDescription.trim();

    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      toast.error("CO number must be a positive number");
      return;
    }

    if (!descriptionValue) {
      toast.error("CO description is required");
      return;
    }

    try {
      if (editingCo) {
        await updateCO({ sub_id: subjectCode, co_no: editingCo.co_no, co_description: descriptionValue });
        toast.success("CO updated successfully");
      } else {
        await createCO({ sub_id: subjectCode, co_no: numberValue, co_description: descriptionValue });
        toast.success("CO added successfully");
      }

      closeCoDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save CO");
    }
  };

  const confirmDeleteCo = async () => {
    if (!deleteTarget) return;

    try {
      await deleteCO({ sub_id: deleteTarget.sub_id, co_no: deleteTarget.co_no });
      toast.success(`CO ${deleteTarget.co_no} deleted successfully`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete CO");
    }
  };

  const openTaskMappingDialog = (task: AdminTaskMapping) => {
    setMappingTarget(task);
    setSelectedCoNos(task.mapped_cos || []);
  };

  const closeTaskMappingDialog = () => {
    setMappingTarget(null);
    setSelectedCoNos([]);
  };

  const toggleCoSelection = (coNo: number, checked: boolean) => {
    setSelectedCoNos((current) =>
      checked ? Array.from(new Set([...current, coNo])) : current.filter((value) => value !== coNo)
    );
  };

  const handleSaveTaskMapping = async () => {
    if (!mappingTarget || !subjectCode) return;

    try {
      await saveTaskMapping(mappingTarget.task_id, selectedCoNos, subjectCode);
      toast.success(`Mapping updated for task ${mappingTarget.task_id}`);
      closeTaskMappingDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save task mapping");
    }
  };

  return (
    <section className="space-y-4">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconDatabase className="h-5 w-5" />
            CO Master Data and Task Mapping
          </CardTitle>
          <CardDescription>
            Manage course outcomes and map them to theory tasks for a selected subject.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Lecture Subject</label>
              <Select value={subjectCode} onValueChange={setSubjectCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject (code - name)" />
                </SelectTrigger>
                <SelectContent>
                  {LECTURE_SUBJECT_OPTIONS.map((subject) => (
                    <SelectItem key={subject.code} value={subject.code}>
                      {subject.code} - {subject.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {subjectCode && (
            <p className="text-sm text-muted-foreground">
              Loaded subject: <span className="font-medium text-foreground">{subjectCode}</span>
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            To add a new subject, click the "Add Subject" button at the top of the page.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">CO Entries</CardTitle>
              <CardDescription>View, add, update, and delete CO records.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCoUploadOpen(true)} size="sm" disabled={!subjectCode}>
                <IconUpload className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
              <Button onClick={openAddCoDialog} size="sm" disabled={!subjectCode}>
                <IconPlus className="mr-2 h-4 w-4" />
                Add CO
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!subjectCode ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Load a subject code to manage COs.
              </div>
            ) : cosLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading COs...</div>
            ) : cosError ? (
              <div className="py-8 text-center text-sm text-destructive">{cosError}</div>
            ) : cos.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No CO entries found.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">CO No</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cos.map((co) => (
                      <TableRow key={`${co.sub_id}-${co.co_no}`}>
                        <TableCell className="font-medium">CO{co.co_no}</TableCell>
                        <TableCell>{co.co_description}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditCoDialog(co)}>
                              <IconEdit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(co)}>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Task CO Mappings</CardTitle>
            <CardDescription>Assign one or more COs to each theory task.</CardDescription>
          </CardHeader>
          <CardContent>
            {!subjectCode ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Load a subject code to manage task mappings.
              </div>
            ) : tasksLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading task mappings...</div>
            ) : tasksError ? (
              <div className="py-8 text-center text-sm text-destructive">{tasksError}</div>
            ) : loadedTasks.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No theory tasks found for this subject.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Mapped COs</TableHead>
                      <TableHead className="text-right w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadedTasks.map((task) => (
                      <TableRow key={task.task_id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground">Task ID: {task.task_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{task.task_type}</Badge>
                            {task.assessment_type ? <Badge variant="outline">{task.assessment_type}</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <NumberBadgeList values={task.mapped_cos} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openTaskMappingDialog(task)}>
                            <IconEdit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={coDialogOpen} onOpenChange={(open) => (!open ? closeCoDialog() : setCoDialogOpen(true))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCo ? "Edit CO" : "Add CO"}</DialogTitle>
            <DialogDescription>
              {editingCo
                ? "Update the CO description for the selected subject."
                : "Create a new CO entry for the selected subject."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCo} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">CO Number</label>
              <Input
                type="number"
                min="1"
                value={coNumber}
                onChange={(event) => setCoNumber(event.target.value)}
                disabled={!!editingCo}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={coDescription}
                onChange={(event) => setCoDescription(event.target.value)}
                placeholder="Describe the CO"
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCoDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingCo || isUpdatingCo}>
                {isCreatingCo || isUpdatingCo ? "Saving..." : editingCo ? "Update CO" : "Add CO"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CsvUploadDialog
        open={coUploadOpen}
        onOpenChange={setCoUploadOpen}
        title="Upload CO CSV"
        description="Upload CO master records for the loaded subject code."
        template={`co_no,co_description\n1,Apply foundational concepts\n2,Analyze design patterns`}
        loading={isUploadingCo}
        onUpload={uploadCOs}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete CO</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete CO{deleteTarget?.co_no}? This will remove the master record for the
              selected subject.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDeleteCo}
            disabled={isDeletingCo}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeletingCo ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!mappingTarget} onOpenChange={(open) => (!open ? closeTaskMappingDialog() : undefined)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Map COs to Task</DialogTitle>
            <DialogDescription>
              {mappingTarget?.title} - choose the CO numbers that apply to this task.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {cos.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Create CO entries before assigning mappings.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {cos.map((co) => {
                  const checked = selectedCoNos.includes(co.co_no);
                  return (
                    <label
                      key={`${co.sub_id}-${co.co_no}`}
                      className="flex items-start gap-3 rounded-md border p-3"
                    >
                      <Checkbox checked={checked} onCheckedChange={(value) => toggleCoSelection(co.co_no, value === true)} />
                      <div className="space-y-1">
                        <div className="font-medium">CO{co.co_no}</div>
                        <p className="text-sm text-muted-foreground">{co.co_description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeTaskMappingDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveTaskMapping} disabled={isSavingTaskMapping || !mappingTarget}>
              {isSavingTaskMapping ? "Saving..." : "Save Mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function LoExperimentSection() {
  const [subjectCode, setSubjectCode] = useState("");

  const [loDialogOpen, setLoDialogOpen] = useState(false);
  const [loNumber, setLoNumber] = useState("");
  const [loDescription, setLoDescription] = useState("");
  const [editingLo, setEditingLo] = useState<AdminLO | null>(null);
  const [deleteLoTarget, setDeleteLoTarget] = useState<AdminLO | null>(null);

  const [experimentDialogOpen, setExperimentDialogOpen] = useState(false);
  const [expNumber, setExpNumber] = useState("");
  const [expName, setExpName] = useState("");
  const [editingExperiment, setEditingExperiment] = useState<AdminExperiment | null>(null);
  const [deleteExperimentTarget, setDeleteExperimentTarget] = useState<AdminExperiment | null>(null);

  const [mappingTarget, setMappingTarget] = useState<AdminExperimentMapping | null>(null);
  const [selectedLoNos, setSelectedLoNos] = useState<number[]>([]);
  const [loUploadOpen, setLoUploadOpen] = useState(false);
  const [experimentUploadOpen, setExperimentUploadOpen] = useState(false);



  const {
    los,
    loading: losLoading,
    error: losError,
    createLO,
    updateLO,
    deleteLO,
    uploadLOs,
    isCreating: isCreatingLo,
    isUpdating: isUpdatingLo,
    isDeleting: isDeletingLo,
    isUploading: isUploadingLo,
  } = useAdminLOs(subjectCode);

  const {
    experiments,
    loading: experimentsLoading,
    error: experimentsError,
    createExperiment,
    updateExperiment,
    deleteExperiment,
    uploadExperiments,
    isCreating: isCreatingExperiment,
    isUpdating: isUpdatingExperiment,
    isDeleting: isDeletingExperiment,
    isUploading: isUploadingExperiments,
  } = useAdminExperiments(subjectCode);

  const {
    los: mappingLos,
    experiments: mappedExperiments,
    loading: mappingLoading,
    error: mappingError,
    saveExperimentMapping,
    isSaving: isSavingExperimentMapping,
  } = useAdminExperimentLOMappings(subjectCode);

  useEffect(() => {
    if (editingLo) {
      setLoNumber(String(editingLo.lo_no));
      setLoDescription(editingLo.lo_description);
    } else {
      setLoNumber("");
      setLoDescription("");
    }
  }, [editingLo]);

  useEffect(() => {
    if (editingExperiment) {
      setExpNumber(String(editingExperiment.exp_no));
      setExpName(editingExperiment.exp_name);
    } else {
      setExpNumber("");
      setExpName("");
    }
  }, [editingExperiment]);

  useEffect(() => {
    if (mappingTarget) {
      setSelectedLoNos(mappingTarget.mapped_los || []);
    } else {
      setSelectedLoNos([]);
    }
  }, [mappingTarget]);

  const openAddLoDialog = () => {
    if (!subjectCode) {
      toast.error("Load a subject code first");
      return;
    }

    setEditingLo(null);
    setLoDialogOpen(true);
  };

  const openEditLoDialog = (lo: AdminLO) => {
    setEditingLo(lo);
    setLoDialogOpen(true);
  };

  const closeLoDialog = () => {
    setLoDialogOpen(false);
    setEditingLo(null);
    setLoNumber("");
    setLoDescription("");
  };

  const handleSaveLo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const numberValue = Number(loNumber);
    const descriptionValue = loDescription.trim();

    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      toast.error("LO number must be a positive number");
      return;
    }

    if (!descriptionValue) {
      toast.error("LO description is required");
      return;
    }

    try {
      if (editingLo) {
        await updateLO({ sub_id: subjectCode, lo_no: editingLo.lo_no, lo_description: descriptionValue });
        toast.success("LO updated successfully");
      } else {
        await createLO({ sub_id: subjectCode, lo_no: numberValue, lo_description: descriptionValue });
        toast.success("LO added successfully");
      }

      closeLoDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save LO");
    }
  };

  const confirmDeleteLo = async () => {
    if (!deleteLoTarget) return;

    try {
      await deleteLO({ sub_id: deleteLoTarget.sub_id, lo_no: deleteLoTarget.lo_no });
      toast.success(`LO ${deleteLoTarget.lo_no} deleted successfully`);
      setDeleteLoTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete LO");
    }
  };

  const openAddExperimentDialog = () => {
    if (!subjectCode) {
      toast.error("Load a subject code first");
      return;
    }

    setEditingExperiment(null);
    setExperimentDialogOpen(true);
  };

  const openEditExperimentDialog = (experiment: AdminExperiment) => {
    setEditingExperiment(experiment);
    setExperimentDialogOpen(true);
  };

  const closeExperimentDialog = () => {
    setExperimentDialogOpen(false);
    setEditingExperiment(null);
    setExpNumber("");
    setExpName("");
  };

  const handleSaveExperiment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const numberValue = Number(expNumber);
    const nameValue = expName.trim();

    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      toast.error("Experiment number must be a positive number");
      return;
    }

    if (!nameValue) {
      toast.error("Experiment name is required");
      return;
    }

    try {
      if (editingExperiment) {
        await updateExperiment({ sub_id: subjectCode, exp_no: editingExperiment.exp_no, exp_name: nameValue });
        toast.success("Experiment updated successfully");
      } else {
        await createExperiment({ sub_id: subjectCode, exp_no: numberValue, exp_name: nameValue });
        toast.success("Experiment added successfully");
      }

      closeExperimentDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save experiment");
    }
  };

  const confirmDeleteExperiment = async () => {
    if (!deleteExperimentTarget) return;

    try {
      await deleteExperiment({ sub_id: deleteExperimentTarget.sub_id, exp_no: deleteExperimentTarget.exp_no });
      toast.success(`Experiment ${deleteExperimentTarget.exp_no} deleted successfully`);
      setDeleteExperimentTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete experiment");
    }
  };

  const openExperimentMappingDialog = (experiment: AdminExperimentMapping) => {
    setMappingTarget(experiment);
    setSelectedLoNos(experiment.mapped_los || []);
  };

  const closeExperimentMappingDialog = () => {
    setMappingTarget(null);
    setSelectedLoNos([]);
  };

  const toggleLoSelection = (loNo: number, checked: boolean) => {
    setSelectedLoNos((current) =>
      checked ? Array.from(new Set([...current, loNo])) : current.filter((value) => value !== loNo)
    );
  };

  const handleSaveExperimentMapping = async () => {
    if (!mappingTarget || !subjectCode) return;

    try {
      await saveExperimentMapping(mappingTarget.exp_no, selectedLoNos, subjectCode);
      toast.success(`Mapping updated for experiment ${mappingTarget.exp_no}`);
      closeExperimentMappingDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save experiment mapping");
    }
  };

  return (
    <section className="space-y-4">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconDatabase className="h-5 w-5" />
            LO Master Data and Experiment Mapping
          </CardTitle>
          <CardDescription>
            Manage lab outcomes, experiment records, and the LO to experiment mapping.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Lab Subject</label>
              <Select value={subjectCode} onValueChange={setSubjectCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject (code - name)" />
                </SelectTrigger>
                <SelectContent>
                  {LAB_SUBJECT_OPTIONS.map((subject) => (
                    <SelectItem key={subject.code} value={subject.code}>
                      {subject.code} - {subject.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {subjectCode && (
            <p className="text-sm text-muted-foreground">
              Loaded subject: <span className="font-medium text-foreground">{subjectCode}</span>
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            To add a new subject, click the "Add Subject" button at the top of the page.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">LO Entries</CardTitle>
              <CardDescription>View, add, update, and delete lab outcomes.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setLoUploadOpen(true)} size="sm" disabled={!subjectCode}>
                <IconUpload className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
              <Button onClick={openAddLoDialog} size="sm" disabled={!subjectCode}>
                <IconPlus className="mr-2 h-4 w-4" />
                Add LO
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!subjectCode ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Load a subject code to manage LOs.
              </div>
            ) : losLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading LOs...</div>
            ) : losError ? (
              <div className="py-8 text-center text-sm text-destructive">{losError}</div>
            ) : los.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No LO entries found.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">LO No</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {los.map((lo) => (
                      <TableRow key={`${lo.sub_id}-${lo.lo_no}`}>
                        <TableCell className="font-medium">LO{lo.lo_no}</TableCell>
                        <TableCell>{lo.lo_description}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditLoDialog(lo)}>
                              <IconEdit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteLoTarget(lo)}>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Experiment Entries</CardTitle>
              <CardDescription>Maintain experiment records for the selected subject.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setExperimentUploadOpen(true)} size="sm" disabled={!subjectCode}>
                <IconUpload className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
              <Button onClick={openAddExperimentDialog} size="sm" disabled={!subjectCode}>
                <IconPlus className="mr-2 h-4 w-4" />
                Add Experiment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!subjectCode ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Load a subject code to manage experiments.
              </div>
            ) : experimentsLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading experiments...</div>
            ) : experimentsError ? (
              <div className="py-8 text-center text-sm text-destructive">{experimentsError}</div>
            ) : experiments.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No experiment entries found.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Exp No</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {experiments.map((experiment) => (
                      <TableRow key={`${experiment.sub_id}-${experiment.exp_no}`}>
                        <TableCell className="font-medium">Exp {experiment.exp_no}</TableCell>
                        <TableCell>{experiment.exp_name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditExperimentDialog(experiment)}>
                              <IconEdit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteExperimentTarget(experiment)}>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Experiment to LO Mappings</CardTitle>
          <CardDescription>Assign one or more LOs to each experiment.</CardDescription>
        </CardHeader>
        <CardContent>
          {!subjectCode ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Load a subject code to manage experiment mappings.
            </div>
          ) : mappingLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading experiment mappings...</div>
          ) : mappingError ? (
            <div className="py-8 text-center text-sm text-destructive">{mappingError}</div>
          ) : mappedExperiments.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No experiments found for this subject.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Experiment</TableHead>
                    <TableHead>Mapped LOs</TableHead>
                    <TableHead className="text-right w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedExperiments.map((experiment) => (
                    <TableRow key={`${experiment.sub_id}-${experiment.exp_no}-mapping`}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">Exp {experiment.exp_no}: {experiment.exp_name}</p>
                          <p className="text-xs text-muted-foreground">Subject: {experiment.sub_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <NumberBadgeList values={experiment.mapped_los} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openExperimentMappingDialog(experiment)}>
                          <IconEdit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={loDialogOpen} onOpenChange={(open) => (!open ? closeLoDialog() : setLoDialogOpen(true))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLo ? "Edit LO" : "Add LO"}</DialogTitle>
            <DialogDescription>
              {editingLo
                ? "Update the LO description for the selected subject."
                : "Create a new LO entry for the selected subject."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveLo} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">LO Number</label>
              <Input
                type="number"
                min="1"
                value={loNumber}
                onChange={(event) => setLoNumber(event.target.value)}
                disabled={!!editingLo}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={loDescription}
                onChange={(event) => setLoDescription(event.target.value)}
                placeholder="Describe the LO"
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeLoDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingLo || isUpdatingLo}>
                {isCreatingLo || isUpdatingLo ? "Saving..." : editingLo ? "Update LO" : "Add LO"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteLoTarget} onOpenChange={() => setDeleteLoTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete LO</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete LO{deleteLoTarget?.lo_no}? This will remove the master record for the
              selected subject.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDeleteLo}
            disabled={isDeletingLo}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeletingLo ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={experimentDialogOpen}
        onOpenChange={(open) => (!open ? closeExperimentDialog() : setExperimentDialogOpen(true))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExperiment ? "Edit Experiment" : "Add Experiment"}</DialogTitle>
            <DialogDescription>
              {editingExperiment
                ? "Update the experiment name for the selected subject."
                : "Create a new experiment entry for the selected subject."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveExperiment} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Experiment Number</label>
              <Input
                type="number"
                min="1"
                value={expNumber}
                onChange={(event) => setExpNumber(event.target.value)}
                disabled={!!editingExperiment}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Experiment Name</label>
              <Textarea
                value={expName}
                onChange={(event) => setExpName(event.target.value)}
                placeholder="Describe the experiment"
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeExperimentDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingExperiment || isUpdatingExperiment}>
                {isCreatingExperiment || isUpdatingExperiment ? "Saving..." : editingExperiment ? "Update Experiment" : "Add Experiment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CsvUploadDialog
        open={loUploadOpen}
        onOpenChange={setLoUploadOpen}
        title="Upload LO CSV"
        description="Upload LO master records for the loaded subject code."
        template={`lo_no,lo_description\n1,Implement stack operations\n2,Analyze queue algorithms`}
        loading={isUploadingLo}
        onUpload={uploadLOs}
      />

      <CsvUploadDialog
        open={experimentUploadOpen}
        onOpenChange={setExperimentUploadOpen}
        title="Upload Experiment CSV"
        description="Upload experiment master records for the loaded subject code."
        template={`exp_no,exp_name\n1,Stack implementation\n2,Queue operations`}
        loading={isUploadingExperiments}
        onUpload={uploadExperiments}
      />

      <AlertDialog open={!!deleteExperimentTarget} onOpenChange={() => setDeleteExperimentTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Experiment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete experiment {deleteExperimentTarget?.exp_no}? This will remove the master record for the selected subject.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDeleteExperiment}
            disabled={isDeletingExperiment}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeletingExperiment ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!mappingTarget} onOpenChange={(open) => (!open ? closeExperimentMappingDialog() : undefined)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Map LOs to Experiment</DialogTitle>
            <DialogDescription>
              {mappingTarget?.exp_name} - choose the LO numbers that apply to this experiment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {mappingLos.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Create LO entries before assigning experiment mappings.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {mappingLos.map((lo) => {
                  const checked = selectedLoNos.includes(lo.lo_no);
                  return (
                    <label key={`${lo.sub_id}-${lo.lo_no}`} className="flex items-start gap-3 rounded-md border p-3">
                      <Checkbox checked={checked} onCheckedChange={(value) => toggleLoSelection(lo.lo_no, value === true)} />
                      <div className="space-y-1">
                        <div className="font-medium">LO{lo.lo_no}</div>
                        <p className="text-sm text-muted-foreground">{lo.lo_description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeExperimentMappingDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveExperimentMapping} disabled={isSavingExperimentMapping || !mappingTarget}>
              {isSavingExperimentMapping ? "Saving..." : "Save Mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default function ObeManagement() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">OBE Data Management</h1>
        <p className="text-sm text-muted-foreground">
          Keep CO, LO, experiment, and mapping data aligned with the database schema.
        </p>
      </div>

      <CoTaskSection />
      <LoExperimentSection />
    </div>
  );
}
