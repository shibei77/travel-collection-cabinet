alter table public.travel_records
  add column if not exists companions text not null default '',
  add column if not exists mood text;
