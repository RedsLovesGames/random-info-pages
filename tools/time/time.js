const STORAGE_KEY='rip.toolbox.time.v3';
const LEGACY_KEYS=['rip.toolbox.time.v1','rip.toolbox.time.v2','rip-toolbox-time-v2'];
const HM_RE=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MAX_OFFSET_MINUTES=7*24*60;

export const cityCatalog=[
  {id:'new-york',label:'New York',country:'United States',zone:'America/New_York',lat:40.7128,lon:-74.006},
  {id:'philadelphia',label:'Philadelphia',country:'United States',zone:'America/New_York',lat:39.9526,lon:-75.1652},
  {id:'los-angeles',label:'Los Angeles',country:'United States',zone:'America/Los_Angeles',lat:34.0522,lon:-118.2437},
  {id:'san-francisco',label:'San Francisco',country:'United States',zone:'America/Los_Angeles',lat:37.7749,lon:-122.4194},
  {id:'chicago',label:'Chicago',country:'United States',zone:'America/Chicago',lat:41.8781,lon:-87.6298},
  {id:'denver',label:'Denver',country:'United States',zone:'America/Denver',lat:39.7392,lon:-104.9903},
  {id:'phoenix',label:'Phoenix',country:'United States',zone:'America/Phoenix',lat:33.4484,lon:-112.074},
  {id:'anchorage',label:'Anchorage',country:'United States',zone:'America/Anchorage',lat:61.2181,lon:-149.9003},
  {id:'honolulu',label:'Honolulu',country:'United States',zone:'Pacific/Honolulu',lat:21.3099,lon:-157.8581},
  {id:'toronto',label:'Toronto',country:'Canada',zone:'America/Toronto',lat:43.6532,lon:-79.3832},
  {id:'vancouver',label:'Vancouver',country:'Canada',zone:'America/Vancouver',lat:49.2827,lon:-123.1207},
  {id:'mexico-city',label:'Mexico City',country:'Mexico',zone:'America/Mexico_City',lat:19.4326,lon:-99.1332},
  {id:'sao-paulo',label:'São Paulo',country:'Brazil',zone:'America/Sao_Paulo',lat:-23.5505,lon:-46.6333},
  {id:'buenos-aires',label:'Buenos Aires',country:'Argentina',zone:'America/Argentina/Buenos_Aires',lat:-34.6037,lon:-58.3816},
  {id:'london',label:'London',country:'United Kingdom',zone:'Europe/London',lat:51.5072,lon:-0.1276},
  {id:'dublin',label:'Dublin',country:'Ireland',zone:'Europe/Dublin',lat:53.3498,lon:-6.2603},
  {id:'lisbon',label:'Lisbon',country:'Portugal',zone:'Europe/Lisbon',lat:38.7223,lon:-9.1393},
  {id:'paris',label:'Paris',country:'France',zone:'Europe/Paris',lat:48.8566,lon:2.3522},
  {id:'berlin',label:'Berlin',country:'Germany',zone:'Europe/Berlin',lat:52.52,lon:13.405},
  {id:'amsterdam',label:'Amsterdam',country:'Netherlands',zone:'Europe/Amsterdam',lat:52.3676,lon:4.9041},
  {id:'madrid',label:'Madrid',country:'Spain',zone:'Europe/Madrid',lat:40.4168,lon:-3.7038},
  {id:'rome',label:'Rome',country:'Italy',zone:'Europe/Rome',lat:41.9028,lon:12.4964},
  {id:'warsaw',label:'Warsaw',country:'Poland',zone:'Europe/Warsaw',lat:52.2297,lon:21.0122},
  {id:'helsinki',label:'Helsinki',country:'Finland',zone:'Europe/Helsinki',lat:60.1699,lon:24.9384},
  {id:'istanbul',label:'Istanbul',country:'Türkiye',zone:'Europe/Istanbul',lat:41.0082,lon:28.9784},
  {id:'cairo',label:'Cairo',country:'Egypt',zone:'Africa/Cairo',lat:30.0444,lon:31.2357},
  {id:'johannesburg',label:'Johannesburg',country:'South Africa',zone:'Africa/Johannesburg',lat:-26.2041,lon:28.0473},
  {id:'nairobi',label:'Nairobi',country:'Kenya',zone:'Africa/Nairobi',lat:-1.2921,lon:36.8219},
  {id:'dubai',label:'Dubai',country:'United Arab Emirates',zone:'Asia/Dubai',lat:25.2048,lon:55.2708},
  {id:'delhi',label:'Delhi',country:'India',zone:'Asia/Kolkata',lat:28.6139,lon:77.209},
  {id:'mumbai',label:'Mumbai',country:'India',zone:'Asia/Kolkata',lat:19.076,lon:72.8777},
  {id:'bangkok',label:'Bangkok',country:'Thailand',zone:'Asia/Bangkok',lat:13.7563,lon:100.5018},
  {id:'singapore',label:'Singapore',country:'Singapore',zone:'Asia/Singapore',lat:1.3521,lon:103.8198},
  {id:'hong-kong',label:'Hong Kong',country:'Hong Kong',zone:'Asia/Hong_Kong',lat:22.3193,lon:114.1694},
  {id:'shanghai',label:'Shanghai',country:'China',zone:'Asia/Shanghai',lat:31.2304,lon:121.4737},
  {id:'beijing',label:'Beijing',country:'China',zone:'Asia/Shanghai',lat:39.9042,lon:116.4074},
  {id:'seoul',label:'Seoul',country:'South Korea',zone:'Asia/Seoul',lat:37.5665,lon:126.978},
  {id:'tokyo',label:'Tokyo',country:'Japan',zone:'Asia/Tokyo',lat:35.6762,lon:139.6503},
  {id:'manila',label:'Manila',country:'Philippines',zone:'Asia/Manila',lat:14.5995,lon:120.9842},
  {id:'jakarta',label:'Jakarta',country:'Indonesia',zone:'Asia/Jakarta',lat:-6.2088,lon:106.8456},
  {id:'perth',label:'Perth',country:'Australia',zone:'Australia/Perth',lat:-31.9523,lon:115.8613},
  {id:'sydney',label:'Sydney',country:'Australia',zone:'Australia/Sydney',lat:-33.8688,lon:151.2093},
  {id:'melbourne',label:'Melbourne',country:'Australia',zone:'Australia/Melbourne',lat:-37.8136,lon:144.9631},
  {id:'auckland',label:'Auckland',country:'New Zealand',zone:'Pacific/Auckland',lat:-36.8509,lon:174.7645}
];

