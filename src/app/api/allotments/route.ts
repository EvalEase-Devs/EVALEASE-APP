import { NextRequest, NextResponse } from 'next/server';
import { supabase, getTeacherByEmail } from '@/lib/supabase';
import { auth } from '@/lib/auth';

// GET /api/allotments - Get all allotments for logged-in teacher
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

        const { data, error } = await supabase
            .from('allotment')
            .select('*')
            .eq('teacher_id', teacher.teacher_id);

        if (error) {
            console.error('Error fetching allotments:', error);
            return NextResponse.json({ error: 'Failed to fetch allotments' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/allotments - Create a new allotment
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
        const { sub_id, sub_name, class_name, batch_no, is_subject_incharge, course, type, current_sem } = body;

        // Validate required fields
        if (!sub_id || !sub_name || !class_name || !type || !current_sem) {
            return NextResponse.json(
                { error: 'Missing required fields: sub_id, sub_name, class_name, type, current_sem' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('allotment')
            .insert({
                teacher_id: teacher.teacher_id,
                sub_id,
                sub_name,
                class_name,
                batch_no: batch_no || null,
                is_subject_incharge: is_subject_incharge || false,
                course: course || null,
                type,
                current_sem
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating allotment:', error);
            return NextResponse.json({ error: 'Failed to create allotment' }, { status: 500 });
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
