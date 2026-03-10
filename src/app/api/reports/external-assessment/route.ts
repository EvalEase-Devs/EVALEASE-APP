import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTeacherByEmail, supabase } from '@/lib/supabase';
import { SUBJECT_TARGETS } from '@/app/teacher/assignments/create/constants';

type AssessmentKind = 'ESE' | 'EXTERNAL_VIVA';

interface CsvRowInput {
    roll_no?: number | string | null;
    pid?: number | string | null;
    stud_name?: string | null;
    obtained_marks?: number | string | null;
    out_of?: number | string | null;
    grade?: string | null;
    gpa?: number | string | null;
}

function toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;
    const normalized = value.trim().replace(/,/g, '');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function getAssessmentKind(type: string): AssessmentKind {
    return type === 'Lab' ? 'EXTERNAL_VIVA' : 'ESE';
}

function getSubjectTarget(subId: string): number {
    const configured = SUBJECT_TARGETS[subId as keyof typeof SUBJECT_TARGETS];
    return typeof configured === 'number' ? configured : 65;
}

function computeAttainment(percentageAboveTarget: number): number {
    if (percentageAboveTarget >= 60) return 3;
    if (percentageAboveTarget >= 50) return 2;
    return 1;
}

async function getAuthorizedAllotment(allotmentId: number, teacherId: number) {
    const { data, error } = await supabase
        .from('allotment')
        .select('*')
        .eq('allotment_id', allotmentId)
        .eq('teacher_id', teacherId)
        .single();

    if (error || !data) return null;
    return data;
}

