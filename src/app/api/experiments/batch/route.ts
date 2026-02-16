import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/experiments/batch?sub_id=CSL702
export async function GET(request: NextRequest) {
    try {
        const subId = request.nextUrl.searchParams.get('sub_id');

        if (!subId) {
            return NextResponse.json(
                { error: 'sub_id is required' },
                { status: 400 }
            );
        }

        // Fetch all experiments for the subject with their LO mappings
        const { data: experiments, error } = await supabase
            .from('experiment')
            .select(`
                sub_id,
                exp_no,
                exp_name,
                experiment_lo_mapping(lo_no, sub_id)
            `)
            .eq('sub_id', subId)
            .order('exp_no', { ascending: true });

        if (error) {
            return NextResponse.json(
                { error: 'Failed to fetch experiments' },
                { status: 500 }
            );
        }

        return NextResponse.json({ experiments: experiments || [] });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
