-- Initial private application schema. Apply deliberately to the intended Supabase project.
create table public.vocabulary_collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  target_language text not null default 'ko' check (target_language = 'ko'),
  explanation_language text not null default 'fr' check (explanation_language = 'fr'),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 500),
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);
create index vocabulary_collections_owner_idx on public.vocabulary_collections(owner_id);
alter table public.vocabulary_collections enable row level security;
create policy collections_owner_read on public.vocabulary_collections for select to authenticated using (owner_id = (select auth.uid()));
-- Server performs validated writes. A browser cannot mark arbitrary imported data as confirmed.
revoke all on public.vocabulary_collections from anon, authenticated;
grant select on public.vocabulary_collections to authenticated;
grant all on public.vocabulary_collections to service_role;

create table public.speaking_sessions (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (snapshot ? 'id' and snapshot->>'id' = id::text),
  check (snapshot ? 'status' and snapshot->>'status' in ('active', 'completed')),
  unique (id, owner_id)
);
create index speaking_sessions_owner_idx on public.speaking_sessions(owner_id, created_at desc);
alter table public.speaking_sessions enable row level security;
create policy sessions_owner_read on public.speaking_sessions for select to authenticated using (owner_id = (select auth.uid()));
revoke all on public.speaking_sessions from anon, authenticated;
grant select on public.speaking_sessions to authenticated;
grant all on public.speaking_sessions to service_role;

