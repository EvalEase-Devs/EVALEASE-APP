import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTeacherByEmail, supabase } from "@/lib/supabase";
import { SEMESTERS, SUBJECTS_DATA } from "@/app/teacher/assignments/create/constants";
import {
  buildTeacherAnalyticsResponse,
  normalizeTeacherAnalyticsFilters,
  type TeacherAnalyticsAllotment,
  type TeacherAnalyticsMark,
  type TeacherAnalyticsStudent,
  type TeacherAnalyticsTask,
} from "@/lib/teacher-analytics";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await getTeacherByEmail(session.user.email);
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const filters = normalizeTeacherAnalyticsFilters({
      subject: request.nextUrl.searchParams.get("subject") || undefined,
      academicYear: request.nextUrl.searchParams.get("academicYear") || undefined,
      semester: request.nextUrl.searchParams.get("semester") || undefined,
    });

    const { data: allotments, error: allotmentError } = await supabase
      .from("allotment")
      .select("allotment_id, teacher_id, sub_id, sub_name, class_name, batch_no, is_subject_incharge, course, type, current_sem")
      .eq("teacher_id", teacher.teacher_id)
      .eq("type", "Lec")
      .order("sub_id", { ascending: true });

    if (allotmentError) {
      console.error("Supabase error fetching allotments:", allotmentError);
      return NextResponse.json({ error: `Failed to fetch allotments: ${allotmentError.message}` }, { status: 500 });
    }

    const lectureAllotments = (allotments || []) as TeacherAnalyticsAllotment[];
    const lectureClassNames = [...new Set(lectureAllotments.map((allotment) => allotment.class_name).filter(Boolean))];

    // Fetch student years - but don't fail if this errors
    let studentYears: Array<{ academic_year: string | null }> = [];
    if (lectureClassNames.length > 0) {
      const { data, error } = await supabase
        .from("student")
        .select("Academic_year")
        .in("class_name", lectureClassNames);
      
      if (!error && data) {
        studentYears = (data as Array<{ Academic_year: string | null }>).map((student) => ({
          academic_year: student.Academic_year,
        }));
      }
      // If error, we just continue with empty studentYears array
    }

    const selectedAllotments = lectureAllotments.filter((allotment) => {
      const subjectMatches = filters.subject === "all" || allotment.sub_id === filters.subject;
      const semesterMatches = filters.semester === "all" || (allotment.current_sem || "") === filters.semester;
      return subjectMatches && semesterMatches;
    });

    const selectedAllotmentIds = selectedAllotments.map((allotment) => allotment.allotment_id);

    const { data: tasks, error: taskError } = selectedAllotmentIds.length > 0
      ? await supabase
          .from("task")
          .select(
            "task_id, allotment_id, title, task_type, assessment_type, assessment_sub_type, max_marks, created_at, allotment:allotment_id(allotment_id, sub_id, sub_name, class_name, current_sem)"
          )
          .in("allotment_id", selectedAllotmentIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };

    if (taskError) {
      console.error("Supabase error fetching tasks:", taskError);
      return NextResponse.json({ error: `Failed to fetch tasks: ${taskError.message}` }, { status: 500 });
    }

    const taskRows = (tasks || []) as TeacherAnalyticsTask[];
    const selectedTaskIds = taskRows.map((task) => task.task_id);

    const { data: marks, error: markError } = selectedTaskIds.length > 0
      ? await supabase
          .from("marks")
          .select("mark_id, task_id, stud_pid, total_marks_obtained, status, submitted_at")
          .in("task_id", selectedTaskIds)
      : { data: [], error: null };

    if (markError) {
      console.warn("Warning: Supabase error fetching marks - continuing with empty marks:", markError);
    }

    // Fetch student data for all marks
    const marksArray = (marks || []) as Array<{
      mark_id: number;
      task_id: number;
      stud_pid: number;
      total_marks_obtained: number;
      status: string | null;
      submitted_at: string | null;
    }>;
    
    const studentPids = [...new Set(marksArray.map((m) => m.stud_pid))];
    const { data: studentData, error: studentError } = studentPids.length > 0
      ? await supabase
          .from("student")
          .select("pid, stud_name, roll_no, class_name, Academic_year")
          .in("pid", studentPids)
      : { data: [], error: null };

    if (studentError) {
      console.warn("Warning: Supabase error fetching student data:", studentError);
    }

    // Map student data by pid for quick lookup
    const studentMap = new Map<number, any>();
    (studentData || []).forEach((student) => {
      studentMap.set(student.pid, {
        ...student,
        academic_year: student.Academic_year,
      });
    });

    // Merge student data into marks
    const enricedMarks = marksArray.map((mark) => ({
      ...mark,
      student: studentMap.get(mark.stud_pid) || null,
    })) as TeacherAnalyticsMark[];

    const payload = buildTeacherAnalyticsResponse({
      teacherName: teacher.teacher_name,
      filters,
      allotments: lectureAllotments,
      tasks: taskRows,
      marks: enricedMarks,
      students: studentYears,
    });

    // Build canonical subject list from all semesters
    const subjectMap = new Map<string, { value: string; label: string; meta?: string }>();
    
    // Iterate through each semester in SUBJECTS_DATA
    const allSemesters = ["SEM 5", "SEM 6", "SEM 7", "SEM 8"] as const;
    for (const semester of allSemesters) {
      const subjectsInSem = (SUBJECTS_DATA as unknown as Record<string, Array<{ code: string; fullName: string; type: string }>>)[semester];
      if (Array.isArray(subjectsInSem)) {
        for (const subject of subjectsInSem) {
          if (!subjectMap.has(subject.code)) {
            subjectMap.set(subject.code, {
              value: subject.code,
              label: `${subject.code} - ${subject.fullName}`,
              meta: subject.type,
            });
          }
        }
      }
    }

    payload.filters.subjects = Array.from(subjectMap.values()).sort((left, right) => left.label.localeCompare(right.label));
    payload.filters.semesters = Array.from(SEMESTERS);

    return NextResponse.json(payload);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";
    console.error("Error in teacher analytics GET:", errorMessage);
    console.error("Stack:", errorStack);
    return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 });
  }
}
