'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type MappingData = Record<string, Record<string, number>>;

interface COPOMappingGridProps {
    subjectCode: string;
    onSave: (mappings: MappingData) => void;
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
        onSave(sanitized);
    };

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-base font-semibold">{outcomeLabel}-PO/PSO Mapping</h3>
                <p className="text-sm text-muted-foreground">
                    Map each {outcomeLabel === 'CO' ? 'course outcome' : 'lab outcome'} to PO/PSO with levels 1, 2, or 3.
                </p>
            </div>

            <Tabs defaultValue="po" className="w-full">
                <TabsList className="mb-4 grid w-full max-w-[400px] grid-cols-2">
                    <TabsTrigger value="po">PO Mapping (PO1 - PO11)</TabsTrigger>
                    <TabsTrigger value="pso">PSO Mapping (PSO1 - PSO3)</TabsTrigger>
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
            </Tabs>

            <div className="flex justify-end">
                <Button onClick={handleSave}>Save & Continue</Button>
            </div>
        </div>
    );
}