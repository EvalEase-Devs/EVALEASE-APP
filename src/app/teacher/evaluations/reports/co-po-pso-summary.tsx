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

function getValue(mappings: MappingData, coNo: number, key: string): number | '' {
    const coKey = `CO${coNo}`;
    const val = mappings?.[coKey]?.[key];
    return typeof val === 'number' && val > 0 ? val : '';
}

function averageForColumn(mappings: MappingData, key: string): string {
    const values = CO_ROWS
        .map((co) => getValue(mappings, co, key))
        .filter((v): v is number => typeof v === 'number');

    if (values.length === 0) return '-';
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    return avg.toFixed(2);
}

export function COPOPSOSummary({ mappings, externalSummary }: COPOPSOSummaryProps) {
    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-base font-semibold">CO-PO-PSO Mapping Summary</h3>
                <p className="text-sm text-muted-foreground">
                    Review your saved mapping matrix before downloading the Excel summary.
                </p>
            </div>

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

            <div className="space-y-4">
                <div className="overflow-auto rounded-md border">
                    <table className="w-full min-w-max border-collapse text-sm">
                        <thead>
                            <tr>
                                <th className="border bg-muted/50 p-2 text-left font-medium">CO</th>
                                {PO_COLUMNS.map((po) => (
                                    <th key={po} className="border bg-muted/50 p-2 text-center font-medium">
                                        {po}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {CO_ROWS.map((co) => (
                                <tr key={`po-co-${co}`}>
                                    <td className="border p-2 font-medium">CO{co}</td>
                                    {PO_COLUMNS.map((po) => (
                                        <td key={`po-${co}-${po}`} className="border p-2 text-center">
                                            {getValue(mappings, co, po) || '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            <tr className="bg-muted/30">
                                <td className="border p-2 font-semibold">Average</td>
                                {PO_COLUMNS.map((po) => (
                                    <td key={`po-avg-${po}`} className="border p-2 text-center font-semibold">
                                        {averageForColumn(mappings, po)}
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
                                <th className="border bg-muted/50 p-2 text-left font-medium">CO</th>
                                {PSO_COLUMNS.map((pso) => (
                                    <th key={pso} className="border bg-muted/50 p-2 text-center font-medium">
                                        {pso}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {CO_ROWS.map((co) => (
                                <tr key={`pso-co-${co}`}>
                                    <td className="border p-2 font-medium">CO{co}</td>
                                    {PSO_COLUMNS.map((pso) => (
                                        <td key={`pso-${co}-${pso}`} className="border p-2 text-center">
                                            {getValue(mappings, co, pso) || '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            <tr className="bg-muted/30">
                                <td className="border p-2 font-semibold">Average</td>
                                {PSO_COLUMNS.map((pso) => (
                                    <td key={`pso-avg-${pso}`} className="border p-2 text-center font-semibold">
                                        {averageForColumn(mappings, pso)}
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