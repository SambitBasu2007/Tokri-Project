-- ============================================================================
-- Tokri V2 — base tables for a fresh Supabase project
--
-- Run this BEFORE 0001_v2_schema.sql when the project has no app tables yet.
-- It creates the original account/community/order tables that 0001 extends.
-- Safe to re-run: every object is created with IF NOT EXISTS and policies are
-- dropped/recreated. Existing rows are never deleted.
-- ============================================================================

create extension if not exists pgcrypto;

-- --------------------------------------------------------------- profiles --
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- New auth users get a profile automatically. Existing auth users are
-- backfilled once so community member names resolve immediately.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(users.full_name, excluded.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.users (id, email, full_name)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'full_name', split_part(coalesce(email, ''), '@', 1))
from auth.users
on conflict (id) do nothing;

-- ------------------------------------------------------------- communities --
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  handle text not null,
  display_name text not null,
  type text not null check (type in ('family', 'friends')),
  leader_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists communities_handle_lower_idx
  on public.communities (lower(handle));

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  nickname text,
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index if not exists community_members_user_idx
  on public.community_members (user_id);

create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);
create unique index if not exists join_requests_one_pending_idx
  on public.join_requests (community_id, user_id)
  where status = 'pending';

-- -------------------------------------------------------------- order rows --
create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete set null,
  ordered_by uuid not null references public.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  amount numeric(10, 2) not null default 0,
  address_text text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);
create index if not exists order_events_feed_idx
  on public.order_events (community_id, created_at desc);
create index if not exists order_events_owner_idx
  on public.order_events (ordered_by, created_at desc);

-- ----------------------------------------------------------------- helpers --
create or replace function public.is_community_member(p_community_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_members
    where community_id = p_community_id and user_id = p_user_id
  );
$$;
grant execute on function public.is_community_member(uuid, uuid) to authenticated;

create or replace function public.shares_community(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_members a
    join public.community_members b using (community_id)
    where a.user_id = p_a and b.user_id = p_b
  );
$$;
grant execute on function public.shares_community(uuid, uuid) to authenticated;

create or replace function public.enforce_community_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.community_members where user_id = new.user_id) >= 10 then
    raise exception 'Community limit reached: 10 communities per person.';
  end if;
  return new;
end;
$$;

drop trigger if exists community_member_limit on public.community_members;
create trigger community_member_limit
  before insert on public.community_members
  for each row execute function public.enforce_community_limit();

-- A leader who already belongs to 10 communities should fail at creation time,
-- not after an orphan community row has been inserted.
create or replace function public.enforce_community_creation_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and (select count(*) from public.community_members where user_id = auth.uid()) >= 10 then
    raise exception 'Community limit reached: 10 communities per person.';
  end if;
  return new;
end;
$$;

drop trigger if exists community_creation_limit on public.communities;
create trigger community_creation_limit
  before insert on public.communities
  for each row execute function public.enforce_community_creation_limit();

create or replace function public.reassign_random_leader(community_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next uuid;
  v_user uuid := auth.uid();
  v_community uuid := community_id;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  if not exists (
    select 1 from public.communities
    where id = v_community and leader_id = v_user
  ) then
    raise exception 'Only the current leader can reassign leadership';
  end if;

  select m.user_id into v_next
  from public.community_members m
  where m.community_id = v_community
  order by random()
  limit 1;

  if v_next is null then
    delete from public.communities where id = v_community;
  else
    update public.communities set leader_id = v_next where id = v_community;
  end if;
end;
$$;
revoke execute on function public.reassign_random_leader(uuid) from public;
grant execute on function public.reassign_random_leader(uuid) to authenticated;

-- ---------------------------------------------------------------- policies --
drop policy if exists "read own profile" on public.users;
drop policy if exists "read community profiles" on public.users;
drop policy if exists "insert own profile" on public.users;
drop policy if exists "update own profile" on public.users;

create policy "read own profile" on public.users
  for select to authenticated using (id = auth.uid());
create policy "read community profiles" on public.users
  for select to authenticated using (
    public.shares_community(auth.uid(), id)
    or exists (
      select 1
      from public.join_requests r
      join public.communities c on c.id = r.community_id
      where r.user_id = users.id and c.leader_id = auth.uid()
    )
  );
create policy "insert own profile" on public.users
  for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

alter table public.communities enable row level security;
drop policy if exists "read communities" on public.communities;
drop policy if exists "create own community" on public.communities;
drop policy if exists "leader updates community" on public.communities;
drop policy if exists "leader deletes community" on public.communities;
create policy "read communities" on public.communities
  for select to authenticated using (true);
create policy "create own community" on public.communities
  for insert to authenticated with check (leader_id = auth.uid());
create policy "leader updates community" on public.communities
  for update to authenticated using (leader_id = auth.uid()) with check (true);
create policy "leader deletes community" on public.communities
  for delete to authenticated using (leader_id = auth.uid());

alter table public.community_members enable row level security;
drop policy if exists "read members" on public.community_members;
drop policy if exists "join or add members" on public.community_members;
drop policy if exists "update own nickname" on public.community_members;
drop policy if exists "leave or remove members" on public.community_members;
create policy "read members" on public.community_members
  for select to authenticated using (true);
create policy "join or add members" on public.community_members
  for insert to authenticated with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.communities c
      where c.id = community_id and c.leader_id = auth.uid()
    )
  );
create policy "update own nickname" on public.community_members
  for update to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.communities c
      where c.id = community_id and c.leader_id = auth.uid()
    )
  );
create policy "leave or remove members" on public.community_members
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.communities c
      where c.id = community_id and c.leader_id = auth.uid()
    )
  );

alter table public.join_requests enable row level security;
drop policy if exists "read own or led requests" on public.join_requests;
drop policy if exists "send own request" on public.join_requests;
drop policy if exists "leader answers request" on public.join_requests;
drop policy if exists "withdraw request" on public.join_requests;
create policy "read own or led requests" on public.join_requests
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.communities c
      where c.id = community_id and c.leader_id = auth.uid()
    )
  );
create policy "send own request" on public.join_requests
  for insert to authenticated with check (
    user_id = auth.uid()
    and not public.is_community_member(community_id, auth.uid())
  );
create policy "leader answers request" on public.join_requests
  for update to authenticated using (
    exists (
      select 1 from public.communities c
      where c.id = community_id and c.leader_id = auth.uid()
    )
  );
create policy "withdraw request" on public.join_requests
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.communities c
      where c.id = community_id and c.leader_id = auth.uid()
    )
  );

-- order_events RLS is enabled by 0001, which also creates owner-only policies.
alter table public.order_events enable row level security;
