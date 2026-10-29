/** Rank Riot - Google Apps Script game server.
 * Deploy as Web app: Execute as me; Who has access: Anyone.
 * Run installRankRiot() once from the Apps Script editor, record passphrase.
 * All sheet data stays private; game data is exposed only to room participants.
 */
const RR_SHEET_ID = '1ZIs8vwnnIAy-rEU8QsGXRBSZ7BoudigjYU9v00-d5iY';
const RR_PEOPLE = ['Tommy', 'Mike', 'Jack', 'Ethan', 'Rita', 'Nora'];
const RR_PROMPTS = [
  "What inanimate object has {name}'s same energy?",
  "What tiny inconvenience would send {name} over the edge?",
  'If {name} had a warning label, what would it say?',
  'What is the most believable fake rumor someone could start about {name}?',
  'If {name} had a Wikipedia page, what would the "Controversies" section say?',
  'If {name} became famous, what would {name} get canceled for?',
  'What would {name} accidentally become internet famous for?',
  'If {name} was arrested, what would everyone assume {name} did?',
  'If {name} got kicked out of a wedding, what did {name} do?',
  'If {name} got banned from one store, which store would it be?',
  'If {name} had a secret second life, what would it be?',
  'If {name} got cursed by a witch, what would the curse be?',
  'What could a cult do that would get {name} to join them?',
  'Which superpower would {name} waste?',
  'If {name} became a ghost, where would {name} haunt?',
  'If {name} disappeared for a week, where would you assume {name} was?',
  'If {name} owned a speakeasy, what would the front be?',
  'Which historical event would {name} somehow make worse if {name} time traveled?',
  'What would {name}\'s "hear me out" crush be?',
  'What is something a person could do that would give {name} the ick?',
  'Which conspiracy theory would {name} accidentally believe?',
  'On a scale of 1 to 10, how likely is {name} to be scammed, and what scam would get {name}?',
  'If {name}\'s life was a movie, what would everyone be screaming at the screen for {name} to do?',
  'Which job would {name} get fired from on the first day?',
  'If {name} was secretly keeping a collection of something in their basement, what would it be?'
];

function rrQuestion_(game, index) { return RR_PROMPTS[index].replace(/\{name\}/g, game === 'alex' ? 'Alex' : 'Doron'); }
function rrKey_(pin) { return 'RANK_ROOM_' + pin; }
function rrProps_() { return PropertiesService.getScriptProperties(); }
function rrToken_() { return Utilities.getUuid().replace(/-/g, ''); }
function rrError_(msg) { throw new Error(msg); }
function rrAssert_(condition, msg) { if (!condition) rrError_(msg); }
function rrClean_(value) { return String(value == null ? '' : value).trim(); }
function rrNorm_(value) { return rrClean_(value).replace(/\s+/g,' ').replace(/[“”]/g, '"').replace(/[’]/g, "'").toLowerCase(); }

