"use client";

import { useMemo, useState } from "react";
import { IconChartBar, IconChecks, IconClockHour4, IconSchool, IconUsers } from "@tabler/icons-react";
import { useAdminPerformanceOverview } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function SmartBar({ label, value, rightLabel }: { label: string; value: number; rightLabel: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export function AdminAnalyticsDashboard() {
  const [className, setClassName] = useState("all");
  const [semester, setSemester] = useState("all");
  const [subId, setSubId] = useState("all");

  const { data, loading, error } = useAdminPerformanceOverview({ className, semester, subId });

  const bestSubject = useMemo(() => {
    if (!data?.subjectPerformance?.length) return null;
    return [...data.subjectPerformance].sort((a, b) => b.average - a.average)[0];
  }, [data?.subjectPerformance]);

  if (loading) {
    return (
      <div className="space-y-4 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle>Loading analytics...</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Fetching student performance metrics and trend data.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle>Unable to load analytics</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-destructive">{error}</CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle>No analytics available</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            There is no data available for the selected filters.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pt-0">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Performance Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Class</p>
              <Select value={className} onValueChange={setClassName}>
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {data.filters.classes.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Semester</p>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger>
                  <SelectValue placeholder="All Semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {data.filters.semesters.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Subject</p>
              <Select value={subId} onValueChange={setSubId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {data.filters.subjects.map((item) => (
                    <SelectItem key={item.sub_id} value={item.sub_id}>
                      {item.sub_id} - {item.sub_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Average Score</CardTitle>
            <IconChartBar size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{data.metrics.averageScore}%</div>
            <p className="text-xs text-muted-foreground">Across submitted assessments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Submission Rate</CardTitle>
            <IconChecks size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{data.metrics.submissionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {data.metrics.submittedCount} submitted / {data.metrics.pendingCount} pending
            </p>
            <div className="mt-3">
              <Progress value={data.metrics.submissionRate} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total Students</CardTitle>
            <IconUsers size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{data.metrics.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Students in selected scope</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Active Teachers</CardTitle>
            <IconSchool size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{data.metrics.activeTeachers}</div>
            <p className="text-xs text-muted-foreground">Teachers registered in system</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.trend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trend data available yet.</p>
            ) : (
              data.trend.map((item) => (
                <SmartBar
                  key={item.month}
                  label={item.month}
                  value={item.average}
                  rightLabel={`${item.average}% (${item.submissions})`}
                />
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.scoreDistribution.map((bucket) => {
              const maxCount = Math.max(1, ...data.scoreDistribution.map((item) => item.count));
              const width = (bucket.count / maxCount) * 100;
              return (
                <SmartBar
                  key={bucket.label}
                  label={bucket.label}
                  value={width}
                  rightLabel={`${bucket.count} records`}
                />
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Class Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.classPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No class-level data available.</p>
            ) : (
              data.classPerformance.slice(0, 8).map((item) => (
                <SmartBar
                  key={item.class_name}
                  label={item.class_name}
                  value={item.average}
                  rightLabel={`${item.average}%`}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bestSubject ? (
              <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Best Performing Subject</p>
                <p className="text-sm font-medium">
                  {bestSubject.sub_id} - {bestSubject.sub_name}
                </p>
                <p className="text-lg font-semibold">{bestSubject.average}%</p>
              </div>
            ) : null}

            {data.subjectPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subject-level data available.</p>
            ) : (
              data.subjectPerformance.slice(0, 8).map((item) => (
                <div key={`${item.sub_id}-${item.sub_name}`} className="rounded-md border border-border/60 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">
                      {item.sub_id} - {item.sub_name}
                    </p>
                    <Badge variant="secondary">{item.average}%</Badge>
                  </div>
                  <div className="mt-2">
                    <Progress value={item.average} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Top Performing Students</CardTitle>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <IconClockHour4 size={14} />
            <span>Auto-updated with current filters</span>
          </div>
        </CardHeader>
        <CardContent>
          {data.topPerformers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No student submissions found for this filter set.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead className="text-right">Average</TableHead>
                  <TableHead className="text-right">Submissions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topPerformers.map((student) => (
                  <TableRow key={student.pid}>
                    <TableCell>{student.pid}</TableCell>
                    <TableCell>{student.stud_name}</TableCell>
                    <TableCell>{student.class_name}</TableCell>
                    <TableCell>{student.roll_no ?? "-"}</TableCell>
                    <TableCell className="text-right font-medium">{student.average}%</TableCell>
                    <TableCell className="text-right">{student.submissions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}