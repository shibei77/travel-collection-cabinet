-- Run this whole file in Supabase Dashboard > SQL Editor before using the app.
-- It is safe to run again when upgrading an earlier version of this project.

create extension if not exists pgcrypto;

create table if not exists public.travel_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  city_name text not null,
  province_name text not null,
  coordinates jsonb not null default '[]'::jsonb,
  visit_date date not null,
  cost numeric not null default 0 check (cost >= 0),
  transport text not null default '旅行',
  days integer not null default 1 check (days > 0),
  companions text not null default '',
  mood text,
  tags jsonb not null default '[]'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  story text,
  legacy_source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade an existing table created by an earlier project version.
alter table public.travel_records
  add column if not exists companions text not null default '',
  add column if not exists mood text,
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists legacy_source_id text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists travel_records_user_id_idx
  on public.travel_records (user_id);

create index if not exists travel_records_user_id_visit_date_idx
  on public.travel_records (user_id, visit_date desc, created_at desc);

-- Prevent the temporary browser migration button from importing one local record twice.
create unique index if not exists travel_records_user_legacy_source_id_idx
  on public.travel_records (user_id, legacy_source_id)
  where legacy_source_id is not null;

create or replace function public.set_travel_record_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists travel_records_set_updated_at on public.travel_records;

create trigger travel_records_set_updated_at
before update on public.travel_records
for each row
execute function public.set_travel_record_updated_at();

alter table public.travel_records enable row level security;

revoke all on table public.travel_records from anon;
grant select, insert, update, delete on table public.travel_records to authenticated;

drop policy if exists "Users can read their own travel records" on public.travel_records;
drop policy if exists "Users can add their own travel records" on public.travel_records;
drop policy if exists "Users can update their own travel records" on public.travel_records;
drop policy if exists "Users can delete their own travel records" on public.travel_records;

create policy "Users can read their own travel records"
on public.travel_records
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own travel records"
on public.travel_records
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own travel records"
on public.travel_records
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own travel records"
on public.travel_records
for delete
to authenticated
using ((select auth.uid()) = user_id);
