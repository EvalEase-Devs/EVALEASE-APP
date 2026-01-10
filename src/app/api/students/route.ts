import { NextRequest, NextResponse } from 'next/server';
import { supabase, getTeacherByEmail } from '@/lib/supabase';
import { auth } from '@/lib/auth';

// GET /api/students - Get students by class and optionally batch (for teacher)
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
        const className = searchParams.get('class_name');
        const batch = searchParams.get('batch');

        if (!className) {
            return NextResponse.json({ error: 'class_name is required' }, { status: 400 });
        }

        let query = supabase
            .from('student')
            .select('pid, stud_name, roll_no, batch, class_name')
            .eq('class_name', className)
            .order('roll_no', { ascending: true });

        if (batch && batch !== '0') {
            query = query.eq('batch', parseInt(batch));
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching students:', error);
            return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
