"use client";

import { useEffect, useMemo, useState } from "react";
import { IconAlertTriangle, IconArrowDownRight, IconArrowUpRight, IconChartBar, IconChartLine, IconRefresh, IconSparkles } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeacherAnalytics } from "@/hooks/use-api";
import type { AnalyticsStats, ComparisonSeries, RankingStudent, TeacherAnalyticsResponse } from "@/lib/teacher-analytics";

interface AnalyticsStatCardProps {
  label: string;
  value: string;
  description: string;
  tone?: "default" | "success" | "warning" | "muted";
}

function AnalyticsStatCard({ label, value, description, tone = "default" }: AnalyticsStatCardProps) {
  const toneClass =
    tone === "success"
      ? "border-emerald-500/20 bg-emerald-500/5"
      : tone === "warning"
        ? "border-amber-500/20 bg-amber-500/5"
        : tone === "muted"
          ? "border-border/60 bg-muted/30"
          : "border-border/60 bg-card";

  return (
    <Card className={toneClass}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function StatSkeleton() {
  return <Skeleton className="h-[118px] w-full rounded-xl" />;
}

function formatScore(value: number, fractionDigits = 2) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? `${value}` : value.toFixed(fractionDigits);
}

function formatPercentage(value: number) {
  return `${formatScore(value)}%`;
}

function getTaskShortLabel(label: string, index: number) {
  const trimmed = label.replace(/\s+/g, " ").trim();
  if (trimmed.length <= 18) return trimmed;
  return `Task ${index + 1}`;
}

function compareByValue(left: number, right: number) {
  return right - left;
}

function buildLinePath(points: Array<{ x: number; y: number; average: number | null }>) {
  let path = "";
  let isStarted = false;

  points.forEach((point) => {
    if (point.average === null) {
      isStarted = false;
      return;
    }

    if (!isStarted) {
      path += `M ${point.x} ${point.y}`;
      isStarted = true;
    } else {
      path += ` L ${point.x} ${point.y}`;
    }
  });

  return path;
}

interface LineComparisonChartProps {
  series: ComparisonSeries[];
  tasks: TeacherAnalyticsResponse["mseComparison"]["tasks"];
}

function LineComparisonChart({ series, tasks }: LineComparisonChartProps) {
  const width = 1000;
  const height = 360;
  const padding = { top: 28, right: 28, bottom: 64, left: 56 };

  const allValues = series.flatMap((item) =>
    item.points.flatMap((point) => [point.lowest, point.average, point.highest]).filter((value): value is number => typeof value === "number")
  );

  if (tasks.length === 0 || series.length === 0 || allValues.length === 0) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
        No MSE data is available for the selected filters.
      </div>
    );
  }

  const minValue = Math.max(0, Math.floor(Math.min(...allValues) - 5));
  const maxValue = Math.ceil(Math.max(...allValues) + 5);
  const valueRange = Math.max(1, maxValue - minValue);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const xStep = tasks.length > 1 ? innerWidth / (tasks.length - 1) : 0;

  const xForIndex = (index: number) => padding.left + (tasks.length > 1 ? index * xStep : innerWidth / 2);
  const yForValue = (value: number) => padding.top + ((maxValue - value) / valueRange) * innerHeight;

  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const value = Math.round(maxValue - ratio * valueRange);
    const y = padding.top + ratio * innerHeight;
    return { value, y };
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">MSE Division Comparison</h3>
            <p className="text-sm text-muted-foreground">
              Average marks are shown as the line. Vertical markers show the high and low range per task.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {series.map((item) => (
              <span key={item.className} className="inline-flex items-center gap-2 rounded-full border border-border/60 px-2.5 py-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.classLabel}
              </span>
            ))}
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 px-2.5 py-1">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Average
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 px-2.5 py-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Highest
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 px-2.5 py-1">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Least
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[360px] w-full min-w-[720px]" role="img" aria-label="MSE division comparison chart">
          <text
            x={padding.left + innerWidth / 2}
            y={height - 10}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            MSE Tasks (chronological order)
          </text>
          <text
            x={16}
            y={padding.top + innerHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${padding.top + innerHeight / 2})`}
            className="fill-muted-foreground text-[11px]"
          >
            Marks
          </text>

          {gridLines.map((gridLine) => (
            <g key={gridLine.value}>
              <line x1={padding.left} x2={width - padding.right} y1={gridLine.y} y2={gridLine.y} stroke="currentColor" strokeOpacity="0.08" />
              <text x={padding.left - 10} y={gridLine.y + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
                {gridLine.value}
              </text>
            </g>
          ))}

          <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke="currentColor" strokeOpacity="0.12" />
          <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke="currentColor" strokeOpacity="0.12" />

          {tasks.map((task, index) => (
            <g key={task.taskId}>
              <line
                x1={xForIndex(index)}
                x2={xForIndex(index)}
                y1={padding.top}
                y2={height - padding.bottom}
                stroke="currentColor"
                strokeOpacity="0.04"
                strokeDasharray="4 4"
              />
              <text
                x={xForIndex(index)}
                y={height - padding.bottom + 28}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {getTaskShortLabel(task.label, index)}
              </text>
            </g>
          ))}

          {series.map((item) => {
            const averagePoints = item.points.map((point, index) => ({
              x: xForIndex(index),
              y: point.average === null ? 0 : yForValue(point.average),
              average: point.average,
            }));
            const path = buildLinePath(averagePoints);

            return (
              <g key={item.className}>
                {item.points.map((point, index) => {
                  if (point.average === null || point.highest === null || point.lowest === null) {
                    return null;
                  }

                  const x = xForIndex(index);
                  const averageY = yForValue(point.average);
                  const highestY = yForValue(point.highest);
                  const lowestY = yForValue(point.lowest);

                  return (
                    <g key={`${item.className}-${point.taskId}`}>
                      <line x1={x} x2={x} y1={highestY} y2={lowestY} stroke={item.color} strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
                      <circle cx={x} cy={averageY} r="4.5" fill={item.color} stroke="white" strokeWidth="1.5">
                        <title>{`${item.classLabel}: ${point.label} | Avg ${formatScore(point.average)} | High ${formatScore(point.highest)} | Low ${formatScore(point.lowest)}`}</title>
                      </circle>
                    </g>
                  );
                })}
                {path ? <path d={path} fill="none" stroke={item.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
              </g>
            );
          })}
        </svg>
      </div>

    </div>
  );
}

interface RankingListProps {
  title: string;
  subtitle: string;
  students: RankingStudent[];
  tone: "top" | "bottom";
}

function RankingList({ title, subtitle, students, tone }: RankingListProps) {
  const icon = tone === "top" ? <IconArrowUpRight className="h-4 w-4 text-emerald-500" /> : <IconArrowDownRight className="h-4 w-4 text-rose-500" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students available for the selected filters.</p>
        ) : (
          <div className="space-y-3">
            {students.map((student, index) => {
              const score = student.subjectScore !== undefined && student.subjectScore > 0 
                ? student.subjectScore 
                : student.overallScore;
              const maxScore = student.subjectMaxScore !== undefined && student.subjectMaxScore > 0 
                ? student.subjectMaxScore 
                : student.maxScore;
              const percentage = student.subjectPercentage !== undefined && student.subjectScore !== undefined && student.subjectScore > 0 
                ? student.subjectPercentage 
                : student.percentage;

              return (
                <div key={student.pid} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">#{index + 1}</span>
                      <p className="font-medium">{student.stud_name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Roll No {student.roll_no ?? "-"} • {student.class_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatScore(score)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPercentage(percentage)} of {formatScore(maxScore)} max
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreComparisonBars({ mse, ise }: { mse?: AnalyticsStats; ise?: AnalyticsStats }) {
  if (!mse || !ise) {
    return <Skeleton className="h-[280px] w-full rounded-xl" />;
  }

  const rows = [
    { label: "Mean", mse: mse.mean, ise: ise.mean },
    { label: "Highest", mse: mse.highest, ise: ise.highest },
    { label: "Lowest", mse: mse.lowest, ise: ise.lowest },
  ];

  const maxValue = Math.max(1, ...rows.flatMap((row) => [row.mse, row.ise]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <IconChartBar className="h-4 w-4 text-primary" />
          MSE vs ISE Snapshot
        </CardTitle>
        <CardDescription>Visual comparison of core score metrics across both assessment types.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {rows.map((row) => {
          const mseWidth = (row.mse / maxValue) * 100;
          const iseWidth = (row.ise / maxValue) * 100;

          return (
            <div key={row.label} className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{row.label}</span>
                <span>MSE {formatScore(row.mse)} | ISE {formatScore(row.ise)}</span>
              </div>
              <div className="space-y-2">
                <div className="h-2.5 rounded-full bg-muted">
                  <div className="h-2.5 rounded-full bg-blue-500" style={{ width: `${mseWidth}%` }} />
                </div>
                <div className="h-2.5 rounded-full bg-muted">
                  <div className="h-2.5 rounded-full bg-emerald-500" style={{ width: `${iseWidth}%` }} />
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> MSE</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> ISE</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ClassAverageBars({ series }: { series: ComparisonSeries[] }) {
  if (series.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Class Average View</CardTitle>
          <CardDescription>No class-level MSE averages are available for this filter set.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const maxAverage = Math.max(1, ...series.map((item) => item.stats.average));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Class Average View</CardTitle>
        <CardDescription>Fast visual scan of division-wise MSE average performance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {series.map((item) => (
          <div key={item.className} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{item.classLabel}</span>
              <span className="text-muted-foreground">{formatScore(item.stats.average)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted">
              <div
                className="h-2.5 rounded-full"
                style={{
                  width: `${(item.stats.average / maxAverage) * 100}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AnalyticsSectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function buildFilterItems(items: Array<{ value: string; label: string }>) {
  return [
    <SelectItem key="all" value="all">
      All
    </SelectItem>,
    ...items.map((item) => (
      <SelectItem key={item.value} value={item.value}>
        {item.label}
      </SelectItem>
    )),
  ];
}

