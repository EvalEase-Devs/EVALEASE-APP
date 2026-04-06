import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "fs/promises";
import path from "path";

interface AddSubjectRequest {
  semester: string;
  code: string;
  fullName: string;
  type: "Lec" | "Lab";
}

// Path to custom subjects JSON file in public directory
const getSubjectsFilePath = () => {
  return path.join(process.cwd(), "public", "custom-subjects.json");
};

export async function POST(req: NextRequest) {
  try {
    const body: AddSubjectRequest = await req.json();
    const { semester, code, fullName, type } = body;

    // Validation
    if (!semester || !code || !fullName || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["Lec", "Lab"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'Lec' or 'Lab'" },
        { status: 400 }
      );
    }

    if (!/^[A-Z0-9]+$/.test(code)) {
      return NextResponse.json(
        { error: "Subject code must be alphanumeric (uppercase)" },
        { status: 400 }
      );
    }

    const filePath = getSubjectsFilePath();

    try {
      await mkdir(path.dirname(filePath), { recursive: true });
    } catch (e) {
      console.warn("Could not create directory:", e);
    }

    let customSubjects: Record<string, any[]> = {};

    // Try to read existing custom subjects
    try {
      const fileContent = await readFile(filePath, "utf-8");
      customSubjects = JSON.parse(fileContent);
    } catch (e) {
      // File doesn't exist yet, start fresh
      customSubjects = {};
    }

    // Ensure semester exists
    if (!customSubjects[semester]) {
      customSubjects[semester] = [];
    }

    // Check if subject already exists
    const subjectExists = customSubjects[semester].some(
      (s: any) => s.code === code
    );
    if (subjectExists) {
      return NextResponse.json(
        { error: `Subject with code '${code}' already exists in ${semester}` },
        { status: 400 }
      );
    }

    // Add new subject
    customSubjects[semester].push({
      code,
      fullName,
      type,
    });

    // Sort subjects by code for consistency
    customSubjects[semester].sort((a: any, b: any) =>
      a.code.localeCompare(b.code)
    );

    // Write back to file
    await writeFile(filePath, JSON.stringify(customSubjects, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      message: `Subject '${code}' added to ${semester}. Refresh the page to see it in dropdowns.`,
    });
  } catch (error) {
    console.error("Error adding subject:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to add subject: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve custom subjects
export async function GET() {
  try {
    const filePath = getSubjectsFilePath();
    const fileContent = await readFile(filePath, "utf-8");
    const customSubjects = JSON.parse(fileContent);
    return NextResponse.json(customSubjects);
  } catch (e) {
    // File doesn't exist or can't be read, return empty
    return NextResponse.json({});
  }
}
