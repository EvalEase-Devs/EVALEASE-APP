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
export async function generateISEMSEExcelBuffer(reportData: ReportResponse, logoBase64?: string): Promise<ArrayBuffer> {
    return _buildISEMSEExcel(reportData, logoBase64);
}

export async function generateISEMSEExcel(reportData: ReportResponse): Promise<void> {
    const buffer = await _buildISEMSEExcel(reportData);
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

async function _buildISEMSEExcel(reportData: ReportResponse, logoBase64?: string): Promise<ArrayBuffer> {
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

    const LAST_DATA_ROW = DATA_START_ROW + students.length - 1;
    const TARGET_LOW = 50;
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
    stamp(R, 3, 'This table consists of count of students who have scored above 50% in each CO', { italic: true, halign: 'left' });
    R++;

    // Headers
    stamp(R, 3, 'Count', { bold: true, bg: HDR_BG, border: true, halign: 'left' });
    coList.forEach((co, idx) => {
        stamp(R, 4 + idx, `CO${co}`, { bold: true, bg: HDR_BG, border: true });
    });
    R++;

    // Data Row
    stamp(R, 3, 'Students Scoring Above 50%', { border: true, halign: 'left' });
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
            if (coMaxMarks[co] > 0 && (obt / coMaxMarks[co]) * 100 >= 50) cnt++;
        });

        stamp(R, 4 + idx, { formula: `COUNTIF(${range}, ">=50")`, result: cnt } as ExcelJS.CellFormulaValue, { border: true });
    });
    const COUNT_DATA_ROW = R;

    //  Block 3: Percentage Table 
    R += 3; // Skip 2 rows

    // Description text
    stamp(R, 3, 'This table consists of percentage of students who have scored above 50% in each CO with respect to students who have attempted the questions', { italic: true, halign: 'left' });
    R++;

    // Headers
    stamp(R, 3, 'In percentage', { bold: true, bg: HDR_BG, border: true, halign: 'left' });
    coList.forEach((co, idx) => {
        stamp(R, 4 + idx, `CO${co}`, { bold: true, bg: HDR_BG, border: true });
    });
    R++;

    // Data Row
    stamp(R, 3, 'Students scoring above 55%', { border: true, halign: 'left' });
    coList.forEach((co, idx) => {
        const countCell = `${getColLetter(4 + idx)}${COUNT_DATA_ROW}`;

        let cnt = 0;
        const { ise = [], mse = [] } = columnStructure[co] || {};
        students.forEach(s => {
            let obt = 0;
            ise.forEach(t => obt += s.coMarks[co]?.ise[t.task_id]?.obtained || 0);
            mse.forEach(q => obt += s.coMarks[co]?.mse[q.question_label]?.obtained || 0);
            if (coMaxMarks[co] > 0 && (obt / coMaxMarks[co]) * 100 >= 50) cnt++;
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

    [[3, C.summLvl3Bg, '>= 60% of students scored >= 50%'],
    [2, C.summLvl2Bg, '>= 50% to < 60% of students scored >= 50%'],
    [1, C.summLvl1Bg, '< 50% of students scored >= 50%']].forEach(([lvl, bg, cond]) => {
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
            if (coMaxMarks[co] > 0 && (obt / coMaxMarks[co]) * 100 >= 50) cnt++;
        });
        const pct = N > 0 ? (cnt / N) * 100 : 0;
        const res = pct >= 60 ? 3 : pct >= 50 ? 2 : pct > 0 ? 1 : 0;

        stamp(R, 3, `CO${co}`, { bold: true, bg: C.summAttBg, border: true, halign: 'left' });
        stamp(R, 4, { formula, result: res } as ExcelJS.CellFormulaValue, { bold: true, bg: C.summAttBg, border: true });
        R++;
    });

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION H — Serialise & return buffer
    // ═════════════════════════════════════════════════════════════════════════

    // ExcelJS returns Buffer/Uint8Array — copy into a true ArrayBuffer for Web Worker transfer
    const raw = await workbook.xlsx.writeBuffer();
    const u8 = new Uint8Array(raw);
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}