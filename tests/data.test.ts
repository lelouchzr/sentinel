import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const session = '33333333-3333-4333-8333-333333333333';
const operation = '44444444-4444-4444-8444-444444444444';
const secondOperation = '55555555-5555-4555-8555-555555555555';
const thirdOperation = '66666666-6666-4666-8666-666666666666';
let db: PGlite;

type Reservation = { state: string; result: unknown; created: boolean };
async function reserve(
  id = operation,
  options: {
    owner?: string;
    session?: string | null;
    fingerprint?: string;
    amount?: number;
    limit?: number;
  } = {},
): Promise<Reservation> {
  const { rows } = await db.query<{ value: Reservation }>(
    'select public.reserve_provider_operation($1,$2,$3,$4,$5,$6,$7,$8,$9) as value',
    [
      id,
      options.owner ?? alice,
      options.session === undefined ? session : options.session,
      'dialogue',
      'meta',
      options.fingerprint ?? 'request-sha256',
      options.amount ?? 1,
      options.limit ?? 5,
      2,
    ],
  );
  return rows[0]!.value;
}
async function finish(id = operation, state = 'succeeded', estimate: number | null = 0.05) {
  await db.query('select public.finish_provider_operation($1,$2,$3,$4::jsonb,$5,$6::jsonb)', [
    id,
    alice,
    state,
    JSON.stringify({ transcript: 'private learner text' }),
    estimate,
    JSON.stringify({ inputTokens: 500 }),
  ]);
}
async function actAs(userId: string) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await db.exec('set role authenticated');
}

