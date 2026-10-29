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