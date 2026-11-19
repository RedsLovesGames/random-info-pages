begin;
create schema if not exists word_hitlist_private;
revoke all on schema word_hitlist_private from public, anon, authenticated;
grant usage on schema word_hitlist_private to service_role;

create table if not exists word_hitlist_private.racks (
  id integer primary key,
  letters text not null,
  goals jsonb not null,
  allowed jsonb not null
);
create table if not exists word_hitlist_private.rooms (
  code text primary key,
  create_key uuid not null unique,
  host uuid not null,
  players jsonb not null,
  round_no integer not null default 0,
  round_total integer not null,
  round_seconds integer not null,
  deck integer[] not null default '{}',
  starts_at timestamptz,
  ends_at timestamptz,
  expires_at timestamptz not null default now() + interval '6 hours'
);
alter table word_hitlist_private.racks enable row level security;
alter table word_hitlist_private.rooms enable row level security;
revoke all on all tables in schema word_hitlist_private from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema word_hitlist_private to service_role;

create or replace function public.word_hitlist(p_action text, p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  r word_hitlist_private.rooms%rowtype;
  card word_hitlist_private.racks%rowtype;
  ts timestamptz;
  code_value text := upper(trim(coalesce(p_payload->>'code', '')));
  name_value text := trim(coalesce(p_payload->>'name', ''));
  word_value text := upper(trim(coalesce(p_payload->>'word', '')));
  goal_value text := coalesce(p_payload->>'goal', '');
  token_value uuid;
  seat uuid;
  position integer;
  rounds integer;
  seconds integer;
  phase text;
  points constant integer := 100;
  players_view jsonb;
  goals_view jsonb := '[]';
  own_answers jsonb := '{}';
  round_key text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if p_action not in ('create','join','state','start','next','rematch','submit','leave') then
    return jsonb_build_object('error','Unknown game action.');
  end if;
  if coalesce(p_payload->>'token','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return jsonb_build_object('error','This player session is invalid.', 'code','session');
  end if;
  token_value := (p_payload->>'token')::uuid;
  if p_action in ('create','join') and (char_length(name_value) not between 1 and 20 or name_value ~ '[[:cntrl:]]') then
    return jsonb_build_object('error','Use a nickname between 1 and 20 characters.');
  end if;

  if p_action = 'create' then
    rounds := case p_payload->>'rounds' when '3' then 3 when '7' then 7 else 5 end;
    seconds := case p_payload->>'seconds' when '45' then 45 when '90' then 90 else 60 end;
    select * into r from word_hitlist_private.rooms x where x.create_key = token_value and x.expires_at > now();
    if not found then
      delete from word_hitlist_private.rooms x where x.expires_at <= now();
      seat := gen_random_uuid();
      for attempt in 1..8 loop
        select string_agg(substr(alphabet, 1+floor(random()*length(alphabet))::int, 1), '')
          into code_value from generate_series(1,6);
        insert into word_hitlist_private.rooms as x (code, create_key, host, players, round_total, round_seconds)
        values (code_value, token_value, seat, jsonb_build_array(jsonb_build_object(
          'id',seat,'token',token_value,'name',name_value,'score',0,'answers','{}'::jsonb,'left',false)), rounds, seconds)
        on conflict do nothing returning * into r;
        exit when found;
        select * into r from word_hitlist_private.rooms x where x.create_key = token_value and x.expires_at > now();
        exit when found;
      end loop;
      if r.code is null then return jsonb_build_object('error','Room creation is busy. Try again.'); end if;
    end if;
  else
    if code_value !~ '^[A-HJ-NP-Z2-9]{6}$' then
      return jsonb_build_object('error','Enter the six-character room code.');
    end if;
    if p_action = 'state' then
      select * into r from word_hitlist_private.rooms x where x.code = code_value and x.expires_at > now();
    else
      select * into r from word_hitlist_private.rooms x where x.code = code_value and x.expires_at > now() for update;
    end if;
    if not found then return jsonb_build_object('error','That room has closed or does not exist.', 'code','room'); end if;
  end if;

  select (ordinality - 1)::integer, (player->>'id')::uuid into position, seat
    from jsonb_array_elements(r.players) with ordinality as x(player, ordinality)
    where player->>'token' = token_value::text and not (player->>'left')::boolean;

  if position is null and p_action = 'join' then
    if r.round_no > 0 then return jsonb_build_object('error','A game is already in progress in that room.'); end if;
    if jsonb_array_length(r.players) >= 12 then return jsonb_build_object('error','That room already has 12 players.'); end if;
    if exists (select 1 from jsonb_array_elements(r.players) player where lower(player->>'name') = lower(name_value)) then
      return jsonb_build_object('error','That nickname is already in the room.');
    end if;
    seat := gen_random_uuid();
    position := jsonb_array_length(r.players);
    r.players := r.players || jsonb_build_array(jsonb_build_object(
      'id',seat,'token',token_value,'name',name_value,'score',0,'answers','{}'::jsonb,'left',false));
  elsif position is null then
    return jsonb_build_object('error','Your seat is no longer in this room.', 'code','session');
  end if;

  ts := clock_timestamp();
  if p_action in ('start','next','rematch') and seat <> r.host then
    return jsonb_build_object('error','Only the host can do that.');
  end if;

  if p_action = 'start' or p_action = 'rematch' then
    if not ((p_action = 'start' and r.round_no = 0) or
            (p_action = 'rematch' and r.round_no = r.round_total and ts >= r.ends_at)) then
      return jsonb_build_object('error','You can start a game from the lobby or after the final round.');
    end if;
    if (select count(*) from jsonb_array_elements(r.players) x where not (x->>'left')::boolean) < 2 then
      return jsonb_build_object('error','At least two players need to be in the room.');
    end if;
    select array_agg(id order by ordering) into r.deck
      from (select id, random() as ordering from word_hitlist_private.racks order by ordering limit r.round_total) x;
    if coalesce(cardinality(r.deck),0) < r.round_total then return jsonb_build_object('error','The game deck is unavailable.'); end if;
    select jsonb_agg(x.player || '{"score":0,"answers":{}}'::jsonb order by x.ordinality) into r.players
      from jsonb_array_elements(r.players) with ordinality x(player, ordinality) where not (x.player->>'left')::boolean;
    r.round_no := 1;
  elsif p_action = 'next' then
    if r.round_no = 0 or r.round_no >= r.round_total or ts < r.ends_at then
      return jsonb_build_object('error','The next round is not ready.');
    end if;
    r.round_no := r.round_no + 1;
  elsif p_action = 'leave' then
    if r.round_no = 0 then r.players := r.players - position;
    else r.players := jsonb_set(r.players, array[position::text,'left'], 'true'::jsonb);
    end if;
    if r.host = seat then
      select (x->>'id')::uuid into r.host from jsonb_array_elements(r.players) x where not (x->>'left')::boolean limit 1;
    end if;
    if r.host is null then delete from word_hitlist_private.rooms x where x.code = r.code;
    else update word_hitlist_private.rooms x set players = r.players, host = r.host where x.code = r.code;
    end if;
    return jsonb_build_object('ok',true);
  end if;

  if p_action in ('start','next','rematch') then
    r.starts_at := ts + interval '3 seconds';
    r.ends_at := r.starts_at + make_interval(secs => r.round_seconds);
  end if;

  round_key := r.round_no::text;
  if r.round_no > 0 then
    select * into card from word_hitlist_private.racks x where x.id = r.deck[r.round_no];
  end if;
  if p_action = 'submit' then
    if r.round_no = 0 or ts < r.starts_at or ts >= r.ends_at or p_payload->>'round' is distinct from round_key then
      return jsonb_build_object('error','That round is not accepting words.');
    end if;
    if word_value !~ '^[A-Z]{3,15}$' or goal_value = '' or not (card.allowed ? goal_value) then
      return jsonb_build_object('error','Pick a goal and enter a word using the rack letters.');
    end if;
    own_answers := coalesce(r.players->position->'answers'->round_key, '{}');
    if own_answers->>goal_value = word_value then p_action := 'state';
    elsif own_answers ? goal_value then return jsonb_build_object('error','You already cleared that goal.');
    elsif exists (select 1 from jsonb_each_text(own_answers) x where x.value = word_value) then
      return jsonb_build_object('error','Use a different word for each goal.');
    elsif not (card.allowed->goal_value ? word_value) then
      return jsonb_build_object('error','That word does not match this goal with these letters.');
    else
      r.players := jsonb_set(r.players, array[position::text,'answers',round_key],
        own_answers || jsonb_build_object(goal_value,word_value));
      r.players := jsonb_set(r.players, array[position::text,'score'], to_jsonb((r.players->position->>'score')::int + points));
    end if;
  end if;

  if p_action not in ('create','state') then
    update word_hitlist_private.rooms x set players = r.players, round_no = r.round_no, deck = r.deck,
      starts_at = r.starts_at, ends_at = r.ends_at, expires_at = ts + interval '6 hours' where x.code = r.code;
  end if;
  phase := case when r.round_no = 0 then 'lobby' when ts < r.starts_at then 'countdown'
    when ts < r.ends_at then 'playing' when r.round_no = r.round_total then 'finished' else 'review' end;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',x->>'id','name',x->>'name','score',(x->>'score')::integer,'left',(x->>'left')::boolean,
    'progress',(select count(*) from jsonb_object_keys(coalesce(x->'answers'->round_key, '{}'))),
    'answers',case when phase in ('review','finished') then coalesce(x->'answers'->round_key, '{}') else null end
  ) order by (x->>'score')::integer desc, lower(x->>'name')), '[]') into players_view from jsonb_array_elements(r.players) x;
  if phase in ('playing','review','finished') then
    select jsonb_agg(case when phase = 'playing' then goal - 'example' else goal end order by ordinality)
      into goals_view from jsonb_array_elements(card.goals) with ordinality x(goal,ordinality);
  end if;
  select coalesce(x->'answers'->round_key,'{}') into own_answers from jsonb_array_elements(r.players) x where x->>'id' = seat::text;
  return jsonb_build_object('room',r.code,'you',seat,'host',r.host,'phase',phase,'round',r.round_no,
    'rounds',r.round_total,'seconds',r.round_seconds,'serverTime',ts,'startsAt',r.starts_at,'endsAt',r.ends_at,
    'players',players_view,'letters',case when phase in ('playing','review','finished') then card.letters else '' end,
    'goals',goals_view,'myAnswers',own_answers);
end;
$$;
revoke all on function public.word_hitlist(text,jsonb) from public, anon, authenticated;
grant execute on function public.word_hitlist(text,jsonb) to service_role;
commit;
