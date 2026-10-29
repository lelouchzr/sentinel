import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const session = '33333333-3333-4333-8333-333333333333';
const collection = '44444444-4444-4444-8444-444444444444';
const operation = '55555555-5555-4555-8555-555555555555';
const mutation = '66666666-6666-4666-8666-666666666666';
const later = '77777777-7777-4777-8777-777777777777';
const items = [{ id: 'one', expression: '빌리다', meaning: 'emprunter' }];
let db: PGlite;
async function writeCollection(
  owner = alice,
  revision: number | null = null,
  title = 'Vocabulary',
  entries: unknown = items,
  id = collection,
) {
  const result = await db.query<{ value: { id: string; revision: number; title: string } }>(
    'select public.write_vocabulary_collection($1,$2,$3,$4::jsonb,$5) as value',
    [id, owner, title, JSON.stringify(entries), revision],
  );
  return result.rows[0]!.value;
}
async function reserve(id = operation, owner = alice, sessionId: string | null = session) {
  return db.query('select public.reserve_provider_operation($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
    id,
    owner,
    sessionId,
    'reply',
    'meta',
    'provider-request',
    1,
    5,
    2,
  ]);
}
async function mutate(
  id = mutation,
  revision = 0,
  value: Record<string, unknown> = { status: 'active' },
  owner = alice,
  fingerprint = 'edit-1',
) {
  const result = await db.query<{ value: Record<string, unknown> }>(
    'select public.mutate_session_snapshot($1,$2,$3,$4::jsonb,$5,$6) as value',
    [session, owner, revision, JSON.stringify({ id: session, ...value }), id, fingerprint],
  );
  return result.rows[0]!.value;
}
async function reconcile(id = operation, amount = 0.1) {
  return db.query('select public.reconcile_provider_operation($1,$2,$3,$4)', [
    id,
    amount,
    'Verified amount in the provider billing dashboard.',
    'billing-reference-1',
  ]);
}
async function actAs(owner: string) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  await db.exec('set role authenticated');
}

