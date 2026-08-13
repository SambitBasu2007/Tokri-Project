-- ============================================================
--  Tokri Compare — Supabase Database Schema
--  Run this in the Supabase SQL Editor (new query)
-- ============================================================

-- ----------------------------------------------------------
--  1. PUBLIC.USERS (mirrors auth.users for app-level queries)
-- ----------------------------------------------------------
create table if not exists public.users (
  id          uuid references auth.users on delete cascade primary key,
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now()
);

comment on table public.users is 'App-level user profiles linked to Supabase Auth';

-- Auto-sync auth.users → public.users on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    email       = excluded.email,
    full_name   = excluded.full_name,
    avatar_url  = excluded.avatar_url;
  return new;
end;
$$;

-- Trigger: fires after every insert on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Also backfill existing auth.users (if any) into public.users
insert into public.users (id, email, full_name, avatar_url)
select 
  id,
  email,
  raw_user_meta_data ->> 'full_name' as full_name,
  raw_user_meta_data ->> 'avatar_url' as avatar_url
from auth.users
on conflict (id) do nothing;


-- ----------------------------------------------------------
--  2. COMMUNITIES
-- ----------------------------------------------------------
create table if not exists public.communities (
  id            uuid primary key default gen_random_uuid(),
  handle        text not null unique,
  display_name  text not null,
  type          text not null check (type in ('family', 'friends')),
  leader_id     uuid references public.users(id) on delete cascade not null,
  created_at    timestamptz default now()
);

comment on table public.communities is 'Shopping communities (family or friends groups)';
comment on column communities.handle is 'Unique @handle used in URLs and mentions';

-- Auto-add creator as first member via trigger
CREATE OR REPLACE FUNCTION public.add_creator_as_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
begin
  insert into public.community_members (community_id, user_id, nickname)
  values (new.id, new.leader_id, 'Leader');
  return new;
end;
$$;

drop trigger if exists on_community_created on public.communities;
create trigger on_community_created
  after insert on public.communities
  for each row execute procedure public.add_creator_as_member();


-- ----------------------------------------------------------
--  3. COMMUNITY_MEMBERS
-- ----------------------------------------------------------
create table if not exists public.community_members (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid references public.communities(id) on delete cascade not null,
  user_id       uuid references public.users(id) on delete cascade not null,
  nickname      text,
  joined_at     timestamptz default now(),
  unique (community_id, user_id)
);

comment on table public.community_members is 'Many-to-many link between users and communities';
comment on column community_members.nickname is 'Display name inside this community (can repeat across communities)';

-- Index for fast "my communities" lookups
create index if not exists idx_community_members_user_id 
  on public.community_members(user_id);


-- ----------------------------------------------------------
--  4. JOIN_REQUESTS
-- ----------------------------------------------------------
create table if not exists public.join_requests (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid references public.communities(id) on delete cascade not null,
  user_id       uuid references public.users(id) on delete cascade not null,
  status        text not null check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (community_id, user_id)
);

comment on table public.join_requests is 'Pending/rejected/accepted requests to join a community';

-- Index for leaders reviewing pending requests
create index if not exists idx_join_requests_community_status 
  on public.join_requests(community_id, status);


-- ----------------------------------------------------------
--  5. SHARED_CART_ITEMS
-- ----------------------------------------------------------
create table if not exists public.shared_cart_items (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid references public.communities(id) on delete cascade not null,
  product_id    integer not null,              -- maps to hardcoded PRODUCTS array in app.js
  added_by      uuid references public.users(id) on delete cascade not null,
  quantity      integer not null default 1 check (quantity > 0),
  selected_store text not null,                -- 'blinkit', 'zepto', etc.
  created_at    timestamptz default now()
);

comment on table public.shared_cart_items is 'Items added to a community shared cart';

-- Index for fast community cart loading
create index if not exists idx_shared_cart_community 
  on public.shared_cart_items(community_id);


-- ----------------------------------------------------------
--  6. ORDER_EVENTS
-- ----------------------------------------------------------
create table if not exists public.order_events (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid references public.communities(id) on delete cascade not null,
  ordered_by    uuid references public.users(id) on delete cascade not null,
  items         jsonb not null,                -- snapshot of cart items at order time
  amount        numeric(10,2) not null,        -- total amount paid
  created_at    timestamptz default now()      -- server clock, not client
);

comment on table public.order_events is 'Immutable record of placed orders; feeds notifications & spend tracker';
comment on column order_events.created_at is 'Uses database server clock so monthly totals cannot be skewed by client device time';

