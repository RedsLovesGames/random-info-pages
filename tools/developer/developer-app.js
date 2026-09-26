import {
  prettyJson, minifyJson, validateJson, base64Encode, base64Decode, textToHex, hexToText,
  textToBinary, binaryToText, urlEncode, urlDecode, htmlEntityEncode, htmlEntityDecode,
  decodeJwt, parseUrlParts, runRegex, diffLines, detectInputType, operationApply,
} from './developer-core.js';
import { createHistory } from '../shared/history.js';
import { downloadBlob } from '../shared/files.js';

const $ = selector => document.querySelector(selector);
const input = $('#developerInput');
const output = $('#developerOutput');
const panel = $('#developerActionPanel');
const chainEl = $('#operationChain');
const status = $('#developerStatus');
const historyEl = $('#developerHistory');
const historyList = $('#developerHistoryList');
const history = createHistory('', { initialLabel: 'Initial input', limit: 80 });
let chain = [];
let yamlPromise = null;
let ajvPromise = null;

const CHAIN_LABELS = {
  'json-pretty':'JSON Pretty','json-minify':'JSON Minify','base64-encode':'Base64 Encode','base64-decode':'Base64 Decode',
  'url-encode':'URL Encode','url-decode':'URL Decode','html-encode':'HTML Entity Encode','html-decode':'HTML Entity Decode',
  'hex-encode':'Hex Encode','hex-decode':'Hex Decode','binary-encode':'Binary Encode','binary-decode':'Binary Decode',
};

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function setStatus(message) { status.textContent = message || ''; }
function writeOutput(value, message = '') { output.value = typeof value === 'string' ? value : JSON.stringify(value, null, 2); if (message) setStatus(message); }
function showPanel(html) { panel.innerHTML = html; panel.hidden = false; panel.scrollIntoView({ block:'nearest' }); }
function closePanel() { panel.hidden = true; panel.innerHTML = ''; }
function copyText(value) { return navigator.clipboard?.writeText ? navigator.clipboard.writeText(value) : Promise.reject(new Error('Clipboard unavailable.')); }

function syncDetected() { $('#detectedType').textContent = detectInputType(input.value); }
function renderHistory() {
  historyList.innerHTML = '';
  for (const entry of history.entries()) { const li=document.createElement('li'); li.textContent=entry.label; if(entry.current)li.classList.add('current'); historyList.append(li); }
  $('#undoDeveloper').disabled = !history.canUndo(); $('#redoDeveloper').disabled = !history.canRedo();
}
function commitInput(label) { history.push({ label, state: input.value }); renderHistory(); }
function restoreInput(value) { input.value = value ?? ''; syncDetected(); replayChain(); renderHistory(); }

function renderChain() {
  chainEl.innerHTML = '';
  for (const [index, op] of chain.entries()) {
    const chip=document.createElement('span'); chip.textContent=`${index+1}. ${op.label}`; chip.title='Click to remove this operation'; chip.tabIndex=0;
    const remove=()=>{chain.splice(index,1);renderChain();replayChain();}; chip.addEventListener('click',remove);chip.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();remove();}});chainEl.append(chip);
  }
}
function replayChain() {
  if (!chain.length) return;
  try { let value=input.value; for(const op of chain)value=operationApply(op.id,value,op.options||{}); writeOutput(value,'Operation chain applied.'); }
  catch(error){setStatus(`Chain stopped: ${error.message||error}`);}
}
function runTransform(id,{add=false,label=CHAIN_LABELS[id]||id,options={}}={}) {
  try {
    if(add){chain.push({id,label,options});renderChain();replayChain();return;}
    writeOutput(operationApply(id,input.value,options),`${label} complete.`);
  } catch(error){setStatus(error.message||String(error));}
}

async function loadYaml(){if(!yamlPromise)yamlPromise=import('https://cdn.jsdelivr.net/npm/js-yaml@5.4.2/dist/js-yaml.mjs').catch(error=>{yamlPromise=null;throw error;});return yamlPromise;}
async function loadAjv(){if(!ajvPromise)ajvPromise=import('https://cdn.jsdelivr.net/npm/ajv@8.17.1/+esm').then(mod=>mod.default||mod).catch(error=>{ajvPromise=null;throw error;});return ajvPromise;}

