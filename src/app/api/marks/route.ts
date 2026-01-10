import { NextRequest, NextResponse } from 'next/server';
import { supabase, getTeacherByEmail, getStudentByEmail } from '@/lib/supabase';
import { auth } from '@/lib/auth';
import { getUserRole } from '@/lib/types';

// GET /api/marks - Get marks (teacher gets all for their tasks, student gets their own)
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = getUserRole(session.user.email);
        const searchParams = request.nextUrl.searchParams;
        const taskId = searchParams.get('task_id');

        if (role === 'teacher') {
            const teacher = await getTeacherByEmail(session.user.email);
            if (!teacher) {
                return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
            }

            if (!taskId) {
                return NextResponse.json({ error: 'task_id is required' }, { status: 400 });
            }

            // Verify task belongs to teacher
            const { data: task } = await supabase
                .from('task')
                .select('allotment:allotment_id(teacher_id)')
                .eq('task_id', parseInt(taskId))
                .single();

            if (!task || (task.allotment as any)?.teacher_id !== teacher.teacher_id) {
                return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
            }

            // Get all marks for this task with student info
            const { data, error } = await supabase
                .from('marks')
                .select('*, student:stud_pid(pid, stud_name, roll_no)')
                .eq('task_id', parseInt(taskId));

            if (error) {
                console.error('Error fetching marks:', error);
                return NextResponse.json({ error: 'Failed to fetch marks' }, { status: 500 });
            }

            return NextResponse.json(data);

        } else if (role === 'student') {
            const student = await getStudentByEmail(session.user.email);
            if (!student) {
                return NextResponse.json({ error: 'Student not found' }, { status: 404 });
            }

            let query = supabase
                .from('marks')
                .select('*, task:task_id(*)')
                .eq('stud_pid', student.pid);

            if (taskId) {
                query = query.eq('task_id', parseInt(taskId));
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching marks:', error);
                return NextResponse.json({ error: 'Failed to fetch marks' }, { status: 500 });
            }

            return NextResponse.json(data);
        }

        return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/marks - Submit marks (teacher for grading, student for MCQ submission)
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = getUserRole(session.user.email);
        const body = await request.json();

        if (role === 'teacher') {
            // Teacher bulk grading
            const teacher = await getTeacherByEmail(session.user.email);
            if (!teacher) {
                return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
            }

            const { task_id, marks_entries } = body;
            // marks_entries: [{ stud_pid, total_marks_obtained, question_marks, status }]

            if (!task_id || !marks_entries || !Array.isArray(marks_entries)) {
                return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
            }

            // Verify task belongs to teacher
            const { data: task } = await supabase
                .from('task')
                .select('allotment:allotment_id(teacher_id)')
                .eq('task_id', task_id)
                .single();

            if (!task || (task.allotment as any)?.teacher_id !== teacher.teacher_id) {
                return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
            }

            // Upsert marks entries
            const marksData = marks_entries.map((entry: any) => ({
                task_id,
                stud_pid: entry.stud_pid,
                total_marks_obtained: entry.total_marks_obtained,
                question_marks: entry.question_marks || null,
                status: entry.status || 'Graded'
            }));

            const { data, error } = await supabase
                .from('marks')
                .upsert(marksData, { onConflict: 'task_id,stud_pid' })
                .select();

            if (error) {
                console.error('Error saving marks:', error);
                return NextResponse.json({ error: 'Failed to save marks' }, { status: 500 });
            }

            return NextResponse.json(data, { status: 201 });

        } else if (role === 'student') {
            // Student MCQ submission
            const student = await getStudentByEmail(session.user.email);
            if (!student) {
                return NextResponse.json({ error: 'Student not found' }, { status: 404 });
            }

            const { task_id, answers } = body;
            // answers: { question_id: selected_option_index }

            if (!task_id || !answers) {
                return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
            }

            // Get the task to verify it's an MCQ and get correct answers
            const { data: task, error: taskError } = await supabase
                .from('task')
                .select('*, allotment:allotment_id(class_name, batch_no)')
                .eq('task_id', task_id)
                .single();

            if (taskError || !task) {
                return NextResponse.json({ error: 'Task not found' }, { status: 404 });
            }

            // Verify student is in the right class/batch
            if ((task.allotment as any)?.class_name !== student.class_name) {
                return NextResponse.json({ error: 'Not authorized for this task' }, { status: 403 });
            }

            // Check if task is MCQ
            if (task.assessment_sub_type !== 'MCQ' || !task.mcq_questions) {
                return NextResponse.json({ error: 'This is not an MCQ task' }, { status: 400 });
            }

            // Check timing
            const now = new Date();
            if (task.start_time && new Date(task.start_time) > now) {
                return NextResponse.json({ error: 'Test has not started yet' }, { status: 400 });
            }
            if (task.end_time && new Date(task.end_time) < now) {
                return NextResponse.json({ error: 'Test has ended' }, { status: 400 });
            }

            // Check if already submitted
            const { data: existingMark } = await supabase
                .from('marks')
                .select('mark_id')
                .eq('task_id', task_id)
                .eq('stud_pid', student.pid)
                .single();

            if (existingMark) {
                return NextResponse.json({ error: 'Already submitted' }, { status: 400 });
            }

            // Calculate score
            const questions = task.mcq_questions as any[];
            let totalScore = 0;
            const questionMarks: Record<string, number> = {};

            questions.forEach((q: any) => {
                const studentAnswer = answers[q.id];
                if (studentAnswer === q.correctOptionIndex) {
                    questionMarks[q.id] = q.marks;
                    totalScore += q.marks;
                } else {
                    questionMarks[q.id] = 0;
                }
            });

            // Save the submission
            const { data, error } = await supabase
                .from('marks')
                .insert({
                    task_id,
                    stud_pid: student.pid,
                    total_marks_obtained: totalScore,
                    question_marks: questionMarks,
                    status: 'Graded'
                })
                .select()
                .single();

            if (error) {
                console.error('Error submitting MCQ:', error);
                return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
            }

            return NextResponse.json({
                ...data,
                score: totalScore,
                maxMarks: task.max_marks
            }, { status: 201 });
        }

        return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
    } catch (error) {
        console.error('Server error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