-- Index for monthly spend aggregations
create index if not exists idx_order_events_community_created 
  on public.order_events(community_id, created_at);


-- ============================================================
--  ROW LEVEL SECURITY (RLS) — enabled on every table
-- ============================================================

-- Helper: is the current user a member of a given community?
-- We inline this as EXISTS subqueries per the spec rather than a
-- separate function to keep policies transparent in the dashboard.


-- ---------- public.users ----------
alter table public.users enable row level security;

create policy "Users can read all profiles"
  on public.users for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ---------- public.communities ----------
alter table public.communities enable row level security;

create policy "Members can read their communities"
  on public.communities for select
  to authenticated
  using (
    exists (
      select 1 from public.community_members cm
      where cm.community_id = communities.id
        and cm.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create communities"
  on public.communities for insert
  to authenticated
  with check (leader_id = auth.uid());

create policy "Leaders can update their communities"
  on public.communities for update
  to authenticated
  using (leader_id = auth.uid())
  with check (leader_id = auth.uid());

create policy "Leaders can delete their communities"
  on public.communities for delete
  to authenticated
  using (leader_id = auth.uid());


-- ---------- public.community_members ----------
alter table public.community_members enable row level security;

create policy "Members can read community members"
  on public.community_members for select
  to authenticated
  using (
    exists (
      select 1 from public.community_members cm
      where cm.community_id = community_members.community_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Leaders can add members"
  on public.community_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.communities c
      where c.id = community_members.community_id
        and c.leader_id = auth.uid()
    )
  );

create policy "Users can update own nickname"
  on public.community_members for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can leave communities; leaders can remove members"
  on public.community_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.communities c
      where c.id = community_members.community_id
        and c.leader_id = auth.uid()
    )
  );


-- ---------- public.join_requests ----------
alter table public.join_requests enable row level security;

create policy "Users can see requests for their communities or their own requests"
  on public.join_requests for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.community_members cm
      where cm.community_id = join_requests.community_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Any authenticated user can request to join"
  on public.join_requests for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Leaders can update request status"
  on public.join_requests for update
  to authenticated
  using (
    exists (
      select 1 from public.communities c
      where c.id = join_requests.community_id
        and c.leader_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.communities c
      where c.id = join_requests.community_id
        and c.leader_id = auth.uid()
    )
  );

create policy "Requesters can cancel their own requests"
  on public.join_requests for delete
  to authenticated
  using (user_id = auth.uid());


-- ---------- public.shared_cart_items ----------
alter table public.shared_cart_items enable row level security;

create policy "Members can read shared cart"
  on public.shared_cart_items for select
  to authenticated
  using (
    exists (
      select 1 from public.community_members cm
      where cm.community_id = shared_cart_items.community_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Members can add items to shared cart"
  on public.shared_cart_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.community_members cm
      where cm.community_id = shared_cart_items.community_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Members can update shared cart items"
  on public.shared_cart_items for update
  to authenticated
  using (
    exists (
      select 1 from public.community_members cm
      where cm.community_id = shared_cart_items.community_id
        and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.community_members cm
      where cm.community_id = shared_cart_items.community_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Members can delete shared cart items"
  on public.shared_cart_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.community_members cm
      where cm.community_id = shared_cart_items.community_id
        and cm.user_id = auth.uid()
    )
  );


-- ---------- public.order_events ----------
alter table public.order_events enable row level security;

create policy "Members can read order events"
  on public.order_events for select
  to authenticated
  using (
    exists (
      select 1 from public.community_members cm
      where cm.community_id = order_events.community_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Members can record orders"
  on public.order_events for insert
  to authenticated
  with check (
    exists (
      select 1 from public.community_members cm
      where cm.community_id = order_events.community_id
        and cm.user_id = auth.uid()
    )
  );

-- No update/delete on order_events — immutable log


-- ============================================================
--  REALTIME (optional but recommended for shared cart sync)
-- ============================================================
-- Enable realtime on tables that need live sync
begin;
  -- Add tables to the realtime publication (if not already present)
  -- Note: in newer Supabase projects this is handled via the Dashboard
  -- under Database → Replication, but we include the SQL for completeness.

  -- Uncomment the lines below if your project uses the older realtime setup:
  -- alter publication supabase_realtime add table public.shared_cart_items;
  -- alter publication supabase_realtime add table public.join_requests;
  -- alter publication supabase_realtime add table public.order_events;
commit;

comment on publication supabase_realtime is 'Realtime updates for shared cart, join requests, and order events';
