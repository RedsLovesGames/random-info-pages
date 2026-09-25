const STORAGE_KEY='rip.toolbox.time.v1';
const HM_RE=/^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const defaultState=()=>({version:2,format24:false,referenceId:'home',offsetHours:0,clocks:[
  {id:'home',name:'Home',zone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',availableStart:null,availableEnd:null},
  {id:'london',name:'London',zone:'Europe/London',availableStart:null,availableEnd:null},
  {id:'tokyo',name:'Tokyo',zone:'Asia/Tokyo',availableStart:null,availableEnd:null}
]});

export function validZone(zone){try{new Intl.DateTimeFormat('en-US',{timeZone:zone}).format();return true}catch{return false}}
export function validHm(value){return typeof value==='string'&&HM_RE.test(value)}

function offsetFallback(date,zone){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  const asUtc=Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second);
  const minutes=Math.round((asUtc-date.getTime())/60000);
  const sign=minutes<0?'-':'+';const abs=Math.abs(minutes);const hh=String(Math.floor(abs/60)).padStart(2,'0');const mm=String(abs%60).padStart(2,'0');
  return `GMT${sign}${hh}:${mm}`;
}

export function zoneParts(date,zone,format24=false){
  if(!validZone(zone))throw new Error(`Unsupported time zone: ${zone}`);
  const options={timeZone:zone,year:'numeric',month:'short',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit'};
  if(format24)options.hourCycle='h23';else options.hour12=true;
  try{options.timeZoneName='shortOffset'}catch{}
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',options).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
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
export function availabilitySummary(date,clocks){
  const configured=[];for(const clock of clocks||[]){const available=isAvailableAt(date,clock.zone,clock.availableStart,clock.availableEnd);if(available!==null)configured.push({id:clock.id,name:clock.name,available});}
  return{configured:configured.length,available:configured.filter(x=>x.available).length,items:configured,allAvailable:configured.length>0&&configured.every(x=>x.available)};
}

export function moveClock(clocks,id,direction){
  const list=Array.from(clocks||[]);const index=list.findIndex(c=>c.id===id);if(index<0)return list;
  const target=Math.max(0,Math.min(list.length-1,index+(direction<0?-1:1)));if(target===index)return list;
  const[item]=list.splice(index,1);list.splice(target,0,item);return list;
}

function normalizeClock(c){
  if(!c||!c.id||!String(c.name||'').trim()||!validZone(c.zone))return null;
  const hours=validHm(c.availableStart)&&validHm(c.availableEnd)?{availableStart:c.availableStart,availableEnd:c.availableEnd}:{availableStart:null,availableEnd:null};
  return{id:String(c.id),name:String(c.name).trim().slice(0,28),zone:String(c.zone),...hours};
}

export function serializeState(state){return JSON.stringify(state)}
export function deserializeState(raw){
  try{
    const parsed=JSON.parse(raw);if(!parsed||!Array.isArray(parsed.clocks)||!parsed.clocks.length)return defaultState();
    const clocks=parsed.clocks.map(normalizeClock).filter(Boolean).slice(0,16);if(!clocks.length)return defaultState();
    return{version:2,format24:Boolean(parsed.format24),referenceId:clocks.some(c=>c.id===parsed.referenceId)?parsed.referenceId:clocks[0].id,offsetHours:Number.isFinite(+parsed.offsetHours)?Math.max(-168,Math.min(168,+parsed.offsetHours)):0,clocks};
  }catch{return defaultState()}
}
export function loadState(){try{return deserializeState(localStorage.getItem(STORAGE_KEY))}catch{return defaultState()}}
export function saveState(state){try{localStorage.setItem(STORAGE_KEY,serializeState(state));return true}catch{return false}}
export function shiftedNow(offsetHours){return new Date(Date.now()+offsetHours*3600000)}
export function uid(){return globalThis.crypto?.randomUUID?.()||`clock-${Date.now()}-${Math.random().toString(36).slice(2)}`}
export const commonZones=['UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Phoenix','America/Anchorage','Pacific/Honolulu','America/Toronto','America/Vancouver','America/Mexico_City','America/Sao_Paulo','Europe/London','Europe/Dublin','Europe/Paris','Europe/Berlin','Europe/Rome','Europe/Madrid','Europe/Warsaw','Europe/Athens','Africa/Cairo','Africa/Johannesburg','Asia/Jerusalem','Asia/Dubai','Asia/Kolkata','Asia/Bangkok','Asia/Singapore','Asia/Hong_Kong','Asia/Shanghai','Asia/Tokyo','Asia/Seoul','Australia/Perth','Australia/Adelaide','Australia/Sydney','Pacific/Auckland'];