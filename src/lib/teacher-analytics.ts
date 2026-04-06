export interface TeacherAnalyticsFilters {
  subject: string;
  academicYear: string;
  semester: string;
}

export interface AnalyticsOption {
  value: string;
  label: string;
  meta?: string;
}

export interface AnalyticsStats {
  mean: number;
  stdDev: number;
  average: number;
  highest: number;
  lowest: number;
  count: number;
}

export interface ComparisonPoint {
  taskId: number;
  label: string;
  average: number | null;
  highest: number | null;
  lowest: number | null;
  count: number;
}

export interface ComparisonSeries {
  className: string;
  classLabel: string;
  color: string;
  stats: AnalyticsStats;
  points: ComparisonPoint[];
}

export interface RankingStudent {
  pid: number;
  stud_name: string;
  roll_no: number | null;
  class_name: string;
  overallScore: number;
  maxScore: number;
  percentage: number;
  subjectScore?: number;
  subjectMaxScore?: number;
  subjectPercentage?: number;
}

export interface TeacherAnalyticsResponse {
  teacherName: string;
  filters: {
    subjects: AnalyticsOption[];
    academicYears: string[];
    semesters: string[];
  };
  appliedFilters: TeacherAnalyticsFilters;
  summary: {
    mse: AnalyticsStats;
    ise: AnalyticsStats;
    combined: AnalyticsStats & { totalMax: number };
  };
  mseComparison: {
    tasks: Array<{
      taskId: number;
      label: string;
      className: string;
      createdAt: string | null;
    }>;
    series: ComparisonSeries[];
  };
  rankings: {
    totalStudents: number;
    top: RankingStudent[];
    bottom: RankingStudent[];
  };
  insights: {
    bestClass: {
      className: string;
      average: number;
    } | null;
    bestStudent: RankingStudent | null;
  };
}

export interface TeacherAnalyticsAllotment {
  allotment_id: number;
  teacher_id: number;
  sub_id: string;
  sub_name: string;
  class_name: string;
  batch_no: number | null;
  is_subject_incharge: boolean;
  course: string | null;
  type: string;
  current_sem: string | null;
}

export interface TeacherAnalyticsTask {
  task_id: number;
  allotment_id: number;
  title: string;
  task_type?: string | null;
  assessment_type: "ISE" | "MSE" | null;
  assessment_sub_type?: string | null;
  max_marks: number;
  created_at: string | null;
  allotment?: {
    allotment_id: number;
    sub_id: string;
    sub_name: string;
    class_name: string;
    current_sem: string | null;
  } | null;
}

export interface TeacherAnalyticsStudent {
  pid: number;
  stud_name: string;
  roll_no: number | null;
  class_name: string | null;
  academic_year: string | null;
}

export interface TeacherAnalyticsMark {
  mark_id: number;
  task_id: number;
  stud_pid: number;
  total_marks_obtained: number;
  status: string | null;
  submitted_at: string | null;
  student?: TeacherAnalyticsStudent | null;
}

export interface BuildTeacherAnalyticsInput {
  teacherName: string;
  filters: TeacherAnalyticsFilters;
  allotments: TeacherAnalyticsAllotment[];
  tasks: TeacherAnalyticsTask[];
  marks: TeacherAnalyticsMark[];
  students?: Array<{
    academic_year: string | null;
  }>;
}

const SERIES_COLORS = ["#2563eb", "#f97316", "#10b981", "#8b5cf6", "#ef4444", "#eab308"];

export function normalizeTeacherAnalyticsFilters(filters?: Partial<TeacherAnalyticsFilters>): TeacherAnalyticsFilters {
  return {
    subject: filters?.subject || "all",
    academicYear: filters?.academicYear || "all",
    semester: filters?.semester || "all",
  };
}

function getStudentAcademicYear(student: TeacherAnalyticsStudent | null | undefined): string | null {
  if (!student) return null;
  return student.academic_year || null;
}

function getStudentClassName(student: TeacherAnalyticsStudent | null | undefined): string {
  return student?.class_name || "Unknown Class";
}

function isSubmittedMark(mark: TeacherAnalyticsMark): boolean {
  return (mark.status || "").toLowerCase() !== "pending";
}

function round(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function extractScores(values: Array<number | null | undefined>): number[] {
  return values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

export function calculateAnalyticsStats(values: Array<number | null | undefined>): AnalyticsStats {
  const scores = extractScores(values);
  const count = scores.length;

  if (count === 0) {
    return {
      mean: 0,
      stdDev: 0,
      average: 0,
      highest: 0,
      lowest: 0,
      count: 0,
    };
  }

  const sum = scores.reduce((total, value) => total + value, 0);
  const mean = sum / count;
  const variance = scores.reduce((total, value) => total + Math.pow(value - mean, 2), 0) / count;

  return {
    mean: round(mean),
    stdDev: round(Math.sqrt(variance)),
    average: round(mean),
    highest: round(Math.max(...scores)),
    lowest: round(Math.min(...scores)),
    count,
  };
}

function sortAcademicYears(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => {
    const leftStart = Number.parseInt(left.split("-")[0] || left, 10);
    const rightStart = Number.parseInt(right.split("-")[0] || right, 10);

    if (Number.isFinite(leftStart) && Number.isFinite(rightStart) && leftStart !== rightStart) {
      return rightStart - leftStart;
    }

    return right.localeCompare(left);
  });
}

function sortSemesters(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => !!value))].sort((left, right) => {
    const leftNumber = Number.parseInt(left.replace(/[^0-9]/g, ""), 10);
    const rightNumber = Number.parseInt(right.replace(/[^0-9]/g, ""), 10);

    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }

    return left.localeCompare(right);
  });
}

