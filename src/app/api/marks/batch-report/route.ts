import { NextRequest, NextResponse } from 'next/server';
import { supabase, getTeacherByEmail } from '@/lib/supabase';
import { auth } from '@/lib/auth';

// GET /api/marks/batch-report?allotment_id=X
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

        const searchParams = request.nextUrl.searchParams;
        const allotmentId = searchParams.get('allotment_id');

        if (!allotmentId) {
            return NextResponse.json({ error: 'allotment_id is required' }, { status: 400 });
        }

        // 1. Get allotment details
        const { data: allotment, error: allotmentError } = await supabase
            .from('allotment')
            .select('*')
            .eq('allotment_id', parseInt(allotmentId))
            .eq('teacher_id', teacher.teacher_id)
            .single();

        if (allotmentError || !allotment) {
            return NextResponse.json({ error: 'Allotment not found or unauthorized' }, { status: 404 });
        }

        // 2. Get students for this batch only (batch marks report shows only that batch's students)
        const { data: students, error: studentsError } = await supabase
            .from('student')
            .select('pid, stud_name, roll_no, batch')
            .eq('class_name', allotment.class_name)
            .eq('batch', allotment.batch_no)
            .order('roll_no', { ascending: true });

        if (studentsError) {
            console.error('Error fetching students:', studentsError);
            return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
        }

        // 3. Get all lab tasks for this allotment
        const { data: tasks, error: tasksError } = await supabase
            .from('task')
            .select('task_id, exp_no, title, max_marks')
            .eq('allotment_id', parseInt(allotmentId))
            .eq('task_type', 'Lab')
            .not('exp_no', 'is', null)
            .order('exp_no', { ascending: true });

        if (tasksError) {
            console.error('Error fetching tasks:', tasksError);
            return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
        }

        if (!tasks || tasks.length === 0) {
            // No tasks yet, return empty data
            return NextResponse.json({
                allotment,
                students: students || [],
                experiments: [],
                marksMatrix: {}
            });
        }

        // 4. Get experiment details and COs
        const expNos = [...new Set(tasks.map(t => t.exp_no).filter(Boolean))];

        const { data: experiments, error: expError } = await supabase
            .from('experiment')
            .select('sub_id, exp_no, exp_name')
            .eq('sub_id', allotment.sub_id)
            .in('exp_no', expNos);

        if (expError) {
            console.error('Error fetching experiments:', expError);
            return NextResponse.json({ error: 'Failed to fetch experiments' }, { status: 500 });
        }


        // 5. Get LOs for each experiment (Lab uses Learning Outcomes, not Course Outcomes)
        const { data: expLOMapping, error: loError } = await supabase
            .from('experiment_lo_mapping')
            .select('exp_no, lo_no')
            .eq('sub_id', allotment.sub_id)
            .in('exp_no', expNos);

        if (loError) {
            console.error('Error fetching LO mappings:', loError);
        }

        // Build experiment data with LOs
        const experimentsWithLOs = experiments?.map(exp => ({
            exp_no: exp.exp_no,
            exp_name: exp.exp_name,
            los: expLOMapping
                ?.filter(m => m.exp_no === exp.exp_no)
                .map(m => `LO${m.lo_no}`)
                .sort() || []
        })) || [];

        // 6. Get all marks for these tasks
        const taskIds = tasks.map(t => t.task_id);
        const { data: marks, error: marksError } = await supabase
            .from('marks')
            .select('mark_id, task_id, stud_pid, total_marks_obtained, status')
            .in('task_id', taskIds);

        if (marksError) {
            console.error('Error fetching marks:', marksError);
            return NextResponse.json({ error: 'Failed to fetch marks' }, { status: 500 });
        }

        // 7. Build marks matrix: { [pid]: { [exp_no]: { mark_id, marks, max_marks, status } } }
        const marksMatrix: Record<number, Record<number, { mark_id: number; marks: number; max_marks: number; status: string }>> = {};

        students?.forEach(student => {
            marksMatrix[student.pid] = {};
        });

        tasks.forEach(task => {
            if (!task.exp_no) return;

            const taskMarks = marks?.filter(m => m.task_id === task.task_id) || [];

            taskMarks.forEach(mark => {
                if (!marksMatrix[mark.stud_pid]) {
                    marksMatrix[mark.stud_pid] = {};
                }
                marksMatrix[mark.stud_pid][task.exp_no] = {
                    mark_id: mark.mark_id,
                    marks: mark.total_marks_obtained,
                    max_marks: task.max_marks,
                    status: mark.status
                };
            });
        });
        return NextResponse.json({
            allotment,
            students: students || [],
            experiments: experimentsWithLOs,
            marksMatrix
        });

    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