describe('cloud library, corrections and privacy migration', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null,created_at timestamptz not null default now());
      alter table storage.objects enable row level security;
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
      grant usage on schema public,auth,storage to authenticated,service_role;
      grant select,insert,delete on storage.objects to authenticated;
    `);
    for (const file of ['202610290001_initial.sql', '202610290002_cloud_library_privacy.sql'])
      await db.exec(
        await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'),
      );
  }, 30000);
  beforeEach(async () => {
    await db.exec(
      "reset role; select set_config('request.jwt.claim.sub','',false); truncate public.provider_operation_reconciliations,public.session_mutations,public.account_deletion_requests,public.provider_operations,public.speaking_sessions,public.vocabulary_collections,storage.objects;",
    );
    await db.query('insert into auth.users(id) values($1),($2) on conflict do nothing', [
      alice,
      bob,
    ]);
    await db.query(
      'insert into public.speaking_sessions(id,owner_id,snapshot) values($1,$2,$3::jsonb)',
      [
        session,
        alice,
        JSON.stringify({
          id: session,
          status: 'completed',
          setup: { targets: items },
          feedback: { summary: 'old' },
          revision: 0,
        }),
      ],
    );
  });
  afterAll(async () => {
    await db.close();
  });
  it('creates confirmed collections idempotently and rejects overwriting a create replay', async () => {
    expect(await writeCollection()).toMatchObject({ revision: 0, title: 'Vocabulary' });
    expect(await writeCollection()).toMatchObject({ revision: 0 });
    await expect(writeCollection(alice, null, 'Different')).rejects.toThrow('COLLECTION_CONFLICT');
    expect((await db.query('select * from public.vocabulary_collections')).rows).toHaveLength(1);
  });
  it('uses optimistic revisions and makes lost PATCH replies safe to retry', async () => {
    await writeCollection();
    expect(await writeCollection(alice, 0, 'Renamed')).toMatchObject({
      revision: 1,
      title: 'Renamed',
    });
    expect(await writeCollection(alice, 0, 'Renamed')).toMatchObject({ revision: 1 });
    await expect(writeCollection(alice, 0, 'Stale update')).rejects.toThrow('COLLECTION_CONFLICT');
  });
  it('serializes concurrent editors instead of losing an update', async () => {
    await writeCollection();
    const results = await Promise.allSettled([
      writeCollection(alice, 0, 'Editor A'),
      writeCollection(alice, 0, 'Editor B'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  });
  it('prevents cross-account collection reads, writes and deletions', async () => {
    await writeCollection();
    await expect(writeCollection(bob, 0)).rejects.toThrow('COLLECTION_NOT_FOUND');
    await expect(
      db.query('select public.delete_vocabulary_collection($1,$2,$3)', [collection, bob, 0]),
    ).rejects.toThrow('COLLECTION_NOT_FOUND');
    await actAs(bob);
    expect((await db.query('select * from public.vocabulary_collections')).rows).toHaveLength(0);
    await expect(writeCollection()).rejects.toThrow('permission denied');
  });
  it('collection editing and deletion never rewrites historical session targets', async () => {
    await writeCollection();
    await writeCollection(alice, 0, 'Changed', [{ expression: '돌려주다', meaning: 'rendre' }]);
    await db.query('select public.delete_vocabulary_collection($1,$2,$3)', [collection, alice, 1]);
    const row = (
      await db.query<{ snapshot: { setup: { targets: unknown } } }>(
        'select snapshot from public.speaking_sessions',
      )
    ).rows[0]!;
    expect(row.snapshot.setup.targets).toEqual(items);
  });
  it('enforces collection count and content limits at the database boundary', async () => {
    await expect(writeCollection(alice, null, 'Empty', [])).rejects.toThrow('INVALID_COLLECTION');
    for (let i = 0; i < 30; i++)
      await writeCollection(alice, null, `Collection ${i}`, items, crypto.randomUUID());
    await expect(writeCollection()).rejects.toThrow('COLLECTION_LIMIT');
  });
  it('correction replay returns current state and cannot resurrect prior feedback', async () => {
    expect(await mutate()).toMatchObject({ revision: 1, status: 'active' });
    const saved = await db.query<{ value: Record<string, unknown> }>(
      'select public.save_session_snapshot($1,$2,$3,$4::jsonb) as value',
      [
        session,
        alice,
        1,
        JSON.stringify({ id: session, status: 'completed', feedback: { summary: 'new' } }),
      ],
    );
    expect(saved.rows[0]!.value).toMatchObject({ revision: 2, feedback: { summary: 'new' } });
    expect(await mutate()).toMatchObject({ revision: 2, feedback: { summary: 'new' } });
    await expect(
      mutate(mutation, 0, { status: 'active' }, alice, 'different-edit'),
    ).rejects.toThrow('OPERATION_CONFLICT');
  });
  it('blocks cross-account, stale or local-mode snapshot mutations', async () => {
    await expect(mutate(mutation, 0, { status: 'active' }, bob)).rejects.toThrow(
      'SESSION_NOT_FOUND',
    );
    await expect(mutate(mutation, 2)).rejects.toThrow('SESSION_CONFLICT');
    await expect(mutate(mutation, 0, { status: 'active', mode: 'local' })).rejects.toThrow(
      'INVALID_SESSION',
    );
    await actAs(alice);
    await expect(mutate()).rejects.toThrow('permission denied');
  });
  it('excludes mutations during unresolved billing and keeps operation namespaces unique', async () => {
    await reserve();
    await expect(mutate()).rejects.toThrow('SESSION_BUSY');
    await db.query('select public.finish_provider_operation($1,$2,$3)', [
      operation,
      alice,
      'unresolved',
    ]);
    await expect(mutate()).rejects.toThrow('SESSION_BUSY');
    await reconcile();
    await expect(mutate(operation)).rejects.toThrow('OPERATION_CONFLICT');
    await mutate();
    await expect(reserve(mutation)).rejects.toThrow('OPERATION_CONFLICT');
  });
  it('scrubs stale provider results after correction and deletes mutation records with session', async () => {
    await reserve();
    await db.query('select public.finish_provider_operation($1,$2,$3,$4::jsonb,$5)', [
      operation,
      alice,
      'succeeded',
      JSON.stringify({ feedback: 'old' }),
      0.01,
    ]);
    await mutate();
    expect((await db.query('select result from public.provider_operations')).rows[0]).toEqual({
      result: null,
    });
    await db.query('select public.delete_owned_session($1,$2)', [session, alice]);
    expect((await db.query('select * from public.session_mutations')).rows).toHaveLength(0);
  });
  it('requires a quiet account before deletion and blocks new writes and uploads afterward', async () => {
    await reserve();
    await expect(db.query('select public.begin_account_deletion($1)', [alice])).rejects.toThrow(
      'ACCOUNT_BUSY',
    );
    await db.query('select public.finish_provider_operation($1,$2,$3)', [
      operation,
      alice,
      'unresolved',
    ]);
    await db.query('select public.begin_account_deletion($1)', [alice]);
    await expect(writeCollection()).rejects.toThrow('ACCOUNT_DELETING');
    await expect(reserve(later)).rejects.toThrow('ACCOUNT_DELETING');
    await actAs(alice);
    await expect(
      db.query('insert into storage.objects(bucket_id,name) values($1,$2)', [
        'vocabulary-pages',
        `${alice}/new.jpg`,
      ]),
    ).rejects.toThrow('ACCOUNT_DELETING');
  });
  it('blocks late privileged uploads and stale JWTs after Auth deletion removes its barrier', async () => {
    await actAs(alice);
    await db.query('insert into storage.objects(bucket_id,name) values($1,$2)', [
      'vocabulary-pages',
      `${alice}/before.jpg`,
    ]);
    await db.exec('reset role');
    await db.query('select public.begin_account_deletion($1)', [alice]);
    // The database guard also protects writes through the privileged Storage service.
    await expect(
      db.query('insert into storage.objects(bucket_id,name) values($1,$2)', [
        'vocabulary-pages',
        `${alice}/late.jpg`,
      ]),
    ).rejects.toThrow('ACCOUNT_DELETING');
    await db.exec('delete from storage.objects');
    await db.query('delete from auth.users where id=$1', [alice]);
    expect((await db.query('select * from public.account_deletion_requests')).rows).toHaveLength(0);
    await actAs(alice);
    expect((await db.query('select public.can_upload_vocabulary() as allowed')).rows).toEqual([
      { allowed: false },
    ]);
    await expect(
      db.query('insert into storage.objects(bucket_id,name) values($1,$2)', [
        'vocabulary-pages',
        `${alice}/after-deletion.jpg`,
      ]),
    ).rejects.toThrow('ACCOUNT_NOT_FOUND');
  });
  it('rejects foreign upload paths before revealing another account status', async () => {
    await actAs(alice);
    for (const owner of [bob, later])
      await expect(
        db.query('insert into storage.objects(bucket_id,name) values($1,$2)', [
          'vocabulary-pages',
          `${owner}/private.jpg`,
        ]),
      ).rejects.toThrow('INVALID_UPLOAD_OWNER');
  });
  it('reconciles only unresolved/stale reservations with an immutable documented amount', async () => {
    await reserve();
    await expect(reconcile()).rejects.toThrow('OPERATION_STILL_RUNNING');
    await db.query('select public.finish_provider_operation($1,$2,$3)', [
      operation,
      alice,
      'unresolved',
    ]);
    await reconcile(operation, 0.3);
    await reconcile(operation, 0.3);
    expect(
      (await db.query('select state,estimated_usd,result from public.provider_operations')).rows[0],
    ).toEqual({ state: 'succeeded', estimated_usd: '0.300000', result: null });
    expect(
      (await db.query('select * from public.provider_operation_reconciliations')).rows,
    ).toHaveLength(1);
    await expect(reconcile(operation, 0)).rejects.toThrow('OPERATION_ALREADY_FINALIZED');
    const replay = await reserve();
    expect(replay.rows[0]).toEqual({
      reserve_provider_operation: {
        state: 'succeeded',
        result: null,
        created: false,
        reconciled: true,
      },
    });
    await actAs(alice);
    await expect(reconcile()).rejects.toThrow('permission denied');
  });
  it('reports estimates separately from unknown held charges without inventing an account balance', async () => {
    await reserve();
    await db.query('select public.finish_provider_operation($1,$2,$3,$4,$5)', [
      operation,
      alice,
      'succeeded',
      null,
      0.02,
    ]);
    await reserve(later);
    await db.query('select public.finish_provider_operation($1,$2,$3)', [
      later,
      alice,
      'unresolved',
    ]);
    const result = await db.query<{ value: { balanceVerified: boolean; providers: unknown[] } }>(
      'select public.owned_usage_summary($1) as value',
      [alice],
    );
    expect(result.rows[0]!.value).toMatchObject({
      balanceVerified: false,
      providers: [
        {
          provider: 'meta',
          estimatedUsd: 0.02,
          heldUsd: 1,
          pendingCount: 0,
          unresolvedCount: 1,
          hasUnknownCharges: true,
        },
      ],
    });
    expect(
      (
        await db.query<{ value: { providers: unknown[] } }>(
          'select public.owned_usage_summary($1) as value',
          [bob],
        )
      ).rows[0]!.value.providers,
    ).toEqual([]);
  });
  it('retention never selects recent files or files from another bucket', async () => {
    await db.exec("insert into storage.buckets(id,name) values('other','other')");
    await db.query(
      "insert into storage.objects(bucket_id,name,created_at) values('vocabulary-pages',$1,now()-interval '2 days'),('vocabulary-pages',$2,now()-interval '2 hours'),('other',$3,now()-interval '2 days')",
      [`${alice}/old.jpg`, `${alice}/new.jpg`, `${alice}/foreign.jpg`],
    );
    expect(
      (await db.query("select * from public.stale_vocabulary_uploads(now()+interval '3 days',100)"))
        .rows,
    ).toEqual([{ name: `${alice}/old.jpg` }]);
    await actAs(alice);
    await expect(
      db.query('select * from public.stale_vocabulary_uploads(now(),100)'),
    ).rejects.toThrow('permission denied');
  });
});