function classSortValue(className: string): number {
  const match = className.match(/(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function buildSeriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

function getTaskAssessmentType(task?: TeacherAnalyticsTask | null): "ISE" | "MSE" | null {
  if (!task) return null;
  const assessmentType = (task.assessment_type || "").trim().toUpperCase();
  if (assessmentType === "MSE") return "MSE";
  if (assessmentType === "ISE") return "ISE";

  // Legacy/manual rows may omit assessment_type for lecture assignments.
  const taskType = (task.task_type || "").trim().toUpperCase();
  if (taskType === "LEC") return "ISE";

  return null;
}

export function buildTeacherAnalyticsResponse(input: BuildTeacherAnalyticsInput): TeacherAnalyticsResponse {
  const filters = normalizeTeacherAnalyticsFilters(input.filters);
  const lectureAllotments = input.allotments.filter((allotment) => allotment.type === "Lec");
  const subjectOptions = [...new Map(
    lectureAllotments.map((allotment) => [
      allotment.sub_id,
      {
        value: allotment.sub_id,
        label: `${allotment.sub_id} - ${allotment.sub_name}`,
        meta: allotment.sub_name,
      },
    ])
  ).values()].sort((left, right) => left.label.localeCompare(right.label));

  const filteredAllotments = lectureAllotments.filter((allotment) => {
    const subjectMatches = filters.subject === "all" || allotment.sub_id === filters.subject;
    const semesterMatches = filters.semester === "all" || (allotment.current_sem || "") === filters.semester;
    return subjectMatches && semesterMatches;
  });

  const filteredAllotmentIds = new Set(filteredAllotments.map((allotment) => allotment.allotment_id));
  const taskById = new Map<number, TeacherAnalyticsTask>();
  const allotmentById = new Map<number, TeacherAnalyticsAllotment>();

  input.allotments.forEach((allotment) => {
    allotmentById.set(allotment.allotment_id, allotment);
  });

  input.tasks
    .filter((task) => filteredAllotmentIds.has(task.allotment_id) && getTaskAssessmentType(task) !== null)
    .forEach((task) => {
      taskById.set(task.task_id, task);
    });

  const relevantTaskIds = new Set(taskById.keys());
  const submittedMarks = input.marks.filter((mark) => {
    if (!relevantTaskIds.has(mark.task_id) || !isSubmittedMark(mark)) {
      return false;
    }

    const academicYear = getStudentAcademicYear(mark.student);
    if (filters.academicYear !== "all" && academicYear !== filters.academicYear) {
      return false;
    }

    return true;
  });

  const academicYearSource = input.students && input.students.length > 0
    ? input.students.map((student) => student.academic_year)
    : submittedMarks.map((mark) => getStudentAcademicYear(mark.student));
  const academicYears = sortAcademicYears(academicYearSource.filter((value): value is string => !!value));
  const semesters = sortSemesters(filteredAllotments.map((allotment) => allotment.current_sem));

  const mseMarks = submittedMarks.filter((mark) => getTaskAssessmentType(taskById.get(mark.task_id)) === "MSE");
  const iseMarks = submittedMarks.filter((mark) => getTaskAssessmentType(taskById.get(mark.task_id)) === "ISE");

  const mseStats = calculateAnalyticsStats(mseMarks.map((mark) => mark.total_marks_obtained));
  const iseStats = calculateAnalyticsStats(iseMarks.map((mark) => mark.total_marks_obtained));

  const combinedStats = calculateAnalyticsStats(submittedMarks.map((mark) => mark.total_marks_obtained));
  const combinedMax = submittedMarks.reduce((total, mark) => {
    const task = taskById.get(mark.task_id);
    return total + (Number(task?.max_marks) || 0);
  }, 0);

  const mseTasks = [...taskById.values()]
    .filter((task) => getTaskAssessmentType(task) === "MSE")
    .sort((left, right) => {
      const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
      const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
      if (leftTime !== rightTime) return leftTime - rightTime;
      return left.title.localeCompare(right.title);
    });

  const classNames = [...new Set(
    mseMarks
      .map((mark) => getStudentClassName(mark.student))
      .filter((className) => className !== "Unknown Class")
  )].sort((left, right) => {
    const leftSort = classSortValue(left);
    const rightSort = classSortValue(right);
    if (leftSort !== rightSort) return leftSort - rightSort;
    return left.localeCompare(right);
  });

  const comparisonTasks = mseTasks.map((task) => ({
    taskId: task.task_id,
    label: task.title,
    className: task.allotment?.class_name || allotmentById.get(task.allotment_id)?.class_name || "Unknown Class",
    createdAt: task.created_at,
  }));

  const series = classNames.map((className, index) => {
    const points = mseTasks.map((task) => {
      const taskScores = mseMarks
        .filter((mark) => mark.task_id === task.task_id && getStudentClassName(mark.student) === className)
        .map((mark) => mark.total_marks_obtained);
      const stats = calculateAnalyticsStats(taskScores);

      return {
        taskId: task.task_id,
        label: task.title,
        average: stats.count > 0 ? stats.average : null,
        highest: stats.count > 0 ? stats.highest : null,
        lowest: stats.count > 0 ? stats.lowest : null,
        count: stats.count,
      };
    });

    const classStats = calculateAnalyticsStats(
      mseMarks
        .filter((mark) => getStudentClassName(mark.student) === className)
        .map((mark) => mark.total_marks_obtained)
    );

    return {
      className,
      classLabel: className,
      color: buildSeriesColor(index),
      stats: classStats,
      points,
    };
  });

  const rankingStudents = new Map<number, RankingStudent>();

  submittedMarks.forEach((mark) => {
    const student = mark.student;
    if (!student) return;

    const current = rankingStudents.get(student.pid) || {
      pid: student.pid,
      stud_name: student.stud_name,
      roll_no: student.roll_no,
      class_name: student.class_name || "Unknown Class",
      overallScore: 0,
      maxScore: 0,
      percentage: 0,
      subjectScore: 0,
      subjectMaxScore: 0,
      subjectPercentage: 0,
    };

    const task = taskById.get(mark.task_id);
    const markValue = Number(mark.total_marks_obtained) || 0;
    const taskMaxMarks = Number(task?.max_marks) || 0;

    current.overallScore += markValue;
    current.maxScore += taskMaxMarks;
    current.percentage = current.maxScore > 0 ? round((current.overallScore / current.maxScore) * 100) : 0;

    // Track subject-specific marks
    if (filters.subject !== "all") {
      const taskAllotment = task?.allotment || (task?.allotment_id ? allotmentById.get(task.allotment_id) : undefined);
      if (taskAllotment?.sub_id === filters.subject) {
        current.subjectScore! += markValue;
        current.subjectMaxScore! += taskMaxMarks;
        current.subjectPercentage = current.subjectMaxScore! > 0 ? round((current.subjectScore! / current.subjectMaxScore!) * 100) : 0;
      }
    }

    rankingStudents.set(student.pid, current);
  });

  // Use subject-specific scores for ranking if a subject is selected
  const rankingField = filters.subject !== "all" ? "subjectScore" : "overallScore";
  
  const rankedStudents = [...rankingStudents.values()]
    .filter((student) => {
      if (filters.subject !== "all") {
        return (student.subjectScore || 0) > 0;
      }
      return student.overallScore > 0;
    })
    .sort((left, right) => {
      const leftScore = filters.subject !== "all" ? (left.subjectScore || 0) : left.overallScore;
      const rightScore = filters.subject !== "all" ? (right.subjectScore || 0) : right.overallScore;
      
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      const leftRoll = left.roll_no ?? Number.MAX_SAFE_INTEGER;
      const rightRoll = right.roll_no ?? Number.MAX_SAFE_INTEGER;
      return leftRoll - rightRoll;
    });

  const topStudents = rankedStudents.slice(0, 5);
  const bottomStudents = [...rankedStudents]
    .reverse()
    .slice(0, 5)
    .sort((left, right) => {
      const leftScore = filters.subject !== "all" ? (left.subjectScore || 0) : left.overallScore;
      const rightScore = filters.subject !== "all" ? (right.subjectScore || 0) : right.overallScore;
      
      if (leftScore !== rightScore) {
        return leftScore - rightScore;
      }

      const leftRoll = left.roll_no ?? Number.MAX_SAFE_INTEGER;
      const rightRoll = right.roll_no ?? Number.MAX_SAFE_INTEGER;
      return leftRoll - rightRoll;
    });

  const bestClass = series.length > 0
    ? [...series].sort((left, right) => right.stats.mean - left.stats.mean)[0]
    : null;

  const bestStudent = topStudents.length > 0 ? topStudents[0] : null;

  return {
    teacherName: input.teacherName,
    filters: {
      subjects: subjectOptions,
      academicYears,
      semesters,
    },
    appliedFilters: filters,
    summary: {
      mse: mseStats,
      ise: iseStats,
      combined: {
        ...combinedStats,
        totalMax: round(combinedMax),
      },
    },
    mseComparison: {
      tasks: comparisonTasks,
      series,
    },
    rankings: {
      totalStudents: rankedStudents.length,
      top: topStudents,
      bottom: bottomStudents,
    },
    insights: {
      bestClass: bestClass
        ? {
            className: bestClass.className,
            average: bestClass.stats.average,
          }
        : null,
      bestStudent,
    },
  };
}
