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
      .from("lo")
      .select("sub_id, lo_no, lo_description")
      .eq("sub_id", subId)
      .order("lo_no", { ascending: true });

    if (error) {
      console.error("Error fetching LOs:", error);
      return NextResponse.json({ error: "Failed to fetch LOs" }, { status: 500 });
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
    const lo_no = toPositiveInt(body.lo_no);
    const lo_description = toNullableText(body.lo_description);

    if (!sub_id) {
      return NextResponse.json({ error: "sub_id is required" }, { status: 400 });
    }

    if (lo_no === null) {
      return NextResponse.json({ error: "lo_no must be a positive number" }, { status: 400 });
    }

    if (!lo_description) {
      return NextResponse.json({ error: "lo_description is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("lo")
      .insert([{ sub_id, lo_no, lo_description }])
      .select("sub_id, lo_no, lo_description");

    if (error) {
      console.error("Error creating LO:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `LO ${lo_no} already exists for subject ${sub_id}` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Failed to create LO" }, { status: 500 });
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
    const lo_no = toPositiveInt(searchParams.get("lo_no"));

    if (!sub_id) {
      return NextResponse.json({ error: "sub_id is required" }, { status: 400 });
    }

    if (lo_no === null) {
      return NextResponse.json({ error: "lo_no is required" }, { status: 400 });
    }

    const body = await request.json();
    const lo_description = toNullableText(body.lo_description);

    if (!lo_description) {
      return NextResponse.json({ error: "lo_description is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("lo")
      .update({ lo_description })
      .eq("sub_id", sub_id)
      .eq("lo_no", lo_no)
      .select("sub_id, lo_no, lo_description");

    if (error) {
      console.error("Error updating LO:", error);
      return NextResponse.json({ error: "Failed to update LO" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "LO not found" }, { status: 404 });
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
    const lo_no = toPositiveInt(searchParams.get("lo_no"));

    if (!sub_id) {
      return NextResponse.json({ error: "sub_id is required" }, { status: 400 });
    }

    if (lo_no === null) {
      return NextResponse.json({ error: "lo_no is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("lo")
      .delete()
      .eq("sub_id", sub_id)
      .eq("lo_no", lo_no);

    if (error) {
      console.error("Error deleting LO:", error);
      return NextResponse.json({ error: "Failed to delete LO" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
