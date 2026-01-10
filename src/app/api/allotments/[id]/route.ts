import { NextRequest, NextResponse } from 'next/server';
import { supabase, getTeacherByEmail } from '@/lib/supabase';
import { auth } from '@/lib/auth';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/allotments/[id] - Get a specific allotment
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const allotmentId = parseInt(id);

        const { data, error } = await supabase
            .from('allotment')
            .select('*')
            .eq('allotment_id', allotmentId)
            .single();

        if (error) {
            console.error('Error fetching allotment:', error);
            return NextResponse.json({ error: 'Allotment not found' }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/allotments/[id] - Delete an allotment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
        const allotmentId = parseInt(id);

        // Verify the allotment belongs to this teacher
        const { data: allotment } = await supabase
            .from('allotment')
            .select('teacher_id')
            .eq('allotment_id', allotmentId)
            .single();

        if (!allotment || allotment.teacher_id !== teacher.teacher_id) {
            return NextResponse.json({ error: 'Not authorized to delete this allotment' }, { status: 403 });
        }

        const { error } = await supabase
            .from('allotment')
            .delete()
            .eq('allotment_id', allotmentId);

        if (error) {
            console.error('Error deleting allotment:', error);
            return NextResponse.json({ error: 'Failed to delete allotment' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Allotment deleted successfully' });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
