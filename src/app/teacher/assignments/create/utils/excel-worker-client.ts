/**
 * excel-worker-client.ts
 *
 * Main-thread helper that:
 *  1. Pre-fetches the logo as base64 (needs DOM / main-thread fetch).
 *  2. Spins up the Web Worker.
 *  3. Posts the report payload + logo into the worker.
 *  4. Receives the finished ArrayBuffer and triggers the browser download.
 *
 * Usage:
 *   import { exportISEMSEViaWorker, exportLabViaWorker } from './excel-worker-client';
 *   await exportISEMSEViaWorker(reportData);
 */

import type { ReportResponse } from './generate-ise-mse-excel';
import type { LabReportResponse } from './generate-lab-excel';
import type { WorkerRequest, WorkerResponse } from './excel-worker';

// ── Logo cache ───────────────────────────────────────────────────────────────
let _logoCachePromise: Promise<string | undefined> | null = null;

function fetchLogoBase64(): Promise<string | undefined> {
    if (!_logoCachePromise) {
        _logoCachePromise = (async () => {
            try {
                const res = await fetch('/sfit_logo.png');
                if (!res.ok) return undefined;
                const ab = await res.arrayBuffer();
                const b64 = btoa(
                    new Uint8Array(ab).reduce((d, b) => d + String.fromCharCode(b), ''),
                );
                return `data:image/png;base64,${b64}`;
            } catch {
                return undefined;
            }
        })();
    }
    return _logoCachePromise;
}

// ── Worker runner ────────────────────────────────────────────────────────────
function runInWorker(request: WorkerRequest): Promise<ArrayBuffer> {
    return new Promise<ArrayBuffer>((resolve, reject) => {
        const worker = new Worker(
            new URL('./excel-worker.ts', import.meta.url),
            { type: 'module' },
        );

        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
            worker.terminate();
            if (e.data.ok) {
                resolve(e.data.buffer);
            } else {
                reject(new Error(e.data.error));
            }
        };

        worker.onerror = (err) => {
            worker.terminate();
            reject(err);
        };

        worker.postMessage(request);
    });
}

// ── Download helper ──────────────────────────────────────────────────────────
function triggerDownload(buffer: ArrayBuffer, filename: string): void {
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate & download an ISE/MSE report in a Web Worker.
 * Falls back to main-thread generation if Workers are unavailable.
 */
export async function exportISEMSEViaWorker(reportData: ReportResponse): Promise<void> {
    if (typeof Worker === 'undefined') {
        // SSR / old browser fallback — import the original main-thread function
        const { generateISEMSEExcel } = await import('./generate-ise-mse-excel');
        return generateISEMSEExcel(reportData);
    }

    const logoBase64 = await fetchLogoBase64();

    const buffer = await runInWorker({
        type: 'ise-mse',
        reportData,
        logoBase64,
    });

    triggerDownload(buffer, `ISE-MSE-Attainment-${reportData.allotment.sub_id}.xlsx`);
}

/**
 * Generate & download a Lab Attainment report in a Web Worker.
 * Falls back to main-thread generation if Workers are unavailable.
 */
export async function exportLabViaWorker(reportData: LabReportResponse): Promise<void> {
    if (typeof Worker === 'undefined') {
        const { generateLabAttainmentExcel } = await import('./generate-lab-excel');
        return generateLabAttainmentExcel(reportData);
    }

    const logoBase64 = await fetchLogoBase64();

    const buffer = await runInWorker({
        type: 'lab',
        reportData,
        logoBase64,
    });

    const batchLabel = reportData.allotment.all_batches
        ? 'AllBatches'
        : `Batch${reportData.allotment.batch_no}`;

    triggerDownload(buffer, `Lab-Attainment-${reportData.allotment.sub_id}-${batchLabel}.xlsx`);
}
