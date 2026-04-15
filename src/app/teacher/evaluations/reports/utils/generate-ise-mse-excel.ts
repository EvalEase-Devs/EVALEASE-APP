/**
 * generate-ise-mse-excel.ts
 *
 * ISE/MSE Attainment Report – Excel generator (ExcelJS).
 *
 * ─── ROW MAP ──────────────────────────────────────────────────────────────────
 *   Row  1  │ College name          (col C onwards — col A-B reserved for logo)
 *   Row  2  │ (Engineering College)
 *   Row  3  │ Accreditation / affiliation
 *   Row  4  │ Address
 *   Row  5  │ Separator
 *   Row  6  │ Report title bar  "ISE-MSE ANALYSIS"
 *   Row  7  │ Meta info (Faculty | Subject)
 *   Row  8  │ Meta info (Department | Class | Semester)
 *   Row  9  │ Separator
 *   Row 10  │ TIER 1 — CO group headers
 *   Row 11  │ TIER 2 — ISE / MSE / Summary
 *   Row 12  │ TIER 3 — Task / question names
 *   Row 13  │ TIER 4 — Obtained | Attempted | %
 *   Row 14+ │ Student data rows
 *   ...     │ (gap of 2 rows)
 *   ...     │ SECTION F — Bottom stacked summary mini-tables
 */

import ExcelJS from 'exceljs';
import { SUBJECT_TARGETS } from '@/app/teacher/assignments/create/constants';


// ─────────────────────────────────────────────────────────────────────────────
// Types  (mirrors ise-mse-report.tsx exactly)
// ─────────────────────────────────────────────────────────────────────────────

export interface ISETask {
    task_id: number;
    title: string;
    max_marks: number;
}

export interface MSEQuestion {
    task_id: number;
    question_label: string;
    max_marks: number;
}

export interface ColumnStructure {
    [coNo: number]: {
        ise: ISETask[];
        mse: MSEQuestion[];
    };
}

export interface StudentMark {
    task_title?: string;
    label?: string;
    obtained: number;
    max: number;
}

export interface StudentData {
    pid: number;
    stud_name: string;
    roll_no: number;
    coMarks: Record<number, {
        ise: Record<string | number, StudentMark>;
        mse: Record<string, StudentMark>;
    }>;
}

export interface ReportResponse {
    allotment: {
        allotment_id: number;
        sub_id: string;
        class_name: string;
        current_sem: string;
    };
    teacher: {
        teacher_name: string;
    };
    students: StudentData[];
    columnStructure: ColumnStructure;
    coList: number[];
}

export interface ExternalAssessmentExportData {
    assessment_kind: 'ESE' | 'EXTERNAL_VIVA';
    subject_target: number;
    rows: Array<{
        roll_no: number | null;
        stud_pid: number | null;
        stud_name: string;
        obtained_marks: number;
        out_of: number;
        percent: number;
        grade: string | null;
        gpa: number | null;
        status: string;
    }>;
    summary: {
        total_students: number;
        count_above_target: number;
        percentage_above_target: number;
        attainment: number;
    };
}

