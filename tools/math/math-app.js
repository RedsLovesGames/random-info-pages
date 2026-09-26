import { evaluateExpression, solveLinear2, quadraticRoots, sampleFunction } from './calc-core.js';
import { convertUnit, listUnitsForDimension, unitInfo, UNIT_DIMENSIONS } from './units-core.js';
import {
  circleMetrics, rectangleMetrics, triangleMetrics, sphereMetrics, cylinderMetrics,
  kinematicsFinalVelocity, kinematicsDisplacement, kineticEnergy, potentialEnergy, vectorMagnitude,
  molarMass, molesFromMass, dilution, ohmsLaw, voltageDivider, equivalentResistance,
} from './science-core.js';
import { weightedGrade, requiredFinalScore } from './grade-core.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const fmt = (value, digits = 6) => Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
const value = id => $(id).value;
const number = id => Number(value(id));
const setResult = (id, main, detail = '', error = false) => {
  const box = $(id); box.classList.toggle('math-error', error);
  box.querySelector('strong').textContent = main;
  const formula = box.querySelector('.formula'); if (formula && detail) formula.textContent = detail;
};
const safeRun = (id, fn) => { try { fn(); } catch (error) { setResult(id, 'Could not calculate', error.message || String(error), true); } };

function setMode(mode, updateUrl = true) {
  const valid = $$('[data-math-mode]').map(button => button.dataset.mathMode);
  const selected = valid.includes(mode) ? mode : 'calculator';
  $$('[data-math-mode]').forEach(button => { const active = button.dataset.mathMode === selected; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  $$('[data-math-panel]').forEach(panel => panel.hidden = panel.dataset.mathPanel !== selected);
  if (updateUrl) { const url = new URL(location.href); url.searchParams.set('action', selected); history.replaceState(null, '', url); }
  if (selected === 'graph') drawGraph();
}
$$('[data-math-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mathMode)));

function calculate() { safeRun('#calcResult', () => setResult('#calcResult', fmt(evaluateExpression(value('#calcExpression'))), 'Formula: parsed locally using standard operator precedence; ^ is exponentiation.')); }
$('#calculateExpression').addEventListener('click', calculate);
$('#calcExpression').addEventListener('keydown', event => { if (event.key === 'Enter') calculate(); });
calculate();

const unitSymbols = UNIT_DIMENSIONS.flatMap(dimension => listUnitsForDimension(dimension));
for (const select of [$('#unitFrom'), $('#unitTo')]) for (const symbol of unitSymbols) { const info = unitInfo(symbol); const option = document.createElement('option'); option.value = symbol; option.textContent = `${symbol} · ${info.label}`; option.dataset.dimension = info.dimension; select.append(option); }
$('#unitFrom').value = 'm'; $('#unitTo').value = 'km';
function syncUnitTargets() {
  const dimension = unitInfo(value('#unitFrom'))?.dimension;
  [...$('#unitTo').options].forEach(option => option.hidden = option.dataset.dimension !== dimension);
  if (unitInfo(value('#unitTo'))?.dimension !== dimension) $('#unitTo').value = listUnitsForDimension(dimension)[1] || listUnitsForDimension(dimension)[0];
  updateUnits();
}
function updateUnits() { safeRun('#unitResult', () => { const from = value('#unitFrom'), to = value('#unitTo'), result = convertUnit(number('#unitValue'), from, to); setResult('#unitResult', `${fmt(result)} ${to}`, `Units: ${number('#unitValue')} ${from} → ${to}; dimension = ${unitInfo(from).dimension}.`); }); }
$('#unitFrom').addEventListener('change', syncUnitTargets); $('#unitTo').addEventListener('change', updateUnits); $('#unitValue').addEventListener('input', updateUnits); updateUnits();

function updateAlgebra() {
  safeRun('#quadResult', () => { const roots = quadraticRoots(number('#quadA'), number('#quadB'), number('#quadC')); setResult('#quadResult', roots.length ? roots.map(root => `x = ${fmt(root)}`).join(' · ') : 'No real roots', 'Formula: x = (−b ± √(b² − 4ac)) / 2a'); });
  safeRun('#linearResult', () => { const result = solveLinear2([[number('#mA'), number('#mB')], [number('#mC'), number('#mD')]], [number('#mE'), number('#mF')]); setResult('#linearResult', `x = ${fmt(result.x)} · y = ${fmt(result.y)}`, 'Formula: Cramer’s rule using the determinant ad − bc.'); });
}
for (const id of ['#quadA','#quadB','#quadC','#mA','#mB','#mC','#mD','#mE','#mF']) $(id).addEventListener('input', updateAlgebra); updateAlgebra();

function drawGraph() {
  const canvas = $('#graphCanvas'), ctx = canvas.getContext('2d');
  try {
    const points = sampleFunction(value('#graphExpression'), number('#graphMin'), number('#graphMax'), Math.min(2000, Math.max(2, Number(value('#graphSamples')) || 401)));
    const finite = points.filter(point => Number.isFinite(point.y));
    if (!finite.length) throw new Error('No finite y-values in this range.');
    let minY = Math.min(...finite.map(point => point.y)), maxY = Math.max(...finite.map(point => point.y));
    if (minY === maxY) { minY -= 1; maxY += 1; }
    const pad = (maxY - minY) * .08; minY -= pad; maxY += pad;
    const w = canvas.width, h = canvas.height, minX = number('#graphMin'), maxX = number('#graphMax');
    const px = x => (x - minX) / (maxX - minX) * w, py = y => h - (y - minY) / (maxY - minY) * h;
    ctx.clearRect(0,0,w,h); ctx.strokeStyle = 'rgba(240,238,230,.18)'; ctx.lineWidth = 2;
    if (minX <= 0 && maxX >= 0) { ctx.beginPath(); ctx.moveTo(px(0),0); ctx.lineTo(px(0),h); ctx.stroke(); }
    if (minY <= 0 && maxY >= 0) { ctx.beginPath(); ctx.moveTo(0,py(0)); ctx.lineTo(w,py(0)); ctx.stroke(); }
    ctx.strokeStyle = '#d9ff62'; ctx.lineWidth = 3; ctx.beginPath(); let started = false;
    for (const point of points) { if (!Number.isFinite(point.y)) { started = false; continue; } const x = px(point.x), y = py(point.y); if (!started) { ctx.moveTo(x,y); started = true; } else ctx.lineTo(x,y); }
    ctx.stroke(); $('#graphStatus').textContent = `y = ${value('#graphExpression')} · x ${fmt(minX)} to ${fmt(maxX)} · y ${fmt(minY)} to ${fmt(maxY)}`; $('#graphStatus').classList.remove('math-error');
  } catch (error) { ctx.clearRect(0,0,canvas.width,canvas.height); $('#graphStatus').textContent = error.message || error; $('#graphStatus').classList.add('math-error'); }
}
for (const id of ['#graphExpression','#graphMin','#graphMax','#graphSamples']) $(id).addEventListener('input', drawGraph);

function updateGeometry() {
  safeRun('#geometryResult', () => {
    const shape = value('#geometryShape'), a = number('#geometryA'), b = number('#geometryB'); let result;
    if (shape === 'circle') result = circleMetrics(a);
    else if (shape === 'rectangle') result = rectangleMetrics(a,b);
    else if (shape === 'triangle') result = triangleMetrics(a,b);
    else if (shape === 'sphere') result = sphereMetrics(a);
    else result = cylinderMetrics(a,b);
    const parts = Object.entries(result).filter(([key,val]) => key !== 'formula' && key !== 'radius' && typeof val === 'number').map(([key,val]) => `${key}: ${fmt(val)}`);
    setResult('#geometryResult', parts.join(' · '), `Formula: ${result.formula}`);
  });
}
function syncGeometryLabels(){ const shape=value('#geometryShape'); $('#geometryALabel').textContent = ['circle','sphere','cylinder'].includes(shape) ? 'Radius' : shape==='rectangle' ? 'Width' : 'Base'; $('#geometryBLabel').textContent = shape==='rectangle' ? 'Height' : shape==='triangle' ? 'Height' : shape==='cylinder' ? 'Height' : 'Second value (unused)'; updateGeometry(); }
$('#geometryShape').addEventListener('change', syncGeometryLabels); $('#geometryA').addEventListener('input', updateGeometry); $('#geometryB').addEventListener('input', updateGeometry); syncGeometryLabels();

const physicsMeta = {
  velocity: ['u · m/s','a · m/s²','t · s','unused','v = u + at','m/s'],
  displacement: ['u · m/s','a · m/s²','t · s','unused','s = ut + ½at²','m'],
  kinetic: ['m · kg','v · m/s','unused','unused','KE = ½mv²','J'],
  potential: ['m · kg','h · m','g · m/s²','unused','PE = mgh','J'],
  vector: ['x','y','unused','unused','|v| = √(x² + y²)',''],
};
function updatePhysics(){ safeRun('#physicsResult',()=>{ const type=value('#physicsType'), a=number('#physicsA'), b=number('#physicsB'), c=number('#physicsC'); let result; if(type==='velocity') result=kinematicsFinalVelocity({initialVelocity:a,acceleration:b,time:c}); else if(type==='displacement') result=kinematicsDisplacement({initialVelocity:a,acceleration:b,time:c}); else if(type==='kinetic') result=kineticEnergy({mass:a,velocity:b}); else if(type==='potential') result=potentialEnergy({mass:a,height:b,gravity:c}); else result=vectorMagnitude(a,b); const meta=physicsMeta[type]; setResult('#physicsResult',`${fmt(result)} ${meta[5]}`.trim(),`Formula: ${meta[4]}. Variables use SI units shown above.`); }); }
function syncPhysics(){ const meta=physicsMeta[value('#physicsType')]; ['A','B','C','D'].forEach((letter,index)=>$(`#physics${letter}Label`).textContent=meta[index]); if(value('#physicsType')==='potential') $('#physicsC').value='9.80665'; updatePhysics(); }
$('#physicsType').addEventListener('change',syncPhysics); for(const id of ['#physicsA','#physicsB','#physicsC','#physicsD']) $(id).addEventListener('input',updatePhysics); syncPhysics();

function updateChem(){ safeRun('#chemMassResult',()=>{ const formula=value('#chemFormula'), mass=molarMass(formula), moles=molesFromMass(number('#chemMass'),formula); setResult('#chemMassResult',`${fmt(mass,4)} g/mol · ${fmt(moles,6)} mol`,`Formula: n = m/M. M(${formula}) = ${fmt(mass,4)} g/mol.`); }); safeRun('#dilutionResult',()=>{ const fields={c1:value('#chemC1'),v1:value('#chemV1'),c2:value('#chemC2'),v2:value('#chemV2')}; for(const key of Object.keys(fields)) if(fields[key] !== '') fields[key]=Number(fields[key]); const result=dilution(fields); const missing=['c1','v1','c2','v2'].find(key=>value(`#chem${key.toUpperCase()}`)===''); setResult('#dilutionResult',`${missing.toUpperCase()} = ${fmt(result[missing])}`,'Formula: C₁V₁ = C₂V₂. Concentration and volume units must be internally consistent.'); }); }
for(const id of ['#chemFormula','#chemMass','#chemC1','#chemV1','#chemC2','#chemV2']) $(id).addEventListener('input',updateChem); updateChem();

function updateElectronics(){ safeRun('#ohmResult',()=>{ const raw={voltage:value('#ohmVoltage'),current:value('#ohmCurrent'),resistance:value('#ohmResistance')}; for(const key in raw) if(raw[key] !== '') raw[key]=Number(raw[key]); else delete raw[key]; const r=ohmsLaw(raw); setResult('#ohmResult',`${fmt(r.voltage)} V · ${fmt(r.current)} A · ${fmt(r.resistance)} Ω · ${fmt(r.power)} W`,'Formula: V = IR; P = VI.'); }); safeRun('#dividerResult',()=>{ const v=voltageDivider({inputVoltage:number('#dividerVin'),r1:number('#dividerR1'),r2:number('#dividerR2')}); const list=value('#resistorList').split(',').map(x=>Number(x.trim())).filter(Number.isFinite); const series=equivalentResistance(list,'series'), parallel=equivalentResistance(list,'parallel'); setResult('#dividerResult',`Vout ${fmt(v)} V · series ${fmt(series)} Ω · parallel ${fmt(parallel)} Ω`,'Formula: Vout = Vin×R₂/(R₁+R₂); series ΣR; parallel 1/Σ(1/R).'); }); }
for(const id of ['#ohmVoltage','#ohmCurrent','#ohmResistance','#dividerVin','#dividerR1','#dividerR2','#resistorList']) $(id).addEventListener('input',updateElectronics); updateElectronics();

function updateGrades(){ safeRun('#weightedGradeResult',()=>{ const entries=value('#gradeEntries').split(/\n+/).filter(Boolean).map((line,index)=>{ const [score,weight]=line.split(':').map(Number); if(!Number.isFinite(score)||!Number.isFinite(weight)) throw new Error(`Line ${index+1} must use score:weight.`); return {score,weight}; }); setResult('#weightedGradeResult',`${fmt(weightedGrade(entries),2)}%`,'Formula: Σ(score × weight) / Σ(weight). Weights may be percentages or decimals if used consistently.'); }); safeRun('#requiredFinalResult',()=>{ const result=requiredFinalScore({currentGrade:number('#currentGrade'),currentWeight:number('#currentWeight')/100,targetGrade:number('#targetGrade'),finalWeight:number('#finalWeight')/100}); const note=result>100?'Above 100%: target is not reachable without extra credit.':result<0?'Below 0%: target is already secured under these assumptions.':'Formula: F = (target − current×currentWeight) / finalWeight.'; setResult('#requiredFinalResult',`${fmt(result,2)}%`,note); }); }
for(const id of ['#gradeEntries','#currentGrade','#currentWeight','#targetGrade','#finalWeight']) $(id).addEventListener('input',updateGrades); updateGrades();

const requested = new URLSearchParams(location.search).get('action') || new URLSearchParams(location.search).get('mode');
setMode(requested || 'calculator', false);
