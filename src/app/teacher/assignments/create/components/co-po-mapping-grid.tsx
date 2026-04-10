'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type MappingData = Record<string, Record<string, number>>;

interface COPOMappingGridProps {
    subjectCode: string;
    onSave: (mappings: MappingData) => void;
    initialMappings?: MappingData;
}

const CO_ROWS = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5', 'CO6'] as const;
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
    'PO12',
] as const;
const PSO_COLUMNS = ['PSO1', 'PSO2', 'PSO3'] as const;

function createEmptyMappings(): MappingData {
    const cols = [...PO_COLUMNS, ...PSO_COLUMNS];
    const next: MappingData = {};

    for (const co of CO_ROWS) {
        next[co] = {};
        for (const col of cols) {
            next[co][col] = 0;
        }
    }

    return next;
}

export function COPOMappingGrid({
    subjectCode,
    onSave,
    initialMappings,
}: COPOMappingGridProps) {
    const [mappings, setMappings] = useState<MappingData>(createEmptyMappings);
    const storageKey = useMemo(() => `evalease_mappings_${subjectCode}`, [subjectCode]);

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);

        if (stored) {
            try {
                const parsed = JSON.parse(stored) as MappingData;
                setMappings((prev) => ({ ...prev, ...parsed }));
                return;
            } catch {
                // Ignore malformed local storage and fall back to initial/empty values.
            }
        }

        if (initialMappings) {
            setMappings((prev) => ({ ...prev, ...initialMappings }));
        } else {
            setMappings(createEmptyMappings());
        }
    }, [initialMappings, storageKey]);

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
        localStorage.setItem(storageKey, JSON.stringify(mappings));
        onSave(mappings);
    };

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-base font-semibold">CO-PO/PSO Mapping</h3>
                <p className="text-sm text-muted-foreground">
                    Map each course outcome to PO/PSO with levels 1, 2, or 3.
                </p>
            </div>

            <Tabs defaultValue="po" className="w-full">
                <TabsList className="mb-4 grid w-full max-w-[400px] grid-cols-2">
                    <TabsTrigger value="po">PO Mapping (PO1 - PO12)</TabsTrigger>
                    <TabsTrigger value="pso">PSO Mapping (PSO1 - PSO3)</TabsTrigger>
                </TabsList>

                <TabsContent value="po">
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
                                    <tr key={co}>
                                        <td className="border p-2 font-medium">{co}</td>
                                        {PO_COLUMNS.map((column) => (
                                            <td key={`${co}-${column}`} className="border p-1 text-center">
                                                <select
                                                    className="h-8 w-16 rounded-md border bg-background px-2 text-sm"
                                                    value={mappings[co]?.[column] ? String(mappings[co][column]) : ''}
                                                    onChange={(e) => handleCellChange(co, column, e.target.value)}
                                                >
                                                    <option value="">-</option>
                                                    <option value="1">1</option>
                                                    <option value="2">2</option>
                                                    <option value="3">3</option>
                                                </select>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                <TabsContent value="pso">
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
                                    <tr key={co}>
                                        <td className="border p-2 font-medium">{co}</td>
                                        {PSO_COLUMNS.map((column) => (
                                            <td key={`${co}-${column}`} className="border p-1 text-center">
                                                <select
                                                    className="h-8 w-16 rounded-md border bg-background px-2 text-sm"
                                                    value={mappings[co]?.[column] ? String(mappings[co][column]) : ''}
                                                    onChange={(e) => handleCellChange(co, column, e.target.value)}
                                                >
                                                    <option value="">-</option>
                                                    <option value="1">1</option>
                                                    <option value="2">2</option>
                                                    <option value="3">3</option>
                                                </select>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
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