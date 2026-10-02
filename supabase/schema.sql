create extension if not exists pgcrypto;

create table if not exists game_runs (
  id uuid primary key default gen_random_uuid(),
  initials text not null,
  streak integer not null check (streak >= 0 and streak <= 500),
  score integer not null check (score >= 0),
  run_date date not null default (now() at time zone 'utc')::date,
  completed_at timestamptz not null default now()
);

alter table game_runs
  drop constraint if exists game_runs_initials_format;

alter table game_runs
  add constraint game_runs_initials_format
  check (initials ~ '^[A-Z0-9]{3}$');

create index if not exists game_runs_daily_rank_idx
  on game_runs (run_date, streak desc, score desc, completed_at asc);

create or replace function lucky_break_score(p_streak integer)
returns integer
language sql
immutable
as $$
  select coalesce(sum(
    case
      when n >= 30 then 500
      when n >= 20 then 300
      when n >= 10 then 200
      when n >= 5 then 150
      else 100
    end
  ),0)::integer
  from generate_series(1, greatest(p_streak,0)) as n;
$$;

create or replace view daily_best_initials as
select distinct on (run_date, initials)
  run_date,
  initials,
  id as run_id,
  streak,
  score,
  completed_at
from game_runs
order by run_date, initials, streak desc, score desc, completed_at asc;

create or replace view daily_top5 as
select run_date, initials, streak, score, completed_at
from daily_best_initials
where run_date = (now() at time zone 'utc')::date
order by streak desc, score desc, completed_at asc
limit 5;

alter table game_runs enable row level security;

drop policy if exists "Public leaderboard read" on game_runs;
create policy "Public leaderboard read"
on game_runs for select
to anon, authenticated
using (true);

revoke insert, update, delete on game_runs from anon, authenticated;

create or replace function submit_score(p_initials text, p_streak integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_initials !~ '^[A-Z0-9]{3}$' then
    raise exception 'Invalid initials';
  end if;
  if p_streak < 0 or p_streak > 500 then
    raise exception 'Invalid streak';
  end if;

  insert into game_runs(initials, streak, score, completed_at)
  values (p_initials, p_streak, lucky_break_score(p_streak), now());
end;
$$;

revoke all on function submit_score(text, integer) from public;
grant execute on function submit_score(text, integer) to anon, authenticated;

grant select on daily_top5 to anon, authenticated;
grant select on daily_best_initials to anon, authenticated;