async function getOrCreateAssessmentTask(allotment: any, assessmentKind: AssessmentKind, maxOutOf: number): Promise<number> {
    const { data: existingTask } = await supabase
        .from('task')
        .select('task_id')
        .eq('allotment_id', allotment.allotment_id)
        .eq('assessment_type', assessmentKind)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingTask?.task_id) return existingTask.task_id;

    const title = assessmentKind === 'ESE'
        ? `${allotment.sub_id} - ESE Attainment`
        : `${allotment.sub_id} - External Viva Attainment`;

    const { data: insertedTask, error: insertError } = await supabase
        .from('task')
        .insert({
            allotment_id: allotment.allotment_id,
            title,
            task_type: allotment.type,
            assessment_type: assessmentKind,
            assessment_sub_type: 'CSV',
            sub_id: allotment.sub_id,
            exp_no: null,
            max_marks: maxOutOf,
            start_time: null,
            end_time: null,
        })
        .select('task_id')
        .single();

    if (insertError || !insertedTask) {
        throw new Error(insertError?.message || 'Failed to create assessment task');
    }

    return insertedTask.task_id;
}

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

        const allotmentIdRaw = request.nextUrl.searchParams.get('allotment_id');
        if (!allotmentIdRaw) {
            return NextResponse.json({ error: 'allotment_id required' }, { status: 400 });
        }

        const allotmentId = Number(allotmentIdRaw);
        if (!Number.isFinite(allotmentId)) {
            return NextResponse.json({ error: 'Invalid allotment_id' }, { status: 400 });
        }

        const allotment = await getAuthorizedAllotment(allotmentId, teacher.teacher_id);
        if (!allotment) {
            return NextResponse.json({ error: 'Allotment not found or unauthorized' }, { status: 403 });
        }

        if (!allotment.is_subject_incharge) {
            return NextResponse.json({ error: 'Only subject incharge can access this report' }, { status: 403 });
        }

        const assessmentKind = getAssessmentKind(allotment.type);
        const subjectTarget = getSubjectTarget(allotment.sub_id);

        const { data: latestUpload } = await supabase
            .from('attainment_csv_upload')
            .select('*')
            .eq('allotment_id', allotmentId)
            .eq('assessment_kind', assessmentKind)
            .order('uploaded_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        let rows: any[] = [];
        let uploadMeta: any = null;

        if (latestUpload) {
            uploadMeta = latestUpload;
            const { data: rowData } = await supabase
                .from('attainment_csv_marks')
                .select('roll_no, stud_pid, stud_name, obtained_marks, out_of, percent, grade, gpa, status, is_valid')
                .eq('upload_id', latestUpload.upload_id)
                .order('roll_no', { ascending: true })
                .order('stud_pid', { ascending: true });
            rows = rowData || [];
        }

        const validRows = rows.filter(r => r.is_valid);
        const totalStudents = validRows.length;
        const countAboveTarget = validRows.filter((row) => Number(row.percent || 0) >= subjectTarget).length;
        const percentageAboveTarget = totalStudents > 0
            ? Number(((countAboveTarget / totalStudents) * 100).toFixed(2))
            : 0;
        const attainment = computeAttainment(percentageAboveTarget);

        const isLab = allotment.type === 'Lab';
        const outcomePrefix = isLab ? 'LO' : 'CO';
        const outcomeType = isLab ? 'LO' : 'CO';

        let outcomeNos: number[] = [];

        if (isLab) {
            // For External Viva, show only LOs that are actually mapped to experiments for this subject.
            const { data: loMappings } = await supabase
                .from('experiment_lo_mapping')
                .select('lo_no')
                .eq('sub_id', allotment.sub_id)
                .order('lo_no', { ascending: true });

            outcomeNos = Array.from(new Set((loMappings || []).map((item: any) => Number(item.lo_no))));
        } else {
            const { data: cos } = await supabase
                .from('co')
                .select('co_no')
                .eq('sub_id', allotment.sub_id)
                .order('co_no', { ascending: true });

            outcomeNos = (cos || []).map((item: any) => Number(item.co_no));
        }

        const attainmentRows = outcomeNos.map((no: number) => ({
            label: `${outcomePrefix}${no}`,
            attainment,
        }));

        return NextResponse.json({
            allotment: {
                allotment_id: allotment.allotment_id,
                sub_id: allotment.sub_id,
                sub_name: allotment.sub_name,
                class_name: allotment.class_name,
                current_sem: allotment.current_sem,
                type: allotment.type,
            },
            assessment_kind: assessmentKind,
            outcome_type: outcomeType,
            subject_target: subjectTarget,
            upload_meta: uploadMeta,
            rows: validRows,
            summary: {
                total_students: totalStudents,
                count_above_target: countAboveTarget,
                percentage_above_target: percentageAboveTarget,
                attainment,
            },
            outcomes_addressed: attainmentRows,
        });
    } catch (error) {
        console.error('Error in external assessment report GET:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

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
        const allotmentId = Number(body.allotment_id);
        const inputRows = Array.isArray(body.rows) ? (body.rows as CsvRowInput[]) : [];
        const fileName = typeof body.file_name === 'string' ? body.file_name : null;

        if (!Number.isFinite(allotmentId)) {
            return NextResponse.json({ error: 'Invalid allotment_id' }, { status: 400 });
        }

        if (inputRows.length === 0) {
            return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
        }

        const allotment = await getAuthorizedAllotment(allotmentId, teacher.teacher_id);
        if (!allotment) {
            return NextResponse.json({ error: 'Allotment not found or unauthorized' }, { status: 403 });
        }

        if (!allotment.is_subject_incharge) {
            return NextResponse.json({ error: 'Only subject incharge can upload this report' }, { status: 403 });
        }

        const assessmentKind = getAssessmentKind(allotment.type);
        const subjectTarget = getSubjectTarget(allotment.sub_id);

        const normalizedRows = inputRows.map((row) => {
            const rollNo = toNumber(row.roll_no);
            const pid = toNumber(row.pid);
            const obtained = toNumber(row.obtained_marks);
            const outOf = toNumber(row.out_of);
            const gpa = toNumber(row.gpa);
            const studName = (row.stud_name || '').trim();

            const errors: string[] = [];
            if (!studName) errors.push('Missing student name');
            if (!pid) errors.push('Missing/invalid PID');
            if (obtained === null || obtained < 0) errors.push('Invalid obtained marks');
            if (outOf === null || outOf <= 0) errors.push('Invalid out of marks');

            return {
                roll_no: rollNo,
                stud_pid: pid,
                stud_name: studName || 'Unknown',
                obtained_marks: obtained ?? 0,
                out_of: outOf ?? 0,
                grade: row.grade?.trim() || null,
                gpa,
                status: errors.length === 0 ? 'Submitted' : 'Pending',
                is_valid: errors.length === 0,
                error_message: errors.length > 0 ? errors.join('; ') : null,
            };
        });

        const validRows = normalizedRows.filter((row) => row.is_valid);
        if (validRows.length === 0) {
            return NextResponse.json({ error: 'CSV has no valid rows' }, { status: 400 });
        }

        const maxOutOf = validRows.reduce((max, row) => Math.max(max, Number(row.out_of || 0)), 0);
        const taskId = await getOrCreateAssessmentTask(allotment, assessmentKind, maxOutOf);

        // Mark older valid rows for this task as non-active to avoid unique index conflicts.
        await supabase
            .from('attainment_csv_marks')
            .update({ is_valid: false, status: 'Pending' })
            .eq('task_id', taskId)
            .eq('is_valid', true);

        const { data: uploadRow, error: uploadErr } = await supabase
            .from('attainment_csv_upload')
            .insert({
                task_id: taskId,
                allotment_id: allotmentId,
                assessment_kind: assessmentKind,
                file_name: fileName,
                uploaded_by: teacher.teacher_id,
                subject_target: subjectTarget,
                total_rows: normalizedRows.length,
                valid_rows: validRows.length,
                invalid_rows: normalizedRows.length - validRows.length,
            })
            .select('upload_id')
            .single();

        if (uploadErr || !uploadRow) {
            return NextResponse.json({ error: uploadErr?.message || 'Failed to create upload record' }, { status: 500 });
        }

        const insertRows = normalizedRows.map((row) => ({
            upload_id: uploadRow.upload_id,
            task_id: taskId,
            roll_no: row.roll_no,
            stud_pid: row.stud_pid,
            stud_name: row.stud_name,
            obtained_marks: row.obtained_marks,
            out_of: row.out_of,
            grade: row.grade,
            gpa: row.gpa,
            status: row.status,
            submitted_at: new Date().toISOString(),
            is_valid: row.is_valid,
            error_message: row.error_message,
        }));

        const { error: marksInsertError } = await supabase
            .from('attainment_csv_marks')
            .insert(insertRows);

        if (marksInsertError) {
            return NextResponse.json({ error: marksInsertError.message || 'Failed to save CSV rows' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            upload_id: uploadRow.upload_id,
            total_rows: normalizedRows.length,
            valid_rows: validRows.length,
            invalid_rows: normalizedRows.length - validRows.length,
        });
    } catch (error) {
        console.error('Error in external assessment report POST:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
