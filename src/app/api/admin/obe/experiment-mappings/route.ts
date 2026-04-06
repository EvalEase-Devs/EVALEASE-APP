import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { checkAdmin, toNullableText, toPositiveInt, unauthorized } from "../_utils";

type ExperimentMappingResponse = {
  sub_id: string;
  exp_no: number;
  exp_name: string;
  mapped_los: number[];
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

    const { data: los, error: loError } = await supabase
      .from("lo")
      .select("sub_id, lo_no, lo_description")
      .eq("sub_id", subId)
      .order("lo_no", { ascending: true });

    if (loError) {
      console.error("Error fetching LOs for mapping:", loError);
      return NextResponse.json({ error: "Failed to fetch LOs" }, { status: 500 });
    }

    const { data: experiments, error } = await supabase
      .from("experiment")
      .select("sub_id, exp_no, exp_name, experiment_lo_mapping(lo_no, sub_id)")
      .eq("sub_id", subId)
      .order("exp_no", { ascending: true });

    if (error) {
      console.error("Error fetching experiments:", error);
      return NextResponse.json({ error: "Failed to fetch experiment mappings" }, { status: 500 });
    }

    const mappedExperiments: ExperimentMappingResponse[] = (experiments || []).map((experiment) => ({
      sub_id: experiment.sub_id,
      exp_no: experiment.exp_no,
      exp_name: experiment.exp_name,
      mapped_los: experiment.experiment_lo_mapping?.map((mapping: { lo_no: number }) => mapping.lo_no) || [],
    }));

    return NextResponse.json({ los: los || [], experiments: mappedExperiments });
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
  const sub_id = toNullableText(body.sub_id);
  const exp_no = toPositiveInt(body.exp_no);
  const lo_nos: number[] | null = Array.isArray(body.lo_nos)
    ? (body.lo_nos as unknown[])
        .map((value: unknown) => toPositiveInt(value))
        .filter((value: number | null): value is number => value !== null)
    : null;

  if (!sub_id) {
    return NextResponse.json({ error: "sub_id is required" }, { status: 400 });
  }

  if (exp_no === null) {
    return NextResponse.json({ error: "exp_no is required" }, { status: 400 });
  }

  if (lo_nos === null) {
    return NextResponse.json({ error: "lo_nos must be an array" }, { status: 400 });
  }

  const { data: experiment, error: experimentError } = await supabase
    .from("experiment")
    .select("sub_id, exp_no")
    .eq("sub_id", sub_id)
    .eq("exp_no", exp_no)
    .single();

  if (experimentError || !experiment) {
    return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("experiment_lo_mapping")
    .delete()
    .eq("sub_id", sub_id)
    .eq("exp_no", exp_no);

  if (deleteError) {
    console.error("Error clearing experiment LO mappings:", deleteError);
    return NextResponse.json({ error: "Failed to update experiment mappings" }, { status: 500 });
  }

  if (lo_nos.length > 0) {
    const { data: validLos, error: validLosError } = await supabase
      .from("lo")
      .select("lo_no")
      .eq("sub_id", sub_id)
      .in("lo_no", lo_nos);

    if (validLosError) {
      console.error("Error validating LO mappings:", validLosError);
      return NextResponse.json({ error: "Failed to validate LO mappings" }, { status: 500 });
    }

    const validLoSet = new Set((validLos || []).map((lo) => lo.lo_no));
    const invalidLos = lo_nos.filter((loNo: number) => !validLoSet.has(loNo));

    if (invalidLos.length > 0) {
      return NextResponse.json(
        { error: `Invalid LO numbers for subject ${sub_id}: ${invalidLos.join(", ")}` },
        { status: 400 }
      );
    }

    const mappings = lo_nos.map((lo_no: number) => ({ sub_id, exp_no, lo_no }));
    const { error: insertError } = await supabase.from("experiment_lo_mapping").insert(mappings);

    if (insertError) {
      console.error("Error saving experiment LO mappings:", insertError);
      return NextResponse.json({ error: "Failed to update experiment mappings" }, { status: 500 });
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
