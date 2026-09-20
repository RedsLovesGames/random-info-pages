const test=require('node:test');
const assert=require('node:assert/strict');
const lab=require('./recommendation.js');
const pool=lab.DEFAULT_PLAYER_POOL;

test('default five excludes backup Michael',()=>{assert.deepEqual(lab.defaultActivePlayers(pool),['Linh','Jon','Ben','Tommy','Dylan'])});

test('player choices keep declared roles',()=>{const c=lab.playerChoices('Tommy',pool);assert.equal(c.find(x=>x.agent==='Sova').role,'Initiator');assert.equal(c.find(x=>x.agent==='Miks').role,'Controller')});

test('recommendations only use legal unique agents',()=>{const meta={agent_pick_rates:[{agent:'Omen',rate:90},{agent:'Sova',rate:88},{agent:'Raze',rate:80},{agent:'Cypher',rate:76},{agent:'KAY/O',rate:70},{agent:'Clove',rate:40}],top_compositions:[{agents:['Omen','Sova','Raze','Cypher','KAY/O'],games:8,wins:5,win_rate:62.5}]};const out=lab.recommendComps(pool,['Linh','Jon','Ben','Tommy','Dylan'],meta,[],5);assert.ok(out.length>0);for(const rec of out){assert.equal(new Set(rec.agents).size,5);for(const[player,agent]of Object.entries(rec.assignment))assert.ok(lab.playerChoices(player,pool).some(x=>x.agent===agent))}});

test('exact pro comp similarity ranks first',()=>{const teams=[{name:'Exact',tag:'EX',maps:{Haven:{compositions:[{agents:['Omen','Sova','Raze','Cypher','KAY/O'],games:2,wins:1,win_rate:50}]}}},{name:'Partial',tag:'PA',maps:{Haven:{compositions:[{agents:['Omen','Sova','Jett','Cypher','Fade'],games:4,wins:3,win_rate:75}]}}}];const rows=lab.compareToTeams(['Omen','Sova','Raze','Cypher','KAY/O'],teams,'Haven');assert.equal(rows[0].team,'Exact');assert.equal(rows[0].similarity,100);assert.equal(rows[1].overlap,3)});

test('playbook reacts to two initiators and sentinel',()=>{const a={Linh:'Cypher',Jon:'Sova',Ben:'KAY/O',Tommy:'Brimstone',Dylan:'Raze'};const plays=lab.buildPlaybook(a,pool,'Ascent');assert.ok(plays.some(x=>/two initiators|layer/i.test(x.text)));assert.ok(plays.some(x=>/flank|sentinel/i.test(x.text)))});

test('playable pro template gets unique player assignment',()=>{const agents=['Raze','Sova','KAY/O','Cypher','Brimstone'];const a=lab.assignAgentsToPlayers(agents,pool,['Linh','Jon','Ben','Tommy','Dylan']);assert.ok(a);assert.deepEqual(new Set(Object.values(a)),new Set(agents))});
