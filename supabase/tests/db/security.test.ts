import { afterAll, describe, expect, it } from 'vitest';
import {
  activeContract, anon, as, createOpenProject, createUser, expectError, pool, randomAddress, root, service,
  signedContract, submitProposal, verifyWallet,
} from './helpers';

afterAll(() => pool.end());

describe('H1 — users cannot change privileged fields', () => {
  it('blocks writes to reputation, trust and wallet data', async () => {
    const uid = await createUser('Privilege Tester');
    await expectError(as(uid).query('update public.profile_stats set rating_avg = 5, trust_credits = 9999 where id = $1', [uid]),
      'permission denied for table profile_stats');
    await expectError(as(uid).query('insert into public.wallets (user_id, address, chain_id, siwe_message, signature) values ($1, $2, 1, $3, $4)',
      [uid, randomAddress(), 'm', 's']), 'permission denied for table wallets');
    await expectError(as(uid).query('insert into public.platform_admins (user_id) values ($1)', [uid]),
      'permission denied for table platform_admins');
    await expectError(as(uid).query(`update public.profiles set created_at = now() - interval '1 year' where id = $1`, [uid]),
      'permission denied for table profiles');
  });

  it('allows editing safe profile fields only on your own row', async () => {
    const uid = await createUser('Editor');
    const other = await createUser('Other Editor');
    const own = await as(uid).query(`update public.profiles set headline = 'Product designer' where id = $1 returning headline`, [uid]);
    expect(own).toEqual([{ headline: 'Product designer' }]);
    const theirs = await as(uid).query(`update public.profiles set headline = 'Hacked' where id = $1 returning id`, [other]);
    expect(theirs).toHaveLength(0);
  });

  it('rejects reserved usernames', async () => {
    const uid = await createUser('Reserved');
    await expectError(as(uid).query(`update public.profiles set username = 'judge_bot' where id = $1`, [uid]), 'username_reserved');
  });
});

describe('H2 — private data is not public', () => {
  it('exposes no email/phone/wallet to anonymous or other users', async () => {
    const uid = await createUser('Private Person');
    await as(uid).query(`update public.profile_private set phone = '+91 98765 43210' where id = $1`, [uid]);
    await verifyWallet(uid);
    const columns = await root<{ column_name: string }>(
      `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'profiles'`);
    expect(columns.map((c) => c.column_name)).not.toContain('email');

    await expectError(anon().query('select * from public.profile_private'), 'permission denied for table profile_private');
    await expectError(anon().query('select * from public.wallets'), 'permission denied for table wallets');
    const stranger = await createUser('Stranger');
    expect(await as(stranger).query('select * from public.profile_private where id = $1', [uid])).toHaveLength(0);
    expect(await as(stranger).query('select * from public.wallets where user_id = $1', [uid])).toHaveLength(0);
    // Public trust facts are visible without revealing the address.
    const [stats] = await anon().query<{ wallet_verified: boolean }>('select wallet_verified from public.profile_stats where id = $1', [uid]);
    expect(stats.wallet_verified).toBe(true);
  });
});

describe('wallet linking', () => {
  it('binds one wallet per account and one account per wallet, with single-use nonces', async () => {
    const a = await createUser('Wallet A');
    const b = await createUser('Wallet B');
    const address = randomAddress();
    await verifyWallet(a, address);
    await expectError(as(a).rpc('issue_wallet_nonce'), 'wallet_already_linked');
    const nonce = await as(b).rpc<string>('issue_wallet_nonce');
    await expectError(service().rpc('link_verified_wallet', {
      p_user: b, p_nonce: nonce, p_address: address.toUpperCase().replace('0X', '0x'), p_chain_id: 1, p_message: 'm', p_signature: 's',
    }), 'wallet_in_use');
    // A nonce works once, only for the user it was issued to.
    const c = await createUser('Wallet C');
    const nonceC = await as(c).rpc<string>('issue_wallet_nonce');
    await expectError(service().rpc('link_verified_wallet', {
      p_user: b, p_nonce: nonceC, p_address: randomAddress(), p_chain_id: 1, p_message: 'm', p_signature: 's',
    }), 'nonce_invalid');
    await service().rpc('link_verified_wallet', {
      p_user: b, p_nonce: nonce, p_address: randomAddress(), p_chain_id: 1, p_message: 'm', p_signature: 's',
    });
    const reuse = await as(c).rpc<string>('issue_wallet_nonce');
    await service().rpc('link_verified_wallet', {
      p_user: c, p_nonce: reuse, p_address: randomAddress(), p_chain_id: 1, p_message: 'm', p_signature: 's',
    });
    await expectError(service().rpc('link_verified_wallet', {
      p_user: c, p_nonce: reuse, p_address: randomAddress(), p_chain_id: 1, p_message: 'm', p_signature: 's',
    }), 'nonce_invalid');
    await expectError(as(b).rpc('link_verified_wallet', {
      p_user: b, p_nonce: 'x'.repeat(32), p_address: randomAddress(), p_chain_id: 1, p_message: 'm', p_signature: 's',
    }), 'permission denied for function link_verified_wallet');
  });
});

