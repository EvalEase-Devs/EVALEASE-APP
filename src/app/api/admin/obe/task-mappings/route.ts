import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { checkAdmin, toNullableText, toPositiveInt, unauthorized } from "../_utils";

type TaskMappingResponse = {
  task_id: number;
  title: string;
  task_type: string;
  assessment_type: string | null;
  assessment_sub_type: string | null;
  sub_id: string;
  exp_no: number | null;
  max_marks: number;
  mapped_cos: number[];
};

export async function GET(request: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return unauthorized();
    }

    const subId = request.nextUrl.searchParams.get("sub_id")?.trim();
    if (!subId) {
      return NextResponse.json({ error: "sub_id is required" }, { status: 400 });
    }

    const { data: cos, error: cosError } = await supabase
      .from("co")
      .select("sub_id, co_no, co_description")
      .eq("sub_id", subId)
      .order("co_no", { ascending: true });

    if (cosError) {
      console.error("Error fetching COs for mapping:", cosError);
      return NextResponse.json({ error: "Failed to fetch COs" }, { status: 500 });
    }

    const { data: tasks, error } = await supabase
      .from("task")
      .select("task_id, title, task_type, assessment_type, assessment_sub_type, sub_id, exp_no, max_marks, task_co_mapping(co_no, sub_id)")
      .eq("sub_id", subId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      return NextResponse.json({ error: "Failed to fetch task mappings" }, { status: 500 });
    }

    const mappedTasks: TaskMappingResponse[] = (tasks || []).map((task) => ({
      task_id: task.task_id,
      title: task.title,
      task_type: task.task_type,
      assessment_type: task.assessment_type,
      assessment_sub_type: task.assessment_sub_type,
      sub_id: task.sub_id,
      exp_no: task.exp_no,
      max_marks: task.max_marks,
      mapped_cos: task.task_co_mapping?.map((mapping: { co_no: number }) => mapping.co_no) || [],
    }));

    return NextResponse.json({ cos: cos || [], tasks: mappedTasks });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function saveMapping(request: NextRequest) {
  const session = await checkAdmin();
  if (!session) {
    return unauthorized();
  }

  const body = await request.json();
  const task_id = toPositiveInt(body.task_id);
  const sub_id = toNullableText(body.sub_id);
  const co_nos: number[] | null = Array.isArray(body.co_nos)
    ? (body.co_nos as unknown[])
        .map((value: unknown) => toPositiveInt(value))
        .filter((value: number | null): value is number => value !== null)
    : null;

  if (task_id === null) {
    return NextResponse.json({ error: "task_id is required" }, { status: 400 });
  }

  if (!sub_id) {
    return NextResponse.json({ error: "sub_id is required" }, { status: 400 });
  }

  if (co_nos === null) {
    return NextResponse.json({ error: "co_nos must be an array" }, { status: 400 });
  }

  const { data: task, error: taskError } = await supabase
    .from("task")
    .select("task_id, sub_id")
    .eq("task_id", task_id)
    .single();

  if (taskError || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (task.sub_id !== sub_id) {
    return NextResponse.json({ error: "Task subject code mismatch" }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from("task_co_mapping")
    .delete()
    .eq("task_id", task_id);

  if (deleteError) {
    console.error("Error clearing task CO mappings:", deleteError);
    return NextResponse.json({ error: "Failed to update task mappings" }, { status: 500 });
  }

  if (co_nos.length > 0) {
    const { data: validCos, error: validCosError } = await supabase
      .from("co")
      .select("co_no")
      .eq("sub_id", sub_id)
      .in("co_no", co_nos);

    if (validCosError) {
      console.error("Error validating CO mappings:", validCosError);
      return NextResponse.json({ error: "Failed to validate CO mappings" }, { status: 500 });
    }

    const validCoSet = new Set((validCos || []).map((co) => co.co_no));
    const invalidCos = co_nos.filter((coNo: number) => !validCoSet.has(coNo));

    if (invalidCos.length > 0) {
      return NextResponse.json(
        { error: `Invalid CO numbers for subject ${sub_id}: ${invalidCos.join(", ")}` },
        { status: 400 }
      );
    }

    const mappings = co_nos.map((co_no: number) => ({ task_id, sub_id, co_no }));
    const { error: insertError } = await supabase.from("task_co_mapping").insert(mappings);

    if (insertError) {
      console.error("Error saving task CO mappings:", insertError);
      return NextResponse.json({ error: "Failed to update task mappings" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  try {
    return await saveMapping(request);
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await saveMapping(request);
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
