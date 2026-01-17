import { NextRequest, NextResponse } from 'next/server';
import { supabase, getTeacherByEmail } from '@/lib/supabase';
import { auth } from '@/lib/auth';

interface RouteParams {
    params: Promise<{ markId: string }>;
}

// PUT /api/marks/[markId] - Update marks (teacher only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const teacher = await getTeacherByEmail(session.user.email);
        if (!teacher) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }

        const { markId } = await params;
        const body = await request.json();
        const { total_marks_obtained, question_marks } = body;

        if (total_marks_obtained === undefined || total_marks_obtained === null) {
            return NextResponse.json({ error: 'total_marks_obtained is required' }, { status: 400 });
        }

        // Get the mark to verify it belongs to this teacher's task
        const { data: mark } = await supabase
            .from('marks')
            .select('mark_id, task_id, task:task_id(allotment:allotment_id(teacher_id))')
            .eq('mark_id', parseInt(markId))
            .single();

        if (!mark || (mark.task as any)?.allotment?.teacher_id !== teacher.teacher_id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        // Update the marks
        const { data: updated, error } = await supabase
            .from('marks')
            .update({
                total_marks_obtained,
                question_marks: question_marks || null,
            })
            .eq('mark_id', parseInt(markId))
            .select()
            .single();

        if (error) {
            console.error('Error updating marks:', error);
            return NextResponse.json({ error: 'Failed to update marks' }, { status: 500 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
