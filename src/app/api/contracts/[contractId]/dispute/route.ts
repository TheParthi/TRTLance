
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch (error) {
                    }
                },
            },
        }
    );
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ contractId: string }> }
) {
    const { contractId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const json = await request.json();
        const { milestoneIndex, reason, domain, amount } = json;

        if (!reason || milestoneIndex === undefined || !domain) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Get Contract & Project Details
        const { data: contract, error: contractError } = await supabase
            .from('contracts')
            .select('project_id, total_amount, client_id, freelancer_id, project:projects(title)')
            .eq('id', contractId)
            .single();

        if (contractError || !contract) {
            return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
        }

        // 2. Determine Role of the Dispute Raiser
        const role = user.id === contract.client_id ? 'CLIENT' : 'FREELANCER';

        if (user.id !== contract.client_id && user.id !== contract.freelancer_id) {
            return NextResponse.json({ error: 'You are not part of this contract' }, { status: 403 });
        }

        // 3. Find an Arbitrator (Auto-Assign)
        // Logic: Find online arbitrator with matching domain, random fallback
        // Since domains are TEXT[], we use array overlap or simple check. For simplicity, we just pick ANY online arbitrator first.

        let { data: arbitrator, error: arbError } = await supabase
            .from('users')
            .select('id')
            .eq('arbitrator_status', 'online')
            .limit(1)
            .maybeSingle();

        // Fallback: If no online arbitrator, pick the fallback 'judge_bot' or any arbitrator
        if (!arbitrator) {
            const { data: fallbackArb } = await supabase
                .from('users')
                .select('id')
                .eq('username', 'judge_bot')
                .single();
            arbitrator = fallbackArb;
        }

        if (!arbitrator) {
            return NextResponse.json({ error: 'No arbitrators available at the moment' }, { status: 503 });
        }

        // 4. Create Dispute
        const disputeId = `DSP-${Date.now().toString().slice(-6)}`; // Simple ID generator

        const { data: dispute, error: disputeError } = await supabase
            .from('disputes')
            .insert({
                id: disputeId,
                project_id: contract.project_id,
                raised_by: user.id,
                project_name: (contract as any).project?.title || 'Contract Dispute',
                role: role,
                amount: amount || contract.total_amount, // Default to total if specific amount not set
                status: 'pd', // Pending/Open
                reason: reason,
                payment_method: 'BLOCKCHAIN_ESCROW', // Default for now
                milestone_index: milestoneIndex,
                assigned_arbitrator_id: arbitrator.id,
                domain: domain
            })
            .select()
            .single();

        if (disputeError) {
            console.error('Dispute Create Error:', disputeError);
            return NextResponse.json({ error: disputeError.message }, { status: 500 });
        }

        // 5. Update Contract Status (Optional: Mark as disputed)
        await supabase
            .from('contracts')
            .update({ status: 'disputed' })
            .eq('id', contractId);

        return NextResponse.json({ message: 'Dispute raised successfully', dispute });

    } catch (error: any) {
        console.error('Server Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
