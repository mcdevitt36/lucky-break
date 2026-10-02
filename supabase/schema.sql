create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique,
  guest_token_hash text unique,
  created_at timestamptz not null default now()
);

create table if not exists game_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  initials text,
  streak integer not null check (streak >= 0),
  score integer not null check (score >= 0),
  run_date date not null default (now() at time zone 'utc')::date,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table game_runs
  add column if not exists initials text;

alter table game_runs
  drop constraint if exists game_runs_initials_format;

alter table game_runs
  add constraint game_runs_initials_format
  check (initials is null or initials ~ '^[A-Z0-9]{3}$');

create index if not exists game_runs_daily_rank_idx
  on game_runs (run_date, streak desc, score desc, completed_at asc);

create or replace view daily_best_initials as
select distinct on (run_date, initials)
  run_date,
  initials,
  id as run_id,
  user_id,
  streak,
  score,
  completed_at
from game_runs
where completed_at is not null
  and initials is not null
order by run_date, initials, streak desc, score desc, completed_at asc;

create or replace view daily_top5 as
select *
from daily_best_initials
where run_date = (now() at time zone 'utc')::date
order by streak desc, score desc, completed_at asc
limit 5;

-- GitHub Pages is static hosting, so never expose a Supabase service-role key
-- in the client. A production shared leaderboard should submit answers to a
-- server-side endpoint / Supabase Edge Function that derives streak and score
-- from verified run state before inserting a qualifying score.
