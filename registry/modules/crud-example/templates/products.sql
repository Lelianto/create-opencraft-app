-- Products table with owner-scoped Row Level Security.
--
-- Run this in the Supabase SQL editor (or add it to your migrations).
--
-- RLS is the backstop, not the only control: the application also filters by
-- owner_id on every query. A service-role key bypasses RLS entirely, so never
-- use one to serve user requests.

create extension if not exists "pgcrypto";

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null check (char_length(name) between 1 and 120),
  description text        check (char_length(description) <= 2000),
  price       numeric(12, 2) not null check (price >= 0),
  image_url   text,
  owner_id    uuid        not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Supports the owner + ordering access pattern used by listProducts().
create index if not exists products_owner_created_idx
  on public.products (owner_id, created_at desc);

alter table public.products enable row level security;

-- Force RLS even for the table owner, so a misconfigured connection cannot
-- silently read everything.
alter table public.products force row level security;

drop policy if exists "products_select_own" on public.products;
create policy "products_select_own"
  on public.products for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "products_insert_own" on public.products;
create policy "products_insert_own"
  on public.products for insert
  to authenticated
  with check (owner_id = auth.uid());

-- `using` controls which rows may be targeted; `with check` prevents reassigning
-- ownership to somebody else during an update.
drop policy if exists "products_update_own" on public.products;
create policy "products_update_own"
  on public.products for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "products_delete_own" on public.products;
create policy "products_delete_own"
  on public.products for delete
  to authenticated
  using (owner_id = auth.uid());

-- Keep updated_at honest even for writes that bypass the application.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();
