/**
 * excel-worker.ts
 *
 * Web Worker entry point for off-main-thread Excel generation.
 * Receives report data + pre-fetched logo (base64) and returns
 * the finished workbook as a transferable ArrayBuffer.
 */

import { generateISEMSEExcelBuffer } from './generate-ise-mse-excel';
import type { ReportResponse } from './generate-ise-mse-excel';
import { generateLabAttainmentExcelBuffer } from './generate-lab-excel';
import type { LabReportResponse } from './generate-lab-excel';

export type WorkerRequest =
    | {
        type: 'ise-mse';
        reportData: ReportResponse;
        mappings?: Record<string, Record<string, number>>;
        externalReport?: {
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
        };
        indirectData?: {
            totalStudents: number;
            coData: Record<number, { mark3: number; mark2: number; mark1: number }>;
        };
        logoBase64?: string;
    }
    | {
        type: 'lab';
        reportData: LabReportResponse;
        mappings?: Record<string, Record<string, number>>;
        externalReport?: {
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
        };
        logoBase64?: string;
    };

export type WorkerResponse =
    | { ok: true; buffer: ArrayBuffer }
    | { ok: false; error: string };

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
    try {
        const msg = e.data;
        let buffer: ArrayBuffer;

        if (msg.type === 'ise-mse') {
            buffer = await generateISEMSEExcelBuffer(msg.reportData, msg.logoBase64, msg.mappings, msg.externalReport, msg.indirectData);
        } else {
            buffer = await generateLabAttainmentExcelBuffer(msg.reportData, msg.logoBase64, msg.mappings, msg.externalReport);
        }

        // Transfer ownership of the buffer (zero-copy)
        (self as unknown as Worker).postMessage(
            { ok: true, buffer } satisfies WorkerResponse,
            [buffer],
        );
    } catch (err) {
        (self as unknown as Worker).postMessage({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
        } satisfies WorkerResponse);
    }
};
