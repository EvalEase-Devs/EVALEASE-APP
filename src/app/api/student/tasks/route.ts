import { NextRequest, NextResponse } from 'next/server';
import { supabase, getStudentByEmail } from '@/lib/supabase';
import { auth } from '@/lib/auth';
import { getUserRole } from '@/lib/types';

// GET /api/student/tasks - Get all tasks for the logged-in student
export async function GET(request: NextRequest) {
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

        console.log('Student found:', {
            pid: student.pid,
            class_name: student.class_name,
            batch: student.batch
        });

        // Get allotments for student's class
        const { data: allotments, error: allotError } = await supabase
            .from('allotment')
            .select('allotment_id, sub_id, type, batch_no, class_name')
            .eq('class_name', student.class_name);

        console.log('Allotments found for class:', allotments);

        if (allotError) {
            console.error('Error fetching allotments:', allotError);
            return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
        }

        // Filter allotments by batch for lab subjects
        const relevantAllotments = allotments.filter(a => {
            if (a.type === 'Lab') {
                return a.batch_no === student.batch || a.batch_no === 0 || a.batch_no === null;
            }
            return true; // Lec applies to all
        });

        console.log('Relevant allotments after batch filter:', relevantAllotments);

        if (relevantAllotments.length === 0) {
            return NextResponse.json([]);
        }

        const allotmentIds = relevantAllotments.map(a => a.allotment_id);

        console.log('Allotment IDs to search tasks:', allotmentIds);

        // Get tasks for these allotments
        const { data: tasks, error: taskError } = await supabase
            .from('task')
            .select('*')
            .in('allotment_id', allotmentIds)
            .order('created_at', { ascending: false });

        console.log('Tasks found:', tasks?.length, tasks);

        if (taskError) {
            console.error('Error fetching tasks:', taskError);
            return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
        }

        // Get student's marks for these tasks
        const taskIds = tasks.map(t => t.task_id);
        const { data: marks } = await supabase
            .from('marks')
            .select('task_id, total_marks_obtained, status')
            .eq('stud_pid', student.pid)
            .in('task_id', taskIds);

        // Combine tasks with marks
        const tasksWithStatus = tasks.map(task => {
            const mark = marks?.find(m => m.task_id === task.task_id);
            return {
                ...task,
                submission: mark ? {
                    marks_obtained: mark.total_marks_obtained,
                    status: mark.status
                } : null
            };
        });

        return NextResponse.json(tasksWithStatus);
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