describe('contract privacy', () => {
  it('limits contracts, milestones, events and messages to the parties', async () => {
    const ctx = await activeContract();
    const stranger = await createUser('Contract Stranger');
    for (const table of ['contracts', 'milestones', 'contract_events', 'escrow_transactions']) {
      const column = table === 'contracts' ? 'id' : 'contract_id';
      const own = await as(ctx.client).query(`select 1 from public.${table} where ${column} = $1`, [ctx.contractId]);
      expect(own.length, table).toBeGreaterThan(0);
      const other = await as(stranger).query(`select 1 from public.${table} where ${column} = $1`, [ctx.contractId]);
      expect(other, table).toHaveLength(0);
    }
    const [conv] = await root<{ id: string }>('select id from public.conversations where contract_id = $1', [ctx.contractId]);
    await as(ctx.client).query(`insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'Hello there')`, [conv.id, ctx.client]);
    expect(await as(stranger).query('select * from public.messages where conversation_id = $1', [conv.id])).toHaveLength(0);
    await expectError(as(stranger).query(`insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'Spam')`, [conv.id, stranger]),
      'new row violates row-level security policy for table "messages"');
    await expectError(as(ctx.client).query(`insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'Spoof')`, [conv.id, ctx.freelancer]),
      'new row violates row-level security policy for table "messages"');
    await expectError(as(ctx.client).query(`insert into public.messages (conversation_id, kind, body) values ($1, 'system', 'Fake system')`, [conv.id]),
      'new row violates row-level security policy for table "messages"');

    // The other party gets a single unread notification for the conversation.
    await as(ctx.client).query(`insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'Second')`, [conv.id, ctx.client]);
    const notes = await as(ctx.freelancer).query(`select id from public.notifications where type = 'message.new'`);
    expect(notes).toHaveLength(1);
    await as(ctx.freelancer).rpc('mark_conversation_read', { p_conversation_id: conv.id });
    expect(await as(ctx.freelancer).query(`select id from public.notifications where type = 'message.new' and read_at is null`)).toHaveLength(0);
  });

  it('prevents direct contract and milestone edits (H5)', async () => {
    const ctx = await activeContract();
    await expectError(as(ctx.client).query('update public.contracts set total_amount = 1 where id = $1', [ctx.contractId]),
      'permission denied for table contracts');
    await expectError(as(ctx.freelancer).query(`update public.milestones set amount = 999, status = 'approved' where contract_id = $1`, [ctx.contractId]),
      'permission denied for table milestones');
  });
});

describe('notifications', () => {
  it('cannot be forged and are private', async () => {
    const a = await createUser('Note A');
    const b = await createUser('Note B');
    await expectError(as(a).query(`insert into public.notifications (user_id, category, type, title) values ($1, 'system', 'x', 'Fake')`, [b]),
      'permission denied for table notifications');
    const ctx = await signedContract();
    const mine = await as(ctx.client).query<{ user_id: string }>('select user_id from public.notifications');
    expect(mine.every((n) => n.user_id === ctx.client)).toBe(true);
  });
});

describe('M11 — attachments and evidence', () => {
  it('only the owner can attach files to a project, only while open', async () => {
    const client = await createUser('Attach Client');
    const other = await createUser('Attach Other');
    const projectId = await createOpenProject(client);
    const insert = `insert into public.project_attachments (project_id, uploaded_by, storage_path, file_name, size_bytes, mime_type)
                    values ($1, $2, $3, 'file.pdf', 100, 'application/pdf')`;
    await as(client).query(insert, [projectId, client, `${projectId}/a.pdf`]);
    await expectError(as(other).query(insert, [projectId, other, `${projectId}/b.pdf`]),
      'new row violates row-level security policy for table "project_attachments"');
  });

  it('storage access follows record access', async () => {
    const ctx = await activeContract();
    const stranger = await createUser('Storage Stranger');
    await as(ctx.freelancer).query(`insert into storage.objects (bucket_id, name, owner) values ('contract-files', $1, $2)`,
      [`${ctx.contractId}/delivery.zip`, ctx.freelancer]);
    await expectError(as(stranger).query(`insert into storage.objects (bucket_id, name, owner) values ('contract-files', $1, $2)`,
      [`${ctx.contractId}/evil.zip`, stranger]), 'new row violates row-level security policy for table "objects"');
    expect(await as(stranger).query(`select name from storage.objects where bucket_id = 'contract-files'`)).toHaveLength(0);
    expect(await as(ctx.client).query(`select name from storage.objects where bucket_id = 'contract-files' and name like $1`, [`${ctx.contractId}/%`])).toHaveLength(1);
    await expectError(as(stranger).query(`insert into storage.objects (bucket_id, name, owner) values ('avatars', $1, $2)`,
      [`${ctx.client}/me.png`, stranger]), 'new row violates row-level security policy for table "objects"');
  });
});

describe('AI outputs', () => {
  it('cannot be written by users (M7)', async () => {
    const client = await createUser('AI Client');
    const projectId = await createOpenProject(client);
    await expectError(as(client).query(`insert into public.ai_risk_reports (project_id, input_hash, model, analyzed_fields, result)
      values ($1, $2, 'fake', '{}', '{}')`, [projectId, 'a'.repeat(64)]), 'permission denied for table ai_risk_reports');
  });
});

describe('rate limits', () => {
  it('throttles proposal spam', async () => {
    const spammer = await createUser('Spammer');
    const projects = [];
    for (let i = 0; i < 21; i++) projects.push(await createOpenProject(await createUser(`Spam Target ${i}`)));
    for (let i = 0; i < 20; i++) await submitProposal(spammer, projects[i]);
    await expectError(submitProposal(spammer, projects[20]), 'rate_limited');
  });
});
