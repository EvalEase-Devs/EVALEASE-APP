import { NextRequest, NextResponse } from 'next/server';
import { supabase, getTeacherByEmail } from '@/lib/supabase';
import { auth } from '@/lib/auth';

// GET /api/tasks - Get all tasks for logged-in teacher
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

        // Get allotment_ids for this teacher
        const { data: allotments } = await supabase
            .from('allotment')
            .select('allotment_id')
            .eq('teacher_id', teacher.teacher_id);

        if (!allotments || allotments.length === 0) {
            return NextResponse.json([]);
        }

        const allotmentIds = allotments.map(a => a.allotment_id);

        // Optional filters from query params
        const searchParams = request.nextUrl.searchParams;
        const allotmentId = searchParams.get('allotment_id');
        const subId = searchParams.get('sub_id');
        const taskType = searchParams.get('task_type');

        let query = supabase
            .from('task')
            .select('*, allotment:allotment_id(*), task_co_mapping(co_id, co:co_id(co_id, co_name))')
            .in('allotment_id', allotmentIds)
            .order('created_at', { ascending: false });

        if (allotmentId) {
            query = query.eq('allotment_id', parseInt(allotmentId));
        }
        if (subId) {
            query = query.eq('sub_id', subId);
        }
        if (taskType) {
            query = query.eq('task_type', taskType);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching tasks:', error);
            return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const teacher = await getTeacherByEmail(session.user.email);
        if (!teacher) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }

        const body = await request.json();
        const {
            allotment_id,
            title,
            task_type,
            assessment_type,
            assessment_sub_type,
            sub_id,
            exp_no,
            max_marks,
            start_time,
            end_time,
            mcq_questions,
            sub_questions,
            mapped_cos // Array of CO numbers like [1, 2, 3]
        } = body;

        // Validate required fields
        if (!allotment_id || !title || !task_type || !sub_id || max_marks === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Verify allotment belongs to this teacher
        const { data: allotment } = await supabase
            .from('allotment')
            .select('teacher_id')
            .eq('allotment_id', allotment_id)
            .single();

        if (!allotment || allotment.teacher_id !== teacher.teacher_id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        // Create the task
        const { data: task, error: taskError } = await supabase
            .from('task')
            .insert({
                allotment_id,
                title,
                task_type,
                assessment_type: assessment_type || null,
                assessment_sub_type: assessment_sub_type || null,
                sub_id,
                exp_no: exp_no || null,
                max_marks,
                start_time: start_time || null,
                end_time: end_time || null,
                mcq_questions: mcq_questions || null,
                sub_questions: sub_questions || null
            })
            .select()
            .single();

        if (taskError) {
            console.error('Error creating task:', taskError);
            return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
        }

        // Create CO mappings if provided
        if (mapped_cos && mapped_cos.length > 0) {
            const coMappings = mapped_cos.map((co_no: number) => ({
                task_id: task.task_id,
                sub_id,
                co_no
            }));

            const { error: coError } = await supabase
                .from('task_co_mapping')
                .insert(coMappings);

            if (coError) {
                console.error('Error creating CO mappings:', coError);
                // Don't fail the whole request, just log the error
            }
        }

        return NextResponse.json(task, { status: 201 });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
