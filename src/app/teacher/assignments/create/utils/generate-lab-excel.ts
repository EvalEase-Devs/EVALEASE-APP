/**
 * generate-lab-excel.ts
 *
 * Lab Attainment Report – Excel generator (ExcelJS).
 *
 * ─── ROW MAP ──────────────────────────────────────────────────────────────────
 *   Row  1  │ "St. Francis Institute of Technology"
 *   Row  2  │ "(Engineering College)"
 *   Row  3  │ "An Autonomous Institute, Affiliated to University of Mumbai"
 *   Row  4  │ "NAAC A+ Accredited | CMPN, EXTC, INFT NBA Accredited | ISO 9001:2015 Certified"
 *   Row  5  │ (empty separator)
 *   Row  6  │ "Department of Computer Engineering"
 *   Row  7  │ "Course Outcome Attainment by Internal Evaluation" (banner)
 *   Row  8  │ (empty separator)
 *   Row  9  │ Meta: Academic Session
 *   Row 10  │ Meta: Class / Subject / Faculty
 *   Row 11  │ (empty separator)
 *   Row 12  │ (empty separator)
 *   Row 13  │ TIER 1 — LO group headers  (merged across experiments + 3 summary cols)
 *   Row 14  │ TIER 2 — Experiment names + "Marks obtained" / "Marks attempted" / "In percentage"
 *   Row 15+ │ Student data rows  (TODO – Step 2)
 *   ...     │ Bottom summary     (TODO – Step 3)
 */

import ExcelJS from 'exceljs';

// ─────────────────────────────────────────────────────────────────────────────
// Types  (mirrors lab-attainment-report.tsx)
// ─────────────────────────────────────────────────────────────────────────────

export interface ExperimentData {
    exp_no: number;
    title: string;
    max_marks: number;
}

export interface LoStructure {
    [loNo: number]: ExperimentData[];
}

export interface StudentMark {
    obtained: number;
    max: number;
}

export interface StudentData {
    pid: number;
    stud_name: string;
    roll_no: number;
    loMarks: Record<number, Record<number, StudentMark>>;
}

