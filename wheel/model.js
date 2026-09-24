export const SCHEMA_VERSION = 1;
let fallbackCounter = 0;
function id(prefix='id') {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  fallbackCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${fallbackCounter.toString(36)}`;
}
const DEFAULT_SETTINGS = Object.freeze({
  spinDurationMs: 5200, extraTurns: 6, sound: true, confetti: true,
  theme: 'system', reducedMotion: false, removeWinnerByDefault: false,
  background: '', centerImage: '', palette: 'auto'
});
export function createEntry(label='') { return { id:id('entry'), label:String(label), weight:1, color:'', image:'' }; }
export function createWheel(name='Wheel') {
  return { id:id('wheel'), name:String(name || 'Wheel'), entries:[createEntry('Alex'),createEntry('Tommy'),createEntry('Mike'),createEntry('Jack')], history:[] };
}
export function createDefaultState() {
  const wheel = createWheel('Wheel 1');
  return { schemaVersion:SCHEMA_VERSION, activeWheelId:wheel.id, wheels:[wheel], settings:{...DEFAULT_SETTINGS} };
}
function sanitizeEntry(raw={}) {
  const weight = Number(raw.weight);
  return { id:String(raw.id || id('entry')), label:String(raw.label ?? ''), weight:Number.isFinite(weight)?weight:1, color:typeof raw.color==='string'?raw.color:'', image:typeof raw.image==='string'?raw.image:'' };
}
function sanitizeWheel(raw={}, index=0) {
  const entries = Array.isArray(raw.entries) ? raw.entries.map(sanitizeEntry) : [];
  return { id:String(raw.id || id('wheel')), name:String(raw.name || `Wheel ${index+1}`), entries, history:Array.isArray(raw.history)?raw.history.filter(x=>x&&typeof x==='object').slice(-100).map(x=>({label:String(x.label??''),entryId:String(x.entryId??''),at:Number(x.at)||Date.now()})):[] };
}
export function sanitizeState(input) {
  const raw = input && typeof input === 'object' ? input : {};
  const wheels = Array.isArray(raw.wheels) && raw.wheels.length ? raw.wheels.map(sanitizeWheel) : [createWheel('Wheel 1')];
  const activeWheelId = wheels.some(w=>w.id===raw.activeWheelId) ? raw.activeWheelId : wheels[0].id;
  const s = raw.settings && typeof raw.settings==='object' ? raw.settings : {};
  const settings = {
    ...DEFAULT_SETTINGS,
    spinDurationMs: Number.isFinite(Number(s.spinDurationMs)) ? Math.min(20000,Math.max(250,Number(s.spinDurationMs))) : DEFAULT_SETTINGS.spinDurationMs,
    extraTurns: Number.isFinite(Number(s.extraTurns)) ? Math.min(20,Math.max(0,Number(s.extraTurns))) : DEFAULT_SETTINGS.extraTurns,
    sound: s.sound !== false,
    confetti: s.confetti !== false,
    theme: ['system','light','dark'].includes(s.theme)?s.theme:'system',
    reducedMotion: Boolean(s.reducedMotion),
    removeWinnerByDefault: Boolean(s.removeWinnerByDefault),
    background: typeof s.background==='string'?s.background:'',
    centerImage: typeof s.centerImage==='string'?s.centerImage:'',
    palette: typeof s.palette==='string'?s.palette:'auto'
  };
  return { schemaVersion:SCHEMA_VERSION, activeWheelId, wheels, settings };
}
export function getActiveWheel(state) { return state.wheels.find(w=>w.id===state.activeWheelId) || state.wheels[0] || null; }
export function eligibleEntries(wheel) { return (wheel?.entries || []).filter(e => String(e.label??'').trim() && Number.isFinite(Number(e.weight)) && Number(e.weight)>0); }
