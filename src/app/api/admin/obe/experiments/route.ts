import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { checkAdmin, toNullableText, toPositiveInt, unauthorized } from "../_utils";

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

    const { data, error } = await supabase
      .from("experiment")
      .select("sub_id, exp_no, exp_name")
      .eq("sub_id", subId)
      .order("exp_no", { ascending: true });

    if (error) {
      console.error("Error fetching experiments:", error);
      return NextResponse.json({ error: "Failed to fetch experiments" }, { status: 500 });
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
      return unauthorized();
    }

    const body = await request.json();
    const sub_id = toNullableText(body.sub_id);
    const exp_no = toPositiveInt(body.exp_no);
    const exp_name = toNullableText(body.exp_name);

    if (!sub_id) {
      return NextResponse.json({ error: "sub_id is required" }, { status: 400 });
    }

    if (exp_no === null) {
      return NextResponse.json({ error: "exp_no must be a positive number" }, { status: 400 });
    }

    if (!exp_name) {
      return NextResponse.json({ error: "exp_name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("experiment")
      .insert([{ sub_id, exp_no, exp_name }])
      .select("sub_id, exp_no, exp_name");

    if (error) {
      console.error("Error creating experiment:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `Experiment ${exp_no} already exists for subject ${sub_id}` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Failed to create experiment" }, { status: 500 });
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
      return unauthorized();
    }

    const searchParams = request.nextUrl.searchParams;
    const sub_id = toNullableText(searchParams.get("sub_id"));
    const exp_no = toPositiveInt(searchParams.get("exp_no"));

    if (!sub_id) {
      return NextResponse.json({ error: "sub_id is required" }, { status: 400 });
    }

    if (exp_no === null) {
      return NextResponse.json({ error: "exp_no is required" }, { status: 400 });
    }

    const body = await request.json();
    const exp_name = toNullableText(body.exp_name);

    if (!exp_name) {
      return NextResponse.json({ error: "exp_name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("experiment")
      .update({ exp_name })
      .eq("sub_id", sub_id)
      .eq("exp_no", exp_no)
      .select("sub_id, exp_no, exp_name");

    if (error) {
      console.error("Error updating experiment:", error);
      return NextResponse.json({ error: "Failed to update experiment" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
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
      return unauthorized();
    }

    const searchParams = request.nextUrl.searchParams;
    const sub_id = toNullableText(searchParams.get("sub_id"));
    const exp_no = toPositiveInt(searchParams.get("exp_no"));

    if (!sub_id) {
      return NextResponse.json({ error: "sub_id is required" }, { status: 400 });
    }

    if (exp_no === null) {
      return NextResponse.json({ error: "exp_no is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("experiment")
      .delete()
      .eq("sub_id", sub_id)
      .eq("exp_no", exp_no);

    if (error) {
      console.error("Error deleting experiment:", error);
      return NextResponse.json({ error: "Failed to delete experiment" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
