/** Rank Riot: Supabase multiplayer Edge Function. No secret keys are sent to browsers.
 * Runtime: Deno + pinned postgres.js over Supabase's managed DB URL.
 */
import postgres from 'npm:postgres@3.4.5';
const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, {prepare:false,max:2,idle_timeout:8,connect_timeout:8});
const MEMBERS = ['Tommy','Mike','Jack','Ethan','Rita','Nora','Alex','Doron'];
const CORS = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type','Cache-Control':'no-store'};
const respond=(data:unknown,status=200)=>new Response(JSON.stringify({ok:status<400,...(status<400?{data}:{error:String(data)})}),{status,headers:{...CORS,'Content-Type':'application/json; charset=utf-8'}});
const fail=(message:string):never=>{throw new Error(message)};
const requireTrue=(ok:unknown,message:string):void=>{if(!ok)fail(message)};
const clean=(v:unknown)=>String(v??'').trim();
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(24))).map(n=>n.toString(16).padStart(2,'0')).join('');
async function hash(s:string){const bytes=new TextEncoder().encode(s),result=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(result)).map(n=>n.toString(16).padStart(2,'0')).join('');}
function scoreboard(scores:Record<string,any>){return Object.entries(scores).map(([name,v])=>({name,...v,average:v.rounds?v.sum/v.rounds:0})).sort((a,b)=>b.sum-a.sum||b.first-a.first||b.average-a.average||a.name.localeCompare(b.name));}
function zero(){return Object.fromEntries(MEMBERS.map(n=>[n,{sum:0,rounds:0,first:0,second:0,third:0}]));}
function sequence(s:any){return s.mode==='both'?(s.questionIndex<25?{game:'alex',index:s.questionIndex}:{game:'doron',index:s.questionIndex-25}):{game:s.mode,index:s.questionIndex};}
async function authorize(tx:any,provided:unknown){requireTrue(typeof provided==='string'&&provided.length>=8,'Host access key required.');const found=await tx`select value from rankriot_config where key='host_sha256'`;requireTrue(found.length>0&&found[0].value===await hash(provided),'Invalid host access key.');}
async function source(tx:any,game:string,index:number){return await tx`select author, answer from rankriot_answers where game=${game} and question_index=${index} and length(trim(answer))>0 order by author`;}
async function questions(tx:any,game:string){return await tx`select question_index,prompt from rankriot_questions where game=${game} order by question_index`;}
async function setup(tx:any,host:unknown){await authorize(tx,host);const all=await tx`select game,question_index, count(*)::int as total from rankriot_answers where length(trim(answer))>0 group by game,question_index`;
const games:any={};for(const g of ['alex','doron']){const rows=all.filter((r:any)=>r.game===g);const authors=await tx`select distinct author from rankriot_answers where game=${g} order by author`;games[g]={tab:'Imported Google Forms responses',responses:authors.map((a:any,i:number)=>({row:i+2,identifier:a.author,suggestedName:a.author,filled:rows.filter((r:any)=>r.total>0).length})),mapping:{},perQuestion:Array.from({length:25},(_,i)=>rows.find((r:any)=>r.question_index===i)?.total||0),authors:authors.map((a:any)=>a.author)}}return {people:MEMBERS,games,source:'Preloaded form responses in Supabase; updates can be imported from original Excel/Sheets.'};}
async function settle(tx:any,s:any){if(s.stage!=='question')return;const tally:any=Object.fromEntries(s.options.map((o:any)=>[o.id,{sum:0,first:0,second:0,third:0}]));const seq=sequence(s);for(const [name,vote] of Object.entries(s.votes) as [string,string[]][]){if(!s.players.some((p:any)=>p.name===name))continue;for(let i=0;i<vote.length;i++){const o=s.options.find((o:any)=>o.id===vote[i]);if(!o||o.author===name)continue;const inc=3-i,field=['first','second','third'][i];tally[o.id].sum+=inc;tally[o.id][field]++;s.scores[o.author].sum+=inc;s.scores[o.author][field]++;s.byGame[seq.game][o.author].sum+=inc;s.byGame[seq.game][o.author][field]++;}}
for(const o of s.options){s.scores[o.author].rounds++;s.byGame[seq.game][o.author].rounds++;}
const prompts=s.questionText?[]:await tx`select prompt from rankriot_questions where game=${seq.game} and question_index=${seq.index}`;
const ranked=s.options.map((o:any)=>({author:o.author,answer:o.text,...tally[o.id]}))
  .sort((a:any,b:any)=>b.sum-a.sum||b.first-a.first||b.second-a.second||b.third-a.third||a.author.localeCompare(b.author));
ranked.forEach((a:any,i:number)=>{
  const previous=ranked[i-1];
  a.rank=previous&&a.sum===previous.sum&&a.first===previous.first&&a.second===previous.second&&a.third===previous.third?previous.rank:i+1;
});
const round={status:'scored',game:seq.game,questionIndex:seq.index,number:seq.index+1,question:s.questionText||prompts[0]?.prompt||'',completedAt:new Date().toISOString(),votes:Object.keys(s.votes).length,results:ranked};
if(!Array.isArray(s.history))s.history=[];s.history.push(round);
s.round={totals:tally,received:Object.keys(s.votes).length};s.stage='reveal';}

