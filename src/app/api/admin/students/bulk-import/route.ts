import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/auth';
import { getUserRole } from '@/lib/types';

interface StudentInsertRow {
  pid: number;
  stud_name: string;
  class_name: string;
  batch: number | null;
  roll_no: number | null;
  course: string | null;
  email_id: string | null;
  Academic_year: string | null;
}

interface BulkImportResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  inserted: number;
  rowErrors: Array<{ rowNumber: number; error: string }>;
}

// Middleware: Check if user is admin
async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.email) {
    return null;
  }

  const role = session.user.role || getUserRole(session.user.email);
  return role === 'admin' ? session : null;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  fields.push(current.trim());
  return fields;
}

function validateRow(
  row: string[]
): { valid: true; data: StudentInsertRow } | { valid: false; error: string } {
  const requiredFields = [
    'pid',
    'stud_name',
    'class_name',
    'batch',
    'roll_no',
    'course',
    'email_id',
    'Academic_year',
  ];

  if (row.length < requiredFields.length) {
    return {
      valid: false,
      error: `Insufficient fields. Expected ${requiredFields.length}, got ${row.length}`,
    };
  }

  const [pid, stud_name, class_name, batch, roll_no, course, email_id, academic_year] = row;

  if (!pid || !pid.trim()) {
    return { valid: false, error: 'pid is required' };
  }
  if (!stud_name || !stud_name.trim()) {
    return { valid: false, error: 'stud_name is required' };
  }
  if (!class_name || !class_name.trim()) {
    return { valid: false, error: 'class_name is required' };
  }

  const pidNum = Number(pid.trim());
  if (!Number.isFinite(pidNum)) {
    return { valid: false, error: 'pid must be a number' };
  }

  const batchNum = batch?.trim() ? Number(batch.trim()) : null;
  if (batchNum !== null && (!Number.isFinite(batchNum) || batchNum < 0)) {
    return { valid: false, error: 'batch must be a non-negative number' };
  }

  const rollNo = roll_no?.trim() ? Number(roll_no.trim()) : null;
  if (rollNo !== null && (!Number.isFinite(rollNo) || rollNo < 0)) {
    return { valid: false, error: 'roll_no must be a non-negative number' };
  }

  return {
    valid: true,
    data: {
      pid: Math.trunc(pidNum),
      stud_name: stud_name.trim(),
      class_name: class_name.trim(),
      batch: batchNum === null ? null : Math.trunc(batchNum),
      roll_no: rollNo === null ? null : Math.trunc(rollNo),
      course: course?.trim() || null,
      email_id: email_id?.trim() || null,
      Academic_year: academic_year?.trim() || null,
    },
  };
}

// POST /api/admin/students/bulk-import - Bulk import students from CSV
export async function POST(request: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { csvContent } = body;

    if (!csvContent) {
      return NextResponse.json({ error: 'csvContent is required' }, { status: 400 });
    }

    const lines = csvContent
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);

    if (lines.length === 0) {
      return NextResponse.json({ error: 'CSV is empty' }, { status: 400 });
    }

    // Validate header
    const headerRow = parseCSVLine(lines[0]);
    const expectedHeaders = ['pid', 'stud_name', 'class_name', 'batch', 'roll_no', 'course', 'email_id', 'Academic_year'];
    const actualHeaders = headerRow.map((h: string) => h.trim());

    if (JSON.stringify(actualHeaders) !== JSON.stringify(expectedHeaders)) {
      return NextResponse.json({
        error: `Invalid CSV headers. Expected: ${expectedHeaders.join(', ')}, Got: ${actualHeaders.join(', ')}`,
      }, { status: 400 });
    }

    // Validate and collect rows
    const rowErrors: BulkImportResult['rowErrors'] = [];
    const validRows: StudentInsertRow[] = [];
    const seenPids = new Set<number>();

    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      const validation = validateRow(row);

      if (!validation.valid) {
        rowErrors.push({ rowNumber: i + 1, error: validation.error });
        continue;
      }

      const { pid } = validation.data;

      if (seenPids.has(pid)) {
        rowErrors.push({ rowNumber: i + 1, error: `Duplicate pid ${pid} within CSV` });
        continue;
      }

      seenPids.add(pid);
      validRows.push(validation.data);
    }

    // Check for existing students in DB
    if (validRows.length > 0) {
      const pids = validRows.map(v => v.pid);
      const { data: existing, error: existError } = await supabase
        .from('student')
        .select('pid')
        .in('pid', pids);

      if (existError) {
        return NextResponse.json({ error: 'Failed to check existing students' }, { status: 500 });
      }

      const existingPids = new Set((existing || []).map((e: { pid: number }) => e.pid));
      const toInsert = validRows.filter(v => !existingPids.has(v.pid));
      const existingDups = validRows.filter(v => existingPids.has(v.pid));

      for (const dup of existingDups) {
        const rowNum = lines.findIndex((l: string) => parseCSVLine(l)[0] === String(dup.pid));
        rowErrors.push({ rowNumber: rowNum + 1, error: `Student with pid ${dup.pid} already exists` });
      }

      let inserted = 0;
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('student')
          .insert(toInsert);

        if (insertError) {
          console.error('Insert error:', insertError);
          return NextResponse.json(
            { error: 'Failed to insert students', details: insertError.message },
            { status: 500 }
          );
        }

        inserted = toInsert.length;
      }

      const result: BulkImportResult = {
        success: true,
        totalRows: lines.length - 1,
        validRows: toInsert.length,
        invalidRows: rowErrors.length,
        inserted,
        rowErrors,
      };

      return NextResponse.json(result);
    }

    const result: BulkImportResult = {
      success: true,
      totalRows: lines.length - 1,
      validRows: 0,
      invalidRows: rowErrors.length,
      inserted: 0,
      rowErrors,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
