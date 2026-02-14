import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/bids/[bidId]/accept - Accept bid and create contract
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ bidId: string }> }
) {
    try {
        const { bidId } = await params;
        const supabase = await createClient();

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get proposal (bid) details with project info
        const { data: proposal, error: proposalError } = await supabase
            .from('proposals')
            .select(`
                *,
                project:projects(*)
            `)
            .eq('id', bidId)
            .single();

        if (proposalError || !proposal) {
            return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
        }

        // Verify user is the project owner
        if (proposal.project.client_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden: Only project owner can accept bids' }, { status: 403 });
        }

        // Verify project is still open
        if (proposal.project.status !== 'open') {
            return NextResponse.json({ error: 'Project is no longer accepting bids' }, { status: 400 });
        }

        // 0. CHECK WALLET BALANCE AND FUND PROJECT
        const contractAmount = proposal.proposed_budget;

        // Fetch client wallet
        const { data: clientWallet, error: walletError } = await supabase
            .from('user_wallets')
            .select('token_balance')
            .eq('user_id', user.id)
            .single();

        if (walletError || !clientWallet) {
            return NextResponse.json({ error: 'Wallet not found. Please setup your wallet.' }, { status: 400 });
        }

        if (clientWallet.token_balance < contractAmount) {
            return NextResponse.json({
                error: `Insufficient balance. needed: ${contractAmount}, available: ${clientWallet.token_balance}. Please buy more tokens.`
            }, { status: 400 });
        }

        // Deduct tokens
        const newBalance = clientWallet.token_balance - contractAmount;
        const { error: updateError } = await supabase
            .from('user_wallets')
            .update({ token_balance: newBalance })
            .eq('user_id', user.id);

        if (updateError) {
            return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
        }

        // Record transaction
        await supabase.from('token_transactions').insert({
            user_id: user.id,
            type: 'SPEND',
            tokens: contractAmount,
            amount_inr: contractAmount * 10,
            status: 'SUCCESS',
            description: `Funded project: ${proposal.project.title}`,
            payment_ref: `PROJ_${proposal.project_id}`
        });

        // Start transaction-like operations
        // 1. Update proposal status to accepted
        await supabase
            .from('proposals')
            .update({ status: 'accepted' })
            .eq('id', bidId);

        // 2. Reject all other proposals for this project
        await supabase
            .from('proposals')
            .update({ status: 'rejected' })
            .eq('project_id', proposal.project_id)
            .neq('id', bidId);

        // 3. Update project status to in_progress and set hired freelancer
        await supabase
            .from('projects')
            .update({
                status: 'in_progress', // Changed to in_progress as funding is done
                freelancer_id: proposal.freelancer_id
            })
            .eq('id', proposal.project_id);

        // 4. Create contract
        const { data: contract, error: contractError } = await supabase
            .from('contracts')
            .insert({
                project_id: proposal.project_id,
                proposal_id: proposal.id,
                client_id: user.id,
                freelancer_id: proposal.freelancer_id,
                total_amount: proposal.proposed_budget,
                locked_amount: proposal.proposed_budget, // Full amount locked
                status: 'active',
                milestones: proposal.milestones || [],
                smart_contract_address: 'INTERNAL_WALLET' // Indicating internal wallet management
            })
            .select()
            .single();

        if (contractError) {
            console.error('Error creating contract:', contractError);
            // potential rollback needed here in real world
            return NextResponse.json({ error: contractError.message }, { status: 500 });
        }

        // Create notification for freelancer
        await supabase.from('notifications').insert({
            user_id: proposal.freelancer_id,
            title: 'Bid Accepted',
            message: `Your bid for "${proposal.project.title}" has been accepted. Project is funded.`,
            type: 'job',
            link: `/projects/${proposal.project_id}/workspace`
        });

        return NextResponse.json({
            success: true,
            contractId: contract.id,
            message: 'Bid accepted. Tokens deducted and project funded.'
        }, { status: 201 });
    } catch (error: any) {
        console.error('Error in POST /api/bids/[bidId]/accept:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