export interface IndirectCOData {
    totalStudents: number;
    coData: Record<number, { mark3: number; mark2: number; mark1: number }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Print-friendly pastel colour palette (ARGB — all fully opaque, prefix FF)
// ALL TEXT IS BLACK / DARK GRAY (#111827).  No white text anywhere.
// ─────────────────────────────────────────────────────────────────────────────
const C = {
    // College header band — very light gray, print-safe
    headerBg: 'FFF3F4F6',   // off-white / light gray
    headerBg2: 'FFE5E7EB',   // slightly darker gray for alternating rows
    headerText: 'FF111827',   // near-black

    // Report title bar
    titleBg: 'FFE0F2FE',   // very light sky blue
    titleText: 'FF111827',

    // Meta info block
    metaLabelBg: 'FFDBEAFE',   // pale indigo
    metaValueBg: 'FFF9FAFB',   // near-white
    metaText: 'FF111827',

    // Tier 1 — CO group header
    tier1Bg: 'FFE0E7FF',   // pale periwinkle
    tier1Text: 'FF111827',

    // Tier 2 — ISE / MSE / Summary
    iseBg: 'FFE0F2FE',   // pale sky
    mseBg: 'FFDCFCE7',   // pale mint
    summaryBg: 'FFFEF9C3',   // pale lemon
    tier2Text: 'FF111827',

    // Tier 3 — Task / question names
    tier3Bg: 'FFF3F4F6',   // light gray
    tier3SummBg: 'FFFEF9C3',   // pale lemon
    tier3Text: 'FF111827',

    // Tier 4 — Granular metric labels
    tier4ObtBg: 'FFDBEAFE',   // pale indigo
    tier4AtmpBg: 'FFF3F4F6',   // light gray
    tier4PctBg: 'FFDCFCE7',   // pale mint
    tier4Text: 'FF111827',

    // Fixed columns (Roll No / PID / Name) header
    fixedColBg: 'FFE5E7EB',   // light gray
    fixedColText: 'FF111827',

    // Student data rows
    dataRowEven: 'FFFFFFFF',   // white
    dataRowOdd: 'FFF9FAFB',   // barely-off-white
    dataFixed: 'FFF3F4F6',   // slightly tinted for identity block
    dataSummObt: 'FFFFF8E1',   // very pale amber
    dataSummPct: 'FFF0FDF4',   // very pale green

    // Summary table rows  
    summTitleBg: 'FFFEF3C7',   // pale amber  — section titles
    summHdrBg: 'FFE5E7EB',   // light gray  — table header
    summLvl3Bg: 'FFF0FDF4',   // pale green  — level 3 (best)
    summLvl2Bg: 'FFDBEAFE',   // pale blue   — level 2
    summLvl1Bg: 'FFFEF9C3',   // pale yellow — level 1
    summLvl0Bg: 'FFFCE4D6',   // pale salmon — level 0
    summAttBg: 'FFFEF9C3',   // pale yellow — attainment level rows
    summText: 'FF111827',

    black: 'FF000000',
    separator: 'FFCBD5E1',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Border helpers
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
// Logo helper — A1:B5 only, college name starts from col C
// ─────────────────────────────────────────────────────────────────────────────
function embedLogoFromBase64(workbook: ExcelJS.Workbook, ws: ExcelJS.Worksheet, logoBase64: string): void {
    try {
        const imageId = workbook.addImage({ base64: logoBase64, extension: 'png' });
        ws.addImage(imageId, 'A1:B5');
    } catch {
        console.warn('[generateISEMSEExcel] logo embed skipped');
    }
}

async function embedLogo(workbook: ExcelJS.Workbook, ws: ExcelJS.Worksheet, logoBase64?: string): Promise<void> {
    if (logoBase64) {
        embedLogoFromBase64(workbook, ws, logoBase64);
        return;
    }
    try {
        const response = await fetch('/sfit_logo.png');
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((d, b) => d + String.fromCharCode(b), '')
        );
        const imageId = workbook.addImage({ base64: `data:image/png;base64,${base64}`, extension: 'png' });
        // Logo anchored strictly to A1:B5 — does NOT bleed into col C+
        ws.addImage(imageId, 'A1:B5');
    } catch {
        console.warn('[generateISEMSEExcel] logo embed skipped');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmtISETitle(title: string): string {
    return title.split('-').slice(-1)[0].trim().toUpperCase();
}

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
    co: number;
    type: 'ISE' | 'MSE' | 'SUMMARY';
    task?: ISETask;
    question?: MSEQuestion;
    summaryOf?: 'obtained' | 'attempted' | 'pct';
    displayLabel: string;
    maxMarks?: number;
}

function buildColDefs(coList: number[], cs: ColumnStructure): ColDef[] {
    const defs: ColDef[] = [];
    for (const co of coList) {
        const { ise = [], mse = [] } = cs[co] ?? {};
        for (const task of ise)
            defs.push({ co, type: 'ISE', task, displayLabel: `${fmtISETitle(task.title)}\n(${task.max_marks})`, maxMarks: task.max_marks });
        for (const q of mse)
            defs.push({ co, type: 'MSE', question: q, displayLabel: `${q.question_label}\n(${q.max_marks})`, maxMarks: q.max_marks });
        defs.push({ co, type: 'SUMMARY', summaryOf: 'obtained', displayLabel: 'Obtained' });
        defs.push({ co, type: 'SUMMARY', summaryOf: 'attempted', displayLabel: 'Attempted' });
        defs.push({ co, type: 'SUMMARY', summaryOf: 'pct', displayLabel: '%' });
    }
    return defs;
}

// ─────────────────────────────────────────────────────────────────────────────
// ColMap — one-time lookup from colDef index → worksheet column number
// ─────────────────────────────────────────────────────────────────────────────
interface ColMap {
    defToCol: number[];
    coSummary: Record<number, {
        iseCols: number[];
        mseCols: number[];
        allLeafCols: number[];   // ISE + MSE combined (for row-average formula)
        summObt: number;
        summAtmp: number;
        summPct: number;
    }>;
}

function buildColMap(colDefs: ColDef[], fixedCols: number): ColMap {
    const defToCol: number[] = [];
    const coSummary: ColMap['coSummary'] = {};
    for (let i = 0; i < colDefs.length; i++) {
        const col = fixedCols + i + 1;
        const def = colDefs[i];
        defToCol[i] = col;
        if (!coSummary[def.co])
            coSummary[def.co] = { iseCols: [], mseCols: [], allLeafCols: [], summObt: 0, summAtmp: 0, summPct: 0 };
        const e = coSummary[def.co];
        if (def.type === 'ISE') { e.iseCols.push(col); e.allLeafCols.push(col); }
        else if (def.type === 'MSE') { e.mseCols.push(col); e.allLeafCols.push(col); }
        else if (def.summaryOf === 'obtained') e.summObt = col;
        else if (def.summaryOf === 'attempted') e.summAtmp = col;
        else if (def.summaryOf === 'pct') e.summPct = col;
    }
    return { defToCol, coSummary };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export async function generateISEMSEExcelBuffer(
    reportData: ReportResponse,
    logoBase64?: string,
    mappings?: Record<string, Record<string, number>>,
    externalReport?: ExternalAssessmentExportData,
    indirectData?: IndirectCOData,
): Promise<ArrayBuffer> {
    return _buildISEMSEExcel(reportData, logoBase64, mappings, externalReport, indirectData);
}

export async function generateISEMSEExcel(
    reportData: ReportResponse,
    mappings?: Record<string, Record<string, number>>,
    externalReport?: ExternalAssessmentExportData,
    indirectData?: IndirectCOData,
): Promise<void> {
    const buffer = await _buildISEMSEExcel(reportData, undefined, mappings, externalReport, indirectData);
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ISE-MSE-Attainment-${reportData.allotment.sub_id}.xlsx`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

async function _buildISEMSEExcel(
    reportData: ReportResponse,
    logoBase64?: string,
    mappings?: Record<string, Record<string, number>>,
    externalReport?: ExternalAssessmentExportData,
    indirectData?: IndirectCOData,
): Promise<ArrayBuffer> {
    const { allotment, teacher, students, columnStructure, coList } = reportData;

    // ── Workbook ─────────────────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EvalEase – SFIT';
    workbook.created = new Date();
    workbook.modified = new Date();

    const ws = workbook.addWorksheet('ISE-MSE Attainment', {
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

    // ── Column defs ──────────────────────────────────────────────────────────
    const FIXED_COLS = 3;
    const colDefs = buildColDefs(coList, columnStructure);
    const TOTAL_COLS = FIXED_COLS + colDefs.length;
    const colMap = buildColMap(colDefs, FIXED_COLS);

    // ── Column widths ────────────────────────────────────────────────────────
    ws.getColumn(1).width = 10;   // Roll No
    ws.getColumn(2).width = 15;   // PID
    ws.getColumn(3).width = 30;   // Name
    colDefs.forEach((def, i) => {
        ws.getColumn(FIXED_COLS + i + 1).width = def.type === 'SUMMARY' ? 13 : 12;
    });

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION A — Rows 1–5 : College identity header
    // FIX: Logo anchored to A1:B5.  College name text starts from col 3 (C).
    // ═════════════════════════════════════════════════════════════════════════

    // Cols A and B (1-2) are visually occupied by the logo image.
    // We set their background to match the header band.
    for (let row = 1; row <= 5; row++) {
        for (let col = 1; col <= 2; col++) {
            const c = ws.getCell(row, col);
            c.fill = fill(C.headerBg);
        }
    }

    // Row 1 — College name  (C1 onwards)
    ws.mergeCells(1, 3, 1, TOTAL_COLS);
    const r1 = ws.getCell(1, 3);
    r1.value = 'St. Francis Institute of Technology';
    r1.font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.headerText } };
    r1.fill = fill(C.headerBg);
    r1.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 30;

    // Row 2 — College type  (C2 onwards)
    ws.mergeCells(2, 3, 2, TOTAL_COLS);
    const r2 = ws.getCell(2, 3);
    r2.value = '(Engineering College)';
    r2.font = { name: 'Calibri', bold: true, size: 13, color: { argb: C.headerText } };
    r2.fill = fill(C.headerBg);
    r2.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 22;

    // Row 3 — Accreditation  (C3 onwards)
    ws.mergeCells(3, 3, 3, TOTAL_COLS);
    const r3 = ws.getCell(3, 3);
    r3.value = 'Accredited by NAAC with Grade "A" | Affiliated to University of Mumbai';
    r3.font = { name: 'Calibri', italic: true, size: 10, color: { argb: C.headerText } };
    r3.fill = fill(C.headerBg2);
    r3.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(3).height = 18;

    // Row 4 — Address  (C4 onwards)
    ws.mergeCells(4, 3, 4, TOTAL_COLS);
    const r4 = ws.getCell(4, 3);
    r4.value = 'Mount Poinsur, SVP Road, Borivali (W), Mumbai – 400 103.';
    r4.font = { name: 'Calibri', size: 10, color: { argb: C.headerText } };
    r4.fill = fill(C.headerBg2);
    r4.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(4).height = 18;

    // Row 5 — thin separator  (C5 onwards)
    ws.mergeCells(5, 3, 5, TOTAL_COLS);
    const r5 = ws.getCell(5, 3);
    r5.value = '';
    r5.fill = fill(C.headerBg);
    r5.border = { bottom: { style: 'thin', color: { argb: C.separator } }, diagonal: {} };
    ws.getRow(5).height = 6;

    // Logo — anchored ONLY to A1:B5, does not bleed into data columns
    await embedLogo(workbook, ws, logoBase64);

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION B — Rows 6–9 : Report meta-info
    // ═════════════════════════════════════════════════════════════════════════

    // Row 6 — Report title bar (full width)
    ws.mergeCells(6, 1, 6, TOTAL_COLS);
    const r6 = ws.getCell(6, 1);
    r6.value = 'ISE – MSE ATTAINMENT ANALYSIS';
    r6.font = { name: 'Calibri', bold: true, size: 13, color: { argb: C.titleText } };
    r6.fill = fill(C.titleBg);
    r6.alignment = { horizontal: 'center', vertical: 'middle' };
    r6.border = box(B.thin);
    ws.getRow(6).height = 24;

    const metaFont = { name: 'Calibri', size: 10 };
    const metaLabelFont = { ...metaFont, bold: true, color: { argb: C.metaText } };
    const metaValueFont = { ...metaFont, color: { argb: C.metaText } };
    const metaAlign: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'left', indent: 1 };

    function metaCell(
        row: number,
        lCol: number, lSpan: number, lText: string,
        vCol: number, vSpan: number, vText: string,
    ) {
        if (lSpan > 1) ws.mergeCells(row, lCol, row, lCol + lSpan - 1);
        const lc = ws.getCell(row, lCol);
        lc.value = lText; lc.font = metaLabelFont; lc.fill = fill(C.metaLabelBg);
        lc.alignment = metaAlign; lc.border = box(B.thin);

        if (vSpan > 1) ws.mergeCells(row, vCol, row, vCol + vSpan - 1);
        const vc = ws.getCell(row, vCol);
        vc.value = vText; vc.font = metaValueFont; vc.fill = fill(C.metaValueBg);
        vc.alignment = metaAlign; vc.border = box(B.thin);
    }

    const half = Math.floor(TOTAL_COLS / 2);
    const labelW = 4;

    ws.getRow(7).height = 20;
    metaCell(7, 1, labelW, 'Faculty Name:', 1 + labelW, half - labelW, teacher.teacher_name);
    metaCell(7, half + 1, labelW, 'Subject:', half + 1 + labelW, TOTAL_COLS - half - labelW, allotment.sub_id);

    ws.getRow(8).height = 20;
    metaCell(8, 1, labelW, 'Department:', 1 + labelW, half - labelW, 'Computer Engineering');
    const rightThird = Math.floor((TOTAL_COLS - half) / 2);
    metaCell(8, half + 1, labelW, 'Class:', half + 1 + labelW, rightThird - labelW, allotment.class_name);
    metaCell(8, half + 1 + rightThird, labelW, 'Semester:',
        half + 1 + rightThird + labelW, TOTAL_COLS - half - rightThird - labelW, allotment.current_sem);

    ws.mergeCells(9, 1, 9, TOTAL_COLS);
    const r9 = ws.getCell(9, 1);
    r9.fill = fill(C.metaValueBg);
    r9.border = { bottom: { style: 'thin', color: { argb: C.separator } }, diagonal: {} };
    ws.getRow(9).height = 4;

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION C — Rows 10–13 : 4-tier nested table headers
    // ═════════════════════════════════════════════════════════════════════════

    const T1 = 10, T2 = 11, T3 = 12, T4 = 13;
    const hdAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // Fixed columns span all 4 tiers
    ['Roll No', 'PID', 'Name'].forEach((label, i) => {
        const col = i + 1;
        ws.mergeCells(T1, col, T4, col);
        const cell = ws.getCell(T1, col);
        cell.value = label;
        cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: C.fixedColText } };
        cell.fill = fill(C.fixedColBg);
        cell.alignment = hdAlign;
        cell.border = box(B.medium);
    });

    let cursor = FIXED_COLS + 1;
    for (const co of coList) {
        const { ise = [], mse = [] } = columnStructure[co] ?? {};
        const coSpan = ise.length + mse.length + 3;
        const coStart = cursor;
        const coEnd = cursor + coSpan - 1;

        // Tier 1 — CO label
        ws.mergeCells(T1, coStart, T1, coEnd);
        const t1 = ws.getCell(T1, coStart);
        t1.value = `CO${co}`; t1.font = { name: 'Calibri', bold: true, size: 11, color: { argb: C.tier1Text } };
        t1.fill = fill(C.tier1Bg); t1.alignment = hdAlign; t1.border = box(B.medium);
        ws.getRow(T1).height = 22;

        let sub = cursor;

        // Tier 2 — ISE
        if (ise.length > 0) {
            ws.mergeCells(T2, sub, T2, sub + ise.length - 1);
            const t2 = ws.getCell(T2, sub);
            t2.value = 'ISE'; t2.font = { name: 'Calibri', bold: true, size: 10, color: { argb: C.tier2Text } };
            t2.fill = fill(C.iseBg); t2.alignment = hdAlign; t2.border = box(B.thin);

            ise.forEach((task, ti) => {
                const col = sub + ti;
                const t3 = ws.getCell(T3, col);
                t3.value = `${fmtISETitle(task.title)}\n(${task.max_marks})`;
                t3.font = { name: 'Calibri', bold: true, size: 9, color: { argb: C.tier3Text } };
                t3.fill = fill(C.tier3Bg); t3.alignment = hdAlign; t3.border = box(B.thin);

                const t4 = ws.getCell(T4, col);
                t4.value = 'Obt. / Max'; t4.font = { name: 'Calibri', size: 8, color: { argb: C.tier4Text } };
                t4.fill = fill(C.tier4ObtBg); t4.alignment = hdAlign; t4.border = box(B.thin);
            });
            sub += ise.length;
        }

        // Tier 2 — MSE
        if (mse.length > 0) {
            ws.mergeCells(T2, sub, T2, sub + mse.length - 1);
            const t2 = ws.getCell(T2, sub);
            t2.value = 'MSE'; t2.font = { name: 'Calibri', bold: true, size: 10, color: { argb: C.tier2Text } };
            t2.fill = fill(C.mseBg); t2.alignment = hdAlign; t2.border = box(B.thin);

            mse.forEach((q, qi) => {
                const col = sub + qi;
                const t3 = ws.getCell(T3, col);
                t3.value = `${q.question_label}\n(${q.max_marks})`;
                t3.font = { name: 'Calibri', bold: true, size: 9, color: { argb: C.tier3Text } };
                t3.fill = fill(C.tier3Bg); t3.alignment = hdAlign; t3.border = box(B.thin);

                const t4 = ws.getCell(T4, col);
                t4.value = 'Obt. / Max'; t4.font = { name: 'Calibri', size: 8, color: { argb: C.tier4Text } };
                t4.fill = fill(C.tier4ObtBg); t4.alignment = hdAlign; t4.border = box(B.thin);
            });
            sub += mse.length;
        }

        // Tier 2 — Summary (3 cols)
        ws.mergeCells(T2, sub, T2, sub + 2);
        const t2s = ws.getCell(T2, sub);
        t2s.value = 'Summary'; t2s.font = { name: 'Calibri', bold: true, size: 10, color: { argb: C.tier2Text } };
        t2s.fill = fill(C.summaryBg); t2s.alignment = hdAlign; t2s.border = box(B.thin);

        ws.mergeCells(T3, sub, T3, sub + 2);
        const t3s = ws.getCell(T3, sub);
        t3s.value = 'CO Summary'; t3s.font = { name: 'Calibri', bold: true, size: 9, color: { argb: C.tier3Text } };
        t3s.fill = fill(C.tier3SummBg); t3s.alignment = hdAlign; t3s.border = box(B.thin);

        ([
            { label: 'Obtained', bg: C.tier4ObtBg },
            { label: 'Attempted', bg: C.tier4AtmpBg },
            { label: '%', bg: C.tier4PctBg },
        ] as const).forEach(({ label, bg }, mi) => {
            const t4 = ws.getCell(T4, sub + mi);
            t4.value = label; t4.font = { name: 'Calibri', bold: true, size: 9, color: { argb: C.tier4Text } };
            t4.fill = fill(bg); t4.alignment = hdAlign; t4.border = box(B.thin);
        });

        cursor += coSpan;
    }

    ws.getRow(T2).height = 18;
    ws.getRow(T3).height = 30;
    ws.getRow(T4).height = 18;

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION D — Freeze panes
    // FIX: Only freeze rows (ySplit = T4 = 13), NO horizontal column freeze.
    // Teachers can scroll left/right and resize name columns freely.
    // ═════════════════════════════════════════════════════════════════════════
    ws.views = [{
        state: 'frozen',
        ySplit: T4,       // freeze the 13 header rows only
        topLeftCell: `A${T4 + 1}`,
        activeCell: `A${T4 + 1}`,
    }];

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION E — Rows 14+ : Student data rows
    // ═════════════════════════════════════════════════════════════════════════

    const DATA_START_ROW = T4 + 1; // = 14

    // Precompute max_marks per CO
    const coMaxMarks: Record<number, number> = {};
    for (const co of coList) {
        const { ise = [], mse = [] } = columnStructure[co] ?? {};
        coMaxMarks[co] =
            ise.reduce((s, t) => s + t.max_marks, 0) +
            mse.reduce((s, q) => s + q.max_marks, 0);
    }

    const dataFont = { name: 'Calibri', size: 10, color: { argb: C.summText } };
    const numAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };
    const nameAlign: Partial<ExcelJS.Alignment> = { horizontal: 'left', vertical: 'middle', indent: 1 };
    const fmtNum = '0.00';

    students.forEach((student, rowIdx) => {
        const excelRow = DATA_START_ROW + rowIdx;
        const isEven = rowIdx % 2 === 0;
        const bgFill = fill(isEven ? C.dataRowEven : C.dataRowOdd);
        const fixFill = fill(C.dataFixed);
        const sumOFill = fill(C.dataSummObt);
        const sumPFill = fill(C.dataSummPct);

        // Fixed columns
        const rollCell = ws.getCell(excelRow, 1);
        rollCell.value = student.roll_no; rollCell.font = { ...dataFont, bold: true };
        rollCell.fill = fixFill; rollCell.alignment = numAlign; rollCell.border = box(B.thin);

        const pidCell = ws.getCell(excelRow, 2);
        pidCell.value = student.pid; pidCell.font = dataFont;
        pidCell.fill = fixFill; pidCell.alignment = numAlign; pidCell.border = box(B.thin);

        const nameCell = ws.getCell(excelRow, 3);
        nameCell.value = student.stud_name; nameCell.font = { ...dataFont, bold: true };
        nameCell.fill = fixFill; nameCell.alignment = nameAlign; nameCell.border = box(B.thin);

        // Data columns
        colDefs.forEach((def, defIdx) => {
            const col = colMap.defToCol[defIdx];
            const cell = ws.getCell(excelRow, col);
            const coEntry = colMap.coSummary[def.co];
            cell.font = dataFont;
            cell.alignment = numAlign;
            cell.border = box(B.thin);

            if (def.type === 'ISE') {
                const mark = student.coMarks[def.co]?.ise[def.task!.task_id];
                cell.value = mark?.obtained ?? 0;
                cell.fill = bgFill;

            } else if (def.type === 'MSE') {
                const mark = student.coMarks[def.co]?.mse[def.question!.question_label];
                cell.value = mark?.obtained ?? 0;
                cell.fill = bgFill;

            } else if (def.summaryOf === 'obtained') {
                const parts = [...coEntry.iseCols, ...coEntry.mseCols]
                    .map(c => `${getColLetter(c)}${excelRow}`);
                let fb = 0;
                const { ise: iL = [], mse: mL = [] } = columnStructure[def.co] ?? {};
                for (const t of iL) fb += student.coMarks[def.co]?.ise[t.task_id]?.obtained ?? 0;
                for (const q of mL) fb += student.coMarks[def.co]?.mse[q.question_label]?.obtained ?? 0;
                cell.value = { formula: parts.length > 0 ? `SUM(${parts.join(',')})` : '0', result: fb };
                cell.fill = sumOFill;

            } else if (def.summaryOf === 'attempted') {
                cell.value = coMaxMarks[def.co] ?? 0;
                cell.fill = sumOFill;

            } else if (def.summaryOf === 'pct') {
                const obtRef = `${getColLetter(coEntry.summObt)}${excelRow}`;
                const atmpRef = `${getColLetter(coEntry.summAtmp)}${excelRow}`;
                const maxM = coMaxMarks[def.co] ?? 0;
                let fb = 0;
                const { ise: iL = [], mse: mL = [] } = columnStructure[def.co] ?? {};
                for (const t of iL) fb += student.coMarks[def.co]?.ise[t.task_id]?.obtained ?? 0;
                for (const q of mL) fb += student.coMarks[def.co]?.mse[q.question_label]?.obtained ?? 0;
                const pctFb = maxM > 0 ? parseFloat(((fb / maxM) * 100).toFixed(2)) : 0;
                cell.value = { formula: `IF(${atmpRef}=0,0,${obtRef}/${atmpRef}*100)`, result: pctFb };
                cell.numFmt = fmtNum;
                cell.fill = sumPFill;
            }
            ws.getRow(excelRow).height = 16;
        });
    });

    // 
    // SECTION F — Bottom Summary Section (Blocks 1, 2, 3)
    // 
    // Rules: No full-row spans, labels in Col C, data in D onwards, A/B empty.

    const LAST_DATA_ROW = DATA_START_ROW  + students.length - 1;
    const subjectTarget = SUBJECT_TARGETS[allotment.sub_id as keyof typeof SUBJECT_TARGETS];
    const TARGET_LOW = typeof subjectTarget === 'number' ? subjectTarget : 50;
    const N = students.length;

    // Helper to stamp individual cells only — no row-wide operations
    function stamp(
        row: number,
        col: number,
        value: string | number | ExcelJS.CellFormulaValue,
        style: {
            bold?: boolean;
            italic?: boolean;
            bg?: string;
            border?: boolean;
            numFmt?: string;
            halign?: 'left' | 'center' | 'right';
        } = {}
    ) {
        const cell = ws.getCell(row, col);
        cell.value = value as ExcelJS.CellValue;
        cell.font = {
            name: 'Calibri',
            size: 10,
            bold: style.bold || false,
            italic: style.italic || false,
            color: { argb: 'FF000000' }
        } as ExcelJS.Font;

        cell.alignment = {
            horizontal: style.halign || 'center',
            vertical: 'middle',
            wrapText: true
        };

        if (style.bg) {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: style.bg }
            };
        }
        if (style.border) {
            const b = { style: 'thin', color: { argb: 'FFD1D5DB' } } as ExcelJS.Border;
            cell.border = { top: b, bottom: b, left: b, right: b };
        }
        if (style.numFmt) {
            cell.numFmt = style.numFmt;
        }
    }

    const HDR_BG = 'FFF3F4F6'; // Light gray pastel for labels
    const DATA_BG = 'FFFFFFFF';
    let R = LAST_DATA_ROW + 3; // Block 1 starts 2 rows below last student

    //  Block 1: The Averages 

    // Row 1: "Average" calculations for every column
    stamp(R, 3, 'Average', { bold: true, bg: HDR_BG, halign: 'left' });
    colDefs.forEach((def, idx) => {
        const colIdx = FIXED_COLS + idx + 1;
        const colLet = getColLetter(colIdx);
        const range = `${colLet}${DATA_START_ROW}:${colLet}${LAST_DATA_ROW}`;

        // JS Fallback calculation
        let sum = 0;
        students.forEach(s => {
            if (def.type === 'ISE' && def.task) sum += s.coMarks[def.co]?.ise[def.task.task_id]?.obtained || 0;
            if (def.type === 'MSE' && def.question) sum += s.coMarks[def.co]?.mse[def.question.question_label]?.obtained || 0;
            if (def.type === 'SUMMARY') {
                const { ise = [], mse = [] } = columnStructure[def.co] || {};
                if (def.summaryOf === 'obtained') {
                    ise.forEach(t => sum += s.coMarks[def.co]?.ise[t.task_id]?.obtained || 0);
                    mse.forEach(q => sum += s.coMarks[def.co]?.mse[q.question_label]?.obtained || 0);
                } else if (def.summaryOf === 'pct') {
                    let obt = 0;
                    ise.forEach(t => obt += s.coMarks[def.co]?.ise[t.task_id]?.obtained || 0);
                    mse.forEach(q => obt += s.coMarks[def.co]?.mse[q.question_label]?.obtained || 0);
                    if (coMaxMarks[def.co] > 0) sum += (obt / coMaxMarks[def.co]) * 100;
                }
            }
        });
        const avg = N > 0 ? parseFloat((sum / N).toFixed(2)) : 0;

        stamp(R, colIdx, { formula: `IFERROR(AVERAGE(${range}), 0)`, result: avg } as ExcelJS.CellFormulaValue, { numFmt: '0.00' });
    });
    R += 2; // (Empty row + Row 3)

    // Row 3: Avg CO pairs
    let currentPairCol = 3;
    coList.forEach(co => {
        const entry = colMap.coSummary[co];
        if (entry.summObt) {
            const colL = getColLetter(entry.summObt);
            const range = `${colL}${DATA_START_ROW}:${colL}${LAST_DATA_ROW}`;

            // Calc result
            let sum = 0;
            const { ise = [], mse = [] } = columnStructure[co] || {};
            students.forEach(s => {
                ise.forEach(t => sum += s.coMarks[co]?.ise[t.task_id]?.obtained || 0);
                mse.forEach(q => sum += s.coMarks[co]?.mse[q.question_label]?.obtained || 0);
            });
            const avg = N > 0 ? parseFloat((sum / N).toFixed(2)) : 0;

            stamp(R, currentPairCol, `Avg CO${co}`, { bold: true, bg: HDR_BG, halign: 'left' });
            stamp(R, currentPairCol + 1, { formula: `IFERROR(AVERAGE(${range}), 0)`, result: avg } as ExcelJS.CellFormulaValue, { numFmt: '0.00' });
            currentPairCol += 2;
        }
    });
    R++;

    // Row 4: CO % pairs
    currentPairCol = 3;
    coList.forEach(co => {
        const entry = colMap.coSummary[co];
        if (entry.summPct) {
            const colL = getColLetter(entry.summPct);
            const range = `${colL}${DATA_START_ROW}:${colL}${LAST_DATA_ROW}`;

            // Calc result
            let sum = 0;
            const { ise = [], mse = [] } = columnStructure[co] || {};
            students.forEach(s => {
                let obt = 0;
                ise.forEach(t => obt += s.coMarks[co]?.ise[t.task_id]?.obtained || 0);
                mse.forEach(q => obt += s.coMarks[co]?.mse[q.question_label]?.obtained || 0);
                if (coMaxMarks[co] > 0) sum += (obt / coMaxMarks[co]) * 100;
            });
            const avg = N > 0 ? parseFloat((sum / N).toFixed(2)) : 0;

            stamp(R, currentPairCol, `CO ${co} %`, { bold: true, bg: HDR_BG, halign: 'left' });
            stamp(R, currentPairCol + 1, { formula: `IFERROR(AVERAGE(${range}), 0)`, result: avg } as ExcelJS.CellFormulaValue, { numFmt: '0.00' });
            currentPairCol += 2;
        }
    });

    //  Block 2: Count Table 
    R += 3; // Skip 2 rows

    // Description text (no borders, no fill)
    stamp(R, 3, `This table consists of count of students who have scored above ${TARGET_LOW}% in each CO`, { italic: true, halign: 'left' });
    R++;

    // Headers
    stamp(R, 3, 'Count', { bold: true, bg: HDR_BG, border: true, halign: 'left' });
    coList.forEach((co, idx) => {
        stamp(R, 4 + idx, `CO${co}`, { bold: true, bg: HDR_BG, border: true });
    });
    R++;

    // Data Row
    stamp(R, 3, `Students Scoring Above ${TARGET_LOW}%`, { border: true, halign: 'left' });
    coList.forEach((co, idx) => {
        const entry = colMap.coSummary[co];
        const colL = getColLetter(entry.summPct);
        const range = `${colL}${DATA_START_ROW}:${colL}${LAST_DATA_ROW}`;

        let cnt = 0;
        const { ise = [], mse = [] } = columnStructure[co] || {};
        students.forEach(s => {
            let obt = 0;
            ise.forEach(t => obt += s.coMarks[co]?.ise[t.task_id]?.obtained || 0);
            mse.forEach(q => obt += s.coMarks[co]?.mse[q.question_label]?.obtained || 0);
            if (coMaxMarks[co] > 0 && (obt / coMaxMarks[co]) * 100 >= TARGET_LOW) cnt++;
        });

        stamp(R, 4 + idx, { formula: `COUNTIF(${range}, ">=${TARGET_LOW}")`, result: cnt } as ExcelJS.CellFormulaValue, { border: true });
    });
    const COUNT_DATA_ROW = R;

    //  Block 3: Percentage Table 
    R += 3; // Skip 2 rows

    // Description text
    stamp(R, 3, `This table consists of percentage of students who have scored above ${TARGET_LOW}% in each CO with respect to students who have attempted the questions`, { italic: true, halign: 'left' });
    R++;

    // Headers
    stamp(R, 3, 'In percentage', { bold: true, bg: HDR_BG, border: true, halign: 'left' });
    coList.forEach((co, idx) => {
        stamp(R, 4 + idx, `CO${co}`, { bold: true, bg: HDR_BG, border: true });
    });
    R++;

    // Data Row
    stamp(R, 3, `Students scoring above ${TARGET_LOW}%`, { border: true, halign: 'left' });
    coList.forEach((co, idx) => {
        const countCell = `${getColLetter(4 + idx)}${COUNT_DATA_ROW}`;

        let cnt = 0;
        const { ise = [], mse = [] } = columnStructure[co] || {};
        students.forEach(s => {
            let obt = 0;
            ise.forEach(t => obt += s.coMarks[co]?.ise[t.task_id]?.obtained || 0);
            mse.forEach(q => obt += s.coMarks[co]?.mse[q.question_label]?.obtained || 0);
            if (coMaxMarks[co] > 0 && (obt / coMaxMarks[co]) * 100 >= TARGET_LOW) cnt++;
        });
        const pct = N > 0 ? parseFloat(((cnt / N) * 100).toFixed(2)) : 0;

        stamp(R, 4 + idx, { formula: `(${countCell}/${N})*100`, result: pct } as ExcelJS.CellFormulaValue, { border: true, numFmt: '0.00' });
    });
    const FINAL_SUMMARY_ROW = R;

    // Re-adding the mapping legend and final attainment as they are critical for the report
    R += 3;
    stamp(R, 3, 'CO Attainment', { bold: true, bg: HDR_BG, border: true });
    stamp(R, 4, 'Degree of Mapping Condition', { bold: true, bg: HDR_BG, border: true, halign: 'left' });
    ws.getColumn(4).width = 45;
    R++;

    [[3, C.summLvl3Bg, `>= 60% of students scored >= ${TARGET_LOW}%`],
    [2, C.summLvl2Bg, `>= 50% to < 60% of students scored >= ${TARGET_LOW}%`],
    [1, C.summLvl1Bg, `< 50% of students scored >= ${TARGET_LOW}%`]].forEach(([lvl, bg, cond]) => {
        stamp(R, 3, lvl as number, { bold: true, bg: bg as string, border: true });
        stamp(R, 4, cond as string, { bg: bg as string, border: true, halign: 'left' });
        R++;
    });

    R += 2;
    stamp(R, 3, 'CO attainment:-', { bold: true, bg: C.summAttBg, halign: 'left' });
    R++;
    coList.forEach((co, idx) => {
        const pctCell = `${getColLetter(4 + idx)}${FINAL_SUMMARY_ROW}`;
        const formula = `IF(${pctCell}>=60,3,IF(${pctCell}>=50,2,IF(${pctCell}>0,1,0)))`;

        let cnt = 0;
        const { ise = [], mse = [] } = columnStructure[co] || {};
        students.forEach(s => {
            let obt = 0;
            ise.forEach(t => obt += s.coMarks[co]?.ise[t.task_id]?.obtained || 0);
            mse.forEach(q => obt += s.coMarks[co]?.mse[q.question_label]?.obtained || 0);
            if (coMaxMarks[co] > 0 && (obt / coMaxMarks[co]) * 100 >= TARGET_LOW) cnt++;
        });
        const pct = N > 0 ? (cnt / N) * 100 : 0;
        const res = pct >= 60 ? 3 : pct >= 50 ? 2 : pct > 0 ? 1 : 0;

        stamp(R, 3, `CO${co}`, { bold: true, bg: C.summAttBg, border: true, halign: 'left' });
        stamp(R, 4, { formula, result: res } as ExcelJS.CellFormulaValue, { bold: true, bg: C.summAttBg, border: true });
        R++;
    });

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION G — External Assessment worksheet (Page 2)
    // ═════════════════════════════════════════════════════════════════════════

    const wsExternal = workbook.addWorksheet('External Assessment (Page 2)', {
        properties: { defaultColWidth: 14, defaultRowHeight: 18 },
    });

    const EXT_TOTAL_COLS = 10;

    for (let row = 1; row <= 5; row++) {
        for (let col = 1; col <= 2; col++) {
            wsExternal.getCell(row, col).fill = fill(C.headerBg);
        }
    }

    wsExternal.mergeCells(1, 3, 1, EXT_TOTAL_COLS);
    wsExternal.getCell(1, 3).value = 'St. Francis Institute of Technology';
    wsExternal.getCell(1, 3).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.headerText } };
    wsExternal.getCell(1, 3).fill = fill(C.headerBg);
    wsExternal.getCell(1, 3).alignment = { horizontal: 'center', vertical: 'middle' };
    wsExternal.getRow(1).height = 30;

    wsExternal.mergeCells(2, 3, 2, EXT_TOTAL_COLS);
    wsExternal.getCell(2, 3).value = '(Engineering College)';
    wsExternal.getCell(2, 3).font = { name: 'Calibri', bold: true, size: 13, color: { argb: C.headerText } };
    wsExternal.getCell(2, 3).fill = fill(C.headerBg);
    wsExternal.getCell(2, 3).alignment = { horizontal: 'center', vertical: 'middle' };
    wsExternal.getRow(2).height = 22;

    wsExternal.mergeCells(3, 3, 3, EXT_TOTAL_COLS);
    wsExternal.getCell(3, 3).value = 'Accredited by NAAC with Grade "A" | Affiliated to University of Mumbai';
    wsExternal.getCell(3, 3).font = { name: 'Calibri', italic: true, size: 10, color: { argb: C.headerText } };
    wsExternal.getCell(3, 3).fill = fill(C.headerBg2);
    wsExternal.getCell(3, 3).alignment = { horizontal: 'center', vertical: 'middle' };
    wsExternal.getRow(3).height = 18;

    wsExternal.mergeCells(4, 3, 4, EXT_TOTAL_COLS);
    wsExternal.getCell(4, 3).value = 'Mount Poinsur, SVP Road, Borivali (W), Mumbai – 400 103.';
    wsExternal.getCell(4, 3).font = { name: 'Calibri', size: 10, color: { argb: C.headerText } };
    wsExternal.getCell(4, 3).fill = fill(C.headerBg2);
    wsExternal.getCell(4, 3).alignment = { horizontal: 'center', vertical: 'middle' };
    wsExternal.getRow(4).height = 18;

    wsExternal.mergeCells(5, 3, 5, EXT_TOTAL_COLS);
    wsExternal.getCell(5, 3).fill = fill(C.headerBg);
    wsExternal.getCell(5, 3).border = { bottom: { style: 'thin', color: { argb: C.separator } }, diagonal: {} };
    wsExternal.getRow(5).height = 6;

    await embedLogo(workbook, wsExternal, logoBase64);

    wsExternal.mergeCells(6, 1, 6, EXT_TOTAL_COLS);
    const extTitle = wsExternal.getCell(6, 1);
    extTitle.value = `External Assessment Analysis - ${externalReport?.assessment_kind ?? 'ESE'}`;
    extTitle.font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.titleText } };
    extTitle.fill = fill(C.titleBg);
    extTitle.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    extTitle.border = box(B.thin);

    wsExternal.mergeCells(7, 1, 7, 4);
    wsExternal.mergeCells(7, 5, 7, 7);
    wsExternal.mergeCells(7, 8, 7, 10);

    wsExternal.getCell(7, 1).value = `Subject: ${allotment.sub_id}`;
    wsExternal.getCell(7, 5).value = `Class: ${allotment.class_name}`;
    wsExternal.getCell(7, 8).value = `Semester: ${allotment.current_sem}`;
    [wsExternal.getCell(7, 1), wsExternal.getCell(7, 5), wsExternal.getCell(7, 8)].forEach((c) => {
        c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.metaText } };
        c.fill = fill(C.metaValueBg);
        c.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        c.border = box(B.thin);
    });

    const extHeaders = ['Roll No', 'PID', 'Name', 'Obtained', 'Out Of', '%', 'Grade', 'GPA', 'Status'];
    const extHeaderRow = 9;
    extHeaders.forEach((h, i) => {
        const c = wsExternal.getCell(extHeaderRow, i + 1);
        c.value = h;
        c.font = { name: 'Calibri', bold: true, size: 10, color: { argb: C.tier2Text } };
        c.fill = fill(C.summHdrBg);
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = box(B.thin);
    });

    const extRows = externalReport?.rows ?? [];
    extRows.forEach((row, idx) => {
        const r = extHeaderRow + 1 + idx;
        const values = [
            row.roll_no ?? '-',
            row.stud_pid ?? '-',
            row.stud_name,
            row.obtained_marks,
            row.out_of,
            row.percent,
            row.grade ?? '-',
            row.gpa ?? '-',
            row.status,
        ];
        values.forEach((v, i) => {
            const c = wsExternal.getCell(r, i + 1);
            c.value = v as ExcelJS.CellValue;
            c.font = { name: 'Calibri', size: 10, color: { argb: C.summText } };
            c.alignment = { horizontal: i === 2 ? 'left' : 'center', vertical: 'middle' };
            c.fill = fill(idx % 2 === 0 ? C.dataRowEven : C.dataRowOdd);
            c.border = box(B.thin);
            if (i === 5) c.numFmt = '0.00';
        });
    });

    const extSummaryStart = extHeaderRow + 2 + extRows.length;
    const extSummary = externalReport?.summary;
    const extTarget = externalReport?.subject_target ?? 0;
    const extLines = [
        `Subject Target (%)`,
        `Count Above Target`,
        `Percentage Above Target`,
        `Attainment Level`,
    ];
    const extValues = [
        extTarget,
        extSummary?.count_above_target ?? 0,
        extSummary?.percentage_above_target ?? 0,
        extSummary?.attainment ?? 0,
    ];
    extLines.forEach((label, i) => {
        const row = extSummaryStart + i;
        const l = wsExternal.getCell(row, 1);
        l.value = label;
        l.font = { name: 'Calibri', bold: true, size: 10, color: { argb: C.summText } };
        l.fill = fill(C.summAttBg);
        l.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        l.border = box(B.thin);

        wsExternal.mergeCells(row, 2, row, 4);
        const v = wsExternal.getCell(row, 2);
        v.value = extValues[i] as ExcelJS.CellValue;
        v.font = { name: 'Calibri', bold: true, size: 10, color: { argb: C.summText } };
        v.fill = fill(C.summAttBg);
        v.alignment = { horizontal: 'center', vertical: 'middle' };
        v.border = box(B.thin);
        if (i === 2 || i === 0) v.numFmt = '0.00';
    });

    wsExternal.getColumn(1).width = 14;
    wsExternal.getColumn(2).width = 14;
    wsExternal.getColumn(3).width = 28;
    wsExternal.getColumn(4).width = 12;
    wsExternal.getColumn(5).width = 12;
    wsExternal.getColumn(6).width = 12;
    wsExternal.getColumn(7).width = 12;
    wsExternal.getColumn(8).width = 12;
    wsExternal.getColumn(9).width = 12;
    wsExternal.getColumn(10).width = 12;

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION H — CO-PO-PSO Summary worksheet (institutional template)
    // ═════════════════════════════════════════════════════════════════════════

    const wsSummary = workbook.addWorksheet('CO-PO-PSO Summary');
    wsSummary.views = [{ showGridLines: true }];

    wsSummary.getColumn(1).width = 5;
    wsSummary.getColumn(2).width = 20;
    for (let col = 3; col <= 17; col++) wsSummary.getColumn(col).width = 10;

    const subjectName = (allotment as { sub_name?: string }).sub_name || allotment.sub_id;
    const coRows = [1, 2, 3, 4, 5, 6] as const;

    const mappingRoot = (mappings as unknown as Record<string, unknown>) || {};
    const toObj = (v: unknown): Record<string, unknown> =>
        v && typeof v === 'object' ? (v as Record<string, unknown>) : {};

    const getTemplateMapping = (kind: 'po' | 'pso', co: number, key: string): number | '' => {
        const grouped = toObj(mappingRoot[kind]);
        const groupedByNo = toObj(grouped[String(co)]);
        const groupedByCO = toObj(grouped[`CO${co}`]);
        const directByCO = toObj(mappingRoot[`CO${co}`]);

        const candidate = groupedByNo[key] ?? groupedByCO[key] ?? directByCO[key];
        return typeof candidate === 'number' && candidate > 0 ? candidate : '';
    };

    const stampSummary = (
        row: number,
        col: number,
        value: string | number | ExcelJS.CellFormulaValue,
        opts: {
            bold?: boolean;
            align?: 'left' | 'center' | 'right';
            bg?: string;
            border?: boolean;
            numFmt?: string;
            wrap?: boolean;
        } = {},
    ) => {
        const cell = wsSummary.getCell(row, col);
        cell.value = value as ExcelJS.CellValue;
        cell.font = {
            name: 'Calibri',
            size: 10,
            bold: !!opts.bold,
            color: { argb: C.summText },
        } as ExcelJS.Font;
        cell.alignment = {
            horizontal: opts.align ?? 'center',
            vertical: 'middle',
            wrapText: opts.wrap ?? false,
        };
        if (opts.bg) cell.fill = fill(opts.bg);
        if (opts.border) cell.border = box(B.thin);
        if (opts.numFmt) cell.numFmt = opts.numFmt;
    };

    // Header rows (1-9)
    wsSummary.mergeCells(1, 1, 1, 12);
    stampSummary(1, 1, 'St. Francis Institute of Technology', { bold: true, align: 'center' });

    wsSummary.mergeCells(2, 1, 2, 12);
    stampSummary(2, 1, '(Engineering College)', { align: 'center' });

    wsSummary.mergeCells(3, 1, 3, 12);
    stampSummary(3, 1, 'An Autonomous Institute, Affiliated to University of Mumbai', { align: 'center' });

    wsSummary.mergeCells(4, 1, 4, 12);
    stampSummary(4, 1, 'NAAC A+ Accredited | CMPN, EXTC, INFT NBA Accredited | ISO 9001:2015 Certified', { align: 'center' });

    wsSummary.mergeCells(6, 1, 6, 12);
    stampSummary(6, 1, 'Department of  Computer Engineering', { bold: true, align: 'center' });

    wsSummary.mergeCells(7, 1, 7, 12);
    stampSummary(7, 1, 'CO - PO - PSO Attainment Calculation & Summary', { bold: true, align: 'center' });

    wsSummary.mergeCells(8, 1, 8, 5);
    wsSummary.mergeCells(8, 8, 8, 12);
    stampSummary(8, 1, `Academic Session : ${allotment.current_sem}`, { align: 'left' });
    stampSummary(8, 8, `Class : ${allotment.class_name}`, { align: 'left' });

    wsSummary.mergeCells(9, 1, 9, 5);
    wsSummary.mergeCells(9, 8, 9, 12);
    stampSummary(9, 1, `Subject Name: ${subjectName}`, { align: 'left' });
    stampSummary(9, 8, `Name of Faculty: ${teacher.teacher_name}`, { align: 'left' });

    // Scale section (11-15)
    stampSummary(11, 2, 'Attainment Level Scale:', { bold: true, align: 'left' });
    stampSummary(12, 2, 'Degree of attainment', { bold: true, border: true, bg: C.summHdrBg });
    wsSummary.mergeCells(12, 4, 12, 8);
    stampSummary(12, 4, 'Condition', { bold: true, align: 'left', border: true, bg: C.summHdrBg });

    stampSummary(13, 2, 3, { border: true, bg: C.summLvl3Bg });
    wsSummary.mergeCells(13, 4, 13, 8);
    stampSummary(13, 4, 'If 60% and above students have scored above 65%', { align: 'left', border: true, bg: C.summLvl3Bg });

    stampSummary(14, 2, 2, { border: true, bg: C.summLvl2Bg });
    wsSummary.mergeCells(14, 4, 14, 8);
    stampSummary(14, 4, 'If 50% to 60% of students have scored above 65%', { align: 'left', border: true, bg: C.summLvl2Bg });

    stampSummary(15, 2, 1, { border: true, bg: C.summLvl1Bg });
    wsSummary.mergeCells(15, 4, 15, 8);
    stampSummary(15, 4, 'If less than 50% of students have scored above 65%', { align: 'left', border: true, bg: C.summLvl1Bg });

    // Section 1 - CO attainment (17-27)
    stampSummary(17, 1, 1, { bold: true, border: true, bg: C.summHdrBg });
    stampSummary(17, 2, 'CO-PO-PSO Attainmment Calculation', { bold: true, align: 'left' });

    stampSummary(19, 2, 'CO Attainment:-', { bold: true, align: 'left' });

    const coHeaderLabels = ['Course Outcome', 'Internal Evaluation', 'End Semester Exam', '% Attainment', 'Attainment Level'];
    coHeaderLabels.forEach((label, idx) => {
        stampSummary(20, 2 + idx, label, { bold: true, border: true, bg: C.summHdrBg, wrap: true });
    });

    // Link summary End Semester values to Page 2 "Percentage Above Target" cell.
    // This keeps sheets connected so manual edits on Page 2 propagate to summary formulas.
    const endSemesterPct = externalReport?.summary?.percentage_above_target ?? 0;
    const endSemesterPctRef = `'External Assessment (Page 2)'!$B$${extSummaryStart + 2}`;

    const coLevelRefs: Record<number, string> = {};
    const coLevelValues: Record<number, number> = {};  // stores raw JS number for PO/PSO fallback
    coRows.forEach((co, idx) => {
        const row = 21 + idx;
        const internalObtained = students.reduce((sum, s) => {
            let obt = 0;
            const { ise = [], mse = [] } = columnStructure[co] ?? {};
            ise.forEach((t) => { obt += s.coMarks[co]?.ise[t.task_id]?.obtained ?? 0; });
            mse.forEach((q) => { obt += s.coMarks[co]?.mse[q.question_label]?.obtained ?? 0; });
            return sum + obt;
        }, 0);
        const internalMax = (coMaxMarks[co] ?? 0) * N;
        const internalPct = internalMax > 0 ? parseFloat(((internalObtained / internalMax) * 100).toFixed(2)) : 0;

        stampSummary(row, 2, `CO${co}`, { border: true, align: 'left' });
        stampSummary(row, 3, internalPct, { border: true, numFmt: '0.00' });
        stampSummary(
            row,
            4,
            { formula: `=${endSemesterPctRef}`, result: endSemesterPct } as ExcelJS.CellFormulaValue,
            { border: true, numFmt: '0.00' },
        );

        const pctFormula = `=(0.4*C${row})+(0.6*D${row})`;
    const pctResult = parseFloat(((0.4 * internalPct) + (0.6 * endSemesterPct)).toFixed(2));
        stampSummary(row, 5, { formula: pctFormula, result: pctResult } as ExcelJS.CellFormulaValue, { border: true, numFmt: '0.00' });

        const lvlFormula = `=IF(E${row}>=60,3,IF(E${row}>=50,2,IF(E${row}>0,1,0)))`;
        const lvlResult = pctResult >= 60 ? 3 : pctResult >= 50 ? 2 : pctResult > 0 ? 1 : 0;
        stampSummary(row, 6, { formula: lvlFormula, result: lvlResult } as ExcelJS.CellFormulaValue, { border: true, bg: C.summAttBg });
        coLevelRefs[co] = `F${row}`;
        coLevelValues[co] = lvlResult;  // store for use in PO/PSO fallback
    });

    stampSummary(27, 2, 'Note: % Attainment is calculated by taking 40% Internal Evaluation and 60% End Semester Evaluation', { align: 'left' });

    // Section 1 - PO attainment (29-45)
    wsSummary.mergeCells(30, 2, 31, 2);
    stampSummary(30, 2, 'Course Outcomes', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    wsSummary.mergeCells(30, 3, 30, 14);
    stampSummary(30, 3, 'Program Outcomes', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });

    stampSummary(31, 3, 'POs', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    for (let i = 0; i < 11; i++) {
        stampSummary(31, 4 + i, `PO${i + 1}`, { bold: true, border: true, bg: C.summHdrBg });
    }

    for (let co = 1; co <= 6; co++) {
        const mapRow = 32 + (co - 1) * 2;
        const attRow = mapRow + 1;
        wsSummary.mergeCells(mapRow, 2, attRow, 2);
        stampSummary(mapRow, 2, `CO${co}`, { bold: true, border: true });
        stampSummary(mapRow, 3, 'Mapping', { bold: true, border: true, bg: C.metaValueBg });
        stampSummary(attRow, 3, 'Attainment', { bold: true, border: true, bg: C.dataSummPct });

        for (let p = 1; p <= 11; p++) {
            const col = 3 + p;
            const colLetter = getColLetter(col);
            const mapVal = getTemplateMapping('po', co, `PO${p}`);
            stampSummary(mapRow, col, mapVal, { border: true });

            const formula = `=IF(${colLetter}${mapRow}="","",(${coLevelRefs[co]}*${colLetter}${mapRow})/3)`;
            const fallback = typeof mapVal === 'number' ? parseFloat(((coLevelValues[co] ?? 0) * mapVal / 3).toFixed(2)) : undefined;
            stampSummary(attRow, col, { formula, result: fallback } as ExcelJS.CellFormulaValue, { border: true, numFmt: '0.00' });
        }
    }

    stampSummary(44, 3, 'Average', { bold: true, border: true, bg: C.summAttBg });
    for (let p = 1; p <= 11; p++) {
        const col = 3 + p;
        const colLetter = getColLetter(col);
        const formula = `=IFERROR(AVERAGE(${colLetter}33,${colLetter}35,${colLetter}37,${colLetter}39,${colLetter}41,${colLetter}43),0)`;
        stampSummary(44, col, { formula } as ExcelJS.CellFormulaValue, { bold: true, border: true, bg: C.summAttBg, numFmt: '0.00' });
    }
    stampSummary(45, 2, 'PO attainment Formula: CO attainment × mapping /3', { align: 'left' });

    // Section 1 - PSO attainment (47-62)
    wsSummary.mergeCells(48, 2, 49, 2);
    stampSummary(48, 2, 'Course Outcomes', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    wsSummary.mergeCells(48, 3, 48, 6);
    stampSummary(48, 3, 'Program Specific Outcomes', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });

    stampSummary(49, 3, 'PSOs', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    for (let i = 0; i < 3; i++) {
        stampSummary(49, 4 + i, `PSO${i + 1}`, { bold: true, border: true, bg: C.summHdrBg });
    }

    for (let co = 1; co <= 6; co++) {
        const mapRow = 50 + (co - 1) * 2;
        const attRow = mapRow + 1;
        wsSummary.mergeCells(mapRow, 2, attRow, 2);
        stampSummary(mapRow, 2, `CO${co}`, { bold: true, border: true });
        stampSummary(mapRow, 3, 'Mapping', { bold: true, border: true, bg: C.metaValueBg });
        stampSummary(attRow, 3, 'Attainment', { bold: true, border: true, bg: C.dataSummPct });

        for (let p = 1; p <= 3; p++) {
            const col = 3 + p;
            const colLetter = getColLetter(col);
            const mapVal = getTemplateMapping('pso', co, `PSO${p}`);
            stampSummary(mapRow, col, mapVal, { border: true });

            const formula = `=IF(${colLetter}${mapRow}="","",(${coLevelRefs[co]}*${colLetter}${mapRow})/3)`;
            stampSummary(attRow, col, { formula } as ExcelJS.CellFormulaValue, { border: true, numFmt: '0.00' });
        }
    }

    stampSummary(62, 3, 'Average', { bold: true, border: true, bg: C.summAttBg });
    for (let p = 1; p <= 3; p++) {
        const col = 3 + p;
        const colLetter = getColLetter(col);
        const formula = `=IFERROR(AVERAGE(${colLetter}51,${colLetter}53,${colLetter}55,${colLetter}57,${colLetter}59,${colLetter}61),0)`;
        stampSummary(62, col, { formula } as ExcelJS.CellFormulaValue, { bold: true, border: true, bg: C.summAttBg, numFmt: '0.00' });
    }

    // Section 2 - CO attainment via Indirect Tool (64-74)
    stampSummary(64, 1, 2, { bold: true, border: true, bg: C.summHdrBg });
    stampSummary(64, 2, 'CO-PO mapping for CO feedback:-(indirect tool)', { bold: true, align: 'left' });

    // Table headers
    stampSummary(66, 2, 'CO', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    wsSummary.mergeCells(66, 3, 66, 7);
    stampSummary(66, 3, 'Formula', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    stampSummary(66, 8, 'Attainment', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });

    const indirectCoValues: number[] = [];
    [1, 2, 3, 4, 5, 6].forEach((co, idx) => {
        const row = 67 + idx;
        const m3 = indirectData?.coData[co]?.mark3 ?? 0;
        const m2 = indirectData?.coData[co]?.mark2 ?? 0;
        const m1 = indirectData?.coData[co]?.mark1 ?? 0;
        const total = indirectData?.totalStudents ?? 0;
        const value = total > 0 ? parseFloat(((m3 * 3 + m2 * 2 + m1 * 1) / total).toFixed(2)) : 0;
        indirectCoValues.push(value);
        const formulaStr = `((${m3}*3)+(${m2}*2)+(${m1}*1))/${total}`;
        stampSummary(row, 2, `CO ${co} =`, { border: true });
        wsSummary.mergeCells(row, 3, row, 7);
        stampSummary(row, 3, formulaStr, { border: true, align: 'left' });
        stampSummary(row, 8, value, { border: true, numFmt: '0.00' });
    });

    const avgIndirect = indirectCoValues.length > 0
        ? parseFloat((indirectCoValues.reduce((s, v) => s + v, 0) / indirectCoValues.length).toFixed(2))
        : 0;
    wsSummary.mergeCells(73, 2, 73, 7);
    stampSummary(73, 2, 'Avg CO attainment using Indirect tool is', { bold: true, border: true, align: 'left', bg: C.summAttBg });
    stampSummary(73, 8, avgIndirect, { bold: true, border: true, numFmt: '0.00', bg: C.summAttBg });

    // ─────────────────────────────────────────────────────────────────────────
    // Table 1 — COPO Attainment of Indirect feedback (Exit survey) (75-83)
    // Formula: (CO_indirect_attainment × mapping) / 3   — same as direct PO formula
    // ─────────────────────────────────────────────────────────────────────────
    wsSummary.mergeCells(75, 2, 75, 17);
    stampSummary(75, 2, 'COPO Attainment of Indirect feedback(Exit survey)', { bold: true, align: 'left', bg: C.summTitleBg });

    // Header row (76)
    stampSummary(76, 2, 'AVG', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    for (let p = 1; p <= 11; p++) {
        stampSummary(76, 2 + p, `PO${p}`, { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    }
    // col 14 = blank separator
    stampSummary(76, 15, 'PSO1', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    stampSummary(76, 16, 'PSO2', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    stampSummary(76, 17, 'PSO3', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });

    // Data rows CO1-CO6  (77-82)
    for (let co = 1; co <= 6; co++) {
        const dataRow   = 76 + co;             // 77 … 82
        const poMapRow  = 32 + (co - 1) * 2;  // 32, 34, 36, 38, 40, 42
        const psoMapRow = 50 + (co - 1) * 2;  // 50, 52, 54, 56, 58, 60
        const indRef    = `H${66 + co}`;       // H67 … H72  (indirect CO attainment)
        const coVal     = indirectCoValues[co - 1] ?? 0;

        // AVG col (col 2) — formula references H column from Section 2
        stampSummary(dataRow, 2,
            { formula: `=${indRef}`, result: coVal } as ExcelJS.CellFormulaValue,
            { border: true, numFmt: '0.00' });

        // PO columns (cols 3-13 = PO1-PO11)
        for (let p = 1; p <= 11; p++) {
            const col     = 2 + p;
            const mapColL = getColLetter(3 + p); // D=PO1, E=PO2, …, N=PO11
            const mapVal  = getTemplateMapping('po', co, `PO${p}`);
            const result  = typeof mapVal === 'number' && mapVal > 0
                ? parseFloat(((coVal * mapVal) / 3).toFixed(2)) : undefined;
            stampSummary(dataRow, col,
                { formula: `=IF(${mapColL}${poMapRow}="","",(${indRef}*${mapColL}${poMapRow})/3)`, result } as ExcelJS.CellFormulaValue,
                { border: true, numFmt: '0.00' });
        }

        // PSO columns (cols 15-17 = PSO1-PSO3)
        for (let p = 1; p <= 3; p++) {
            const col     = 14 + p;
            const mapColL = getColLetter(3 + p); // D=PSO1, E=PSO2, F=PSO3
            const mapVal  = getTemplateMapping('pso', co, `PSO${p}`);
            const result  = typeof mapVal === 'number' && mapVal > 0
                ? parseFloat(((coVal * mapVal) / 3).toFixed(2)) : undefined;
            stampSummary(dataRow, col,
                { formula: `=IF(${mapColL}${psoMapRow}="","",(${indRef}*${mapColL}${psoMapRow})/3)`, result } as ExcelJS.CellFormulaValue,
                { border: true, numFmt: '0.00' });
        }
    }

    // AVG row (83)
    stampSummary(83, 2,
        { formula: '=H73', result: avgIndirect } as ExcelJS.CellFormulaValue,
        { bold: true, border: true, numFmt: '0.00', bg: C.summAttBg });
    for (let p = 1; p <= 11; p++) {
        const col = 2 + p;
        const cl  = getColLetter(col);
        stampSummary(83, col,
            { formula: `=IFERROR(AVERAGE(${cl}77,${cl}78,${cl}79,${cl}80,${cl}81,${cl}82),0)` } as ExcelJS.CellFormulaValue,
            { bold: true, border: true, numFmt: '0.00', bg: C.summAttBg });
    }
    for (let p = 1; p <= 3; p++) {
        const col = 14 + p;
        const cl  = getColLetter(col);
        stampSummary(83, col,
            { formula: `=IFERROR(AVERAGE(${cl}77,${cl}78,${cl}79,${cl}80,${cl}81,${cl}82),0)` } as ExcelJS.CellFormulaValue,
            { bold: true, border: true, numFmt: '0.00', bg: C.summAttBg });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Summary Table (85-91)
    // ─────────────────────────────────────────────────────────────────────────
    stampSummary(85, 1, 3, { bold: true, border: true, bg: C.summHdrBg });
    stampSummary(85, 2, 'Summary:-', { bold: true, align: 'left' });

    // Table headers for summary
    stampSummary(87, 2, 'Subject code', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    wsSummary.mergeCells(87, 2, 88, 2);
    wsSummary.mergeCells(87, 3, 87, 6);
    stampSummary(87, 3, 'Attainment', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });

    // Internal sub-headers
    wsSummary.mergeCells(88, 3, 88, 4);
    stampSummary(88, 3, 'Direct Tools', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    wsSummary.mergeCells(88, 5, 88, 6);
    stampSummary(88, 5, 'Indirect Tools', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });

    // Labels
    wsSummary.mergeCells(89, 3, 89, 4);
    stampSummary(89, 3, 'Avg', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    wsSummary.mergeCells(89, 5, 89, 6);
    stampSummary(89, 5, 'CO feedback', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });

    // Data row
    stampSummary(89, 2, allotment.sub_id, { bold: true, border: true, align: 'center' });
    wsSummary.mergeCells(89, 2, 90, 2);
    
    wsSummary.mergeCells(90, 3, 90, 4);
    stampSummary(90, 3,
        { formula: '=IFERROR(AVERAGE(F21,F22,F23,F24,F25,F26),0)' } as ExcelJS.CellFormulaValue,
        { border: true, numFmt: '0.00', align: 'center' });
    
    wsSummary.mergeCells(90, 5, 90, 6);
    stampSummary(90, 5,
        { formula: '=H73', result: avgIndirect } as ExcelJS.CellFormulaValue,
        { border: true, numFmt: '0.00', align: 'center' });

    // Row 91: Total Avg
    wsSummary.mergeCells(91, 3, 91, 5);
    stampSummary(91, 3, 'Total Avg =', { bold: true, border: true, align: 'right', bg: C.summAttBg });
    stampSummary(91, 6,
        { formula: '=IFERROR(AVERAGE(C90,E90),0)' } as ExcelJS.CellFormulaValue,
        { bold: true, border: true, numFmt: '0.00', bg: C.summAttBg });


    // ─────────────────────────────────────────────────────────────────────────
    // PO Attainment Table (93-106)
    //   Direct  avg → row 44, cols D-N   (PO1=D44 … PO11=N44)
    //   Indirect avg → row 83, cols C-M  (PO1=C83 … PO11=M83)
    // ─────────────────────────────────────────────────────────────────────────
    // Row 93: title
    stampSummary(93, 2, `Subject code : ${allotment.sub_id}`, { bold: true, border: true, align: 'center' });
    wsSummary.mergeCells(93, 2, 94, 2);
    wsSummary.mergeCells(93, 3, 93, 4);
    stampSummary(93, 3, 'PO Attainment', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    wsSummary.mergeCells(93, 5, 95, 5);
    stampSummary(93, 5, 'Average of direct + indirect tools', { bold: true, border: true, bg: C.summHdrBg, align: 'center', wrap: true });

    // Row 94: Direct / Indirect sub-headers
    stampSummary(94, 3, 'Direct Tools', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    stampSummary(94, 4, 'Indirect Tools', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });

    // Row 95: column labels
    stampSummary(95, 2, 'POs', { bold: true, border: true, bg: C.summHdrBg });
    stampSummary(95, 3, 'Avg', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    stampSummary(95, 4, 'Average', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });

    // Data rows PO1-PO11 (96-106)
    for (let p = 1; p <= 11; p++) {
        const dataRow    = 95 + p;                // 96 … 106
        const directCol  = getColLetter(3 + p);   // D(PO1) … N(PO11)   → row 44
        const indirectCol = getColLetter(2 + p);  // C(PO1) … M(PO11)   → row 83

        stampSummary(dataRow, 2, `PO${p}`, { border: true });
        stampSummary(dataRow, 3,
            { formula: `=${directCol}44` } as ExcelJS.CellFormulaValue,
            { border: true, numFmt: '0.00' });
        stampSummary(dataRow, 4,
            { formula: `=${indirectCol}83` } as ExcelJS.CellFormulaValue,
            { border: true, numFmt: '0.00' });
        stampSummary(dataRow, 5,
            { formula: `=IFERROR(AVERAGE(C${dataRow},D${dataRow}),0)` } as ExcelJS.CellFormulaValue,
            { border: true, numFmt: '0.00' });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PSO Attainment Table (108-113)
    //   Direct  avg → row 62, cols D-F   (PSO1=D62 … PSO3=F62)
    //   Indirect avg → row 83, cols O-Q  (PSO1=O83 … PSO3=Q83)
    // ─────────────────────────────────────────────────────────────────────────
    // Row 108: title
    stampSummary(108, 2, `Subject code : ${allotment.sub_id}`, { bold: true, border: true, align: 'center' });
    wsSummary.mergeCells(108, 2, 109, 2);
    wsSummary.mergeCells(108, 3, 108, 4);
    stampSummary(108, 3, 'PSO Attainment', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    wsSummary.mergeCells(108, 5, 110, 5);
    stampSummary(108, 5, 'Average of direct + indirect tools', { bold: true, border: true, bg: C.summHdrBg, align: 'center', wrap: true });

    // Row 109: Direct / Indirect sub-headers
    stampSummary(109, 3, 'Direct Tools', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    stampSummary(109, 4, 'Indirect Tools', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });

    // Row 110: column labels
    stampSummary(110, 2, 'PSOs', { bold: true, border: true, bg: C.summHdrBg });
    stampSummary(110, 3, 'Avg', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });
    stampSummary(110, 4, 'Average', { bold: true, border: true, bg: C.summHdrBg, align: 'center' });

    // Data rows PSO1-PSO3 (111-113)
    for (let p = 1; p <= 3; p++) {
        const dataRow     = 110 + p;               // 111, 112, 113
        const directCol   = getColLetter(3 + p);   // D(PSO1), E(PSO2), F(PSO3) → row 62
        const indirectCol = getColLetter(14 + p);  // O(PSO1), P(PSO2), Q(PSO3) → row 83

        stampSummary(dataRow, 2, `PSO${p}`, { border: true });
        stampSummary(dataRow, 3,
            { formula: `=${directCol}62` } as ExcelJS.CellFormulaValue,
            { border: true, numFmt: '0.00' });
        stampSummary(dataRow, 4,
            { formula: `=${indirectCol}83` } as ExcelJS.CellFormulaValue,
            { border: true, numFmt: '0.00' });
        stampSummary(dataRow, 5,
            { formula: `=IFERROR(AVERAGE(C${dataRow},D${dataRow}),0)` } as ExcelJS.CellFormulaValue,
            { border: true, numFmt: '0.00' });
    }

    // Section 5 - Final comment (115-118)  [pushed down from 93]
    stampSummary(115, 1, 5, { bold: true, border: true, bg: C.summHdrBg });
    stampSummary(115, 2, 'Final Comment by Faculty', { bold: true, align: 'left' });

    wsSummary.mergeCells(116, 2, 118, 10);
    const commentCell = wsSummary.getCell(116, 2);
    commentCell.value = '';
    commentCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    commentCell.border = box(B.thin);

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION I — Serialise & return buffer
    // ═════════════════════════════════════════════════════════════════════════

    // ExcelJS returns Buffer/Uint8Array — copy into a true ArrayBuffer for Web Worker transfer
    const raw = await workbook.xlsx.writeBuffer();
    const u8 = new Uint8Array(raw);
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}