describe('actual PostgreSQL migration, ownership and cost ledger', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text not null);
      alter table storage.objects enable row level security;
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1] $$;
      grant usage on schema public, auth, storage to authenticated, service_role;
      grant select, insert, delete on storage.objects to authenticated;
    `);
    await db.exec(
      await readFile(
        new URL('../supabase/migrations/202610290001_initial.sql', import.meta.url),
        'utf8',
      ),
    );
  }, 30_000);
  beforeEach(async () => {
    await db.exec(
      'reset role; truncate public.provider_operations, public.speaking_sessions, public.vocabulary_collections, storage.objects;',
    );
    await db.query('insert into auth.users(id) values ($1),($2) on conflict do nothing', [
      alice,
      bob,
    ]);
    await db.query(
      'insert into public.speaking_sessions(id,owner_id,snapshot) values ($1,$2,$3::jsonb)',
      [session, alice, JSON.stringify({ id: session, status: 'active' })],
    );
  });
  afterAll(async () => {
    await db.close();
  });

  it('only exposes a session to its owner through RLS', async () => {
    await actAs(bob);
    expect((await db.query('select id from public.speaking_sessions')).rows).toHaveLength(0);
    await db.exec('reset role');
    await actAs(alice);
    expect((await db.query('select id from public.speaking_sessions')).rows).toHaveLength(1);
  });
  it('denies client session mutation, ledger access and budget RPC execution', async () => {
    await actAs(alice);
    await expect(
      db.query("update public.speaking_sessions set snapshot = '{}'::jsonb"),
    ).rejects.toThrow('permission denied');
    await expect(db.query('select * from public.provider_operations')).rejects.toThrow(
      'permission denied',
    );
    await expect(reserve()).rejects.toThrow('permission denied');
  });
  it('enforces private Storage paths for uploads and reads', async () => {
    await actAs(alice);
    await db.query('insert into storage.objects(bucket_id,name) values ($1,$2)', [
      'vocabulary-pages',
      `${alice}/page.png`,
    ]);
    await expect(
      db.query('insert into storage.objects(bucket_id,name) values ($1,$2)', [
        'vocabulary-pages',
        `${bob}/page.png`,
      ]),
    ).rejects.toThrow('row-level security');
    await db.exec('reset role');
    await actAs(bob);
    expect((await db.query('select * from storage.objects')).rows).toHaveLength(0);
  });
  it('allows only the server role to reserve through the privileged function', async () => {
    await db.exec('set role service_role');
    expect(await reserve()).toMatchObject({ created: true, state: 'reserved' });
  });
  it('serializes competing global budget reservations across owners', async () => {
    const attempts = await Promise.allSettled([
      reserve(operation, { session: null, amount: 4, limit: 5 }),
      reserve(secondOperation, { owner: bob, session: null, amount: 4, limit: 5 }),
    ]);
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    const rejected = attempts.find((attempt) => attempt.status === 'rejected');
    expect(rejected && rejected.status === 'rejected' ? String(rejected.reason) : '').toContain(
      'BUDGET_EXCEEDED',
    );
  });
  it('rejects cross-tenant session references even with privileged reservation calls', async () => {
    await expect(reserve(operation, { owner: bob })).rejects.toThrow('SESSION_NOT_FOUND');
  });
  it('returns pending duplicates without dispatch authority and binds all request fields', async () => {
    expect(await reserve()).toMatchObject({ created: true, state: 'reserved' });
    expect(await reserve()).toMatchObject({ created: false, state: 'reserved' });
    await expect(reserve(operation, { fingerprint: 'changed' })).rejects.toThrow(
      'OPERATION_CONFLICT',
    );
    await expect(reserve(operation, { owner: bob })).rejects.toThrow('OPERATION_CONFLICT');
  });
  it('serializes simultaneous duplicate reservations and rejects parallel session mutations', async () => {
    const results = await Promise.all([reserve(), reserve()]);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    await expect(reserve(secondOperation)).rejects.toThrow('SESSION_BUSY');
    await finish();
    expect(await reserve(secondOperation)).toMatchObject({ created: true });
  });
  it('enforces the global concurrency ceiling across independent sessions', async () => {
    await reserve(operation, { session: null });
    await reserve(secondOperation, { session: null });
    await expect(reserve(thirdOperation, { session: null })).rejects.toThrow('CONCURRENCY_LIMIT');
  });
  it('settles measured usage but holds unknown costs and never silently retries unresolved charges', async () => {
    await reserve(operation, { amount: 4.9 });
    await finish(operation, 'succeeded', 0.01);
    expect(await reserve(secondOperation, { amount: 4.9 })).toMatchObject({ created: true });
    await finish(secondOperation, 'unresolved', null);
    expect(await reserve(secondOperation)).toMatchObject({ created: false, state: 'unresolved' });
    await expect(finish(secondOperation, 'failed', 0)).rejects.toThrow(
      'OPERATION_ALREADY_FINALIZED',
    );
    await expect(reserve(thirdOperation, { session: null, amount: 0.2 })).rejects.toThrow(
      'BUDGET_EXCEEDED',
    );
  });
  it('releases known pre-dispatch failures and returns a completed replay', async () => {
    await reserve();
    await finish(operation, 'failed', 0);
    await reserve(secondOperation);
    await finish(secondOperation);
    const replay = await reserve(secondOperation);
    expect(replay).toMatchObject({
      created: false,
      state: 'succeeded',
      result: { transcript: 'private learner text' },
    });
  });
  it('deletes session content and replay payloads while retaining non-content usage', async () => {
    await reserve();
    await finish();
    await db.query('select public.delete_owned_session($1,$2)', [session, bob]);
    expect((await db.query('select * from public.speaking_sessions')).rows).toHaveLength(1);
    await db.query('select public.delete_owned_session($1,$2)', [session, alice]);
    const row = (
      await db.query<{ result: unknown; usage: unknown }>(
        'select result,usage from public.provider_operations',
      )
    ).rows[0]!;
    expect(row.result).toBeNull();
    expect(row.usage).toEqual({ inputTokens: 500 });
    expect((await db.query('select * from public.speaking_sessions')).rows).toHaveLength(0);
  });
  it('keeps cost accounting but scrubs personal replay content on account deletion', async () => {
    await reserve();
    await finish();
    await db.query('delete from auth.users where id=$1', [alice]);
    expect(
      (await db.query('select owner_id,result,usage from public.provider_operations')).rows[0],
    ).toEqual({ owner_id: null, result: null, usage: null });
  });
  it('rejects attempts to bypass the configured maximum development budget', async () => {
    await expect(reserve(operation, { amount: 1, limit: 151 })).rejects.toThrow(
      'INVALID_RESERVATION',
    );
  });
});
