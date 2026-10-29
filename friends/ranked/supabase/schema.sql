-- Rank Riot. All tables locked by RLS and privileges; only the private Edge Function reads them.
create table if not exists public.rankriot_config (key text primary key, value text not null);
create table if not exists public.rankriot_questions (game text not null check (game in ('alex','doron')), question_index int not null check (question_index between 0 and 24), prompt text not null, primary key(game,question_index));
create table if not exists public.rankriot_answers (game text not null check (game in ('alex','doron')), question_index int not null check (question_index between 0 and 24), author text not null, answer text not null, primary key(game,question_index,author), foreign key(game,question_index) references public.rankriot_questions(game,question_index));
create table if not exists public.rankriot_rooms (pin char(6) primary key, state jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists rankriot_rooms_modified_idx on public.rankriot_rooms(updated_at);
alter table public.rankriot_config enable row level security;
alter table public.rankriot_questions enable row level security;
alter table public.rankriot_answers enable row level security;
alter table public.rankriot_rooms enable row level security;
revoke all on public.rankriot_config,public.rankriot_questions,public.rankriot_answers,public.rankriot_rooms from public,anon,authenticated;

-- Completed matches are saved separately from the live-room state.
-- Archives contain player display names and round tallies, never join credentials.
create table if not exists public.rankriot_results (
  pin char(6) primary key,
  mode text not null check (mode in ('alex','doron','both')),
  created_at timestamptz not null,
  finished_at timestamptz not null,
  seconds_per_question integer not null,
  players jsonb not null default '[]'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  by_game jsonb not null default '{}'::jsonb,
  rounds jsonb not null default '[]'::jsonb,
  archived_at timestamptz not null default now(),
  constraint rankriot_results_players_array check (jsonb_typeof(players)='array'),
  constraint rankriot_results_rounds_array check (jsonb_typeof(rounds)='array')
);
create index if not exists rankriot_results_finished_at_idx on public.rankriot_results(finished_at desc);
alter table public.rankriot_results enable row level security;
revoke all on public.rankriot_results from public, anon, authenticated;

-- Recover any finished games stored before the archive feature was introduced.
-- Earlier games retain their final scores but cannot recover old individual rounds.
insert into public.rankriot_results (pin,mode,created_at,finished_at,seconds_per_question,players,scores,by_game,rounds)
select r.pin,
       r.state->>'mode',
       r.created_at,
       to_timestamp((r.state->>'finishedAt')::numeric/1000),
       (r.state->>'seconds')::integer,
       coalesce((select jsonb_agg(player->>'name' order by player->>'joined')
                 from jsonb_array_elements(coalesce(r.state->'players','[]'::jsonb)) player),'[]'::jsonb),
       coalesce(r.state->'scores','{}'::jsonb),
       coalesce(r.state->'byGame','{}'::jsonb),
       '[]'::jsonb
from public.rankriot_rooms r
where r.state->>'stage'='finished'
  and coalesce(r.state->>'finishedAt','0') ~ '^[0-9]+$'
  and (r.state->>'finishedAt')::numeric > 0
on conflict(pin) do nothing;
