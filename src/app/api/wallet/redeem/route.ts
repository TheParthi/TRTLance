import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { amountTokens, bankDetails } = await request.json();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const tokensToRedeem = parseInt(amountTokens);
        if (isNaN(tokensToRedeem) || tokensToRedeem <= 0) {
            return NextResponse.json(
                { error: 'Invalid amount' },
                { status: 400 }
            );
        }

        // 1. Check Balance
        const { data: wallet, error: walletError } = await supabase
            .from('user_wallets')
            .select('token_balance')
            .eq('user_id', user.id)
            .single();

        if (walletError || !wallet) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
        }

        if (wallet.token_balance < tokensToRedeem) {
            return NextResponse.json(
                { error: 'Insufficient balance' },
                { status: 400 }
            );
        }

        // 2. Create Transaction (PENDING)
        const amountInr = tokensToRedeem * 10;

        const { data: transaction, error: txError } = await supabase
            .from('token_transactions')
            .insert({
                user_id: user.id,
                type: 'REDEEM',
                tokens: tokensToRedeem,
                amount_inr: amountInr,
                status: 'PENDING',
                payment_ref: null,
                description: `Redemption Request: ${tokensToRedeem} Tokens to ${bankDetails.accountNumber || bankDetails.upiId}`
            })
            .select()
            .single();

        if (txError) {
            console.error('Error creating transaction:', txError);
            return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
        }

        // 3. Deduct Balance
        const newBalance = wallet.token_balance - tokensToRedeem;
        const { error: updateError } = await supabase
            .from('user_wallets')
            .update({ token_balance: newBalance })
            .eq('user_id', user.id);

        if (updateError) {
            console.error('CRITICAL: Failed to deduct balance after creating redeem transaction', updateError);
            return NextResponse.json({ error: 'System error processing redemption' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            transaction,
            newBalance
        });

    } catch (err) {
        console.error('Internal error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
