import { NextRequest, NextResponse } from 'next/server';
import { supabase, getStudentByEmail } from '@/lib/supabase';
import { auth } from '@/lib/auth';
import { getUserRole } from '@/lib/types';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/student/tasks/[id] - Get a specific task for MCQ taking
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = getUserRole(session.user.email);
        if (role !== 'student') {
            return NextResponse.json({ error: 'Not a student' }, { status: 403 });
        }

        const student = await getStudentByEmail(session.user.email);
        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        const { id } = await params;
        const taskId = parseInt(id);

        // Get task with allotment info
        const { data: task, error } = await supabase
            .from('task')
            .select('*, allotment:allotment_id(class_name, batch_no, type)')
            .eq('task_id', taskId)
            .single();

        if (error || !task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Verify student is in the right class
        const allotment = task.allotment as any;
        if (allotment.class_name !== student.class_name) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        // Check batch for lab
        if (allotment.type === 'Lab' && allotment.batch_no !== 0 && allotment.batch_no !== student.batch) {
            return NextResponse.json({ error: 'Not authorized for this batch' }, { status: 403 });
        }

        // Check if already submitted
        const { data: existingMark } = await supabase
            .from('marks')
            .select('*')
            .eq('task_id', taskId)
            .eq('stud_pid', student.pid)
            .single();

        // For MCQ, hide correct answers if not submitted yet
        let mcqQuestions = task.mcq_questions;
        if (task.assessment_sub_type === 'MCQ' && mcqQuestions && !existingMark) {
            // Remove correct answers for unsumbitted MCQ
            mcqQuestions = (mcqQuestions as any[]).map(q => ({
                id: q.id,
                text: q.text,
                options: q.options,
                marks: q.marks
                // correctOptionIndex is removed
            }));
        }

        // Check timing for MCQ
        let canAttempt = true;
        let message = '';
        const now = new Date();

        if (task.assessment_sub_type === 'MCQ') {
            if (task.start_time && new Date(task.start_time) > now) {
                canAttempt = false;
                message = 'Test has not started yet';
            }
            if (task.end_time && new Date(task.end_time) < now) {
                canAttempt = false;
                message = 'Test has ended';
            }
        }

        if (existingMark) {
            canAttempt = false;
            message = 'Already submitted';
        }

        return NextResponse.json({
            ...task,
            mcq_questions: mcqQuestions,
            submission: existingMark ? {
                marks_obtained: existingMark.total_marks_obtained,
                question_marks: existingMark.question_marks,
                status: existingMark.status,
                submitted_at: existingMark.submitted_at
            } : null,
            canAttempt,
            message
        });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
