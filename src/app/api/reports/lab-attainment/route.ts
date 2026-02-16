import { NextRequest, NextResponse } from 'next/server';
import { supabase, getTeacherByEmail } from '@/lib/supabase';
import { auth } from '@/lib/auth';

interface LoData {
    obtained_marks: number;
    max_marks: number;
}

interface ExperimentData {
    exp_no: number;
    title: string;
    max_marks: number;
}

interface StudentCoMarks {
    [loNo: number]: {
        [expNo: number]: {
            obtained: number;
            max: number;
        };
    };
}

interface StudentData {
    pid: number;
    stud_name: string;
    roll_no: number;
    loMarks: StudentCoMarks;
}

interface LoStructure {
    [loNo: number]: ExperimentData[];
}

interface ReportResponse {
    allotment: {
        allotment_id: number;
        sub_id: string;
        sub_name?: string;
        class_name: string;
        batch_no: number;
        current_sem: string;
    };
    teacher: {
        teacher_name: string;
    };
    students: StudentData[];
    loStructure: LoStructure;
    loList: number[];
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const teacher = await getTeacherByEmail(session.user.email);
        if (!teacher) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }

        const allotmentId = request.nextUrl.searchParams.get('allotment_id');
        if (!allotmentId) {
            return NextResponse.json({ error: 'allotment_id required' }, { status: 400 });
        }

        // Verify allotment belongs to this teacher
        const { data: allotmentData, error: allotmentError } = await supabase
            .from('allotment')
            .select('*, teacher(teacher_name)')
            .eq('allotment_id', allotmentId)
            .eq('teacher_id', teacher.teacher_id)
            .single();

        if (allotmentError || !allotmentData) {
            return NextResponse.json({ error: 'Allotment not found or unauthorized' }, { status: 403 });
        }

        // Fetch all lab tasks for this allotment
        const { data: tasksData, error: tasksError } = await supabase
            .from('task')
            .select('*')
            .eq('allotment_id', parseInt(allotmentId))
            .eq('task_type', 'Lab')
            .order('exp_no', { ascending: true });

        if (tasksError || !tasksData) {
            return NextResponse.json(
                { error: 'Failed to fetch tasks' },
                { status: 500 }
            );
        }

        // Fetch experiment LO mapping
        const { data: loMappingData, error: loMappingError } = await supabase
            .from('experiment_lo_mapping')
            .select('*')
            .eq('sub_id', allotmentData.sub_id);

        if (loMappingError) {
            return NextResponse.json(
                { error: 'Failed to fetch LO mappings' },
                { status: 500 }
            );
        }

        // Fetch LO descriptions
        const { data: loData, error: loError } = await supabase
            .from('lo')
            .select('*')
            .eq('sub_id', allotmentData.sub_id)
            .order('lo_no', { ascending: true });

        if (loError) {
            return NextResponse.json(
                { error: 'Failed to fetch LOs' },
                { status: 500 }
            );
        }

        // Build LO structure mapping
        const loStructure: LoStructure = {};
        const loList: number[] = [];

        loData.forEach((lo: any) => {
            loList.push(lo.lo_no);
            loStructure[lo.lo_no] = [];
        });

        // Map experiments to LOs
        loMappingData.forEach((mapping: any) => {
            const task = tasksData.find((t: any) => t.exp_no === mapping.exp_no);
            if (task && loStructure[mapping.lo_no]) {
                loStructure[mapping.lo_no].push({
                    exp_no: mapping.exp_no,
                    title: task.title,
                    max_marks: task.max_marks,
                });
            }
        });

        // Fetch students in this class and batch
        const { data: studentsData, error: studentsError } = await supabase
            .from('student')
            .select('pid, stud_name, roll_no')
            .eq('class_name', allotmentData.class_name)
            .eq('batch', allotmentData.batch_no)
            .order('roll_no', { ascending: true });

        if (studentsError || !studentsData) {
            return NextResponse.json(
                { error: 'Failed to fetch students' },
                { status: 500 }
            );
        }

        // Fetch all marks for these tasks and students
        const taskIds = tasksData.map((t: any) => t.task_id);
        const { data: marksData, error: marksError } = await supabase
            .from('marks')
            .select('*')
            .in('task_id', taskIds);

        if (marksError) {
            return NextResponse.json(
                { error: 'Failed to fetch marks' },
                { status: 500 }
            );
        }

        // Build student LO marks structure
        const studentMarksMap = new Map();

        marksData.forEach((mark: any) => {
            const task = tasksData.find((t: any) => t.task_id === mark.task_id);
            if (!task) return;

            const loNos = loMappingData
                .filter((m: any) => m.exp_no === task.exp_no)
                .map((m: any) => m.lo_no);

            if (!studentMarksMap.has(mark.stud_pid)) {
                studentMarksMap.set(mark.stud_pid, {});
            }

            const studentLos = studentMarksMap.get(mark.stud_pid);

            loNos.forEach((loNo: number) => {
                if (!studentLos[loNo]) {
                    studentLos[loNo] = {};
                }

                // Divide marks equally among mapped LOs
                const marksPerLo = mark.total_marks_obtained / loNos.length;
                const maxMarksPerLo = task.max_marks / loNos.length;

                studentLos[loNo][task.exp_no] = {
                    obtained: marksPerLo,
                    max: maxMarksPerLo,
                };
            });
        });

        // Build final student data
        const finalStudents: StudentData[] = studentsData.map((student: any) => ({
            pid: student.pid,
            stud_name: student.stud_name,
            roll_no: student.roll_no,
            loMarks: studentMarksMap.get(student.pid) || {},
        }));

        const response: ReportResponse = {
            allotment: {
                allotment_id: allotmentData.allotment_id,
                sub_id: allotmentData.sub_id,
                sub_name: allotmentData.sub_name,
                class_name: allotmentData.class_name,
                batch_no: allotmentData.batch_no,
                current_sem: allotmentData.current_sem,
            },
            teacher: {
                teacher_name: allotmentData.teacher?.teacher_name || '',
            },
            students: finalStudents,
            loStructure,
            loList,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
