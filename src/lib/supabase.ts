import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types based on schema
export interface Teacher {
    teacher_id: number;
    user_id: string | null;
    teacher_name: string;
    designation: string | null;
    department: string | null;
    email: string | null;
}

export interface Student {
    pid: number;
    user_id: string | null;
    stud_name: string;
    class_name: string;
    batch: number | null;
    roll_no: number | null;
    course: string | null;
    email_id: string | null;
}

export interface CO {
    sub_id: string;
    co_no: number;
    co_description: string;
}

export interface LO {
    sub_id: string;
    lo_no: number;
    lo_description: string;
}

export interface Experiment {
    sub_id: string;
    exp_no: number;
    exp_name: string;
}

export interface Allotment {
    allotment_id: number;
    teacher_id: number;
    sub_id: string;
    class_name: string;
    batch_no: number | null;
    is_subject_incharge: boolean;
    course: string | null;
    type: 'Lec' | 'Lab';
}

export interface MCQQuestion {
    id: string;
    text: string;
    options: string[];
    correctOptionIndex: number;
    marks: number;
}

export interface SubQuestion {
    label: string;
    co: string;
    marks: number;
}

export interface DBTask {
    task_id: number;
    allotment_id: number;
    title: string;
    description: string | null;
    task_type: 'Lec' | 'Lab';
    assessment_type: 'ISE' | 'MSE' | null;
    assessment_sub_type: 'Subjective' | 'MCQ' | null;
    sub_id: string;
    exp_no: number | null;
    max_marks: number;
    start_time: string | null;
    end_time: string | null;
    created_at: string;
    mcq_questions: MCQQuestion[] | null;
    sub_questions: SubQuestion[] | null;
}

export interface QuestionMarks {
    [key: string]: number;
}

export interface Marks {
    mark_id: number;
    task_id: number;
    stud_pid: number;
    total_marks_obtained: number;
    question_marks: QuestionMarks | null;
    status: 'Submitted' | 'Graded' | 'Late' | 'Absent';
    submitted_at: string;
}

// Helper function to get teacher by email
export async function getTeacherByEmail(email: string): Promise<Teacher | null> {
    const { data, error } = await supabase
        .from('teacher')
        .select('*')
        .eq('email', email)
        .single();

    if (error) {
        console.error('Error fetching teacher:', error);
        return null;
    }
    return data;
}

// Helper function to get student by email
export async function getStudentByEmail(email: string): Promise<Student | null> {
    // Look up student by email_id column
    const { data, error } = await supabase
        .from('student')
        .select('*')
        .eq('email_id', email)
        .single();

    if (error) {
        console.error('Error fetching student:', error);
        return null;
    }
    return data;
}