create table public.provider_operations (
  id uuid primary key,
  -- Retain the minimal cost reservation if an account is deleted; personal content is cleared separately.
  owner_id uuid references auth.users(id) on delete set null,
  session_id uuid,
  kind text not null check (char_length(kind) between 1 and 80),
  provider text not null check (provider in ('meta', 'azure')),
  fingerprint text not null check (char_length(fingerprint) between 1 and 128),
  state text not null default 'reserved' check (state in ('reserved', 'succeeded', 'failed', 'unresolved')),
  reserved_usd numeric(12,6) not null check (reserved_usd > 0),
  estimated_usd numeric(12,6) check (estimated_usd >= 0),
  result jsonb,
  usage jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index provider_operations_owner_idx on public.provider_operations(owner_id, created_at desc);
create index provider_operations_pending_idx on public.provider_operations(session_id) where state in ('reserved', 'unresolved');
alter table public.provider_operations enable row level security;
-- No browser access to ledger or reservation procedures. All calls require server verification first.
revoke all on public.provider_operations from anon, authenticated;
grant all on public.provider_operations to service_role;

create or replace function public.reserve_provider_operation(
  p_id uuid, p_owner_id uuid, p_session_id uuid, p_kind text, p_provider text,
  p_fingerprint text, p_reserved_usd numeric, p_limit_usd numeric, p_max_concurrent integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  existing public.provider_operations%rowtype;
  used_usd numeric;
  active_count integer;
begin
  if p_owner_id is null or p_reserved_usd is null or p_reserved_usd <= 0
     or p_limit_usd is null or p_limit_usd <= 0 or p_limit_usd > 120
     or p_reserved_usd > p_limit_usd or p_max_concurrent is null or p_max_concurrent < 1 or p_max_concurrent > 2
     or p_provider not in ('meta', 'azure') then
    raise exception 'INVALID_RESERVATION';
  end if;
  -- One transaction lock serializes accounting across all server instances, not just one Node process.
  perform pg_catalog.pg_advisory_xact_lock(814207563);
  select * into existing from public.provider_operations where id = p_id;
  if found then
    if existing.owner_id is distinct from p_owner_id or existing.session_id is distinct from p_session_id
      or existing.kind is distinct from p_kind or existing.provider is distinct from p_provider
      or existing.fingerprint is distinct from p_fingerprint then
      raise exception 'OPERATION_CONFLICT';
    end if;
    return jsonb_build_object('state', existing.state, 'result', existing.result, 'created', false);
  end if;
  if p_session_id is not null and exists (
    select 1 from public.speaking_sessions where id = p_session_id and owner_id <> p_owner_id
  ) then raise exception 'SESSION_NOT_FOUND'; end if;
  if p_session_id is not null and exists (
    select 1 from public.provider_operations where session_id = p_session_id and state in ('reserved', 'unresolved')
  ) then raise exception 'SESSION_BUSY'; end if;
  select count(*) into active_count from public.provider_operations where state in ('reserved', 'unresolved');
  if active_count >= p_max_concurrent then raise exception 'CONCURRENCY_LIMIT'; end if;
  -- Settle known usage estimates; unresolved or unmeasured charges retain their full reservation.
  select coalesce(sum(case when state = 'succeeded' and estimated_usd is not null then estimated_usd else reserved_usd end), 0) into used_usd
    from public.provider_operations where provider = p_provider and state <> 'failed';
  if used_usd + p_reserved_usd > p_limit_usd then raise exception 'BUDGET_EXCEEDED'; end if;
  insert into public.provider_operations (id, owner_id, session_id, kind, provider, fingerprint, reserved_usd)
    values (p_id, p_owner_id, p_session_id, p_kind, p_provider, p_fingerprint, p_reserved_usd);
  return jsonb_build_object('state', 'reserved', 'result', null, 'created', true);
end;
$$;
revoke all on function public.reserve_provider_operation(uuid, uuid, uuid, text, text, text, numeric, numeric, integer) from public, anon, authenticated;
grant execute on function public.reserve_provider_operation(uuid, uuid, uuid, text, text, text, numeric, numeric, integer) to service_role;

create or replace function public.finish_provider_operation(
  p_id uuid, p_owner_id uuid, p_state text, p_result jsonb default null,
  p_estimated_usd numeric default null, p_usage jsonb default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare existing public.provider_operations%rowtype;
begin
  if p_state not in ('succeeded', 'failed', 'unresolved') or (p_estimated_usd is not null and p_estimated_usd < 0) then
    raise exception 'INVALID_OPERATION_STATE';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(814207563);
  select * into existing from public.provider_operations where id = p_id and owner_id = p_owner_id for update;
  if not found then raise exception 'OPERATION_NOT_FOUND'; end if;
  if existing.state <> 'reserved' then
    -- Finalized requests cannot be overwritten or have an unresolved charge silently discarded.
    if existing.state = p_state then return; end if;
    raise exception 'OPERATION_ALREADY_FINALIZED';
  end if;
  update public.provider_operations set state = p_state, result = p_result,
    estimated_usd = p_estimated_usd, usage = p_usage, finished_at = now()
    where id = p_id and owner_id = p_owner_id;
end;
$$;
revoke all on function public.finish_provider_operation(uuid, uuid, text, jsonb, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.finish_provider_operation(uuid, uuid, text, jsonb, numeric, jsonb) to service_role;

create or replace function public.delete_owned_session(p_id uuid, p_owner_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(814207563);
  if exists (select 1 from public.provider_operations where session_id = p_id and owner_id = p_owner_id and state = 'reserved') then
    raise exception 'SESSION_BUSY';
  end if;
  delete from public.speaking_sessions where id = p_id and owner_id = p_owner_id;
  -- Keep only non-content cost records, never replay deleted transcripts through an operation id.
  update public.provider_operations set result = null where session_id = p_id and owner_id = p_owner_id;
end;
$$;
revoke all on function public.delete_owned_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_owned_session(uuid, uuid) to service_role;

create or replace function public.clear_deleted_user_operation_content()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.provider_operations set result = null, usage = null where owner_id = old.id;
  return old;
end;
$$;
revoke all on function public.clear_deleted_user_operation_content() from public, anon, authenticated;
create trigger clear_operation_content_before_user_delete before delete on auth.users
for each row execute function public.clear_deleted_user_operation_content();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vocabulary-pages', 'vocabulary-pages', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy vocabulary_pages_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'vocabulary-pages' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy vocabulary_pages_owner_read on storage.objects for select to authenticated
using (bucket_id = 'vocabulary-pages' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy vocabulary_pages_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'vocabulary-pages' and (storage.foldername(name))[1] = (select auth.uid())::text);
