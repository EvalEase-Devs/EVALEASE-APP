import { NextRequest, NextResponse } from 'next/server';
import { supabase, getTeacherByEmail } from '@/lib/supabase';
import { auth } from '@/lib/auth';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/tasks/[id] - Get a specific task with its CO mappings
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const taskId = parseInt(id);

        const { data: task, error } = await supabase
            .from('task')
            .select('*, allotment:allotment_id(*)')
            .eq('task_id', taskId)
            .single();

        if (error) {
            console.error('Error fetching task:', error);
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Get CO mappings
        const { data: coMappings } = await supabase
            .from('task_co_mapping')
            .select('co_no')
            .eq('task_id', taskId);

        return NextResponse.json({
            ...task,
            mapped_cos: coMappings?.map(m => m.co_no) || []
        });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT /api/tasks/[id] - Update a task
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

        const { id } = await params;
        const taskId = parseInt(id);
        const body = await request.json();

        // Verify task belongs to this teacher
        const { data: task } = await supabase
            .from('task')
            .select('allotment_id, allotment:allotment_id(teacher_id)')
            .eq('task_id', taskId)
            .single();

        if (!task || (task.allotment as any)?.teacher_id !== teacher.teacher_id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        const {
            title,
            description,
            max_marks,
            start_time,
            end_time,
            mcq_questions,
            sub_questions,
            mapped_cos
        } = body;

        const { data: updatedTask, error } = await supabase
            .from('task')
            .update({
                title,
                description,
                max_marks,
                start_time,
                end_time,
                mcq_questions,
                sub_questions
            })
            .eq('task_id', taskId)
            .select()
            .single();

        if (error) {
            console.error('Error updating task:', error);
            return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
        }

        // Update CO mappings if provided
        if (mapped_cos) {
            // Delete existing mappings
            await supabase
                .from('task_co_mapping')
                .delete()
                .eq('task_id', taskId);

            // Insert new mappings
            if (mapped_cos.length > 0) {
                const coMappings = mapped_cos.map((co_no: number) => ({
                    task_id: taskId,
                    sub_id: updatedTask.sub_id,
                    co_no
                }));

                await supabase
                    .from('task_co_mapping')
                    .insert(coMappings);
            }
        }

        return NextResponse.json(updatedTask);
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/tasks/[id] - Delete a task
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
        const taskId = parseInt(id);

        // Verify task belongs to this teacher
        const { data: task } = await supabase
            .from('task')
            .select('allotment_id, allotment:allotment_id(teacher_id)')
            .eq('task_id', taskId)
            .single();

        if (!task || (task.allotment as any)?.teacher_id !== teacher.teacher_id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        const { error } = await supabase
            .from('task')
            .delete()
            .eq('task_id', taskId);

        if (error) {
            console.error('Error deleting task:', error);
            return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