function installRankRiot() {
  const props = rrProps_();
  if (!props.getProperty('RANK_HOST_SECRET')) {
    const passphrase = rrToken_().slice(0, 12).toUpperCase();
    props.setProperty('RANK_HOST_SECRET', passphrase);
    console.log('Rank Riot host passphrase: ' + passphrase);
  } else {
    console.log('Host passphrase already installed. To reset, remove RANK_HOST_SECRET in Script Properties, then rerun.');
  }
  console.log('Connected spreadsheet: https://docs.google.com/spreadsheets/d/' + RR_SHEET_ID + '/edit');
}
function rrRequireAdmin_(secret) {
  const expected = rrProps_().getProperty('RANK_HOST_SECRET');
  rrAssert_(expected && rrClean_(secret) === expected, 'Invalid host passphrase. Run installRankRiot in Apps Script first.');
}
function rrSheetData_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('rank_source_v3');
  if (cached) return JSON.parse(cached);
  const book = SpreadsheetApp.openById(RR_SHEET_ID);
  const sheets = book.getSheets();
  const output = {alex:{rows:[], tab:null}, doron:{rows:[], tab:null}};
  for (const sh of sheets) {
    if (sh.getLastRow() < 2) continue;
    const values = sh.getDataRange().getDisplayValues();
    const head = values[0].map(rrNorm_);
    for (const game of ['alex','doron']) {
      const cols = RR_PROMPTS.map((_,i) => head.indexOf(rrNorm_(rrQuestion_(game,i))));
      const found = cols.filter(i => i !== -1).length;
      // Detect response tabs by their actual question headers, never by assumed tab names.
      if (found < 20 || (output[game].tab && output[game].rows.length >= values.length - 1)) continue;
      const nameCol = head.findIndex(h => h === 'name' || h === 'your name' || h === 'participant name');
      const emailCol = head.findIndex(h => h === 'email address' || h === 'email');
      const tsCol = head.findIndex(h => h === 'timestamp');
      output[game] = {tab:sh.getName(), rows:values.slice(1).map((cells,i) => ({
        row:i+2,
        identifier:rrClean_(nameCol >= 0 ? cells[nameCol] : '') || rrClean_(emailCol >= 0 ? cells[emailCol] : '') || rrClean_(tsCol >= 0 ? cells[tsCol] : '') || ('Response row '+(i+2)),
        suggestedName:RR_PEOPLE.find(n => rrNorm_(n) === rrNorm_(nameCol >= 0 ? cells[nameCol] : '')) || '',
        answers:cols.map(index => index < 0 ? '' : rrClean_(cells[index]))
      })).filter(r => r.answers.some(Boolean))};
    }
  }
  // Google Apps Script cache has a 100 KB/item cap. A miss simply re-reads Sheets.
  const serial = JSON.stringify(output);
  if (serial.length < 95000) cache.put('rank_source_v3', serial, 15);
  return output;
}
function rrMappings_() {
  const props = rrProps_();
  return {
    alex:JSON.parse(props.getProperty('RANK_MAP_ALEX') || '{}'),
    doron:JSON.parse(props.getProperty('RANK_MAP_DORON') || '{}')
  };
}
function rrMapped_(data, game, maps) {
  const out = {};
  const assigned = maps[game] || {};
  for (const row of data[game].rows) {
    const name = assigned[row.row] || row.suggestedName;
    if (RR_PEOPLE.includes(name) && !out[name]) out[name] = row;
  }
  return out;
}
function rrAvailable_(data, game, maps) {
  const rows = rrMapped_(data, game, maps);
  return RR_PROMPTS.map((_,i)=>RR_PEOPLE.filter(name=>rows[name] && rows[name].answers[i]).length);
}
function rrSetup_(params) {
  rrRequireAdmin_(params.secret);
  const data = rrSheetData_(), maps = rrMappings_();
  return {people:RR_PEOPLE, spreadsheet:'https://docs.google.com/spreadsheets/d/'+RR_SHEET_ID+'/edit', games:Object.fromEntries(['alex','doron'].map(g=>[g,{
    tab:data[g].tab, responses:data[g].rows.map(r=>({row:r.row, identifier:r.identifier, suggestedName:r.suggestedName, filled:r.answers.filter(Boolean).length})),
    mapping:maps[g], perQuestion:rrAvailable_(data,g,maps)
  }]))};
}
function rrSaveMap_(params) {
  rrRequireAdmin_(params.secret);
  const game = rrClean_(params.game).toLowerCase();
  rrAssert_(['alex','doron'].includes(game), 'Unknown form.');
  const data = rrSheetData_();
  const validRows = new Set(data[game].rows.map(r=>String(r.row)));
  const mapping = {};
  for (const entry of params.assignments || []) {
    const row = String(entry.row), name = rrClean_(entry.name);
    if (name) { rrAssert_(validRows.has(row) && RR_PEOPLE.includes(name),'Invalid author assignment.'); mapping[row] = name; }
  }
  const names = Object.values(mapping);
  rrAssert_(names.length === new Set(names).size, 'Each author can own only one response row per form.');
  rrProps_().setProperty('RANK_MAP_'+game.toUpperCase(),JSON.stringify(mapping));
  return rrSetup_(params);
}
function rrGetRoom_(pin) {
  rrAssert_(/^\d{6}$/.test(String(pin)), 'Enter a six-digit room PIN.');
  const s = rrProps_().getProperty(rrKey_(pin));
  rrAssert_(s, 'Room not found. Check the PIN.');
  return JSON.parse(s);
}
function rrStoreRoom_(room) {
  const serial = JSON.stringify(room);
  rrAssert_(serial.length <= 8800, 'Room state is too large. Start a fresh room.');
  rrProps_().setProperty(rrKey_(room.pin), serial);
}
function rrWithLock_(handler) {
  const lock = LockService.getScriptLock();
  lock.waitLock(18000);
  try { return handler(); } finally { lock.releaseLock(); }
}
function rrNewScores_() { return Object.fromEntries(RR_PEOPLE.map(name=>[name,{sum:0,rounds:0,first:0,second:0,third:0}])); }
function rrScoreBoard_(scores) {
  return RR_PEOPLE.map(name=>({name,...scores[name],average:scores[name].rounds?scores[name].sum/scores[name].rounds:0}))
    .sort((a,b)=>b.average-a.average || b.first-a.first || b.sum-a.sum || a.name.localeCompare(b.name));
}
function rrGames_(mode) { return mode==='both'?['alex','doron']: [mode]; }
function rrCreate_(params) {
  rrRequireAdmin_(params.secret);
  const mode = rrClean_(params.game).toLowerCase();
  rrAssert_(['alex','doron','both'].includes(mode), 'Choose Alex, Doron or both.');
  const seconds = Number(params.seconds);
  rrAssert_(Number.isInteger(seconds) && seconds >= 15 && seconds <= 120, 'Choose 15 to 120 seconds per question.');
  const data = rrSheetData_(), maps = rrMappings_();
  for (const game of rrGames_(mode)) {
    rrAssert_(data[game].tab, game.toUpperCase() + ' form response tab was not found in the connected spreadsheet.');
    rrAssert_(Object.keys(rrMapped_(data,game,maps)).length >= 4, 'Assign at least four distinct authors to '+game+' responses before playing.');
  }
  return rrWithLock_(()=>{
    let pin; do { pin=String(Math.floor(100000+Math.random()*900000)); } while(rrProps_().getProperty(rrKey_(pin)));
    const room={pin, mode, seconds, stage:'lobby', questionIndex:-1, openedAt:0, closesAt:0,
      players:[], votes:{}, options:[], round:null, scores:rrNewScores_(), byGame:{alex:rrNewScores_(),doron:rrNewScores_()}, finishedAt:0};
    rrStoreRoom_(room);
    return {pin};
  });
}
function rrJoin_(params) {
  const pin=String(params.pin), name=rrClean_(params.name);
  rrAssert_(RR_PEOPLE.includes(name),'Choose one of the six submitted-answer authors.');
  return rrWithLock_(()=>{
    const room=rrGetRoom_(pin);
    rrAssert_(room.stage !== 'finished', 'This game has ended.');
    const prev=room.players.find(p=>p.name===name);
    const provided=rrClean_(params.playerKey);
    if(prev) { rrAssert_(provided && provided===prev.key, 'That name is already taken in this room.'); return {pin,playerKey:prev.key,name}; }
    rrAssert_(room.stage==='lobby', 'The game has started, so new players cannot join.');
    const player={name,key:rrToken_(),joined:Date.now()}; room.players.push(player);
    rrStoreRoom_(room);
    return {pin,playerKey:player.key,name};
  });
}
function rrRoundSequence_(room) {
  if (room.mode==='both') return room.questionIndex<25 ? {game:'alex',i:room.questionIndex}:{game:'doron',i:room.questionIndex-25};
  return {game:room.mode,i:room.questionIndex};
}
function rrSettle_(room) {
  if(room.stage!=='question') return;
  const seq=rrRoundSequence_(room);
  const totals=Object.fromEntries(room.options.map(o=>[o.id,{sum:0,first:0,second:0,third:0}]));
  for (const [name, vote] of Object.entries(room.votes)) {
    if (!room.players.some(p=>p.name===name)) continue;
    for (let i=0;i<vote.length;i++) {
      const option=room.options.find(o=>o.id===vote[i]);
      if(!option || option.author===name) continue;
      const inc=3-i, tally=totals[option.id];
      tally.sum+=inc; tally[['first','second','third'][i]]++;
      room.scores[option.author].sum+=inc;
      room.scores[option.author][['first','second','third'][i]]++;
      room.byGame[seq.game][option.author].sum+=inc;
      room.byGame[seq.game][option.author][['first','second','third'][i]]++;
    }
  }
  for(const option of room.options) {
    room.scores[option.author].rounds++;
    room.byGame[seq.game][option.author].rounds++;
  }
  room.round={totals,received:Object.keys(room.votes).length};
  room.stage='reveal';
}
function rrStartNext_(room) {
  room.questionIndex++;
  const limit=room.mode==='both'?50:25;
  if(room.questionIndex>=limit) { room.stage='finished';room.finishedAt=Date.now();return; }
  const seq=rrRoundSequence_(room), source=rrSheetData_(), assigned=rrMapped_(source,seq.game,rrMappings_());
  const options=RR_PEOPLE.filter(n=>assigned[n] && assigned[n].answers[seq.i]).map(author=>({id:rrToken_().slice(0,10),author}));
  for(let i=options.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
  room.options=options; room.votes={};room.round=null;
  if(options.length<4){room.stage='skipped';room.openedAt=0;room.closesAt=0;return;}
  room.stage='question';room.openedAt=Date.now();room.closesAt=room.openedAt+room.seconds*1000;
}
function rrAdvance_(params) {
  rrRequireAdmin_(params.secret);
  return rrWithLock_(()=>{
    const room=rrGetRoom_(String(params.pin));
    if(room.stage==='lobby' || room.stage==='leaderboard' || room.stage==='skipped') rrStartNext_(room);
    else if(room.stage==='question') rrSettle_(room);
    else if(room.stage==='reveal') room.stage='leaderboard';
    else rrError_('This room is already finished.');
    rrStoreRoom_(room);
    return {ok:true,stage:room.stage};
  });
}
function rrVote_(params) {
  return rrWithLock_(()=>{
    const room=rrGetRoom_(String(params.pin));
    rrAssert_(room.stage==='question' && Date.now() < room.closesAt,'Voting has closed.');
    const player=room.players.find(p=>p.key===rrClean_(params.playerKey));
    rrAssert_(player,'Join the room before voting.');
    const picks=params.picks;
    rrAssert_(Array.isArray(picks) && picks.length===3 && new Set(picks).size===3,'Select exactly three different answers.');
    rrAssert_(picks.every(id=>room.options.some(o=>o.id===id && o.author!==player.name)),'You cannot vote for yourself or unknown answers.');
    room.votes[player.name]=picks;
    rrStoreRoom_(room);
    return {ok:true};
  });
}
function rrState_(params) {
  return rrWithLock_(()=>{
    const room=rrGetRoom_(String(params.pin));
    const isHost=rrProps_().getProperty('RANK_HOST_SECRET')===rrClean_(params.secret) && !!params.secret;
    const player=room.players.find(p=>p.key===rrClean_(params.playerKey));
    rrAssert_(isHost || player,'Join the room or enter the host passphrase.');
    if(room.stage==='question' && Date.now()>=room.closesAt) {rrSettle_(room);rrStoreRoom_(room);}
    const state={pin:room.pin,mode:room.mode,stage:room.stage,questionIndex:room.questionIndex,
      count:room.mode==='both'?50:25, seconds:room.seconds,openedAt:room.openedAt,closesAt:room.closesAt,
      players:room.players.map(p=>p.name), voteCount:Object.keys(room.votes).length,
      serverNow:Date.now(), viewer:player?player.name:null,
      voted:player?Boolean(room.votes[player.name]):false, picks:player?(room.votes[player.name]||[]):[],
      leaderboard:rrScoreBoard_(room.scores)};
    if(room.questionIndex>=0 && room.stage!=='finished') {
      const seq=rrRoundSequence_(room); state.game=seq.game;state.number=seq.i+1;state.question=rrQuestion_(seq.game,seq.i);
      if(room.stage==='question' || room.stage==='reveal' || room.stage==='skipped') {
        const source=rrSheetData_(),assigned=rrMapped_(source,seq.game,rrMappings_());
        const revealed=room.stage!=='question';
        state.options=room.options.map(o=>({id:o.id,text:assigned[o.author]?.answers[seq.i] || '[Answer removed]',
          ...(revealed?{author:o.author,tally:room.round?.totals[o.id] || {sum:0,first:0,second:0,third:0}}:{}),
          mine:player?o.author===player.name:false}));
      }
    }
    if(room.stage==='finished') {state.byGame={alex:rrScoreBoard_(room.byGame.alex),doron:rrScoreBoard_(room.byGame.doron)};}
    return state;
  });
}
function rrDispatch_(req) {
  const action=rrClean_(req.action);
  switch(action){
    case 'ping':return {ok:true,connected:true};
    case 'setup':return rrSetup_(req);
    case 'saveMap':return rrSaveMap_(req);
    case 'create':return rrCreate_(req);
    case 'join':return rrJoin_(req);
    case 'state':return rrState_(req);
    case 'vote':return rrVote_(req);
    case 'advance':return rrAdvance_(req);
    default:rrError_('Unsupported command.');
  }
}
function doGet(e) {
  const params=e && e.parameter || {};
  const callback=rrClean_(params.callback);
  // Restrict JSONP callback to a generated function identifier to prevent script injection.
  if(!/^rankCb_[A-Za-z0-9_]{1,30}$/.test(callback))
    return ContentService.createTextOutput('/* invalid callback */').setMimeType(ContentService.MimeType.JAVASCRIPT);
  let response;
  try {
    rrAssert_(params.payload && params.payload.length <= 7500,'Request too large.');
    const req=JSON.parse(params.payload);
    response={ok:true,data:rrDispatch_(req)};
  } catch(err) { response={ok:false,error:String(err && err.message || err)}; }
  return ContentService.createTextOutput(callback+'('+JSON.stringify(response).replace(/\u2028|\u2029/g,' ')+');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}