'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type MappingData = Record<string, Record<string, number>>;

export interface IndirectCOData {
    totalStudents: number;
    coData: Record<number, { mark3: number; mark2: number; mark1: number }>;
}

interface COPOMappingGridProps {
    subjectCode: string;
    onSave: (mappings: MappingData) => void;
    onSaveIndirect?: (data: IndirectCOData) => void;
    initialMappings?: MappingData;
    outcomeLabel?: 'CO' | 'LO';
    outcomeNumbers?: number[];
}

const DEFAULT_OUTCOME_NUMBERS = [1, 2, 3, 4, 5, 6] as const;
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

function createEmptyMappings(outcomeLabel: 'CO' | 'LO', outcomeNumbers: number[]): MappingData {
    const cols = [...PO_COLUMNS, ...PSO_COLUMNS];
    const next: MappingData = {};

    for (const num of outcomeNumbers) {
        const outcomeKey = `${outcomeLabel}${num}`;
        next[outcomeKey] = {};
        for (const col of cols) {
            next[outcomeKey][col] = 0;
        }
    }

    return next;
}

function normalizeMappings(
    source: MappingData | undefined,
    outcomeLabel: 'CO' | 'LO',
    outcomeNumbers: number[],
): MappingData {
    const base = createEmptyMappings(outcomeLabel, outcomeNumbers);
    if (!source) return base;

    const allColumns = [...PO_COLUMNS, ...PSO_COLUMNS];
    const validRows = new Set(outcomeNumbers.map((num) => `${outcomeLabel}${num}`));

    for (const row of Object.keys(source)) {
        if (!validRows.has(row)) continue;

        for (const col of allColumns) {
            const raw = source[row]?.[col];
            if (typeof raw === 'number' && Number.isFinite(raw)) {
                base[row][col] = raw;
            }
        }
    }

    return base;
}

