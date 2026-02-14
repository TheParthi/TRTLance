import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications';

// POST /api/contracts/[contractId]/milestones/[index]/release - Release milestone funds
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ contractId: string; index: string }> }
) {
    try {
        const { contractId, index } = await params;
        const milestoneIndex = parseInt(index);
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify contract and user is client
        const { data: contract } = await supabase
            .from('contracts')
            .select('*, project:projects(title)')
            .eq('id', contractId)
            .single();

        if (!contract || contract.client_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden: Only client can release funds' }, { status: 403 });
        }

        // Get milestone amount
        const milestones = contract.milestones || [];
        if (milestoneIndex >= milestones.length) {
            return NextResponse.json({ error: 'Invalid milestone index' }, { status: 400 });
        }

        const milestone = milestones[milestoneIndex];
        const releaseAmount = parseFloat(milestone.amount);

        // Update milestone submission status
        await supabase
            .from('milestone_submissions')
            .update({
                status: 'approved',
                reviewed_at: new Date().toISOString()
            })
            .eq('contract_id', contractId)
            .eq('milestone_index', milestoneIndex);

        // Update contract locked amount
        const newLockedAmount = contract.locked_amount - releaseAmount;
        await supabase
            .from('contracts')
            .update({ locked_amount: newLockedAmount })
            .eq('id', contractId);

        // TRANSFER TOKENS TO FREELANCER
        const freelancerId = contract.freelancer_id;

        // 1. Get Freelancer Wallet
        const { data: flWallet } = await supabase
            .from('user_wallets')
            .select('token_balance')
            .eq('user_id', freelancerId)
            .single();

        // If no wallet (should exist), create or handle error. 
        // We assume handle_new_user_wallet trigger created it, or we create now.
        let currentFlBalance = 0;
        if (flWallet) {
            currentFlBalance = flWallet.token_balance;
        } else {
            await supabase.from('user_wallets').insert({ user_id: freelancerId, token_balance: 0 });
        }

        // 2. Credit Freelancer
        await supabase
            .from('user_wallets')
            .update({ token_balance: currentFlBalance + releaseAmount })
            .eq('user_id', freelancerId);

        // 3. Record Transaction
        await supabase.from('token_transactions').insert({
            user_id: freelancerId,
            type: 'RECEIVE',
            tokens: releaseAmount,
            amount_inr: releaseAmount * 10,
            status: 'SUCCESS',
            description: `Milestone Payment: ${contract.project?.title || 'Project'}`,
            payment_ref: `MST_${contractId}_${milestoneIndex}`
        });

        // 4. Notify Freelancer
        await supabase.from('notifications').insert({
            user_id: freelancerId,
            title: 'Payment Received',
            message: `You received ${releaseAmount} tokens for milestone completion.`,
            type: 'payment',
            link: `/profile/wallet`
        });

        // Create Transaction Record (Credit to Freelancer)
        const { error: txnError } = await supabase
            .from('transactions')
            .insert({
                user_id: contract.freelancer_id,
                project_id: contract.project_id,
                amount: releaseAmount,
                type: 'credit',
                category: 'project_payment',
                description: `Payment for milestone ${milestoneIndex + 1}: ${milestone.title}`,
                status: 'completed',
                payment_method: 'wallet'
            });

        if (txnError) {
            console.error('Error recording transaction:', txnError);
        }

        // Create notification for freelancer
        if (contract) {
            const projectTitle = (contract as any).project?.title || 'project';
            await createNotification({
                userId: contract.freelancer_id,
                title: 'Payment Received',
                message: `Client released $${releaseAmount} for milestone ${milestoneIndex + 1} of "${projectTitle}"`,
                type: 'payment',
                link: `/contracts/${contractId}`
            });
        }

        return NextResponse.json({
            success: true,
            released_amount: releaseAmount,
            remaining_locked: newLockedAmount,
            message: `$${releaseAmount} released to freelancer wallet`
        });
    } catch (error: any) {
        console.error('Error releasing funds:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
