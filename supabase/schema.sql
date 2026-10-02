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
  streak integer not null check (streak >= 0),
  score integer not null check (score >= 0),
  run_date date not null default current_date,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists game_runs_daily_rank_idx
  on game_runs (run_date, streak desc, score desc, completed_at asc);

create or replace view daily_best_runs as
select distinct on (run_date, user_id)
  run_date, user_id, id as run_id, streak, score, completed_at
from game_runs
where completed_at is not null
order by run_date, user_id, streak desc, score desc, completed_at asc;

-- Production app should submit answers to a server-side run session and derive
-- streak/score there rather than accepting arbitrary client totals.