export interface LabReportResponse {
    allotment: {
        allotment_id: number;
        sub_id: string;
        sub_name?: string;
        class_name: string;
        batch_no?: number;
        current_sem: string;
        all_batches: boolean;
    };
    teacher: {
        teacher_name: string;
    };
    students: StudentData[];
    loStructure: LoStructure;
    loList: number[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Print-friendly pastel colour palette (ARGB – all fully opaque, prefix FF)
// ALL TEXT IS DARK (#111827). No white text anywhere.
// ─────────────────────────────────────────────────────────────────────────────
const C = {
    // College header band — very light gray, print-safe
    headerBg: 'FFF3F4F6',   // #F3F4F6 – pale gray
    headerBg2: 'FFE5E7EB',   // #E5E7EB – slightly darker gray
    headerText: 'FF111827',   // near-black

    // Report title / banner
    titleBg: 'FFE0F2FE',   // #E0F2FE – very light sky blue
    titleText: 'FF111827',

    // Meta-info block
    metaLabelBg: 'FFDBEAFE',  // #DBEAFE – pale blue-indigo
    metaValueBg: 'FFF9FAFB',  // near-white
    metaText: 'FF111827',

    // Tier 1 — LO group header
    tier1Bg: 'FFE0F2FE',    // #E0F2FE – light blue pastel
    tier1Text: 'FF111827',

    // Tier 2 — experiment / summary labels
    tier2Bg: 'FFF3F4F6',  // #F3F4F6 – light gray pastel
    tier2SummBg: 'FFFFFBEB',  // very pale amber for summary columns
    tier2Text: 'FF111827',

    // Fixed columns header (Roll No / Name)
    fixedColBg: 'FFE5E7EB', // light gray
    fixedColText: 'FF111827',

    // Student data rows
    dataRowEven: 'FFFFFFFF', // white
    dataRowOdd: 'FFF9FAFB', // barely-off-white
    dataFixed: 'FFF3F4F6', // slightly tinted for identity block
    dataSummObt: 'FFFFF8E1', // very pale amber
    dataSummPct: 'FFF0FDF4', // very pale green

    // Summary tables (bottom section)
    summHdrBg: 'FFE5E7EB',   // light gray – table headers
    summLvl3Bg: 'FFF0FDF4',   // pale green – level 3 (best)
    summLvl2Bg: 'FFDBEAFE',   // pale blue  – level 2
    summLvl1Bg: 'FFFEF9C3',   // pale yellow – level 1
    summAttBg: 'FFFEF9C3',   // pale yellow – attainment rows
    summText: 'FF111827',

    black: 'FF000000',
    separator: 'FFCBD5E1',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Border helpers  (cell-level only — never applied to full rows)
// ─────────────────────────────────────────────────────────────────────────────
const B = {
    thin: { style: 'thin', color: { argb: C.black } } as ExcelJS.Border,
    medium: { style: 'medium', color: { argb: C.black } } as ExcelJS.Border,
} as const;

function box(b: ExcelJS.Border): ExcelJS.Borders {
    return { top: b, bottom: b, left: b, right: b, diagonal: {} };
}

function fill(argb: string): ExcelJS.Fill {
    return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getColLetter(col: number): string {
    let letter = '';
    while (col > 0) {
        const r = (col - 1) % 26;
        letter = String.fromCharCode(65 + r) + letter;
        col = Math.floor((col - 1) / 26);
    }
    return letter;
}

// ─────────────────────────────────────────────────────────────────────────────
// ColDef — one entry per leaf column in the data table
// ─────────────────────────────────────────────────────────────────────────────
interface ColDef {
    lo: number;
    type: 'EXP' | 'SUMMARY';
    experiment?: ExperimentData;
    summaryOf?: 'obtained' | 'attempted' | 'pct';
    displayLabel: string;
    maxMarks?: number;
}

function buildColDefs(loList: number[], ls: LoStructure): ColDef[] {
    const defs: ColDef[] = [];
    for (const lo of loList) {
        const exps = ls[lo] ?? [];
        for (const exp of exps) {
            defs.push({
                lo,
                type: 'EXP',
                experiment: exp,
                displayLabel: `EXP ${exp.exp_no}\n(${exp.max_marks})`,
                maxMarks: exp.max_marks,
            });
        }
        defs.push({ lo, type: 'SUMMARY', summaryOf: 'obtained', displayLabel: 'Marks\nobtained' });
        defs.push({ lo, type: 'SUMMARY', summaryOf: 'attempted', displayLabel: 'Marks\nattempted' });
        defs.push({ lo, type: 'SUMMARY', summaryOf: 'pct', displayLabel: 'In\npercentage' });
    }
    return defs;
}

// ─────────────────────────────────────────────────────────────────────────────
// ColMap — one-time lookup from colDef index → worksheet column number
// ─────────────────────────────────────────────────────────────────────────────
interface LabColMap {
    /** Maps each colDef index to its 1-based worksheet column number */
    defToCol: number[];
    /** Per-LO summary info for formula generation */
    loSummary: Record<number, {
        expCols: number[];          // experiment leaf column indexes
        summObt: number;            // "Marks obtained" column index
        summAtmp: number;           // "Marks attempted" column index
        summPct: number;            // "In percentage" column index
    }>;
}

function buildLabColMap(colDefs: ColDef[], fixedCols: number): LabColMap {
    const defToCol: number[] = [];
    const loSummary: LabColMap['loSummary'] = {};

    for (let i = 0; i < colDefs.length; i++) {
        const col = fixedCols + i + 1;  // 1-based
        const def = colDefs[i];
        defToCol[i] = col;

        if (!loSummary[def.lo]) {
            loSummary[def.lo] = { expCols: [], summObt: 0, summAtmp: 0, summPct: 0 };
        }
        const entry = loSummary[def.lo];
        if (def.type === 'EXP') {
            entry.expCols.push(col);
        } else if (def.summaryOf === 'obtained') {
            entry.summObt = col;
        } else if (def.summaryOf === 'attempted') {
            entry.summAtmp = col;
        } else if (def.summaryOf === 'pct') {
            entry.summPct = col;
        }
    }
    return { defToCol, loSummary };
}

// ─────────────────────────────────────────────────────────────────────────────
// Logo helper — A1:B4 only
// ─────────────────────────────────────────────────────────────────────────────
async function embedLogo(workbook: ExcelJS.Workbook, ws: ExcelJS.Worksheet): Promise<void> {
    try {
        const response = await fetch('/sfit_logo.png');
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((d, b) => d + String.fromCharCode(b), ''),
        );
        const imageId = workbook.addImage({
            base64: `data:image/png;base64,${base64}`,
            extension: 'png',
        });
        ws.addImage(imageId, 'A1:B5');
    } catch {
        console.warn('[generateLabExcel] logo embed skipped');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export async function generateLabAttainmentExcel(reportData: LabReportResponse): Promise<void> {
    const { allotment, teacher, students, loStructure, loList } = reportData;

    // ── Workbook ─────────────────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EvalEase – SFIT';
    workbook.created = new Date();
    workbook.modified = new Date();

    const ws = workbook.addWorksheet('LO Attainment EXPT', {
        pageSetup: {
            paperSize: 9,            // A4
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
        },
        properties: { defaultColWidth: 12, defaultRowHeight: 16 },
    });

    // ── Column definitions ───────────────────────────────────────────────────
    const FIXED_COLS = 3;  // Col A = Roll No, Col B = PID, Col C = Name
    const colDefs = buildColDefs(loList, loStructure);
    const TOTAL_COLS = FIXED_COLS + colDefs.length;
    const colMap = buildLabColMap(colDefs, FIXED_COLS);

    // ── Bulletproof column widths (NO auto-fit) ──────────────────────────────
    for (let i = 1; i <= TOTAL_COLS + 5; i++) {
        const col = ws.getColumn(i);
        if (i === 1) col.width = 10;       // Roll No
        else if (i === 2) col.width = 15;  // PID
        else if (i === 3) col.width = 35;  // Name
        else col.width = 14;              // ALL Exp and Summary columns
    }

    // Merge span end for college headers (C:K or TOTAL_COLS, whichever is larger)
    const MERGE_END = Math.max(11, TOTAL_COLS);  // at least col K (11)

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION A — Rows 1–7 : College header
    //
    // Cols A–B are reserved for the logo (A1:B5).
    // Text is MERGED from Col C → MERGE_END and CENTER-aligned.
    // Only the merged cell range is styled — no full-row fill.
    // ═════════════════════════════════════════════════════════════════════════

    const hdFont = { name: 'Calibri', color: { argb: C.headerText } };
    const hdAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };

    // Row 1 — College name (merged C1:MERGE_END, bold 14pt, centered)
    ws.mergeCells(1, 3, 1, MERGE_END);
    const r1 = ws.getCell(1, 3);
    r1.value = 'St. Francis Institute of Technology';
    r1.font = { ...hdFont, bold: true, size: 14 };
    r1.alignment = hdAlign;
    ws.getRow(1).height = 24;

    // Row 2 (merged C2:MERGE_END)
    ws.mergeCells(2, 3, 2, MERGE_END);
    const r2 = ws.getCell(2, 3);
    r2.value = '(Engineering College)';
    r2.font = { ...hdFont, size: 11 };
    r2.alignment = hdAlign;
    ws.getRow(2).height = 18;

    // Row 3 (merged C3:MERGE_END)
    ws.mergeCells(3, 3, 3, MERGE_END);
    const r3 = ws.getCell(3, 3);
    r3.value = 'An Autonomous Institute, Affiliated to University of Mumbai';
    r3.font = { ...hdFont, italic: true, size: 10 };
    r3.alignment = hdAlign;
    ws.getRow(3).height = 16;

    // Row 4 (merged C4:MERGE_END)
    ws.mergeCells(4, 3, 4, MERGE_END);
    const r4 = ws.getCell(4, 3);
    r4.value = 'NAAC A+ Accredited | CMPN, EXTC, INFT NBA Accredited | ISO 9001:2015 Certified';
    r4.font = { ...hdFont, size: 9 };
    r4.alignment = hdAlign;
    ws.getRow(4).height = 16;

    // Row 5 — empty separator
    ws.getRow(5).height = 6;

    // Row 6 — Department (merged C6:MERGE_END)
    ws.mergeCells(6, 3, 6, MERGE_END);
    const r6 = ws.getCell(6, 3);
    r6.value = 'Department of Computer Engineering';
    r6.font = { ...hdFont, bold: true, size: 11 };
    r6.alignment = hdAlign;
    ws.getRow(6).height = 20;

    // Row 7 — Banner title (merged C7:MERGE_END, light gray background, centered)
    ws.mergeCells(7, 3, 7, MERGE_END);
    const r7 = ws.getCell(7, 3);
    r7.value = 'Course Outcome Attainment by Internal Evaluation';
    r7.font = { ...hdFont, bold: true, size: 11 };
    r7.fill = fill(C.headerBg);
    r7.alignment = hdAlign;
    r7.border = box(B.thin);
    ws.getRow(7).height = 22;

    // Embed logo (if available)
    await embedLogo(workbook, ws);

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION B — Rows 9–10 : Meta-info block
    //
    // Each metadata field is MERGED horizontally so long text doesn't stretch
    // the data columns underneath. Cell-level styling only.
    // ═════════════════════════════════════════════════════════════════════════

    // Row 8 — empty separator
    ws.getRow(8).height = 6;

    const metaFont = { name: 'Calibri', size: 10, color: { argb: C.metaText } };
    const metaAlign: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'left', indent: 1 };

    /** Stamp a merged meta cell: merge from col → endCol, then style */
    function metaMerged(row: number, startCol: number, endCol: number, text: string) {
        if (endCol > startCol) ws.mergeCells(row, startCol, row, endCol);
        const c = ws.getCell(row, startCol);
        c.value = text;
        c.font = metaFont;
        c.fill = fill(C.metaValueBg);
        c.alignment = metaAlign;
        c.border = box(B.thin);
    }

    // Row 9: Academic Session merged B9:E9
    ws.getRow(9).height = 20;
    metaMerged(9, 2, 5, `Academic Session : ${allotment.current_sem}`);

    // Row 10: Class (B10:C10) | Subject (D10:G10) | Faculty (H10:K10)
    ws.getRow(10).height = 20;
    metaMerged(10, 2, 3, `Class : ${allotment.class_name}`);
    metaMerged(10, 4, 7, `Subject Name: ${allotment.sub_name || allotment.sub_id}`);
    metaMerged(10, 8, 11, `Name of Faculty: ${teacher.teacher_name}`);

    // Row 11–12 — separators
    ws.getRow(11).height = 6;
    ws.getRow(12).height = 6;

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION C — Rows 13–14 : 2-tier nested table headers
    //
    // TIER 1 (Row 13) — LO group headers merged across experiments + 3 summary cols
    //                     Light blue pastel (#E0F2FE)
    // TIER 2 (Row 14) — Experiment labels + 3 summary labels per LO
    //                     Light gray pastel (#F3F4F6), amber for summary cols
    //
    // Fixed columns: Roll No (A), PID (B), Name (C) span both tiers.
    // Thin borders ONLY on populated cells.
    // ═════════════════════════════════════════════════════════════════════════

    const T1 = 13;  // Tier 1 row
    const T2 = 14;  // Tier 2 row
    const hdCellAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // Fixed columns — span both tiers (merge T1:T2)
    const fixedHeaders = ['Roll No.', 'PID', 'NAMES of Students'];
    fixedHeaders.forEach((label, i) => {
        const col = i + 1;
        ws.mergeCells(T1, col, T2, col);
        const cell = ws.getCell(T1, col);
        cell.value = label;
        cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: C.fixedColText } };
        cell.fill = fill(C.fixedColBg);
        cell.alignment = hdCellAlign;
        cell.border = box(B.thin);
    });

    // Dynamic LO columns
    let cursor = FIXED_COLS + 1;  // first dynamic column (1-based)

    for (const lo of loList) {
        const exps = loStructure[lo] ?? [];
        const loSpan = exps.length + 3;  // experiments + 3 summary cols
        const loStart = cursor;
        const loEnd = cursor + loSpan - 1;

        // ── Tier 1 — LO group header (merged across all its cols)
        ws.mergeCells(T1, loStart, T1, loEnd);
        const t1Cell = ws.getCell(T1, loStart);
        t1Cell.value = `LO ${lo}`;
        t1Cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: C.tier1Text } };
        t1Cell.fill = fill(C.tier1Bg);
        t1Cell.alignment = hdCellAlign;
        t1Cell.border = box(B.thin);