async function archiveFinished(tx:any,s:any){
  if(s.stage!=='finished')return;
  const room=await tx`select created_at from rankriot_rooms where pin=${s.pin}`;
  requireTrue(room.length,'Cannot archive a missing room.');
  const playerNames=s.players.map((p:any)=>p.name);
  await tx`insert into rankriot_results(pin,mode,created_at,finished_at,seconds_per_question,players,scores,by_game,rounds)
  values (${s.pin},${s.mode},${room[0].created_at},${new Date(s.finishedAt).toISOString()},${s.seconds},${tx.json(playerNames)},${tx.json(s.scores)},${tx.json(s.byGame)},${tx.json(Array.isArray(s.history)?s.history:[])})
  on conflict(pin) do nothing`;
}
function savedGameSummary(row:any){const leaderboard=scoreboard(row.scores);return {pin:clean(row.pin),mode:row.mode,createdAt:row.created_at,finishedAt:row.finished_at,playerCount:row.players.length,winner:leaderboard[0]||null,leaderboard,roundsRecorded:row.rounds_recorded};}
async function next(tx:any,s:any){s.questionIndex++;if(s.questionIndex>=(s.mode==='both'?50:25)){s.stage='finished';s.finishedAt=Date.now();await archiveFinished(tx,s);return;}const seq=sequence(s);const answers=await source(tx,seq.game,seq.index);const prompts=await tx`select prompt from rankriot_questions where game=${seq.game} and question_index=${seq.index}`;s.questionText=prompts[0]?.prompt||'';const options=answers.map((r:any)=>({id:token().slice(0,12),author:r.author,text:r.answer}));for(let i=options.length-1;i>0;i--){const a=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[options[a],options[i]]=[options[i],options[a]];}s.options=options;s.votes={};s.round=null;s.openedAt=0;s.closesAt=0;if(options.length<4){s.stage='skipped';if(!Array.isArray(s.history))s.history=[];s.history.push({status:'skipped',game:seq.game,questionIndex:seq.index,number:seq.index+1,question:s.questionText,completedAt:new Date().toISOString(),votes:0,results:[]});return;}s.stage='question';s.openedAt=Date.now();s.closesAt=s.seconds===0?0:s.openedAt+s.seconds*1000;}
function snapshot(s:any,isHost:boolean,player:any,now:number,questionText:string){const score=scoreboard(s.scores),seq=s.questionIndex>=0?sequence(s):null;const show=s.stage!=='question';const result:any={pin:s.pin,mode:s.mode,stage:s.stage,questionIndex:s.questionIndex,count:s.mode==='both'?50:25,seconds:s.seconds,openedAt:s.openedAt,closesAt:s.closesAt,players:s.players.map((p:any)=>p.name),voteCount:Object.keys(s.votes).length,serverNow:now,viewer:player?.name||null,voted:player?Boolean(s.votes[player.name]):false,picks:player?(s.votes[player.name]||[]):[],leaderboard:score,roster:MEMBERS};
if(seq&&s.stage!=='finished'){result.game=seq.game;result.number=seq.index+1;result.question=questionText;result.options=s.options.map((o:any)=>({id:o.id,text:o.text,...(show?{author:o.author,tally:s.round?.totals[o.id]||{sum:0,first:0,second:0,third:0}}:{}),mine:Boolean(player&&o.author===player.name)}));}
if(s.stage==='finished'){result.byGame={alex:scoreboard(s.byGame.alex),doron:scoreboard(s.byGame.doron)};}return result;}
async function perform(action:string,p:any){if(action==='ping'){const rows=await sql`select (select count(*)::int from rankriot_questions) as questions, (select count(*)::int from rankriot_answers) as answers`;return {connected:true,provider:'Supabase',questions:rows[0].questions,answers:rows[0].answers};}
if(action==='fame'){return sql.begin(async(tx:any)=>{
  await authorize(tx,p.secret);
  const cutoff=await tx`select value from rankriot_config where key='hall_of_fame_since'`;
  const since=cutoff[0]?.value||'1970-01-01T00:00:00Z';
  const games=await tx`select count(*)::int as count from rankriot_results where finished_at>=${since}::timestamptz`;
  const rows=await tx`
    select a.item->>'author' as author,
           a.item->>'answer' as answer,
           r.item->>'game' as game,
           (r.item->>'questionIndex')::int as question_index,
           r.item->>'question' as question,
           count(distinct h.pin)::int as game_count,
           count(*)::int as appearances,
           sum((a.item->>'sum')::int)::int as points,
           sum((a.item->>'first')::int)::int as first_votes,
           sum((a.item->>'second')::int)::int as second_votes,
           sum((a.item->>'third')::int)::int as third_votes,
           min((a.item->>'rank')::int)::int as best_rank,
           max((a.item->>'sum')::int)::int as best_round_points
    from rankriot_results h
    cross join lateral jsonb_array_elements(h.rounds) as r(item)
    cross join lateral jsonb_array_elements(coalesce(r.item->'results','[]'::jsonb)) as a(item)
    where h.finished_at>=${since}::timestamptz and r.item->>'status'='scored'
    group by a.item->>'author',a.item->>'answer',r.item->>'game',r.item->>'questionIndex',r.item->>'question'
    order by points desc,first_votes desc,appearances desc,author asc
    limit 100`;
  return {savedGames:games[0].count,entries:rows};
});}
if(action==='history'){return sql.begin(async(tx:any)=>{
  await authorize(tx,p.secret);
  const limit=p.limit===undefined?20:Number(p.limit),offset=p.offset===undefined?0:Number(p.offset);
  requireTrue(Number.isInteger(limit)&&limit>=1&&limit<=100&&Number.isInteger(offset)&&offset>=0&&offset<=100000,'Invalid history page.');
  const rows=await tx`select pin,mode,created_at,finished_at,players,scores,jsonb_array_length(rounds)::int as rounds_recorded from rankriot_results order by finished_at desc,pin desc limit ${limit+1} offset ${offset}`;
  return {games:rows.slice(0,limit).map(savedGameSummary),hasMore:rows.length>limit,nextOffset:offset+Math.min(rows.length,limit)};
});}
if(action==='result'){return sql.begin(async(tx:any)=>{
  await authorize(tx,p.secret);const requested=clean(p.pin);requireTrue(/^\d{6}$/.test(requested),'Enter a six-digit PIN.');
  const rows=await tx`select pin,mode,created_at,finished_at,seconds_per_question,players,scores,by_game,rounds from rankriot_results where pin=${requested}`;
  requireTrue(rows.length,'Saved game not found.');
  const row=rows[0];
  return {pin:clean(row.pin),mode:row.mode,createdAt:row.created_at,finishedAt:row.finished_at,seconds:row.seconds_per_question,players:row.players,leaderboard:scoreboard(row.scores),byGame:{alex:scoreboard(row.by_game?.alex||{}),doron:scoreboard(row.by_game?.doron||{})},rounds:row.rounds};
});}
if(action==='setup')return sql.begin((tx:any)=>setup(tx,p.secret));
if(action==='create'){return sql.begin(async(tx:any)=>{await authorize(tx,p.secret);const mode=clean(p.game).toLowerCase(),seconds=Number(p.seconds);requireTrue(['alex','doron','both'].includes(mode),'Select Alex, Doron, or both.');requireTrue(Number.isInteger(seconds)&&(seconds===0||(seconds>=15&&seconds<=120)),'Time must be unlimited or between 15 and 120 seconds.');const games=mode==='both'?['alex','doron']:[mode];for(const g of games){const count=await tx`select count(distinct author)::int as c from rankriot_answers where game=${g}`;requireTrue(count[0].c>=4,`${g} needs at least four authors.`);}let pin='';for(let attempts=0;attempts<20;attempts++){pin=String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000);const row=await tx`select pin from rankriot_rooms where pin=${pin}`;if(!row.length)break;pin='';}requireTrue(pin,'Could not allocate a unique PIN.');const s:any={pin,mode,seconds,stage:'lobby',questionIndex:-1,openedAt:0,closesAt:0,players:[],votes:{},options:[],round:null,scores:zero(),byGame:{alex:zero(),doron:zero()},finishedAt:0,history:[],questionText:''};await tx`insert into rankriot_rooms(pin,state) values (${pin},${tx.json(s)})`;return {pin};});}
const pin=clean(p.pin);requireTrue(/^\d{6}$/.test(pin),'Enter a six-digit PIN.');
return sql.begin(async(tx:any)=>{const found=await tx`select state from rankriot_rooms where pin=${pin} for update`;requireTrue(found.length,'Room not found. Check the PIN.');const s=found[0].state;const now=Date.now();let player=null;let modified=false;let result:any;
if(action==='projector-access'){
  await authorize(tx,p.secret);
  const existing=clean(p.viewerKey);
  if(existing.length===48&&s.projectorHash&&await hash(existing)===s.projectorHash){
    result={pin,viewerKey:existing};
  }else{
    const viewerKey=token();s.projectorHash=await hash(viewerKey);modified=true;
    result={pin,viewerKey};
  }
}
else if(action==='join'){const name=clean(p.name),key=clean(p.playerKey);requireTrue(MEMBERS.includes(name),'Select your name.');const prior=s.players.find((a:any)=>a.name===name);if(prior){requireTrue(key&&prior.key===key,'That name is already taken. Return on the original device.');player=prior;}else{requireTrue(s.stage==='lobby','The game has started.');requireTrue(s.players.length<8,'Room is full.');player={name,key:token(),joined:now};s.players.push(player);modified=true;}result={pin,name,playerKey:player.key};}
else if(action==='vote'){requireTrue(s.stage==='question'&&(s.seconds===0||now<s.closesAt),'Voting has closed.');player=s.players.find((a:any)=>a.key===clean(p.playerKey));requireTrue(player,'Join before voting.');const picks=p.picks;requireTrue(Array.isArray(picks)&&picks.length===3&&new Set(picks).size===3,'Choose three different answers.');requireTrue(!s.votes[player.name],'Your vote is already locked.');requireTrue(picks.every((id:any)=>s.options.some((o:any)=>o.id===id&&o.author!==player.name)),'You cannot vote for yourself.');s.votes[player.name]=picks;modified=true;if(s.players.length>0&&Object.keys(s.votes).length===s.players.length)await settle(tx,s);result={ok:true,stage:s.stage};}
else if(action==='advance'){await authorize(tx,p.secret);if(['lobby','leaderboard','skipped'].includes(s.stage))await next(tx,s);else if(s.stage==='question')await settle(tx,s);else if(s.stage==='reveal')s.stage='leaderboard';else fail('This room is already finished.');modified=true;result={stage:s.stage};}
else if(action==='state'||action==='projector-state'){
  const spectator=action==='projector-state';
  const isHost=!spectator&&typeof p.secret==='string'&&p.secret.length>=8&&(await hash(p.secret))===(await tx`select value from rankriot_config where key='host_sha256'`)[0]?.value;
  player=spectator?null:s.players.find((a:any)=>a.key===clean(p.playerKey));
  const viewerKey=clean(p.viewerKey);
  const validSpectator=spectator&&viewerKey.length===48&&Boolean(s.projectorHash)&&await hash(viewerKey)===s.projectorHash;
  requireTrue(spectator?validSpectator:isHost||player,'Join first, or sign in as host.');if(s.stage==='question'&&s.seconds>0&&now>=s.closesAt){await settle(tx,s);modified=true;}let questionText='';if(s.questionIndex>=0&&s.stage!=='finished'){const seq=sequence(s);const prompts=await tx`select prompt from rankriot_questions where game=${seq.game} and question_index=${seq.index}`;questionText=prompts[0]?.prompt||'Missing question';}result=snapshot(s,Boolean(isHost),player,now,questionText);}
else fail('Unsupported action.');
if(modified)await tx`update rankriot_rooms set state=${tx.json(s)},updated_at=now() where pin=${pin}`;return result;});}
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});if(req.method!=='POST')return respond('Use POST',405);try{const p=await req.json();requireTrue(p&&typeof p==='object'&&!Array.isArray(p),'Invalid request.');const action=clean(p.action);requireTrue(['ping','setup','create','join','vote','advance','state','history','result','fame','projector-access','projector-state'].includes(action),'Unsupported action.');return respond(await perform(action,p));}catch(e){const message=e instanceof Error?e.message:String(e);console.error('Rank Riot request error',message);return respond(message,/(invalid|not found|already|cannot|closed|required|choose|select|join|taken|start|host|full|unknown|missing|expired)/i.test(message)?400:500);}});