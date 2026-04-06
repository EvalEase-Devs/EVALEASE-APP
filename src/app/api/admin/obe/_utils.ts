import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserRole } from "@/lib/types";

export async function checkAdmin() {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  const role = session.user.role || getUserRole(session.user.email);
  return role === "admin" ? session : null;
}

export function toNullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

export function toPositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;

  const intValue = Math.trunc(parsed);
  return intValue > 0 ? intValue : null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export type CsvRowError = {
  rowNumber: number;
  error: string;
};

export type CsvImportSummary = {
  success: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  inserted: number;
  rowErrors: CsvRowError[];
};

export function parseCsvContent(csvContent: string): string[][] {
  const content = csvContent.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = index + 1 < content.length ? content[index + 1] : "";

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      currentRow.push(currentValue.trim());
      currentValue = "";

      // Ignore completely blank lines but keep rows that contain empty CSV fields.
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentValue += char;
  }

  currentRow.push(currentValue.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

export function headersMatch(actual: string[], expected: string[]): boolean {
  if (actual.length !== expected.length) return false;
  return expected.every((value, index) => actual[index]?.trim().toLowerCase() === value.toLowerCase());
}
