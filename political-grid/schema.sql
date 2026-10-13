-- Political Grid: anonymous public aggregate, private participant records.
-- Names and tokens are never exposed through public reads.
create table if not exists public.political_grid_responses (
  id bigint generated always as identity primary key,
  edit_token uuid not null unique,
  participant_name text not null check (char_length(participant_name) between 2 and 40),
  picks integer[] not null default '{}'::integer[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists political_grid_responses_updated_at_idx
  on public.political_grid_responses(updated_at desc);
alter table public.political_grid_responses enable row level security;
revoke all on public.political_grid_responses from public, anon, authenticated;
-- Deliberately no RLS policies. Access is restricted to the three input-validated RPCs.

create or replace function public.political_grid_submit(p_name text, p_token uuid, p_picks integer[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_picks integer[] := coalesce(p_picks, '{}'::integer[]);
begin
  if p_token is null then
    raise exception 'Missing participant token' using errcode = '22023';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 40
     or v_name ~ '[[:cntrl:]]' then
    raise exception 'Enter a name between 2 and 40 characters' using errcode = '22023';
  end if;
  if cardinality(v_picks) > 100
     or exists (select 1 from unnest(v_picks) item
                where item is null or item < 0 or item > 99)
     or (select count(distinct item) from unnest(v_picks) item)
        <> cardinality(v_picks) then
    raise exception 'Invalid statement selections' using errcode = '22023';
  end if;
  insert into public.political_grid_responses (edit_token, participant_name, picks)
  values (p_token, v_name, v_picks)
  on conflict (edit_token) do update
    set participant_name = excluded.participant_name,
        picks = excluded.picks,
        updated_at = now();
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.political_grid_load(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('name', participant_name, 'picks', picks, 'updated_at', updated_at)
  from public.political_grid_responses
  where edit_token = p_token
  limit 1;
$$;

create or replace function public.political_grid_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with totals as (
    select count(*)::integer as respondents,
           coalesce(sum(cardinality(picks)), 0)::integer as total_selections,
           max(updated_at) as last_submission
    from public.political_grid_responses
  ), selections as (
    select selected.item_id, count(*)::integer as selected_count
    from public.political_grid_responses r
    cross join lateral unnest(r.picks) as selected(item_id)
    group by selected.item_id
  ), counts as (
    select jsonb_agg(coalesce(s.selected_count, 0) order by n.item_id) as per_statement
    from generate_series(0, 99) as n(item_id)
    left join selections s on s.item_id = n.item_id
  )
  select jsonb_build_object(
    'respondents', t.respondents,
    'total_selections', t.total_selections,
    'counts', c.per_statement,
    'last_submission', t.last_submission
  )
  from totals t cross join counts c;
$$;

revoke all on function public.political_grid_submit(text, uuid, integer[]) from public, anon, authenticated;
revoke all on function public.political_grid_load(uuid) from public, anon, authenticated;
revoke all on function public.political_grid_stats() from public, anon, authenticated;
grant execute on function public.political_grid_submit(text, uuid, integer[]) to anon, authenticated;
grant execute on function public.political_grid_load(uuid) to anon, authenticated;
grant execute on function public.political_grid_stats() to anon, authenticated;
comment on table public.political_grid_responses is 'Private name-tagged political statement checklist submissions; public access limited to validated RPC functions.';
