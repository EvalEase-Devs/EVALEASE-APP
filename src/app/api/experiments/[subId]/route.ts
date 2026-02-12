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

        // Fetch LOs associated with the experiment
        const { data: loData, error: loError } = await supabase
            .from('experiment_lo_mapping')
            .select('lo_no')
            .eq('sub_id', subId)
            .eq('exp_no', expNo);

        if (loError) {
            console.error('Supabase error:', loError);
            throw loError;
        }

        return NextResponse.json(loData || []);
    } catch (error) {
        console.error('Error fetching experiment LOs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch experiment LOs', details: String(error) },
            { status: 500 }
        );
    }
}
