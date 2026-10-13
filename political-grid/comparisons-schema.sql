-- Opt-in, named comparison profiles. Existing entries remain PRIVATE.
alter table public.political_grid_responses
  add column if not exists public_visible boolean not null default false;
create index if not exists political_grid_public_visible_recent_idx
  on public.political_grid_responses (updated_at desc, id desc)
  where public_visible;

-- Replace the public submission endpoint with backward-compatible optional flag.
drop function if exists public.political_grid_submit(text, uuid, integer[]);

create function public.political_grid_submit(
  p_name text,
  p_token uuid,
  p_picks integer[],
  p_visible boolean default false
) returns jsonb
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
  insert into public.political_grid_responses (edit_token, participant_name, picks, public_visible)
  values (p_token, v_name, v_picks, coalesce(p_visible, false))
  on conflict (edit_token) do update
    set participant_name = excluded.participant_name,
        picks = excluded.picks,
        public_visible = excluded.public_visible,
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
  select jsonb_build_object(
    'name', participant_name,
    'picks', picks,
    'public_visible', public_visible,
    'updated_at', updated_at
  )
  from public.political_grid_responses
  where edit_token = p_token
  limit 1;
$$;

-- Only responses that explicitly opted in are individually visible.
-- No edit tokens or raw database IDs are released.
-- Limit is fixed for payload size and transparent sampling.
create or replace function public.political_grid_visible()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with recent as (
    select md5(edit_token::text) as public_id,
           participant_name,
           picks,
           updated_at, id
    from public.political_grid_responses
    where public_visible = true
    order by updated_at desc, id desc
    limit 200
  )
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'id', public_id,
      'name', participant_name,
      'picks', picks
    ) order by updated_at desc, id desc),
    '[]'::jsonb
  )
  from recent;
$$;

revoke all on function public.political_grid_submit(text, uuid, integer[], boolean)
  from public, anon, authenticated;
revoke all on function public.political_grid_load(uuid)
  from public, anon, authenticated;
revoke all on function public.political_grid_visible()
  from public, anon, authenticated;
grant execute on function public.political_grid_submit(text, uuid, integer[], boolean)
  to anon, authenticated;
grant execute on function public.political_grid_load(uuid)
  to anon, authenticated;
grant execute on function public.political_grid_visible()
  to anon, authenticated;
comment on column public.political_grid_responses.public_visible is
  'Explicit, reversible opt-in to public nickname and statement selections in comparison views; false for all existing entries.';
