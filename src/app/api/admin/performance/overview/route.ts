import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserRole } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type AllotmentSummary = {
  allotment_id: number;
  class_name: string;
  current_sem: string | null;
  sub_id: string;
  sub_name: string;
};

type TaskSummary = {
  task_id: number;
  allotment_id: number;
  title: string;
  sub_id: string;
  max_marks: number;
  created_at: string;
  assessment_type: string | null;
  task_type: string;
};

type MarkSummary = {
  task_id: number;
  stud_pid: number;
  total_marks_obtained: number;
  status: string | null;
  submitted_at: string | null;
};

type StudentSummary = {
  pid: number;
  stud_name: string;
  class_name: string;
  roll_no: number | null;
};

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.email) {
    return null;
  }

  const role = session.user.role || getUserRole(session.user.email);
  return role === "admin" ? session : null;
}

function toPercent(obtained: number, max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 0;
  return (obtained / max) * 100;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET(request: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const classFilter = request.nextUrl.searchParams.get("class_name")?.trim() || "all";
    const semFilter = request.nextUrl.searchParams.get("semester")?.trim() || "all";
    const subFilter = request.nextUrl.searchParams.get("sub_id")?.trim() || "all";

    const { data: allAllotments, error: allAllotmentsError } = await supabase
      .from("allotment")
      .select("allotment_id, class_name, current_sem, sub_id, sub_name")
      .order("class_name", { ascending: true });

    if (allAllotmentsError) {
      console.error("Error fetching allotments:", allAllotmentsError);
      return NextResponse.json({ error: "Failed to fetch allotments" }, { status: 500 });
    }

    const allotments = (allAllotments || []) as AllotmentSummary[];

    const { data: classRows, error: classRowsError } = await supabase
      .from("student")
      .select("class_name");

    if (classRowsError) {
      console.error("Error fetching class filter options:", classRowsError);
      return NextResponse.json({ error: "Failed to fetch class filters" }, { status: 500 });
    }

    const studentClasses = (classRows || [])
      .map((row) => row.class_name)
      .filter((value): value is string => Boolean(value && value.trim()));

    const classes = Array.from(
      new Set([...studentClasses, ...allotments.map((a) => a.class_name).filter(Boolean)])
    ).sort((a, b) => a.localeCompare(b));
    const semesters = Array.from(
      new Set(
        allotments
          .map((a) => a.current_sem)
          .filter((value): value is string => Boolean(value && value.trim()))
      )
    ).sort();
    const subjects = Array.from(
      new Set(allotments.map((a) => `${a.sub_id}__${a.sub_name}`))
    )
      .map((entry) => {
        const [sub_id, sub_name] = entry.split("__");
        return { sub_id, sub_name };
      })
      .sort((a, b) => a.sub_id.localeCompare(b.sub_id));

    const filteredAllotments = allotments.filter((allotment) => {
      if (classFilter !== "all" && allotment.class_name !== classFilter) return false;
      if (semFilter !== "all" && (allotment.current_sem || "") !== semFilter) return false;
      if (subFilter !== "all" && allotment.sub_id !== subFilter) return false;
      return true;
    });

    const filteredAllotmentIds = filteredAllotments.map((a) => a.allotment_id);

    const { count: teacherCount, error: teachersError } = await supabase
      .from("teacher")
      .select("teacher_id", { count: "exact", head: true });

    if (teachersError) {
      console.error("Error counting teachers:", teachersError);
      return NextResponse.json({ error: "Failed to fetch teacher count" }, { status: 500 });
    }

    let studentQuery = supabase.from("student").select("pid, stud_name, class_name, roll_no");
    if (classFilter !== "all") {
      studentQuery = studentQuery.eq("class_name", classFilter);
    }

    const { data: studentsData, error: studentsError } = await studentQuery;
    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }

    const students = (studentsData || []) as StudentSummary[];
    const studentMap = new Map(students.map((student) => [student.pid, student]));

    if (filteredAllotmentIds.length === 0) {
      return NextResponse.json({
        filters: {
          classes,
          semesters,
          subjects,
        },
        metrics: {
          totalStudents: students.length,
          activeTeachers: teacherCount ?? 0,
          totalTasks: 0,
          submittedCount: 0,
          pendingCount: 0,
          submissionRate: 0,
          averageScore: 0,
        },
        classPerformance: [],
        semesterPerformance: [],
        subjectPerformance: [],
        trend: [],
        scoreDistribution: [],
        topPerformers: [],
      });
    }

    const { data: taskData, error: taskError } = await supabase
      .from("task")
      .select("task_id, allotment_id, title, sub_id, max_marks, created_at, assessment_type, task_type")
      .in("allotment_id", filteredAllotmentIds)
      .order("created_at", { ascending: false });

    if (taskError) {
      console.error("Error fetching tasks:", taskError);
      return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }

    const tasks = (taskData || []) as TaskSummary[];
    const taskMap = new Map(tasks.map((task) => [task.task_id, task]));
    const taskIds = tasks.map((task) => task.task_id);

    let marks: MarkSummary[] = [];
    if (taskIds.length > 0) {
      const { data: marksData, error: marksError } = await supabase
        .from("marks")
        .select("task_id, stud_pid, total_marks_obtained, status, submitted_at")
        .in("task_id", taskIds);

      if (marksError) {
        console.error("Error fetching marks:", marksError);
        return NextResponse.json({ error: "Failed to fetch marks" }, { status: 500 });
      }

      marks = (marksData || []) as MarkSummary[];
    }

    const classAgg = new Map<string, { obtained: number; max: number; submitted: number; total: number }>();
    const semAgg = new Map<string, { obtained: number; max: number; submitted: number; total: number }>();
    const subAgg = new Map<string, { obtained: number; max: number; submitted: number; total: number; sub_name: string }>();
    const monthAgg = new Map<string, { obtained: number; max: number; submitted: number }>();
    const studentAgg = new Map<
      number,
      { obtained: number; max: number; submitted: number; total: number; name: string; class_name: string; roll_no: number | null }
    >();

    const scoreBuckets = [
      { label: "0-39", min: 0, max: 40, count: 0 },
      { label: "40-59", min: 40, max: 60, count: 0 },
      { label: "60-74", min: 60, max: 75, count: 0 },
      { label: "75-89", min: 75, max: 90, count: 0 },
      { label: "90-100", min: 90, max: 101, count: 0 },
    ];

    let totalObtained = 0;
    let totalMax = 0;
    let submittedCount = 0;
    let pendingCount = 0;

    for (const mark of marks) {
      const task = taskMap.get(mark.task_id);
      if (!task) continue;

      const allotment = filteredAllotments.find((item) => item.allotment_id === task.allotment_id);
      if (!allotment) continue;

      const status = (mark.status || "").toLowerCase();
      const isSubmitted = status !== "pending";
      if (isSubmitted) {
        submittedCount += 1;
      } else {
        pendingCount += 1;
      }

      const obtained = Number(mark.total_marks_obtained || 0);
      const maxMarks = Number(task.max_marks || 0);
      if (!isSubmitted || maxMarks <= 0) {
        continue;
      }

      totalObtained += obtained;
      totalMax += maxMarks;

      const percentage = toPercent(obtained, maxMarks);
      const bucket = scoreBuckets.find((item) => percentage >= item.min && percentage < item.max);
      if (bucket) bucket.count += 1;

      const classKey = allotment.class_name;
      const classEntry = classAgg.get(classKey) || { obtained: 0, max: 0, submitted: 0, total: 0 };
      classEntry.obtained += obtained;
      classEntry.max += maxMarks;
      classEntry.submitted += 1;
      classEntry.total += 1;
      classAgg.set(classKey, classEntry);

      const semKey = allotment.current_sem || "Unspecified";
      const semEntry = semAgg.get(semKey) || { obtained: 0, max: 0, submitted: 0, total: 0 };
      semEntry.obtained += obtained;
      semEntry.max += maxMarks;
      semEntry.submitted += 1;
      semEntry.total += 1;
      semAgg.set(semKey, semEntry);

      const subjectKey = `${task.sub_id}__${allotment.sub_name}`;
      const subjectEntry =
        subAgg.get(subjectKey) || { obtained: 0, max: 0, submitted: 0, total: 0, sub_name: allotment.sub_name };
      subjectEntry.obtained += obtained;
      subjectEntry.max += maxMarks;
      subjectEntry.submitted += 1;
      subjectEntry.total += 1;
      subAgg.set(subjectKey, subjectEntry);

      const monthDate = mark.submitted_at ? new Date(mark.submitted_at) : new Date(task.created_at);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
      const monthEntry = monthAgg.get(monthKey) || { obtained: 0, max: 0, submitted: 0 };
      monthEntry.obtained += obtained;
      monthEntry.max += maxMarks;
      monthEntry.submitted += 1;
      monthAgg.set(monthKey, monthEntry);

      const student = studentMap.get(mark.stud_pid);
      if (student) {
        const current =
          studentAgg.get(student.pid) || {
            obtained: 0,
            max: 0,
            submitted: 0,
            total: 0,
            name: student.stud_name,
            class_name: student.class_name,
            roll_no: student.roll_no,
          };
        current.obtained += obtained;
        current.max += maxMarks;
        current.submitted += 1;
        current.total += 1;
        studentAgg.set(student.pid, current);
      }
    }

    const classPerformance = Array.from(classAgg.entries())
      .map(([class_name, value]) => ({
        class_name,
        average: round2(toPercent(value.obtained, value.max)),
        submissions: value.submitted,
      }))
      .sort((a, b) => b.average - a.average);

    const semesterPerformance = Array.from(semAgg.entries())
      .map(([semester, value]) => ({
        semester,
        average: round2(toPercent(value.obtained, value.max)),
        submissions: value.submitted,
      }))
      .sort((a, b) => b.average - a.average);

    const subjectPerformance = Array.from(subAgg.entries())
      .map(([key, value]) => {
        const [sub_id] = key.split("__");
        return {
          sub_id,
          sub_name: value.sub_name,
          average: round2(toPercent(value.obtained, value.max)),
          submissions: value.submitted,
        };
      })
      .sort((a, b) => b.average - a.average);

    const trend = Array.from(monthAgg.entries())
      .map(([month, value]) => ({
        month,
        average: round2(toPercent(value.obtained, value.max)),
        submissions: value.submitted,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-8);

    const topPerformers = Array.from(studentAgg.entries())
      .map(([pid, value]) => ({
        pid,
        stud_name: value.name,
        class_name: value.class_name,
        roll_no: value.roll_no,
        average: round2(toPercent(value.obtained, value.max)),
        submissions: value.submitted,
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 10);

    const totalRows = submittedCount + pendingCount;

    return NextResponse.json({
      filters: {
        classes,
        semesters,
        subjects,
      },
      metrics: {
        totalStudents: students.length,
        activeTeachers: teacherCount ?? 0,
        totalTasks: tasks.length,
        submittedCount,
        pendingCount,
        submissionRate: totalRows > 0 ? round2((submittedCount / totalRows) * 100) : 0,
        averageScore: totalMax > 0 ? round2((totalObtained / totalMax) * 100) : 0,
      },
      classPerformance,
      semesterPerformance,
      subjectPerformance,
      trend,
      scoreDistribution: scoreBuckets,
      topPerformers,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}