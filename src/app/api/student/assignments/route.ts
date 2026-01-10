import { NextRequest, NextResponse } from 'next/server';
import { supabase, getStudentByEmail } from '@/lib/supabase';
import { auth } from '@/lib/auth';

// GET /api/student/assignments - Get all assignments for logged-in student
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const student = await getStudentByEmail(session.user.email);
        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status'); // Filter by status: PENDING, SUBMITTED

        // Fetch marks for this student with task details
        let query = supabase
            .from('marks')
            .select(`
                mark_id,
                task_id,
                total_marks_obtained,
                status,
                submitted_at,
                task:task_id(
                    task_id,
                    title,
                    task_type,
                    assessment_type,
                    assessment_sub_type,
                    sub_id,
                    exp_no,
                    max_marks,
                    start_time,
                    end_time,
                    sub_questions,
                    allotment:allotment_id(
                        allotment_id,
                        sub_name,
                        class_name,
                        batch_no
                    )
                )
            `)
            .eq('stud_pid', student.pid)
            .order('submitted_at', { ascending: false, nullsFirst: true });

        if (status) {
            query = query.eq('status', status.toUpperCase());
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching assignments:', error);
            return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