function toolHeader(title,description=''){return `<div class="developer-pane-head"><strong>${escapeHtml(title)}</strong><button id="closeDeveloperPanel" class="developer-button" type="button">Close</button></div>${description?`<p>${escapeHtml(description)}</p>`:''}`;}
function bindClose(){ $('#closeDeveloperPanel')?.addEventListener('click',closePanel); }
function bindTransformButton(selector,id,add=false){$(selector)?.addEventListener('click',()=>runTransform(id,{add}));}

function openJson(){
  showPanel(`${toolHeader('JSON','Pretty-print, minify or validate the current input.')}<div class="developer-toolbar"><button id="jsonPretty" class="developer-button primary">Pretty</button><button id="jsonMinify" class="developer-button">Minify</button><button id="jsonValidate" class="developer-button">Validate</button><button id="jsonPrettyChain" class="developer-button">+ Pretty to chain</button></div><div id="devToolResult" class="developer-result" hidden></div>`);bindClose();
  $('#jsonPretty').onclick=()=>runTransform('json-pretty');$('#jsonMinify').onclick=()=>runTransform('json-minify');$('#jsonPrettyChain').onclick=()=>runTransform('json-pretty',{add:true});
  $('#jsonValidate').onclick=()=>{const r=validateJson(input.value),el=$('#devToolResult');el.hidden=false;el.className=`developer-result ${r.valid?'good':'bad'}`;el.textContent=r.valid?'Valid JSON':r.error;};
}
function openBase64(){showPanel(`${toolHeader('Base64','UTF-8-safe encode/decode.')}<div class="developer-toolbar"><button id="b64Encode" class="developer-button primary">Encode</button><button id="b64Decode" class="developer-button">Decode</button><button id="b64EncodeChain" class="developer-button">+ Encode to chain</button><button id="b64DecodeChain" class="developer-button">+ Decode to chain</button></div>`);bindClose();bindTransformButton('#b64Encode','base64-encode');bindTransformButton('#b64Decode','base64-decode');bindTransformButton('#b64EncodeChain','base64-encode',true);bindTransformButton('#b64DecodeChain','base64-decode',true);}
function openEncoding(){showPanel(`${toolHeader('Encoding','Hex, binary and HTML entity transforms.')}<div class="developer-toolbar"><button data-enc="hex-encode" class="developer-button">Text → Hex</button><button data-enc="hex-decode" class="developer-button">Hex → Text</button><button data-enc="binary-encode" class="developer-button">Text → Binary</button><button data-enc="binary-decode" class="developer-button">Binary → Text</button><button data-enc="html-encode" class="developer-button">HTML entities</button><button data-enc="html-decode" class="developer-button">Decode entities</button></div>`);bindClose();panel.querySelectorAll('[data-enc]').forEach(b=>b.onclick=()=>runTransform(b.dataset.enc));}
function openUrl(){showPanel(`${toolHeader('URL','Encode/decode text or inspect a full URL.')}<div class="developer-toolbar"><button id="urlEncode" class="developer-button">Encode component</button><button id="urlDecode" class="developer-button">Decode component</button><button id="urlInspect" class="developer-button primary">Inspect URL</button><button id="urlEncodeChain" class="developer-button">+ Encode to chain</button></div><div id="devToolResult" class="developer-result" hidden></div>`);bindClose();bindTransformButton('#urlEncode','url-encode');bindTransformButton('#urlDecode','url-decode');bindTransformButton('#urlEncodeChain','url-encode',true);$('#urlInspect').onclick=()=>{const el=$('#devToolResult');try{el.textContent=JSON.stringify(parseUrlParts(input.value),null,2);el.className='developer-result good';}catch(e){el.textContent=e.message;el.className='developer-result bad';}el.hidden=false;};}
async function openYaml(){showPanel(`${toolHeader('YAML','Lazy-loads js-yaml only for this tool.')}<div class="developer-toolbar"><button id="jsonToYaml" class="developer-button primary">JSON → YAML</button><button id="yamlToJson" class="developer-button">YAML → JSON</button></div><div id="devToolResult" class="developer-result">Library loads on first use.</div>`);bindClose();$('#jsonToYaml').onclick=async()=>{const el=$('#devToolResult');try{const yaml=await loadYaml();writeOutput(yaml.dump(JSON.parse(input.value)),'Converted JSON to YAML.');el.textContent='Converted locally.';}catch(e){el.textContent=e.message;}};$('#yamlToJson').onclick=async()=>{const el=$('#devToolResult');try{const yaml=await loadYaml();writeOutput(JSON.stringify(yaml.load(input.value),null,2),'Converted YAML to JSON.');el.textContent='Converted locally.';}catch(e){el.textContent=e.message;}};}
function prettyXml(text){const parsed=new DOMParser().parseFromString(String(text??''),'application/xml');const error=parsed.querySelector('parsererror');if(error)throw new Error(error.textContent.trim().split('\n')[0]);const raw=new XMLSerializer().serializeToString(parsed);return raw.replace(/(>)(<)(\/*)/g,'$1\n$2$3').split('\n').reduce((acc,line)=>{const closing=/^<\//.test(line),self=/\/>$/.test(line)||/^<\?/.test(line)||/^<!/.test(line),open=/^<[^/][^>]*[^/]?>$/.test(line)&&!self; if(closing)acc.depth=Math.max(0,acc.depth-1);acc.lines.push(`${'  '.repeat(acc.depth)}${line}`);if(open)acc.depth++;return acc;},{depth:0,lines:[]}).lines.join('\n');}
function openXml(){showPanel(`${toolHeader('XML','Parse and pretty-print XML with the browser DOM parser.')}<div class="developer-toolbar"><button id="xmlPretty" class="developer-button primary">Pretty XML</button></div><div id="devToolResult" class="developer-result" hidden></div>`);bindClose();$('#xmlPretty').onclick=()=>{const el=$('#devToolResult');try{writeOutput(prettyXml(input.value),'XML formatted.');el.textContent='Well-formed XML.';el.className='developer-result good';}catch(e){el.textContent=e.message;el.className='developer-result bad';}el.hidden=false;};}
function openJwt(){showPanel(`${toolHeader('JWT Inspector','Decode only. This does not verify the signature.')}<div class="developer-toolbar"><button id="decodeJwt" class="developer-button primary">Decode JWT</button></div><div id="devToolResult" class="developer-result" hidden></div>`);bindClose();$('#decodeJwt').onclick=()=>{const el=$('#devToolResult');try{const value=decodeJwt(input.value);el.textContent=`Header\n${JSON.stringify(value.header,null,2)}\n\nPayload\n${JSON.stringify(value.payload,null,2)}\n\nSignature present: ${Boolean(value.signature)}\nVerified: NO`;el.className='developer-result good';}catch(e){el.textContent=e.message;el.className='developer-result bad';}el.hidden=false;};}
function openPem(){showPanel(`${toolHeader('PEM Inspector','Reads PEM labels and payload length; it does not claim certificate verification.')}<div class="developer-toolbar"><button id="inspectPem" class="developer-button primary">Inspect</button></div><div id="devToolResult" class="developer-result" hidden></div>`);bindClose();$('#inspectPem').onclick=()=>{const el=$('#devToolResult');const m=/-----BEGIN ([^-]+)-----([\s\S]*?)-----END \1-----/.exec(input.value.trim());if(!m){el.textContent='No matching PEM BEGIN/END block found.';el.className='developer-result bad';}else{try{const bytes=atob(m[2].replace(/\s+/g,''));el.textContent=`Type: ${m[1]}\nDER payload: ${bytes.length.toLocaleString()} bytes\nCryptographic verification: not performed`;el.className='developer-result good';}catch(e){el.textContent=`Invalid PEM Base64: ${e.message}`;el.className='developer-result bad';}}el.hidden=false;};}
async function hashText(algorithm){const digest=await crypto.subtle.digest(algorithm,new TextEncoder().encode(input.value));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function openHash(){showPanel(`${toolHeader('Hash','Web Crypto hashes the current UTF-8 input.')}<div class="developer-toolbar"><button data-hash="SHA-256" class="developer-button primary">SHA-256</button><button data-hash="SHA-384" class="developer-button">SHA-384</button><button data-hash="SHA-512" class="developer-button">SHA-512</button></div><div id="devToolResult" class="developer-result" hidden></div>`);bindClose();panel.querySelectorAll('[data-hash]').forEach(b=>b.onclick=async()=>{const el=$('#devToolResult');try{const value=await hashText(b.dataset.hash);el.textContent=value;el.hidden=false;writeOutput(value,`${b.dataset.hash} ready.`);}catch(e){el.textContent=e.message;el.hidden=false;}});}
function openRegex(){showPanel(`${toolHeader('Regex Tester','Runs JavaScript regular expressions against the persistent input.')}<div class="developer-form"><div class="developer-form-grid"><label>Pattern<input id="regexPattern" value="\\w+"></label><label>Flags<input id="regexFlags" value="g"></label><label style="grid-column:1/-1">Replacement (optional)<input id="regexReplacement" placeholder="leave empty to only inspect matches"></label></div><div class="developer-toolbar"><button id="runRegex" class="developer-button primary">Run</button><button id="replaceRegex" class="developer-button">Replace → output</button></div><div id="devToolResult" class="developer-result" hidden></div></div>`);bindClose();$('#runRegex').onclick=()=>{const el=$('#devToolResult');try{el.textContent=JSON.stringify(runRegex(input.value,$('#regexPattern').value,$('#regexFlags').value),null,2);el.className='developer-result good';}catch(e){el.textContent=e.message;el.className='developer-result bad';}el.hidden=false;};$('#replaceRegex').onclick=()=>{try{const re=new RegExp($('#regexPattern').value,$('#regexFlags').value);writeOutput(input.value.replace(re,$('#regexReplacement').value),'Regex replacement ready.');}catch(e){setStatus(e.message);}};}
function openDiff(){showPanel(`${toolHeader('Diff','Line-based comparison against a second input.')}<div class="developer-form"><label>Compare against<textarea id="developerCompare"></textarea></label><button id="runDiff" class="developer-button primary">Compare</button><div id="devToolResult" class="developer-result" hidden></div></div>`);bindClose();$('#runDiff').onclick=()=>{const parts=diffLines(input.value,$('#developerCompare').value),el=$('#devToolResult');el.hidden=false;el.innerHTML=parts.map(p=>`${p.type==='add'?'+':p.type==='remove'?'-':' '} ${escapeHtml(p.value)}`).join('\n');};}
async function openSchema(){showPanel(`${toolHeader('JSON Schema','Uses Ajv 8 only when validation is requested.')}<div class="developer-form"><label>JSON Schema<textarea id="schemaInput">{\n  "type": "object",\n  "required": ["name"],\n  "properties": { "name": { "type": "string" } }\n}</textarea></label><button id="runSchema" class="developer-button primary">Validate input JSON</button><div id="devToolResult" class="developer-result">Ajv loads on first validation.</div></div>`);bindClose();$('#runSchema').onclick=async()=>{const el=$('#devToolResult');try{const Ajv=await loadAjv();const ajv=new Ajv({allErrors:true,strict:false});const validate=ajv.compile(JSON.parse($('#schemaInput').value));const valid=validate(JSON.parse(input.value));el.textContent=valid?'Valid against schema':JSON.stringify(validate.errors,null,2);el.className=`developer-result ${valid?'good':'bad'}`;}catch(e){el.textContent=e.message;el.className='developer-result bad';}};}
function openApi(){showPanel(`${toolHeader('API Request','Runs fetch directly from your browser. CORS rules apply; no Toolbox proxy is used.')}<div class="developer-form"><div class="developer-form-grid"><label>Method<select id="apiMethod"><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select></label><label>URL<input id="apiUrl" placeholder="https://api.example.com/data"></label></div><label>Headers JSON<textarea id="apiHeaders">{}</textarea></label><label>Body<textarea id="apiBody"></textarea></label><button id="runApi" class="developer-button primary">Send request</button><div id="devToolResult" class="developer-result" hidden></div></div>`);bindClose();$('#runApi').onclick=async()=>{const el=$('#devToolResult');el.hidden=false;el.textContent='Requesting…';try{const method=$('#apiMethod').value,headers=JSON.parse($('#apiHeaders').value||'{}'),options={method,headers};if(!['GET','HEAD'].includes(method)&&$('#apiBody').value)options.body=$('#apiBody').value;const response=await fetch($('#apiUrl').value,options);const body=await response.text();el.textContent=`${response.status} ${response.statusText}\n${[...response.headers].map(([k,v])=>`${k}: ${v}`).join('\n')}\n\n${body}`;el.className=`developer-result ${response.ok?'good':'bad'}`;}catch(e){el.textContent=`Request failed: ${e.message}\n\nThe remote server may block browser CORS requests.`;el.className='developer-result bad';}};}
function openPlayground(){showPanel(`${toolHeader('HTML / CSS / JS Playground','Runs in a sandboxed iframe with scripts allowed but without same-origin access.')}<div class="playground-grid"><label>HTML<textarea id="playHtml"><h1>Hello</h1></textarea></label><label>CSS<textarea id="playCss">body { font-family: system-ui; }</textarea></label><label>JavaScript<textarea id="playJs">document.body.append(' ✓');</textarea></label></div><div class="developer-toolbar"><button id="runPlayground" class="developer-button primary">Run</button></div><iframe id="playgroundFrame" class="playground-frame" sandbox="allow-scripts" title="Sandboxed playground"></iframe>`);bindClose();$('#runPlayground').onclick=()=>{$('#playgroundFrame').srcdoc=`<!doctype html><html><head><style>${$('#playCss').value}</style></head><body>${$('#playHtml').value}<script>${$('#playJs').value.replace(/<\/script/gi,'<\\/script')}<\/script></body></html>`;};$('#runPlayground').click();}

const tools={json:openJson,yaml:openYaml,xml:openXml,base64:openBase64,url:openUrl,encoding:openEncoding,jwt:openJwt,schema:openSchema,hash:openHash,pem:openPem,regex:openRegex,diff:openDiff,api:openApi,playground:openPlayground};
document.querySelectorAll('[data-dev-tool]').forEach(button=>button.addEventListener('click',()=>tools[button.dataset.devTool]?.()));

input.addEventListener('input',syncDetected);
$('#copyDeveloperOutput').onclick=()=>copyText(output.value).then(()=>setStatus('Output copied.')).catch(e=>setStatus(e.message));
$('#useDeveloperOutput').onclick=()=>{input.value=output.value;chain=[];renderChain();syncDetected();commitInput('Use output as input');setStatus('Output moved to input.');};
$('#undoDeveloper').onclick=()=>{if(history.canUndo())restoreInput(history.undo());};$('#redoDeveloper').onclick=()=>{if(history.canRedo())restoreInput(history.redo());};
$('#clearChain').onclick=()=>{chain=[];renderChain();setStatus('Operation chain cleared.');};
$('#showDeveloperHistory').onclick=()=>{renderHistory();historyEl.hidden=false;};$('#closeDeveloperHistory').onclick=()=>historyEl.hidden=true;
$('#downloadDeveloperOutput').onclick=()=>downloadBlob(new Blob([output.value],{type:'text/plain;charset=utf-8'}),'developer-output.txt');

const requested=new URLSearchParams(location.search).get('action');
const routeMap={json:'json',base64:'base64',url:'url',jwt:'jwt',regex:'regex',hash:'hash',diff:'diff',api:'api',schema:'schema',playground:'playground'};
if(requested&&routeMap[requested])queueMicrotask(()=>document.querySelector(`[data-dev-tool="${routeMap[requested]}"]`)?.click());

syncDetected();renderHistory();renderChain();
