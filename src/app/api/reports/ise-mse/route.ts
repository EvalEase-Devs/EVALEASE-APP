import { NextRequest, NextResponse } from 'next/server';
import { supabase, getTeacherByEmail } from '@/lib/supabase';
import { auth } from '@/lib/auth';

// GET /api/reports/ise-mse?allotment_id=X
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
        const { data: allotment, error: allotmentError } = await supabase
            .from('allotment')
            .select('*')
            .eq('allotment_id', parseInt(allotmentId))
            .eq('teacher_id', teacher.teacher_id)
            .single();

        if (allotmentError || !allotment) {
            return NextResponse.json({ error: 'Allotment not found or unauthorized' }, { status: 403 });
        }

        // Fetch all students in this class
        const { data: students, error: studentsError } = await supabase
            .from('student')
            .select('pid, stud_name, roll_no')
            .eq('class_name', allotment.class_name)
            .order('roll_no', { ascending: true });

        if (studentsError || !students) {
            return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
        }

        // Fetch all ISE and MSE tasks for this allotment
        const { data: tasks, error: tasksError } = await supabase
            .from('task')
            .select('*, task_co_mapping(co_no, sub_id)')
            .eq('allotment_id', parseInt(allotmentId))
            .in('assessment_type', ['ISE', 'MSE'])
            .order('created_at', { ascending: true });

        if (tasksError || !tasks) {
            return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
        }

        // Fetch all CO data for the subject
        const { data: cos, error: cosError } = await supabase
            .from('co')
            .select('co_no, co_description')
            .eq('sub_id', allotment.sub_id)
            .order('co_no', { ascending: true });

        if (cosError) {
            return NextResponse.json({ error: 'Failed to fetch COs' }, { status: 500 });
        }

        // Fetch marks for all students in these tasks
        const taskIds = tasks.map(t => t.task_id);
        const { data: marks, error: marksError } = await supabase
            .from('marks')
            .select('*')
            .in('task_id', taskIds);

        if (marksError) {
            return NextResponse.json({ error: 'Failed to fetch marks' }, { status: 500 });
        }

        // Build column structure: CO -> ISE/MSE -> Task/Question
        const coList = (cos || []).map(c => c.co_no).sort((a, b) => a - b);

        const columnStructure: Record<number, any> = {};
        coList.forEach(co => {
            columnStructure[co] = { ise: [], mse: [] };
        });

        // Organize tasks by CO
        tasks?.forEach(task => {
            const mappedCos = task.task_co_mapping?.map((m: any) => m.co_no) || [];

            if (task.assessment_type === 'ISE') {
                // ISE task: add under each mapped CO
                mappedCos.forEach((co: number) => {
                    if (columnStructure[co]) {
                        columnStructure[co].ise.push({
                            task_id: task.task_id,
                            title: task.title,
                            max_marks: task.max_marks
                        });
                    }
                });
            } else if (task.assessment_type === 'MSE') {
                // MSE task: organize by sub_questions
                const subQuestions = task.sub_questions || [];
                subQuestions.forEach((q: any) => {
                    const qCo = parseInt(q.co.replace('CO', ''));
                    if (columnStructure[qCo]) {
                        columnStructure[qCo].mse.push({
                            task_id: task.task_id,
                            question_label: q.label,
                            max_marks: q.marks
                        });
                    }
                });
            }
        });

        // Fetch student marks data with task info
        const studentData = students?.map(student => {
            const studentMarks = marks?.filter(m => m.stud_pid === student.pid) || [];

            const rowData: Record<string, any> = {
                pid: student.pid,
                stud_name: student.stud_name,
                roll_no: student.roll_no,
                coMarks: {}
            };

            // Build marks map for each CO->ISE/MSE->Task
            coList.forEach(co => {
                rowData.coMarks[co] = {
                    ise: {},
                    mse: {}
                };

                // Map ISE task marks
                columnStructure[co].ise.forEach((iseTask: any) => {
                    const taskMark = studentMarks.find(m => m.task_id === iseTask.task_id);
                    rowData.coMarks[co].ise[iseTask.task_id] = {
                        task_title: iseTask.title,
                        obtained: taskMark?.total_marks_obtained || 0,
                        max: iseTask.max_marks
                    };
                });

                // Map MSE question marks
                columnStructure[co].mse.forEach((mseQuestion: any) => {
                    const taskMark = studentMarks.find(m => m.task_id === mseQuestion.task_id);
                    const questionMarks = taskMark?.question_marks || {};
                    const obtained = questionMarks[mseQuestion.question_label] || 0;

                    rowData.coMarks[co].mse[mseQuestion.question_label] = {
                        label: mseQuestion.question_label,
                        obtained: obtained,
                        max: mseQuestion.max_marks
                    };
                });
            });

            return rowData;
        }) || [];

        return NextResponse.json({
            allotment,
            teacher: {
                teacher_name: teacher.teacher_name
            },
            students: studentData,
            tasks,
            cos: cos || [],
            marks: marks || [],
            coList,
            columnStructure
        });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