const cityByIdMap=new Map(cityCatalog.map(city=>[city.id,city]));
export const commonZones=[...new Set(['UTC',...cityCatalog.map(city=>city.zone)])];

export const defaultState=()=>({
  version:3,
  format24:false,
  referenceLocationId:'new-york',
  offsetMinutes:0,
  activeView:'map',
  locations:[
    {...cityByIdMap.get('new-york')},
    {...cityByIdMap.get('london')},
    {...cityByIdMap.get('tokyo')}
  ],
  people:[
    {id:'tommy',name:'Tommy',locationId:'new-york',availableStart:null,availableEnd:null},
    {id:'london-person',name:'London',locationId:'london',availableStart:null,availableEnd:null},
    {id:'tokyo-person',name:'Tokyo',locationId:'tokyo',availableStart:null,availableEnd:null}
  ]
});

export function validZone(zone){try{new Intl.DateTimeFormat('en-US',{timeZone:zone}).format();return true}catch{return false}}
export function validHm(value){return typeof value==='string'&&HM_RE.test(value)}
export function cityById(id){const city=cityByIdMap.get(String(id));return city?{...city}:null}
export function cityForZone(zone){const city=cityCatalog.find(item=>item.zone===zone);return city?{...city}:null}

function offsetFallback(date,zone){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  const asUtc=Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second);
  const minutes=Math.round((asUtc-date.getTime())/60000);
  const sign=minutes<0?'-':'+';const abs=Math.abs(minutes);const hh=String(Math.floor(abs/60)).padStart(2,'0');const mm=String(abs%60).padStart(2,'0');
  return `GMT${sign}${hh}:${mm}`;
}