export function COPOMappingGrid({
    subjectCode,
    onSave,
    onSaveIndirect,
    initialMappings,
    outcomeLabel = 'CO',
    outcomeNumbers,
}: COPOMappingGridProps) {
    const rowNumbers = useMemo(() => {
        const source = Array.isArray(outcomeNumbers) && outcomeNumbers.length > 0
            ? outcomeNumbers
            : outcomeLabel === 'CO'
                ? [...DEFAULT_OUTCOME_NUMBERS]
                : [];

        return Array.from(new Set(source.filter((n) => Number.isFinite(n) && n > 0))).sort((a, b) => a - b);
    }, [outcomeLabel, outcomeNumbers]);

    const [mappings, setMappings] = useState<MappingData>(() => createEmptyMappings(outcomeLabel, rowNumbers));
    const storageKey = useMemo(
        () => `evalease_mappings_${outcomeLabel}_${subjectCode}`,
        [outcomeLabel, subjectCode],
    );
    const indirectStorageKey = useMemo(
        () => `evalease_indirect_co_${subjectCode}`,
        [subjectCode],
    );

    const createEmptyIndirect = (rows: number[]): IndirectCOData => ({
        totalStudents: 0,
        coData: Object.fromEntries(rows.map((n) => [n, { mark3: 0, mark2: 0, mark1: 0 }])),
    });

    const [indirectData, setIndirectData] = useState<IndirectCOData>(() => createEmptyIndirect(rowNumbers));
    const [activeTab, setActiveTab] = useState('po');
    const [indirectStep, setIndirectStep] = useState<1 | 2>(1);

    // Wizard step helpers
    const tabOrder = outcomeLabel === 'CO' ? ['po', 'pso', 'indirect'] : ['po', 'pso'];
    const currentStep = activeTab === 'indirect'
        ? (indirectStep === 1 ? 2 : 3)
        : tabOrder.indexOf(activeTab);
    const totalSteps = outcomeLabel === 'CO' ? 4 : 2;
    const isFirst = currentStep === 0;
    const isLast = currentStep === totalSteps - 1;

    const goBack = () => {
        if (activeTab === 'indirect' && indirectStep === 2) { setIndirectStep(1); }
        else if (activeTab === 'indirect') { setActiveTab('pso'); }
        else if (activeTab === 'pso') { setActiveTab('po'); }
    };

    const goNext = () => {
        if (activeTab === 'po') { setActiveTab('pso'); }
        else if (activeTab === 'pso' && outcomeLabel === 'CO') { setActiveTab('indirect'); setIndirectStep(1); }
        else if (activeTab === 'indirect' && indirectStep === 1) { setIndirectStep(2); }
    };

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);

        if (stored) {
            try {
                const parsed = JSON.parse(stored) as MappingData;
                setMappings(normalizeMappings(parsed, outcomeLabel, rowNumbers));
                return;
            } catch {
                // Ignore malformed local storage and fall back to initial/empty values.
            }
        }

        if (initialMappings) {
            setMappings(normalizeMappings(initialMappings, outcomeLabel, rowNumbers));
        } else {
            setMappings(createEmptyMappings(outcomeLabel, rowNumbers));
        }
    }, [initialMappings, outcomeLabel, rowNumbers, storageKey]);

    useEffect(() => {
        const stored = localStorage.getItem(indirectStorageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as IndirectCOData;
                setIndirectData(parsed);
                return;
            } catch {
                // fall back to empty
            }
        }
        setIndirectData(createEmptyIndirect(rowNumbers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [indirectStorageKey]);

    const handleCellChange = (co: string, column: string, value: string) => {
        const numeric = value === '' ? 0 : Number(value);

        setMappings((prev) => ({
            ...prev,
            [co]: {
                ...(prev[co] ?? {}),
                [column]: numeric,
            },
        }));
    };

    const handleSave = () => {
        const sanitized = normalizeMappings(mappings, outcomeLabel, rowNumbers);
        localStorage.setItem(storageKey, JSON.stringify(sanitized));
        localStorage.setItem(indirectStorageKey, JSON.stringify(indirectData));
        onSave(sanitized);
        onSaveIndirect?.(indirectData);
    };

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-base font-semibold">{outcomeLabel}-PO/PSO Mapping</h3>
                <p className="text-sm text-muted-foreground">
                    Map each {outcomeLabel === 'CO' ? 'course outcome' : 'lab outcome'} to PO/PSO with levels 1, 2, or 3.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setIndirectStep(1); }} className="w-full">
                <TabsList className="mb-4 grid w-full max-w-[600px] grid-cols-3">
                    <TabsTrigger value="po">PO Mapping (PO1 - PO11)</TabsTrigger>
                    <TabsTrigger value="pso">PSO Mapping (PSO1 - PSO3)</TabsTrigger>
                    {outcomeLabel === 'CO' && (
                        <TabsTrigger value="indirect">CO Mapping (Indirect)</TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="po">
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
                                {rowNumbers.map((num) => {
                                    const outcomeKey = `${outcomeLabel}${num}`;
                                    return (
                                    <tr key={outcomeKey}>
                                        <td className="border p-2 font-medium">{outcomeKey}</td>
                                        {PO_COLUMNS.map((column) => (
                                            <td key={`${outcomeKey}-${column}`} className="border p-1 text-center">
                                                <select
                                                    className="h-8 w-16 rounded-md border bg-background px-2 text-sm"
                                                    value={mappings[outcomeKey]?.[column] ? String(mappings[outcomeKey][column]) : ''}
                                                    onChange={(e) => handleCellChange(outcomeKey, column, e.target.value)}
                                                >
                                                    <option value="">-</option>
                                                    <option value="1">1</option>
                                                    <option value="2">2</option>
                                                    <option value="3">3</option>
                                                </select>
                                            </td>
                                        ))}
                                    </tr>
                                );})}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                <TabsContent value="pso">
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
                                {rowNumbers.map((num) => {
                                    const outcomeKey = `${outcomeLabel}${num}`;
                                    return (
                                    <tr key={outcomeKey}>
                                        <td className="border p-2 font-medium">{outcomeKey}</td>
                                        {PSO_COLUMNS.map((column) => (
                                            <td key={`${outcomeKey}-${column}`} className="border p-1 text-center">
                                                <select
                                                    className="h-8 w-16 rounded-md border bg-background px-2 text-sm"
                                                    value={mappings[outcomeKey]?.[column] ? String(mappings[outcomeKey][column]) : ''}
                                                    onChange={(e) => handleCellChange(outcomeKey, column, e.target.value)}
                                                >
                                                    <option value="">-</option>
                                                    <option value="1">1</option>
                                                    <option value="2">2</option>
                                                    <option value="3">3</option>
                                                </select>
                                            </td>
                                        ))}
                                    </tr>
                                );})}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                {outcomeLabel === 'CO' && (
                    <TabsContent value="indirect">
                        {indirectStep === 1 ? (
                            <div className="space-y-3">
                                <div className="rounded-md border">
                                    <table className="w-full border-collapse text-sm">
                                        <thead>
                                            <tr>
                                                <th className="border bg-muted/50 p-2 text-left font-medium">CO</th>
                                                <th className="border bg-muted/50 p-2 text-center font-medium">
                                                    Level 3<br />
                                                    <span className="font-normal text-muted-foreground text-xs">No. of students</span>
                                                </th>
                                                <th className="border bg-muted/50 p-2 text-center font-medium">
                                                    Level 2<br />
                                                    <span className="font-normal text-muted-foreground text-xs">No. of students</span>
                                                </th>
                                                <th className="border bg-muted/50 p-2 text-center font-medium">
                                                    Level 1<br />
                                                    <span className="font-normal text-muted-foreground text-xs">No. of students</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rowNumbers.map((num) => (
                                                <tr key={`indirect-co-${num}`}>
                                                    <td className="border p-2 font-medium">CO{num}</td>
                                                    {(['mark3', 'mark2', 'mark1'] as const).map((field) => (
                                                        <td key={field} className="border p-1 text-center">
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                pattern="[0-9]*"
                                                                className="h-8 w-16 rounded-md border bg-background px-2 text-sm text-center"
                                                                placeholder="0"
                                                                value={indirectData.coData[num]?.[field] || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/\D/g, '');
                                                                    setIndirectData((prev) => ({
                                                                        ...prev,
                                                                        coData: {
                                                                            ...prev.coData,
                                                                            [num]: {
                                                                                ...(prev.coData[num] ?? { mark3: 0, mark2: 0, mark1: 0 }),
                                                                                [field]: val === '' ? 0 : Number(val),
                                                                            },
                                                                        },
                                                                    }));
                                                                }}
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 rounded-md border p-3">
                                    <label className="text-sm font-medium w-44 shrink-0">
                                        Total No. of Students
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        className="h-8 w-24 rounded-md border bg-background px-2 text-sm"
                                        value={indirectData.totalStudents || ''}
                                        placeholder="0"
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setIndirectData((prev) => ({
                                                ...prev,
                                                totalStudents: val === '' ? 0 : Number(val),
                                            }));
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </TabsContent>
                )}
            </Tabs>

            <div className="flex items-center justify-between">
                <div>
                    {!isFirst && (
                        <Button variant="outline" onClick={goBack}>← Back</Button>
                    )}
                </div>
                <div>
                    {isLast ? (
                        <Button onClick={handleSave}>Save & Continue</Button>
                    ) : (
                        <Button onClick={goNext}>Next →</Button>
                    )}
                </div>
            </div>
        </div>
    );
}