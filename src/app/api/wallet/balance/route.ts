import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Fetch wallet balance
        const { data: wallet, error } = await supabase
            .from('user_wallets')
            .select('token_balance')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Results contain 0 rows"
            console.error('Error fetching wallet:', error);
            return NextResponse.json(
                { error: 'Failed to fetch wallet' },
                { status: 500 }
            );
        }

        // If no wallet exists, return 0 (or create one if we wanted to be proactive, but we have a trigger for that)
        // However, if the trigger hasn't run or failed, we might see no row.
        // For now, assume 0 if not found.
        const tokenBalance = wallet?.token_balance || 0;
        const inrValue = tokenBalance * 10; // 1 Token = ₹10

        return NextResponse.json({
            tokenBalance,
            inrValue
        });

    } catch (err) {
        console.error('Internal error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
