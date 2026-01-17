import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { supabase, getTeacherByEmail } from '@/lib/supabase';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/tasks/[id]/students - Students for a task (pending first)
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const teacher = await getTeacherByEmail(session.user.email);
        if (!teacher) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }

        const { id } = await params;
        const taskId = parseInt(id);

        // Verify the task belongs to this teacher
        const { data: task } = await supabase
            .from('task')
            .select('task_id, allotment:allotment_id(teacher_id)')
            .eq('task_id', taskId)
            .single();

        if (!task || (task.allotment as any)?.teacher_id !== teacher.teacher_id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        // Fetch students for this task with their marks status and scores
        const { data, error } = await supabase
            .from('marks')
            .select('mark_id, status, stud_pid, total_marks_obtained, question_marks, student:stud_pid(pid, stud_name, roll_no, class_name, batch)')
            .eq('task_id', taskId)
            .order('roll_no', { ascending: true, foreignTable: 'student' });

        if (error) {
            console.error('Error fetching students for task:', error);
            return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
        }

        return NextResponse.json(data || []);
    } catch (err) {
        console.error('Server error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}