import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserRole } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export interface AdminTeacher {
  teacher_id: number;
  teacher_name: string;
  designation: string | null;
  department: string | null;
  email: string | null;
}

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.email) {
    return null;
  }

  const role = session.user.role || getUserRole(session.user.email);
  return role === "admin" ? session : null;
}

function toNullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function toTeacherId(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search")?.trim();

    let query = supabase
      .from("teacher")
      .select("*")
      .order("teacher_id", { ascending: true });

    if (search) {
      const safeSearch = search.replace(/,/g, " ");
      const teacherId = Number(safeSearch);
      query = Number.isFinite(teacherId)
        ? query.or(
            `teacher_name.ilike.%${safeSearch}%,designation.ilike.%${safeSearch}%,department.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,teacher_id.eq.${teacherId}`
          )
        : query.or(
            `teacher_name.ilike.%${safeSearch}%,designation.ilike.%${safeSearch}%,department.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`
          );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching teachers:", error);
      return NextResponse.json({ error: "Failed to fetch teachers" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const teacher_id = toTeacherId(body.teacher_id);
    const teacher_name = toNullableText(body.teacher_name);
    const designation = toNullableText(body.designation);
    const department = toNullableText(body.department);
    const email = toNullableText(body.email);

    if (teacher_id === null) {
      return NextResponse.json({ error: "teacher_id must be a number" }, { status: 400 });
    }

    if (!teacher_name) {
      return NextResponse.json({ error: "teacher_name is required" }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("teacher")
      .insert([
        {
          teacher_id,
          teacher_name,
          designation,
          department,
          email,
        },
      ])
      .select();

    if (error) {
      console.error("Error creating teacher:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `Teacher with ID ${teacher_id} already exists` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Failed to create teacher" }, { status: 500 });
    }

    return NextResponse.json(data?.[0] ?? null, { status: 201 });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const teacherId = toTeacherId(url.searchParams.get("teacher_id"));

    if (teacherId === null) {
      return NextResponse.json({ error: "teacher_id is required" }, { status: 400 });
    }

    const body = await request.json();
    const teacher_name = toNullableText(body.teacher_name);
    const designation = toNullableText(body.designation);
    const department = toNullableText(body.department);
    const email = toNullableText(body.email);

    if (!teacher_name) {
      return NextResponse.json({ error: "teacher_name is required" }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("teacher")
      .update({
        teacher_name,
        designation,
        department,
        email,
      })
      .eq("teacher_id", teacherId)
      .select();

    if (error) {
      console.error("Error updating teacher:", error);
      return NextResponse.json({ error: "Failed to update teacher" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const teacherId = toTeacherId(url.searchParams.get("teacher_id"));

    if (teacherId === null) {
      return NextResponse.json({ error: "teacher_id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("teacher")
      .delete()
      .eq("teacher_id", teacherId);

    if (error) {
      console.error("Error deleting teacher:", error);
      if (error.code === "23503") {
        return NextResponse.json(
          { error: "Teacher cannot be deleted because it is referenced by other records" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Failed to delete teacher" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}