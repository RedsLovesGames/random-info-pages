-- All saved political-grid participants are included in named comparisons.
-- The legacy visibility field remains to support previously cached clients but
-- is no longer used to gate comparison access.
-- IMPORTANT: GitHub Pages is public. Nicknames and X marks are publicly readable.
alter table public.political_grid_responses
  alter column public_visible set default true;

update public.political_grid_responses
set public_visible = true
where public_visible = false;

create or replace function public.political_grid_submit(
  p_name text, p_token uuid, p_picks integer[], p_visible boolean default false
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

  insert into public.political_grid_responses
    (edit_token, participant_name, picks, public_visible)
  values
    (p_token, v_name, v_picks, true)
  on conflict (edit_token) do update
  set participant_name = excluded.participant_name,
      picks = excluded.picks,
      public_visible = true,
      updated_at = now();

  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.political_grid_load(p_token uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', participant_name,
    'picks', picks,
    'public_visible', true,
    'updated_at', updated_at
  )
  from public.political_grid_responses
  where edit_token = p_token
  limit 1;
$$;

create or replace function public.political_grid_visible()
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  with recent as (
    select md5(edit_token::text) as public_id,
           participant_name, picks, updated_at, id
    from public.political_grid_responses
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

comment on column public.political_grid_responses.public_visible is
  'Legacy compatibility field. Always true; all participants appear in named comparisons.';

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
