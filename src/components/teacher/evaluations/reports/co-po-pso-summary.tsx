'use client';

type MappingData = Record<string, Record<string, number>>;

interface ExternalAssessmentSummaryData {
    assessment_kind: 'ESE' | 'EXTERNAL_VIVA';
    subject_target: number;
    summary: {
        count_above_target: number;
        percentage_above_target: number;
        attainment: number;
    };
}

interface COPOPSOSummaryProps {
    mappings: MappingData;
    externalSummary?: ExternalAssessmentSummaryData | null;
    outcomeLabel?: 'CO' | 'LO';
    outcomeNumbers?: number[];
    showExternalSnapshot?: boolean;
}

const CO_ROWS = [1, 2, 3, 4, 5, 6] as const;
const PO_COLUMNS = [
    'PO1',
    'PO2',
    'PO3',
    'PO4',
    'PO5',
    'PO6',
    'PO7',
    'PO8',
    'PO9',
    'PO10',
    'PO11',
] as const;
const PSO_COLUMNS = ['PSO1', 'PSO2', 'PSO3'] as const;

function getValue(mappings: MappingData, outcomeLabel: 'CO' | 'LO', coNo: number, key: string): number | '' {
    const outcomeKey = `${outcomeLabel}${coNo}`;
    const val = mappings?.[outcomeKey]?.[key];
    return typeof val === 'number' && val > 0 ? val : '';
}

function averageForColumn(mappings: MappingData, outcomeLabel: 'CO' | 'LO', rows: readonly number[], key: string): string {
    const values = rows
        .map((n) => getValue(mappings, outcomeLabel, n, key))
        .filter((v): v is number => typeof v === 'number');

    if (values.length === 0) return '-';
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    return avg.toFixed(2);
}

export function COPOPSOSummary({
    mappings,
    externalSummary,
    outcomeLabel = 'CO',
    outcomeNumbers,
    showExternalSnapshot = true,
}: COPOPSOSummaryProps) {
    const rowNumbers: readonly number[] =
        outcomeNumbers && outcomeNumbers.length > 0 ? outcomeNumbers : CO_ROWS;
    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-base font-semibold">{outcomeLabel}-PO-PSO Mapping Summary</h3>
                <p className="text-sm text-muted-foreground">
                    Review your saved mapping matrix before downloading the Excel summary.
                </p>
            </div>

            {showExternalSnapshot && (
                <div className="rounded-md border bg-muted/20 p-3 text-sm">
                    <p className="font-medium">External Assessment Snapshot (Page 2)</p>
                    {externalSummary ? (
                        <div className="mt-2 grid gap-2 text-muted-foreground md:grid-cols-4">
                            <p>
                                Type: <span className="font-medium text-foreground">{externalSummary.assessment_kind}</span>
                            </p>
                            <p>
                                Target: <span className="font-medium text-foreground">{externalSummary.subject_target}%</span>
                            </p>
                            <p>
                                Above Target: <span className="font-medium text-foreground">{externalSummary.summary.percentage_above_target.toFixed(2)}%</span>
                            </p>
                            <p>
                                Attainment: <span className="font-medium text-foreground">Level {externalSummary.summary.attainment}</span>
                            </p>
                        </div>
                    ) : (
                        <p className="mt-2 text-muted-foreground">No Page 2 data available yet. Upload the ESE CSV on Page 2 to include it in summary/export.</p>
                    )}
                </div>
            )}

            <div className="space-y-4">
                <div className="overflow-auto rounded-md border">
                    <table className="w-full min-w-max border-collapse text-sm">
                        <thead>
                            <tr>
                                <th className="border bg-muted/50 p-2 text-left font-medium">{outcomeLabel}</th>
                                {PO_COLUMNS.map((po) => (
                                    <th key={po} className="border bg-muted/50 p-2 text-center font-medium">
                                        {po}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rowNumbers.map((n) => (
                                <tr key={`po-${outcomeLabel}-${n}`}>
                                    <td className="border p-2 font-medium">{outcomeLabel}{n}</td>
                                    {PO_COLUMNS.map((po) => (
                                        <td key={`po-${n}-${po}`} className="border p-2 text-center">
                                            {getValue(mappings, outcomeLabel, n, po) || '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            <tr className="bg-muted/30">
                                <td className="border p-2 font-semibold">Average</td>
                                {PO_COLUMNS.map((po) => (
                                    <td key={`po-avg-${po}`} className="border p-2 text-center font-semibold">
                                        {averageForColumn(mappings, outcomeLabel, rowNumbers, po)}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="overflow-auto rounded-md border">
                    <table className="w-full min-w-max border-collapse text-sm">
                        <thead>
                            <tr>
                                <th className="border bg-muted/50 p-2 text-left font-medium">{outcomeLabel}</th>
                                {PSO_COLUMNS.map((pso) => (
                                    <th key={pso} className="border bg-muted/50 p-2 text-center font-medium">
                                        {pso}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rowNumbers.map((n) => (
                                <tr key={`pso-${outcomeLabel}-${n}`}>
                                    <td className="border p-2 font-medium">{outcomeLabel}{n}</td>
                                    {PSO_COLUMNS.map((pso) => (
                                        <td key={`pso-${n}-${pso}`} className="border p-2 text-center">
                                            {getValue(mappings, outcomeLabel, n, pso) || '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            <tr className="bg-muted/30">
                                <td className="border p-2 font-semibold">Average</td>
                                {PSO_COLUMNS.map((pso) => (
                                    <td key={`pso-avg-${pso}`} className="border p-2 text-center font-semibold">
                                        {averageForColumn(mappings, outcomeLabel, rowNumbers, pso)}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
