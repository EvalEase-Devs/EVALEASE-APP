import { NextRequest, NextResponse } from 'next/server';
import { supabase, getStudentByEmail } from '@/lib/supabase';
import { auth } from '@/lib/auth';

// PUT /api/student/assignments/[marksId] - Submit marks for an assignment
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ marksId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const student = await getStudentByEmail(session.user.email);
        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        const { marksId } = await params;
        const body = await request.json();
        const { marks_obtained, question_marks } = body;

        if (marks_obtained === undefined || marks_obtained === null) {
            return NextResponse.json(
                { error: 'marks_obtained is required' },
                { status: 400 }
            );
        }

        if (typeof marks_obtained !== 'number' || marks_obtained < 0) {
            return NextResponse.json(
                { error: 'marks_obtained must be a positive number' },
                { status: 400 }
            );
        }

        // Verify this marks entry belongs to the student
        const { data: markEntry } = await supabase
            .from('marks')
            .select('mark_id, stud_pid, task_id, status, task:task_id(max_marks)')
            .eq('mark_id', parseInt(marksId))
            .single();

        if (!markEntry) {
            return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
        }

        if (markEntry.stud_pid !== student.pid) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        // Validate marks don't exceed max_marks
        const maxMarks = (markEntry.task as any)?.max_marks || 100;
        if (marks_obtained > maxMarks) {
            return NextResponse.json(
                { error: `marks_obtained cannot exceed max_marks (${maxMarks})` },
                { status: 400 }
            );
        }

        // Update marks
        // Prevent re-submission if already submitted
        if (markEntry.status === 'Submitted') {
            return NextResponse.json({ error: 'Already submitted' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('marks')
            .update({
                total_marks_obtained: marks_obtained,
                question_marks: question_marks || null,
                status: 'Submitted',
                submitted_at: new Date().toISOString()
            })
            .eq('mark_id', parseInt(marksId))
            .select()
            .single();

        if (error) {
            console.error('Error updating marks:', error);
            return NextResponse.json({ error: 'Failed to submit marks' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