export function zoneParts(date,zone,format24=false){
  if(!validZone(zone))throw new Error(`Unsupported time zone: ${zone}`);
  const base={timeZone:zone,year:'numeric',month:'short',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit'};
  if(format24)base.hourCycle='h23';else base.hour12=true;
  let formatter;
  try{formatter=new Intl.DateTimeFormat('en-US',{...base,timeZoneName:'shortOffset'});}catch{formatter=new Intl.DateTimeFormat('en-US',base);}
  const parts=Object.fromEntries(formatter.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  if(!parts.timeZoneName)parts.timeZoneName=offsetFallback(date,zone);
  return parts;
}

export function calendarKey(date,zone){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}`}
export function dayDifference(date,zone,referenceZone){const a=Date.parse(calendarKey(date,zone)+'T00:00:00Z');const b=Date.parse(calendarKey(date,referenceZone)+'T00:00:00Z');return Math.round((a-b)/86400000)}

export function localMinutes(date,zone){
  if(!validZone(zone))throw new Error(`Unsupported time zone: ${zone}`);
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return (+p.hour)*60+(+p.minute);
}
export function hmMinutes(value){if(!validHm(value))return null;const[h,m]=value.split(':').map(Number);return h*60+m}
export function isAvailableAt(date,zone,start,end){
  const s=hmMinutes(start),e=hmMinutes(end);if(s===null||e===null)return null;
  const now=localMinutes(date,zone);if(s===e)return true;
  return s<e?now>=s&&now<e:now>=s||now<e;
}

export function peopleForLocation(people,locationId){return Array.from(people||[]).filter(person=>person.locationId===locationId)}
export function groupPeopleByLocation(state){
  return Array.from(state?.locations||[]).map(location=>({...location,people:peopleForLocation(state?.people,location.id)})).filter(group=>group.people.length>0);
}
export function availabilitySummary(date,stateOrPeople,maybeLocations){
  const people=Array.isArray(stateOrPeople)?stateOrPeople:Array.from(stateOrPeople?.people||[]);
  const locations=Array.isArray(maybeLocations)?maybeLocations:Array.from(stateOrPeople?.locations||[]);
  const byId=new Map(locations.map(location=>[location.id,location]));
  const items=[];
  for(const person of people){
    const location=byId.get(person.locationId);if(!location)continue;
    const available=isAvailableAt(date,location.zone,person.availableStart,person.availableEnd);
    if(available!==null)items.push({id:person.id,name:person.name,locationId:person.locationId,available});
  }
  return{configured:items.length,available:items.filter(x=>x.available).length,items,allAvailable:items.length>0&&items.every(x=>x.available)};
}

export function projectCoordinates(lat,lon,width=1000,height=500){
  return{x:((Number(lon)+180)/360)*width,y:((90-Number(lat))/180)*height};
}

function slug(value){return String(value||'location').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'location'}
function uniqueId(base,used){let id=base||'item',n=2;while(used.has(id)){id=`${base}-${n++}`;}used.add(id);return id}
function normalizeHours(start,end){return validHm(start)&&validHm(end)?{availableStart:start,availableEnd:end}:{availableStart:null,availableEnd:null}}
function normalizeLocation(location,index=0){
  if(!location||!validZone(location.zone))return null;
  const catalog=cityCatalog.find(city=>city.zone===location.zone&&(city.id===location.id||city.label===location.label))||cityForZone(location.zone);
  const lat=Number.isFinite(+location.lat)?+location.lat:(catalog?.lat??0);
  const lon=Number.isFinite(+location.lon)?+location.lon:(catalog?.lon??0);
  return{id:String(location.id||catalog?.id||`location-${index+1}`),label:String(location.label||catalog?.label||location.zone).trim().slice(0,48),country:String(location.country||catalog?.country||'').trim().slice(0,48),zone:String(location.zone),lat,lon};
}
function normalizePerson(person,locationIds,index=0){
  if(!person||!String(person.name||'').trim()||!locationIds.has(String(person.locationId)))return null;
  return{id:String(person.id||`person-${index+1}`),name:String(person.name).trim().slice(0,40),locationId:String(person.locationId),...normalizeHours(person.availableStart,person.availableEnd)};
}

function normalizeV3(parsed){
  const inputLocations=Array.isArray(parsed.locations)?parsed.locations.map(normalizeLocation).filter(Boolean):[];
  if(!inputLocations.length)return defaultState();
  const locations=[];const zoneToId=new Map();const oldToNew=new Map();const usedLocationIds=new Set();
  for(const location of inputLocations){
    let id=zoneToId.get(location.zone);
    if(!id){id=uniqueId(location.id||slug(location.label),usedLocationIds);locations.push({...location,id});zoneToId.set(location.zone,id);}
    oldToNew.set(location.id,id);
  }
  const locationIds=new Set(locations.map(location=>location.id));const usedPersonIds=new Set();const people=[];
  for(const [index,raw] of Array.from(parsed.people||[]).entries()){
    const remapped={...raw,locationId:oldToNew.get(String(raw.locationId))||String(raw.locationId)};
    const person=normalizePerson(remapped,locationIds,index);if(!person)continue;
    person.id=uniqueId(person.id,usedPersonIds);people.push(person);
  }
  if(!people.length)return defaultState();
  const referenceCandidate=oldToNew.get(String(parsed.referenceLocationId))||String(parsed.referenceLocationId||'');
  const referenceLocationId=locationIds.has(referenceCandidate)?referenceCandidate:locations[0].id;
  const activeView=['map','planner','board'].includes(parsed.activeView)?parsed.activeView:'map';
  const offset=Number.isFinite(+parsed.offsetMinutes)?+parsed.offsetMinutes:0;
  return{version:3,format24:Boolean(parsed.format24),referenceLocationId,offsetMinutes:Math.max(-MAX_OFFSET_MINUTES,Math.min(MAX_OFFSET_MINUTES,Math.round(offset))),activeView,locations,people:people.slice(0,64)};
}

function migrateV2(parsed){
  const clocks=Array.isArray(parsed.clocks)?parsed.clocks:[];if(!clocks.length)return defaultState();
  const locations=[];const people=[];const zoneToId=new Map();const usedLocationIds=new Set();const usedPersonIds=new Set();let referenceLocationId=null;
  clocks.forEach((clock,index)=>{
    if(!clock||!validZone(clock.zone)||!String(clock.name||'').trim())return;
    let locationId=zoneToId.get(clock.zone);
    if(!locationId){
      const catalog=cityForZone(clock.zone);const base=catalog||{id:slug(clock.zone),label:clock.name||clock.zone,country:'',zone:clock.zone,lat:0,lon:0};
      locationId=uniqueId(base.id,usedLocationIds);locations.push({...base,id:locationId});zoneToId.set(clock.zone,locationId);
    }
    const personId=uniqueId(String(clock.id||`person-${index+1}`),usedPersonIds);
    people.push({id:personId,name:String(clock.name).trim().slice(0,40),locationId,...normalizeHours(clock.availableStart,clock.availableEnd)});
    if(clock.id===parsed.referenceId)referenceLocationId=locationId;
  });
  if(!locations.length||!people.length)return defaultState();
  return{version:3,format24:Boolean(parsed.format24),referenceLocationId:referenceLocationId||locations[0].id,offsetMinutes:Math.max(-MAX_OFFSET_MINUTES,Math.min(MAX_OFFSET_MINUTES,Math.round((Number.isFinite(+parsed.offsetHours)?+parsed.offsetHours:0)*60))),activeView:'map',locations,people};
}

export function serializeState(state){return JSON.stringify(normalizeV3(state))}
export function deserializeState(raw){
  try{const parsed=typeof raw==='string'?JSON.parse(raw):raw;if(!parsed)return defaultState();if(+parsed.version===3||Array.isArray(parsed.locations))return normalizeV3(parsed);if(+parsed.version===2||Array.isArray(parsed.clocks))return migrateV2(parsed);return defaultState();}catch{return defaultState()}
}
export function loadState(){
  try{
    const current=localStorage.getItem(STORAGE_KEY);if(current)return deserializeState(current);
    for(const key of LEGACY_KEYS){const raw=localStorage.getItem(key);if(raw){const state=deserializeState(raw);saveState(state);return state;}}
  }catch{}
  return defaultState();
}
export function saveState(state){try{localStorage.setItem(STORAGE_KEY,serializeState(state));return true}catch{return false}}
export function shiftedNow(offsetMinutes=0){return new Date(Date.now()+(Number(offsetMinutes)||0)*60000)}
export function uid(prefix='item'){return globalThis.crypto?.randomUUID?.()||`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`}

export function addPersonToState(inputState,{name,cityId,availableStart=null,availableEnd=null}){
  const state=deserializeState(serializeState(inputState));const city=cityById(cityId);if(!city||!String(name||'').trim())return state;
  let location=state.locations.find(item=>item.zone===city.zone);
  if(!location){
    const used=new Set(state.locations.map(item=>item.id));const id=uniqueId(city.id,used);location={...city,id};state.locations.push(location);
  }
  state.people.push({id:uid('person'),name:String(name).trim().slice(0,40),locationId:location.id,...normalizeHours(availableStart,availableEnd)});
  return state;
}

export function removePersonFromState(inputState,personId){
  const state=deserializeState(serializeState(inputState));state.people=state.people.filter(person=>person.id!==personId);
  const used=new Set(state.people.map(person=>person.locationId));state.locations=state.locations.filter(location=>used.has(location.id));
  if(!state.locations.length||!state.people.length)return defaultState();
  if(!state.locations.some(location=>location.id===state.referenceLocationId))state.referenceLocationId=state.locations[0].id;
  return state;
}

export function movePerson(people,id,direction){
  const list=Array.from(people||[]);const index=list.findIndex(person=>person.id===id);if(index<0)return list;
  const target=Math.max(0,Math.min(list.length-1,index+(direction<0?-1:1)));if(target===index)return list;
  const[item]=list.splice(index,1);list.splice(target,0,item);return list;
}
export const moveClock=movePerson;
