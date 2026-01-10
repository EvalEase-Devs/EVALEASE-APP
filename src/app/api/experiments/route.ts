import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const subId = request.nextUrl.searchParams.get('sub_id');

    if (!subId) {
        return NextResponse.json(
            { error: 'sub_id parameter is required' },
            { status: 400 }
        );
    }

    try {
        const { data, error } = await supabase
            .from('experiment')
            .select('sub_id, exp_no, exp_name')
            .eq('sub_id', subId)
            .order('exp_no', { ascending: true });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching experiments:', error);
        return NextResponse.json(
            { error: 'Failed to fetch experiments' },
            { status: 500 }
        );
    }
}
