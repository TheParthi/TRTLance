import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { packageId, customAmount, paymentMethod } = await request.json();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        let tokensToBuy = 0;
        let amountInr = 0;

        // Define packages
        // 10 tokens = ₹100
        // 50 tokens = ₹500
        // 100 tokens = ₹1000

        if (packageId === 'pack_10') {
            tokensToBuy = 10;
            amountInr = 100;
        } else if (packageId === 'pack_50') {
            tokensToBuy = 50;
            amountInr = 500;
        } else if (packageId === 'pack_100') {
            tokensToBuy = 100;
            amountInr = 1000;
        } else if (packageId === 'custom' && customAmount) {
            tokensToBuy = parseInt(customAmount);
            amountInr = tokensToBuy * 10;
        } else {
            return NextResponse.json(
                { error: 'Invalid package or amount' },
                { status: 400 }
            );
        }

        if (tokensToBuy <= 0) {
            return NextResponse.json(
                { error: 'Invalid token amount' },
                { status: 400 }
            );
        }

        // MOCK PAYMENT PROCESSING
        // In a real app, we would create a payment intent here (Stripe/Razorpay)
        // and return client_secret. For this demo, we assume payment is instant/mocked.

        // 1. Record the pending transaction
        const { data: transaction, error: txError } = await supabase
            .from('token_transactions')
            .insert({
                user_id: user.id,
                type: 'BUY',
                tokens: tokensToBuy,
                amount_inr: amountInr,
                status: 'SUCCESS', // Mocking success immediately
                payment_ref: `MOCK_PAY_${Date.now()}`,
                description: `Purchased ${tokensToBuy} Tokens via ${paymentMethod}`
            })
            .select()
            .single();

        if (txError) {
            console.error('Error creating transaction:', txError);
            return NextResponse.json(
                { error: 'Transaction failed' },
                { status: 500 }
            );
        }

        // 2. Update user wallet balance
        // This should ideally be done via a Postgres trigger or a secure backend process
        // verifying the payment. Since we mocked success, we update balance now.

        // Get current balance first (concurrency issue potential here but okay for demo)
        const { data: wallet, error: walletError } = await supabase
            .from('user_wallets')
            .select('token_balance')
            .eq('user_id', user.id)
            .single();

        if (walletError && walletError.code !== 'PGRST116') {
            console.error('Error fetching wallet:', walletError);
            return NextResponse.json({ error: 'Wallet error' }, { status: 500 });
        }

        let currentBalance = 0;
        if (wallet) {
            currentBalance = wallet.token_balance;
        } else {
            // Create wallet if not exists
            await supabase.from('user_wallets').insert({ user_id: user.id, token_balance: 0 });
        }

        const newBalance = currentBalance + tokensToBuy;

        const { error: updateError } = await supabase
            .from('user_wallets')
            .update({ token_balance: newBalance })
            .eq('user_id', user.id);

        if (updateError) {
            console.error('Error updating wallet:', updateError);
            return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
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
