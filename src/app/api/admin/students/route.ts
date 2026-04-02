import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/auth';
import { getUserRole } from '@/lib/types';

export interface AdminStudent {
  pid: number;
  stud_name: string;
  class_name: string;
  batch: number | null;
  roll_no: number | null;
  course: string | null;
  email_id: string | null;
  Academic_year: string | null;
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

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

// GET /api/admin/students - Fetch all students with optional search/filter
export async function GET(request: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const classFilter = searchParams.get('class_name');
    const batchFilter = searchParams.get('batch');

    let query = supabase
      .from('student')
      .select('*')
      .order('roll_no', { ascending: true, nullsFirst: false });

    if (search) {
      const escapedSearch = search.replace(/,/g, ' ');
      const numericPid = Number(escapedSearch);
      query = Number.isFinite(numericPid)
        ? query.or(
            `stud_name.ilike.%${escapedSearch}%,email_id.ilike.%${escapedSearch}%,pid.eq.${numericPid}`
          )
        : query.or(`stud_name.ilike.%${escapedSearch}%,email_id.ilike.%${escapedSearch}%`);
    }

    if (classFilter) {
      query = query.eq('class_name', classFilter);
    }

    if (batchFilter && batchFilter !== 'null') {
      query = query.eq('batch', parseInt(batchFilter));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching students:', error);
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/students - Create a new student
export async function POST(request: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      pid,
      stud_name,
      class_name,
      batch,
      roll_no,
      course,
      email_id,
      Academic_year,
    } = body;

    // Validate required fields
    if (!pid || !stud_name || !class_name) {
      return NextResponse.json(
        { error: 'pid, stud_name, and class_name are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('student')
      .insert([
        {
          pid: Number(pid),
          stud_name,
          class_name,
          batch: toNullableNumber(batch),
          roll_no: toNullableNumber(roll_no),
          course,
          email_id,
          Academic_year,
        },
      ])
      .select();

    if (error) {
      console.error('Error creating student:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `Student with PID ${pid} already exists` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/students/:pid - Update a student
export async function PUT(request: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const pid = url.searchParams.get('pid');

    if (!pid) {
      return NextResponse.json({ error: 'pid is required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      stud_name,
      class_name,
      batch,
      roll_no,
      course,
      email_id,
      Academic_year,
    } = body;

    if (!stud_name || !class_name) {
      return NextResponse.json(
        { error: 'stud_name and class_name are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('student')
      .update({
        stud_name,
        class_name,
        batch: toNullableNumber(batch),
        roll_no: toNullableNumber(roll_no),
        course,
        email_id,
        Academic_year,
      })
      .eq('pid', Number(pid))
      .select();

    if (error) {
      console.error('Error updating student:', error);
      return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/students/:pid - Delete a student
export async function DELETE(request: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const pid = url.searchParams.get('pid');

    if (!pid) {
      return NextResponse.json({ error: 'pid is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('student')
      .delete()
      .eq('pid', Number(pid));

    if (error) {
      console.error('Error deleting student:', error);
      return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
