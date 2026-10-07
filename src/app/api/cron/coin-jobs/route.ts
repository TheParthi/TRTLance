import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Scheduled job (call every 15–60 minutes with `Authorization: Bearer $CRON_SECRET`): pays submitted
 * milestones the client left unanswered past the auto-release window, and makes held earnings
 * withdrawable once their 7 working days have passed.
 */
async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { data, error } = await createAdminClient().rpc('run_coin_jobs');
  if (error) {
    console.error('[coin jobs]', error);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
  return NextResponse.json(data);
}

export const GET = run;
export const POST = run;
