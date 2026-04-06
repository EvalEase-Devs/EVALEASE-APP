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
      .from("co")
      .select("sub_id, co_no, co_description")
      .eq("sub_id", subId)
      .order("co_no", { ascending: true });

    if (error) {
      console.error("Error fetching COs:", error);
      return NextResponse.json({ error: "Failed to fetch COs" }, { status: 500 });
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
    const co_no = toPositiveInt(body.co_no);
    const co_description = toNullableText(body.co_description);

    if (!sub_id) {
      return NextResponse.json({ error: "sub_id is required" }, { status: 400 });
    }

    if (co_no === null) {
      return NextResponse.json({ error: "co_no must be a positive number" }, { status: 400 });
    }

    if (!co_description) {
      return NextResponse.json({ error: "co_description is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("co")
      .insert([{ sub_id, co_no, co_description }])
      .select("sub_id, co_no, co_description");

    if (error) {
      console.error("Error creating CO:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `CO ${co_no} already exists for subject ${sub_id}` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Failed to create CO" }, { status: 500 });
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
    const co_no = toPositiveInt(searchParams.get("co_no"));

    if (!sub_id) {
      return NextResponse.json({ error: "sub_id is required" }, { status: 400 });
    }

    if (co_no === null) {
      return NextResponse.json({ error: "co_no is required" }, { status: 400 });
    }

    const body = await request.json();
    const co_description = toNullableText(body.co_description);

    if (!co_description) {
      return NextResponse.json({ error: "co_description is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("co")
      .update({ co_description })
      .eq("sub_id", sub_id)
      .eq("co_no", co_no)
      .select("sub_id, co_no, co_description");

    if (error) {
      console.error("Error updating CO:", error);
      return NextResponse.json({ error: "Failed to update CO" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "CO not found" }, { status: 404 });
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
    const co_no = toPositiveInt(searchParams.get("co_no"));

    if (!sub_id) {
      return NextResponse.json({ error: "sub_id is required" }, { status: 400 });
    }

    if (co_no === null) {
      return NextResponse.json({ error: "co_no is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("co")
      .delete()
      .eq("sub_id", sub_id)
      .eq("co_no", co_no);

    if (error) {
      console.error("Error deleting CO:", error);
      return NextResponse.json({ error: "Failed to delete CO" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
