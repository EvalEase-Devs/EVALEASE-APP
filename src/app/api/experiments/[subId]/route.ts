import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ subId: string }> }
) {
    const { subId } = await params;
    const expNoParam = request.nextUrl.searchParams.get('exp_no');
    const expNo = expNoParam ? parseInt(expNoParam, 10) : null;

    if (!subId || !expNo) {
        console.warn('Missing parameters:', { subId, expNo });
        return NextResponse.json(
            { error: 'sub_id and exp_no parameters are required' },
            { status: 400 }
        );
    }

    try {
        console.log(`Fetching COs for: subId=${subId}, expNo=${expNo}`);

        // Fetch COs associated with the experiment
        const { data: coData, error: coError } = await supabase
            .from('experiment_co_mapping')
            .select('co_no')
            .eq('sub_id', subId)
            .eq('exp_no', expNo);

        if (coError) {
            console.error('Supabase error:', coError);
            throw coError;
        }

        console.log(`Fetched COs:`, coData);
        return NextResponse.json(coData || []);
    } catch (error) {
        console.error('Error fetching experiment COs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch experiment COs', details: String(error) },
            { status: 500 }
        );
    }
}