        // ── Tier 2 — Experiment labels
        exps.forEach((exp, ei) => {
            const col = loStart + ei;
            const t2Cell = ws.getCell(T2, col);
            t2Cell.value = `EXP ${exp.exp_no}\n(${exp.max_marks})`;
            t2Cell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: C.tier2Text } };
            t2Cell.fill = fill(C.tier2Bg);
            t2Cell.alignment = hdCellAlign;
            t2Cell.border = box(B.thin);
        });

        // ── Tier 2 — 3 summary columns
        const summStart = loStart + exps.length;
        const summLabels = [
            { label: 'Marks\nobtained', bg: C.tier2SummBg },
            { label: 'Marks\nattempted', bg: C.tier2SummBg },
            { label: 'In\npercentage', bg: C.tier2SummBg },
        ];
        summLabels.forEach(({ label, bg }, si) => {
            const col = summStart + si;
            const t2Cell = ws.getCell(T2, col);
            t2Cell.value = label;
            t2Cell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: C.tier2Text } };
            t2Cell.fill = fill(bg);
            t2Cell.alignment = hdCellAlign;
            t2Cell.border = box(B.thin);
        });

        cursor += loSpan;
    }

    // Row heights
    ws.getRow(T1).height = 24;
    ws.getRow(T2).height = 36;  // Taller so wrapped text looks clean

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION D — Freeze panes
    // Only freeze rows vertically (ySplit = T2 = 14). NO horizontal freeze.
    // Teachers can scroll left/right and resize name columns freely.
    // ═════════════════════════════════════════════════════════════════════════
    ws.views = [{
        state: 'frozen',
        ySplit: T2,               // freeze the 14 header rows only
        topLeftCell: `A${T2 + 1}`,
        activeCell: `A${T2 + 1}`,
    }];

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION E — Student data rows (Row 15+)
    //
    // Cell-level styling ONLY:
    //   • Thin borders on every populated cell (cols 1 → TOTAL_COLS).
    //   • Odd data rows get faint gray (#F9FAFB); even rows stay white.
    //   • Fixed columns (Roll No, Name) get a slightly tinted bg (#F3F4F6).
    //   • Summary "Obtained" cols get pale amber (#FFF8E1).
    //   • Summary "%" cols get pale green (#F0FDF4).
    //   • Formulas use getColLetter for dynamic cell references.
    // ═════════════════════════════════════════════════════════════════════════

    const DATA_START_ROW = T2 + 1;  // = 15
    const fmtNum = '0.00';

    // Precompute max_marks per LO (sum of all experiment max_marks)
    const loMaxMarks: Record<number, number> = {};
    for (const lo of loList) {
        const exps = loStructure[lo] ?? [];
        loMaxMarks[lo] = exps.reduce((s, e) => s + e.max_marks, 0);
    }

    // Reusable fonts & alignments
    const dataFont = { name: 'Calibri', size: 10, color: { argb: C.summText } };
    const numAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };
    const nameAlign: Partial<ExcelJS.Alignment> = { horizontal: 'left', vertical: 'middle', indent: 1 };

    students.forEach((student, rowIdx) => {
        const excelRow = DATA_START_ROW + rowIdx;
        const isOdd = rowIdx % 2 !== 0;
        const stripeBg = fill(isOdd ? C.dataRowOdd : C.dataRowEven);
        const fixedBg = fill(C.dataFixed);
        const summObtFill = fill(C.dataSummObt);
        const summPctFill = fill(C.dataSummPct);

        // ── Col 1: Roll No ───────────────────────────────────────────────
        const rollCell = ws.getCell(excelRow, 1);
        rollCell.value = student.roll_no;
        rollCell.font = { ...dataFont, bold: true };
        rollCell.fill = fixedBg;
        rollCell.alignment = numAlign;
        rollCell.border = box(B.thin);

        // ── Col 2: PID ───────────────────────────────────────────────────
        const pidCell = ws.getCell(excelRow, 2);
        pidCell.value = student.pid;
        pidCell.font = dataFont;
        pidCell.fill = fixedBg;
        pidCell.alignment = numAlign;
        pidCell.border = box(B.thin);

        // ── Col 3: Student Name ──────────────────────────────────────────
        const nameCell = ws.getCell(excelRow, 3);
        nameCell.value = student.stud_name;
        nameCell.font = { ...dataFont, bold: true };
        nameCell.fill = fixedBg;
        nameCell.alignment = nameAlign;
        nameCell.border = box(B.thin);

        // ── Dynamic LO columns ──────────────────────────────────────────
        colDefs.forEach((def, defIdx) => {
            const col = colMap.defToCol[defIdx];
            const cell = ws.getCell(excelRow, col);
            const loEntry = colMap.loSummary[def.lo];

            cell.font = dataFont;
            cell.alignment = numAlign;
            cell.border = box(B.thin);

            if (def.type === 'EXP') {
                // ── Experiment mark ──────────────────────────────────
                const mark = student.loMarks[def.lo]?.[def.experiment!.exp_no];
                cell.value = mark?.obtained ?? 0;
                cell.fill = stripeBg;

            } else if (def.summaryOf === 'obtained') {
                // ── Marks Obtained: =SUM(firstExpCol:lastExpCol) ─────
                const expCols = loEntry.expCols;
                const firstLetter = getColLetter(expCols[0]);
                const lastLetter = getColLetter(expCols[expCols.length - 1]);
                const formula = `SUM(${firstLetter}${excelRow}:${lastLetter}${excelRow})`;

                // JS fallback: compute the sum ourselves for the cached result
                let fbSum = 0;
                const exps = loStructure[def.lo] ?? [];
                for (const exp of exps) {
                    fbSum += student.loMarks[def.lo]?.[exp.exp_no]?.obtained ?? 0;
                }

                cell.value = { formula, result: fbSum } as ExcelJS.CellFormulaValue;
                cell.fill = summObtFill;

            } else if (def.summaryOf === 'attempted') {
                // ── Marks Attempted: static sum of max_marks ────────
                cell.value = loMaxMarks[def.lo] ?? 0;
                cell.fill = summObtFill;

            } else if (def.summaryOf === 'pct') {
                // ── In Percentage: =IF(AtmpCell=0, 0, (ObtCell/AtmpCell)*100)
                const obtLetter = getColLetter(loEntry.summObt);
                const atmpLetter = getColLetter(loEntry.summAtmp);
                const obtRef = `${obtLetter}${excelRow}`;
                const atmpRef = `${atmpLetter}${excelRow}`;
                const formula = `IF(${atmpRef}=0,0,(${obtRef}/${atmpRef})*100)`;

                // JS fallback
                const maxM = loMaxMarks[def.lo] ?? 0;
                let fbObt = 0;
                const exps = loStructure[def.lo] ?? [];
                for (const exp of exps) {
                    fbObt += student.loMarks[def.lo]?.[exp.exp_no]?.obtained ?? 0;
                }
                const fbPct = maxM > 0 ? parseFloat(((fbObt / maxM) * 100).toFixed(2)) : 0;

                cell.value = { formula, result: fbPct } as ExcelJS.CellFormulaValue;
                cell.numFmt = fmtNum;
                cell.fill = summPctFill;
            }
        });

        ws.getRow(excelRow).height = 16;
    });

    // Track the last data row for bottom summary formulas
    const LAST_DATA_ROW = DATA_START_ROW + students.length - 1;
    const N = students.length;

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION F — Bottom Summary (Blocks 1, 2, 3)
    //
    // Spatial rules (STRICT):
    //   • NO fill/border on entire rows — only stamp cells that have data.
    //   • LO summary data starts at Col C (3), one per LO sequentially.
    //   • Legend table is at Cols L-M (12-13), aligned with Blocks 2/3.
    //   • Cols A is left blank in the summary section.
    // ═════════════════════════════════════════════════════════════════════════

    const TARGET_MARK = 75;  // Easily change this for different subjects

    // Helper: stamp a single cell with value + optional styling
    function stamp(
        row: number,
        col: number,
        value: ExcelJS.CellValue,
        opts: {
            bold?: boolean;
            italic?: boolean;
            bg?: string;
            border?: boolean;
            halign?: 'left' | 'center' | 'right';
            numFmt?: string;
            size?: number;
        } = {},
    ) {
        const c = ws.getCell(row, col);
        c.value = value;
        c.font = {
            name: 'Calibri',
            size: opts.size ?? 10,
            bold: opts.bold ?? false,
            italic: opts.italic ?? false,
            color: { argb: C.summText },
        };
        if (opts.bg) c.fill = fill(opts.bg);
        if (opts.border) c.border = box(B.thin);
        c.alignment = {
            horizontal: opts.halign ?? 'center',
            vertical: 'middle',
            wrapText: true,
        };
        if (opts.numFmt) c.numFmt = opts.numFmt;
    }

    // ─── Track the row cursor ─────────────────────────────────────────────
    let R = LAST_DATA_ROW + 2;  // leave 1 blank row after student data

    // ═══════════════════════════════════════════════════════════════════════
    // BLOCK 1: Count Table
    //
    //   Col B: "Students scoring above 75%"  |  Col C: LO1  |  Col D: LO2  | ...
    //   Col B: "Count"                       |  Col C: [fx]  |  Col D: [fx] | ...
    //                              Col L: "Subject Target :" | Col M: 75
    // ═══════════════════════════════════════════════════════════════════════

    const BLOCK1_ROW1 = R;
    const BLOCK1_ROW2 = R + 1;

    // Row 1 header: "Students scoring above 75%"
    stamp(BLOCK1_ROW1, 2, `Students scoring above ${TARGET_MARK}%`, {
        bold: true, bg: C.summHdrBg, border: true, halign: 'left',
    });

    // LO labels across Col C, D, E...
    loList.forEach((lo, idx) => {
        stamp(BLOCK1_ROW1, 3 + idx, `LO${lo}`, {
            bold: true, bg: C.summHdrBg, border: true,
        });
    });

    // Subject Target label (Col L = 12) and value (Col M = 13)
    stamp(BLOCK1_ROW1, 12, 'Subject Target :', {
        bold: true, bg: C.headerBg, border: true, halign: 'right',
    });
    stamp(BLOCK1_ROW1, 13, TARGET_MARK, {
        bold: true, bg: C.summAttBg, border: true,
    });

    // Row 2: "Count" label + COUNTIF formulas
    stamp(BLOCK1_ROW2, 2, 'Count', {
        bold: true, bg: C.headerBg, border: true, halign: 'left',
    });

    loList.forEach((lo, idx) => {
        const pctCol = colMap.loSummary[lo].summPct;
        const pctLetter = getColLetter(pctCol);
        const rangeStr = `${pctLetter}${DATA_START_ROW}:${pctLetter}${LAST_DATA_ROW}`;
        const formula = `COUNTIF(${rangeStr},">=${TARGET_MARK}")`;

        // JS fallback: compute the count
        let fbCount = 0;
        const exps = loStructure[lo] ?? [];
        students.forEach(s => {
            let obt = 0;
            for (const exp of exps) obt += s.loMarks[lo]?.[exp.exp_no]?.obtained ?? 0;
            const maxM = loMaxMarks[lo] ?? 0;
            if (maxM > 0 && (obt / maxM) * 100 >= TARGET_MARK) fbCount++;
        });

        stamp(BLOCK1_ROW2, 3 + idx, { formula, result: fbCount } as ExcelJS.CellFormulaValue, {
            bold: true, bg: C.metaValueBg, border: true,
        });
    });

    R = BLOCK1_ROW2 + 2;  // skip 1 blank row

    // ═══════════════════════════════════════════════════════════════════════
    // BLOCK 2: Percentage Table + Legend Header (side by side)
    //
    //   Col B: "Students scoring above 75%"  |  Col C: LO1  | ...
    //   Col B: "Percentage"                  |  Col C: [fx]  | ...
    //
    //   Col L–M (same rows): Degree of Attainment legend
    //     Row 1: "Criteria of attainment with each CO" (merged L:M)
    //     Row 2: "Degree of Attainment" | "Condition"
    //     Row 3: 3 | "If 60% and above students have scored above 75%"
    //     Row 4: 2 | "If 50% to 60% of students have scored above 75%"
    // ═══════════════════════════════════════════════════════════════════════

    const BLOCK2_ROW1 = R;
    const BLOCK2_ROW2 = R + 1;

    // Header row
    stamp(BLOCK2_ROW1, 2, `Students scoring above ${TARGET_MARK}%`, {
        bold: true, bg: C.summHdrBg, border: true, halign: 'left',
    });
    loList.forEach((lo, idx) => {
        stamp(BLOCK2_ROW1, 3 + idx, `LO${lo}`, {
            bold: true, bg: C.summHdrBg, border: true,
        });
    });

    // Percentage row
    stamp(BLOCK2_ROW2, 2, 'Percentage', {
        bold: true, bg: C.headerBg, border: true, halign: 'left',
    });

    loList.forEach((lo, idx) => {
        const countCellRef = `${getColLetter(3 + idx)}${BLOCK1_ROW2}`;
        const formula = `IFERROR((${countCellRef}/${N})*100,0)`;

        // JS fallback
        const exps = loStructure[lo] ?? [];
        let fbCount = 0;
        students.forEach(s => {
            let obt = 0;
            for (const exp of exps) obt += s.loMarks[lo]?.[exp.exp_no]?.obtained ?? 0;
            const maxM = loMaxMarks[lo] ?? 0;
            if (maxM > 0 && (obt / maxM) * 100 >= TARGET_MARK) fbCount++;
        });
        const fbPct = N > 0 ? parseFloat(((fbCount / N) * 100).toFixed(2)) : 0;

        stamp(BLOCK2_ROW2, 3 + idx, { formula, result: fbPct } as ExcelJS.CellFormulaValue, {
            bold: true, bg: C.metaValueBg, border: true, numFmt: '0.00',
        });
    });

    // ── Legend (Cols L-M = 12-13), aligned with Block 2 rows ──

    // Legend title: "Criteria of attainment with each CO" merged L:M
    ws.mergeCells(BLOCK2_ROW1, 12, BLOCK2_ROW1, 13);
    stamp(BLOCK2_ROW1, 12, 'Criteria of attainment with each CO', {
        bold: true, bg: C.summHdrBg, border: true, halign: 'center',
    });

    // Legend sub-header: Degree | Condition
    stamp(BLOCK2_ROW2, 12, 'Degree of Attainment', {
        bold: true, bg: C.headerBg, border: true,
    });
    stamp(BLOCK2_ROW2, 13, 'Condition', {
        bold: true, bg: C.headerBg, border: true, halign: 'left',
    });

    // Legend row: 3 — green
    const LEGEND_ROW3 = BLOCK2_ROW2 + 1;
    stamp(LEGEND_ROW3, 12, 3, {
        bold: true, bg: C.summLvl3Bg, border: true,
    });
    stamp(LEGEND_ROW3, 13, `If 60% and above students have scored above ${TARGET_MARK}%`, {
        bg: C.summLvl3Bg, border: true, halign: 'left',
    });

    // Legend row: 2 — blue
    const LEGEND_ROW2 = LEGEND_ROW3 + 1;
    stamp(LEGEND_ROW2, 12, 2, {
        bold: true, bg: C.summLvl2Bg, border: true,
    });
    stamp(LEGEND_ROW2, 13, `If 50% to 60% of students have scored above ${TARGET_MARK}%`, {
        bg: C.summLvl2Bg, border: true, halign: 'left',
    });

    // Legend row: 1 — yellow
    const LEGEND_ROW1 = LEGEND_ROW2 + 1;
    stamp(LEGEND_ROW1, 12, 1, {
        bold: true, bg: C.summLvl1Bg, border: true,
    });
    stamp(LEGEND_ROW1, 13, `If less than 50% of students have scored above ${TARGET_MARK}%`, {
        bg: C.summLvl1Bg, border: true, halign: 'left',
    });

    // Widen Col M for the legend text
    ws.getColumn(13).width = 50;

    R = BLOCK2_ROW2 + 2;  // skip 1 blank row

    // ═══════════════════════════════════════════════════════════════════════
    // BLOCK 3: CO Attainment (1-3 scale)
    //
    //   Col B: "CO Attainment"  |  Col C: LO1  |  Col D: LO2  | ...
    //   Col B: (empty)          |  Col C: [fx]  |  Col D: [fx] | ...
    //
    // Formula: =IF(PctCell>=60, 3, IF(PctCell>=50, 2, 1))
    //   (Unlike ISE sheet: <50% = 1, NOT 0)
    // ═══════════════════════════════════════════════════════════════════════

    const BLOCK3_ROW1 = R;
    const BLOCK3_ROW2 = R + 1;

    // Header row
    stamp(BLOCK3_ROW1, 2, 'CO Attainment', {
        bold: true, bg: C.summHdrBg, border: true, halign: 'left',
    });
    loList.forEach((lo, idx) => {
        stamp(BLOCK3_ROW1, 3 + idx, `LO${lo}`, {
            bold: true, bg: C.summHdrBg, border: true,
        });
    });

    // Attainment formula row
    stamp(BLOCK3_ROW2, 2, '', {
        bg: C.headerBg, border: true,
    });

    loList.forEach((lo, idx) => {
        // Reference the Percentage cell from Block 2
        const pctCellRef = `${getColLetter(3 + idx)}${BLOCK2_ROW2}`;
        const formula = `IF(${pctCellRef}>=60,3,IF(${pctCellRef}>=50,2,1))`;

        // JS fallback
        const exps = loStructure[lo] ?? [];
        let fbCount = 0;
        students.forEach(s => {
            let obt = 0;
            for (const exp of exps) obt += s.loMarks[lo]?.[exp.exp_no]?.obtained ?? 0;
            const maxM = loMaxMarks[lo] ?? 0;
            if (maxM > 0 && (obt / maxM) * 100 >= TARGET_MARK) fbCount++;
        });
        const fbPct = N > 0 ? (fbCount / N) * 100 : 0;
        const fbAttn = fbPct >= 60 ? 3 : fbPct >= 50 ? 2 : 1;

        stamp(BLOCK3_ROW2, 3 + idx, { formula, result: fbAttn } as ExcelJS.CellFormulaValue, {
            bold: true, bg: C.summAttBg, border: true, size: 12,
        });
    });

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION H — Serialise & Download
    // ═════════════════════════════════════════════════════════════════════════

    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const batchLabel = allotment.all_batches ? 'AllBatches' : `Batch${allotment.batch_no}`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Lab-Attainment-${allotment.sub_id}-${batchLabel}.xlsx`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}
