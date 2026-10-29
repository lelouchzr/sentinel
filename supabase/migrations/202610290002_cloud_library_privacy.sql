-- Cloud library, correction concurrency, administrative reconciliation and deletion barriers.
-- This migration does not enable paid providers or provision any external service.
alter table public.vocabulary_collections add column revision integer not null default 0 check (revision >= 0);
alter table public.vocabulary_collections add column updated_at timestamptz not null default now();

create table public.account_deletion_requests (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now()
);
alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from anon, authenticated;
grant select on public.account_deletion_requests to authenticated;
grant all on public.account_deletion_requests to service_role;
create policy deletion_request_owner_read on public.account_deletion_requests for select to authenticated using (owner_id = (select auth.uid()));

create function public.assert_active_account(p_owner_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.account_deletion_requests where owner_id = p_owner_id) then raise exception 'ACCOUNT_DELETING'; end if;
end;
$$;
revoke all on function public.assert_active_account(uuid) from public, anon, authenticated;
grant execute on function public.assert_active_account(uuid) to service_role;

create function public.write_vocabulary_collection(p_id uuid,p_owner_id uuid,p_title text,p_items jsonb,p_expected_revision integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare existing public.vocabulary_collections%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(814207563);
  perform public.assert_active_account(p_owner_id);
  if p_title is null or char_length(btrim(p_title)) not between 1 and 100 or p_items is null
    or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 500 then raise exception 'INVALID_COLLECTION'; end if;
  select * into existing from public.vocabulary_collections where id=p_id for update;
  if found then
    if existing.owner_id <> p_owner_id then raise exception 'COLLECTION_NOT_FOUND'; end if;
    if p_expected_revision is null then
      if existing.title=btrim(p_title) and existing.items=p_items then return to_jsonb(existing); end if;
      raise exception 'COLLECTION_CONFLICT';
    end if;
    -- A lost response can be retried without incrementing the revision twice.
    if existing.revision=p_expected_revision+1 and existing.title=btrim(p_title) and existing.items=p_items then return to_jsonb(existing); end if;
    if existing.revision<>p_expected_revision then raise exception 'COLLECTION_CONFLICT'; end if;
    update public.vocabulary_collections set title=btrim(p_title),items=p_items,revision=revision+1,updated_at=now() where id=p_id returning * into existing;
    return to_jsonb(existing);
  end if;
  if p_expected_revision is not null then raise exception 'COLLECTION_NOT_FOUND'; end if;
  if (select count(*) from public.vocabulary_collections where owner_id=p_owner_id)>=30 then raise exception 'COLLECTION_LIMIT'; end if;
  insert into public.vocabulary_collections(id,owner_id,title,items) values(p_id,p_owner_id,btrim(p_title),p_items) returning * into existing;
  return to_jsonb(existing);
end;
$$;
revoke all on function public.write_vocabulary_collection(uuid,uuid,text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.write_vocabulary_collection(uuid,uuid,text,jsonb,integer) to service_role;

create function public.delete_vocabulary_collection(p_id uuid,p_owner_id uuid,p_expected_revision integer)
returns void language plpgsql security definer set search_path = '' as $$
declare existing public.vocabulary_collections%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(814207563);
  perform public.assert_active_account(p_owner_id);
  select * into existing from public.vocabulary_collections where id=p_id for update;
  if not found then return; end if;
  if existing.owner_id<>p_owner_id then raise exception 'COLLECTION_NOT_FOUND'; end if;
  if p_expected_revision is null or existing.revision<>p_expected_revision then raise exception 'COLLECTION_CONFLICT'; end if;
  delete from public.vocabulary_collections where id=p_id;
end;
$$;
revoke all on function public.delete_vocabulary_collection(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.delete_vocabulary_collection(uuid,uuid,integer) to service_role;

create table public.session_mutations (
  operation_id uuid primary key,
  session_id uuid not null,
  owner_id uuid not null,
  fingerprint text not null check(char_length(fingerprint) between 1 and 128),
  created_at timestamptz not null default now(),
  foreign key(session_id,owner_id) references public.speaking_sessions(id,owner_id) on delete cascade
);
alter table public.session_mutations enable row level security;
revoke all on public.session_mutations from anon,authenticated;
grant all on public.session_mutations to service_role;

create function public.mutate_session_snapshot(p_session_id uuid,p_owner_id uuid,p_expected_revision integer,p_snapshot jsonb,p_operation_id uuid,p_fingerprint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare existing public.speaking_sessions%rowtype; prior public.session_mutations%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(814207563);
  perform public.assert_active_account(p_owner_id);
  select * into existing from public.speaking_sessions where id=p_session_id and owner_id=p_owner_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if exists(select 1 from public.provider_operations where id=p_operation_id) then raise exception 'OPERATION_CONFLICT'; end if;
  select * into prior from public.session_mutations where operation_id=p_operation_id;
  if found then
    if prior.session_id<>p_session_id or prior.owner_id<>p_owner_id or prior.fingerprint<>p_fingerprint then raise exception 'OPERATION_CONFLICT'; end if;
    -- Return current state, never an old replay that could resurrect invalidated feedback.
    return existing.snapshot;
  end if;
  if exists(select 1 from public.provider_operations where session_id=p_session_id and state in ('reserved','unresolved')) then raise exception 'SESSION_BUSY'; end if;
  if p_expected_revision is null or coalesce((existing.snapshot->>'revision')::integer,0)<>p_expected_revision then raise exception 'SESSION_CONFLICT'; end if;
  if p_snapshot->>'id' is distinct from p_session_id::text or p_snapshot->>'mode'='local' then raise exception 'INVALID_SESSION'; end if;
  insert into public.session_mutations(operation_id,session_id,owner_id,fingerprint) values(p_operation_id,p_session_id,p_owner_id,p_fingerprint);
  update public.speaking_sessions set snapshot=jsonb_set(p_snapshot,'{revision}',to_jsonb(p_expected_revision+1)),updated_at=now() where id=p_session_id returning * into existing;
  -- Successful replay results are stale after a correction and must not reintroduce prior evidence.
  update public.provider_operations set result=null where session_id=p_session_id and owner_id=p_owner_id;
  return existing.snapshot;
end;
$$;
revoke all on function public.mutate_session_snapshot(uuid,uuid,integer,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.mutate_session_snapshot(uuid,uuid,integer,jsonb,uuid,text) to service_role;

create function public.save_session_snapshot(p_session_id uuid,p_owner_id uuid,p_expected_revision integer,p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare existing public.speaking_sessions%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(814207563);
  perform public.assert_active_account(p_owner_id);
  select * into existing from public.speaking_sessions where id=p_session_id and owner_id=p_owner_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if p_expected_revision is null or coalesce((existing.snapshot->>'revision')::integer,0)<>p_expected_revision then raise exception 'SESSION_CONFLICT'; end if;
  if p_snapshot->>'id' is distinct from p_session_id::text or p_snapshot->>'mode'='local' then raise exception 'INVALID_SESSION'; end if;
  update public.speaking_sessions set snapshot=jsonb_set(p_snapshot,'{revision}',to_jsonb(p_expected_revision+1)),updated_at=now() where id=p_session_id returning * into existing;
  return existing.snapshot;
end;
$$;
revoke all on function public.save_session_snapshot(uuid,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.save_session_snapshot(uuid,uuid,integer,jsonb) to service_role;

create function public.begin_account_deletion(p_owner_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(814207563);
  if exists(select 1 from public.provider_operations where owner_id=p_owner_id and state='reserved') then raise exception 'ACCOUNT_BUSY'; end if;
  insert into public.account_deletion_requests(owner_id) values(p_owner_id) on conflict do nothing;
end;
$$;
revoke all on function public.begin_account_deletion(uuid) from public,anon,authenticated;
grant execute on function public.begin_account_deletion(uuid) to service_role;

create table public.provider_operation_reconciliations (
  operation_id uuid primary key references public.provider_operations(id),
  billed_usd numeric(12,6) not null check(billed_usd>=0),
  reason text not null check(char_length(reason) between 20 and 500),
  reference text not null check(char_length(reference) between 3 and 300),
  reconciled_at timestamptz not null default now()
);
alter table public.provider_operation_reconciliations enable row level security;
revoke all on public.provider_operation_reconciliations from anon,authenticated;
grant all on public.provider_operation_reconciliations to service_role;
create function public.reconcile_provider_operation(p_id uuid,p_billed_usd numeric,p_reason text,p_reference text)
returns void language plpgsql security definer set search_path = '' as $$
declare existing public.provider_operations%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(814207563);
  if p_billed_usd is null or p_billed_usd<0 or p_billed_usd>1000 or char_length(p_reason) not between 20 and 500 or char_length(p_reference) not between 3 and 300 then raise exception 'INVALID_RECONCILIATION'; end if;
  select * into existing from public.provider_operations where id=p_id for update;
  if not found then raise exception 'OPERATION_NOT_FOUND'; end if;
  if exists(select 1 from public.provider_operation_reconciliations where operation_id=p_id and billed_usd=p_billed_usd and reason=p_reason and reference=p_reference) then return; end if;
  if existing.state not in ('reserved','unresolved') then raise exception 'OPERATION_ALREADY_FINALIZED'; end if;
  if existing.state='reserved' and existing.created_at>now()-interval '15 minutes' then raise exception 'OPERATION_STILL_RUNNING'; end if;
  insert into public.provider_operation_reconciliations(operation_id,billed_usd,reason,reference) values(p_id,p_billed_usd,p_reason,p_reference);
  update public.provider_operations set state=case when p_billed_usd=0 then 'failed' else 'succeeded' end,estimated_usd=p_billed_usd,result=null,finished_at=now() where id=p_id;
end;
$$;
revoke all on function public.reconcile_provider_operation(uuid,numeric,text,text) from public,anon,authenticated;
grant execute on function public.reconcile_provider_operation(uuid,numeric,text,text) to service_role;

create function public.owned_usage_summary(p_owner_id uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('balanceVerified',false,'providers',coalesce(jsonb_agg(summary),'[]'::jsonb)) from (
    select jsonb_build_object('provider',provider,
      'estimatedUsd',coalesce(sum(estimated_usd) filter(where state='succeeded' and estimated_usd is not null),0),
      'heldUsd',coalesce(sum(reserved_usd) filter(where state in ('reserved','unresolved') or (state='succeeded' and estimated_usd is null)),0),
      'operationCount',count(*),'pendingCount',count(*) filter(where state='reserved'),
      'unresolvedCount',count(*) filter(where state='unresolved'),
      'hasUnknownCharges',coalesce(bool_or(state='unresolved' or (state='succeeded' and estimated_usd is null)),false)) as summary
    from public.provider_operations where owner_id=p_owner_id group by provider
  ) grouped;
$$;
revoke all on function public.owned_usage_summary(uuid) from public,anon,authenticated;
grant execute on function public.owned_usage_summary(uuid) to service_role;

create function public.stale_vocabulary_uploads(p_before timestamptz,p_limit integer default 100)
returns table(name text) language sql security definer set search_path = '' as $$
  select name from storage.objects where bucket_id='vocabulary-pages'
    and created_at<least(p_before,now()-interval '24 hours')
    order by created_at,name limit least(greatest(p_limit,1),200);
$$;
revoke all on function public.stale_vocabulary_uploads(timestamptz,integer) from public,anon,authenticated;
grant execute on function public.stale_vocabulary_uploads(timestamptz,integer) to service_role;

-- A still-valid JWT must not recreate private objects after its Auth user was deleted.
-- This helper exposes only the calling user's state, never another account's existence.
create function public.can_upload_vocabulary() returns boolean
language sql security definer set search_path = '' as $$
  select exists(select 1 from auth.users where id=(select auth.uid()))
    and not exists(select 1 from public.account_deletion_requests where owner_id=(select auth.uid()));
$$;
revoke all on function public.can_upload_vocabulary() from public,anon;
grant execute on function public.can_upload_vocabulary() to authenticated,service_role;

-- Drain in-flight metadata writes before begin_account_deletion places its barrier.
-- RLS alone cannot serialize an upload that started before the cleanup request.
create function public.guard_vocabulary_upload() returns trigger
language plpgsql security definer set search_path = '' as $$
declare object_owner uuid;
begin
  if new.bucket_id<>'vocabulary-pages' then return new; end if;
  perform pg_catalog.pg_advisory_xact_lock(814207563);
  begin
    object_owner:=split_part(new.name,'/',1)::uuid;
  exception when invalid_text_representation then raise exception 'INVALID_UPLOAD_OWNER';
  end;
  -- BEFORE triggers run before RLS; reject foreign paths before revealing account state.
  if auth.uid() is not null and object_owner<>auth.uid() then raise exception 'INVALID_UPLOAD_OWNER'; end if;
  if not exists(select 1 from auth.users where id=object_owner) then raise exception 'ACCOUNT_NOT_FOUND'; end if;
  perform public.assert_active_account(object_owner);
  return new;
end;
$$;
revoke all on function public.guard_vocabulary_upload() from public,anon,authenticated;
create trigger vocabulary_upload_account_guard before insert or update of bucket_id,name on storage.objects
  for each row execute function public.guard_vocabulary_upload();

-- Do not accept new uploads while an account deletion is removing its private objects.
drop policy vocabulary_pages_owner_insert on storage.objects;
create policy vocabulary_pages_owner_insert on storage.objects for insert to authenticated with check (
  bucket_id='vocabulary-pages' and (storage.foldername(name))[1]=(select auth.uid())::text
  and (select public.can_upload_vocabulary())
);

-- Account deletion shares the accounting lock with all new provider dispatches.
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
  perform public.assert_active_account(p_owner_id);
  if exists(select 1 from public.session_mutations where operation_id=p_id) then raise exception 'OPERATION_CONFLICT'; end if;
  select * into existing from public.provider_operations where id = p_id;
  if found then
    if existing.owner_id is distinct from p_owner_id or existing.session_id is distinct from p_session_id
      or existing.kind is distinct from p_kind or existing.provider is distinct from p_provider
      or existing.fingerprint is distinct from p_fingerprint then
      raise exception 'OPERATION_CONFLICT';
    end if;
    return jsonb_build_object('state', existing.state, 'result', existing.result, 'created', false,
      'reconciled',exists(select 1 from public.provider_operation_reconciliations where operation_id=existing.id));
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


-- Use exact stored keys for account cleanup, including older nested objects.
create function public.owned_vocabulary_uploads(p_owner_id uuid,p_limit integer default 100)
returns table(name text) language sql security definer set search_path = '' as $$
  select object.name from storage.objects object where object.bucket_id='vocabulary-pages'
    and split_part(object.name,'/',1)=p_owner_id::text
    order by object.name limit least(greatest(p_limit,1),200);
$$;
revoke all on function public.owned_vocabulary_uploads(uuid,integer) from public,anon,authenticated;
grant execute on function public.owned_vocabulary_uploads(uuid,integer) to service_role;
