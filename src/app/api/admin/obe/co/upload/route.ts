import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  checkAdmin,
  CsvImportSummary,
  headersMatch,
  parseCsvContent,
  toNullableText,
  toPositiveInt,
  unauthorized,
} from "../../_utils";

const expectedHeaders = ["co_no", "co_description"];

export async function POST(request: NextRequest) {
  try {
    const session = await checkAdmin();
    if (!session) {
      return unauthorized();
    }

    const body = await request.json();
    const csvContent = toNullableText(body.csvContent);
    const subId = toNullableText(body.sub_id);

    if (!csvContent) {
      return NextResponse.json({ error: "csvContent is required" }, { status: 400 });
    }

    if (!subId) {
      return NextResponse.json({ error: "sub_id is required" }, { status: 400 });
    }

    const rows = parseCsvContent(csvContent);
    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
    }

    const headers = rows[0];
    if (!headersMatch(headers, expectedHeaders)) {
      return NextResponse.json(
        { error: `Invalid CSV headers. Expected: ${expectedHeaders.join(",")}` },
        { status: 400 }
      );
    }

    const rowErrors: CsvImportSummary["rowErrors"] = [];
    const validRows: Array<{ sub_id: string; co_no: number; co_description: string }> = [];
    const seenKeys = new Set<string>();

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      const rowNumber = i + 1;

      if (row.length !== expectedHeaders.length) {
        rowErrors.push({ rowNumber, error: "Incorrect number of columns" });
        continue;
      }

      const co_no = toPositiveInt(row[0]);
      const co_description = toNullableText(row[1]);

      if (co_no === null) {
        rowErrors.push({ rowNumber, error: "co_no must be a positive number" });
        continue;
      }

      if (!co_description) {
        rowErrors.push({ rowNumber, error: "co_description is required" });
        continue;
      }

      const key = `${subId}::${co_no}`;
      if (seenKeys.has(key)) {
        rowErrors.push({ rowNumber, error: "Duplicate CO in CSV" });
        continue;
      }

      seenKeys.add(key);
      validRows.push({ sub_id: subId, co_no, co_description });
    }

    if (validRows.length > 0) {
      const { error } = await supabase
        .from("co")
        .upsert(validRows, { onConflict: "sub_id,co_no", ignoreDuplicates: true });

      if (error) {
        console.error("Error importing CO CSV:", error);
        return NextResponse.json({ error: "Failed to import CO CSV" }, { status: 500 });
      }
    }

    const summary: CsvImportSummary = {
      success: true,
      totalRows: Math.max(rows.length - 1, 0),
      validRows: validRows.length,
      invalidRows: rowErrors.length,
      inserted: validRows.length,
      rowErrors,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
