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
    | { type: 'ise-mse'; reportData: ReportResponse; logoBase64?: string }
    | { type: 'lab'; reportData: LabReportResponse; logoBase64?: string };

export type WorkerResponse =
    | { ok: true; buffer: ArrayBuffer }
    | { ok: false; error: string };

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
    try {
        const msg = e.data;
        let buffer: ArrayBuffer;

        if (msg.type === 'ise-mse') {
            buffer = await generateISEMSEExcelBuffer(msg.reportData, msg.logoBase64);
        } else {
            buffer = await generateLabAttainmentExcelBuffer(msg.reportData, msg.logoBase64);
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