export function TeacherAnalyticsContent() {
  const [subject, setSubject] = useState("all");
  const [academicYear, setAcademicYear] = useState("all");
  const [semester, setSemester] = useState("all");

  const { data, loading, error, refetchAnalytics } = useTeacherAnalytics({ subject, academicYear, semester });
  const response = data as TeacherAnalyticsResponse | null;

  useEffect(() => {
    if (!response) return;

    if (subject !== "all" && !response.filters.subjects.some((item) => item.value === subject)) {
      setSubject("all");
    }

    if (academicYear !== "all" && !response.filters.academicYears.includes(academicYear)) {
      setAcademicYear("all");
    }

    if (semester !== "all" && !response.filters.semesters.includes(semester)) {
      setSemester("all");
    }
  }, [response, subject, academicYear, semester]);

  const mseStats = response?.summary.mse;
  const iseStats = response?.summary.ise;
  const topStudents = response?.rankings.top || [];
  const bottomStudents = response?.rankings.bottom || [];
  const series = response?.mseComparison.series || [];
  const tasks = response?.mseComparison.tasks || [];

  const classInsights = useMemo(() => {
    return [...series].sort((left, right) => compareByValue(left.stats.mean, right.stats.mean));
  }, [series]);

  const selectedFiltersCount = [subject, academicYear, semester].filter((value) => value !== "all").length;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_40%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(15,23,42,0.92))] p-6 text-white shadow-lg">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.08),transparent)] opacity-50" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit bg-white/10 text-white hover:bg-white/10">Teacher Analytics</Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Analytics</h1>
              <p className="max-w-2xl text-sm text-white/75 md:text-base">
                Track MSE and ISE trends, compare class divisions, and rank students using a single live filter set.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-white/75">
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Filters update every chart</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">ISE data uses assignment records</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Top and bottom ranks are aggregated totals</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <p className="text-white/60">MSE submissions</p>
              <p className="mt-1 text-2xl font-semibold">{mseStats?.count ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <p className="text-white/60">ISE submissions</p>
              <p className="mt-1 text-2xl font-semibold">{iseStats?.count ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <p className="text-white/60">Ranked students</p>
              <p className="mt-1 text-2xl font-semibold">{response?.rankings.totalStudents ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Global Filters</CardTitle>
              <CardDescription>Change any filter and the whole page updates together.</CardDescription>
            </div>
            <Button variant="outline" onClick={() => refetchAnalytics()} className="w-fit">
              <IconRefresh className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject</p>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent className="max-h-72">{response ? buildFilterItems(response.filters.subjects) : null}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Academic Year</p>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger>
                  <SelectValue placeholder="All Academic Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {response?.filters.academicYears.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Semester</p>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger>
                  <SelectValue placeholder="All Semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {response?.filters.semesters.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{selectedFiltersCount} active filters</Badge>
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1">
              <IconSparkles className="h-3.5 w-3.5" />
              Subject, year and semester all drive the same data slice
            </span>
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-6 text-sm text-destructive">
            <IconAlertTriangle className="h-5 w-5" />
            {error}
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-4">
        <AnalyticsSectionHeader
          title="MSE Statistical Analysis"
          description="Central tendency and spread for Mid-Semester Exam marks across the selected scope."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {loading || !mseStats ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <AnalyticsStatCard label="Mean" value={formatScore(mseStats.mean)} description="Average across all MSE submissions" />
              <AnalyticsStatCard label="Standard Deviation" value={formatScore(mseStats.stdDev)} description="How tightly the marks cluster around the mean" tone="muted" />
              <AnalyticsStatCard label="Average Marks" value={formatScore(mseStats.average)} description="Same selected-scope average, shown explicitly for comparison" tone="success" />
              <AnalyticsStatCard label="Highest Marks" value={formatScore(mseStats.highest)} description="Best MSE score in the current filter set" tone="warning" />
              <AnalyticsStatCard label="Least Marks" value={formatScore(mseStats.lowest)} description="Lowest MSE score in the current filter set" tone="muted" />
            </>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <LineComparisonChart series={series} tasks={tasks} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IconChartLine className="h-4 w-4 text-primary" />
                Division Summary
              </CardTitle>
              <CardDescription>Average, highest and least marks for each class division.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : classInsights.length === 0 ? (
                <p className="text-sm text-muted-foreground">No division comparison data is available yet.</p>
              ) : (
                classInsights.map((seriesItem) => (
                  <div key={seriesItem.className} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: seriesItem.color }} />
                        <p className="font-medium">{seriesItem.classLabel}</p>
                      </div>
                      <Badge variant="secondary">{seriesItem.stats.count} records</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Average</p>
                        <p className="font-semibold">{formatScore(seriesItem.stats.average)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Highest</p>
                        <p className="font-semibold">{formatScore(seriesItem.stats.highest)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Least</p>
                        <p className="font-semibold">{formatScore(seriesItem.stats.lowest)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Std Dev</p>
                        <p className="font-semibold">{formatScore(seriesItem.stats.stdDev)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <AnalyticsSectionHeader
          title="ISE Evaluation"
          description="Statistical summary from assignment section records for In-Semester Evaluation marks."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {loading || !iseStats ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <AnalyticsStatCard label="Mean" value={formatScore(iseStats.mean)} description="Average across all ISE assignment records" tone="success" />
              <AnalyticsStatCard label="High" value={formatScore(iseStats.highest)} description="Highest ISE score in the selected slice" tone="warning" />
              <AnalyticsStatCard label="Low" value={formatScore(iseStats.lowest)} description="Lowest ISE score in the selected slice" tone="muted" />
            </>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <AnalyticsSectionHeader
          title="Comparative Visualizations"
          description="Graph-first views to quickly compare score behavior across assessment types and divisions."
        />
        <div className="grid gap-4 xl:grid-cols-2">
          <ScoreComparisonBars mse={mseStats} ise={iseStats} />
          {loading ? <Skeleton className="h-[280px] w-full rounded-xl" /> : <ClassAverageBars series={classInsights} />}
        </div>
      </section>

      <section className="space-y-4">
        <AnalyticsSectionHeader
          title="Student Performance Ranking"
          description="Top 5 and bottom 5 students ranked by marks. Rankings are specific to the selected subject when filtered, or aggregated across all subjects when viewing all."
        />
        <div className="grid gap-4 xl:grid-cols-2">
          {loading ? (
            <>
              <Card>
                <CardContent className="space-y-3 py-6">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-3 py-6">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <RankingList
                title="Top 5 Students"
                subtitle={subject !== "all" && response ? `Highest marks in ${response.filters.subjects.find(s => s.value === subject)?.label || subject}` : "Highest overall marks across all subjects"}
                students={topStudents}
                tone="top"
              />
              <RankingList
                title="Bottom 5 Students"
                subtitle={subject !== "all" && response ? `Lowest marks in ${response.filters.subjects.find(s => s.value === subject)?.label || subject}` : "Lowest overall marks across all subjects"}
                students={bottomStudents}
                tone="bottom"
              />
            </>
          )}
        </div>
      </section>

      {response?.insights.bestClass || response?.insights.bestStudent ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Best Performing Division</CardTitle>
              <CardDescription>Based on the mean MSE score across the current filter set.</CardDescription>
            </CardHeader>
            <CardContent>
              {response?.insights.bestClass ? (
                <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-4">
                  <div>
                    <p className="font-medium">{response.insights.bestClass.className}</p>
                    <p className="text-sm text-muted-foreground">Highest average MSE score</p>
                  </div>
                  <Badge>{formatScore(response.insights.bestClass.average)}</Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No class summary available yet.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Highest Overall Student</CardTitle>
              <CardDescription>Aggregated across both MSE and ISE records.</CardDescription>
            </CardHeader>
            <CardContent>
              {response?.insights.bestStudent ? (
                <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-4">
                  <div>
                    <p className="font-medium">{response.insights.bestStudent.stud_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Roll No {response.insights.bestStudent.roll_no ?? "-"} • {response.insights.bestStudent.class_name}
                    </p>
                  </div>
                  <Badge>{formatScore(response.insights.bestStudent.overallScore)}</Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No student ranking available yet.</p>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
