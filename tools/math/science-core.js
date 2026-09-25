const finite = (value, name = 'value') => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${name} must be numeric.`);
  return number;
};
const nonNegative = (value, name = 'value') => {
  const number = finite(value, name);
  if (number < 0) throw new Error(`${name} must be non-negative.`);
  return number;
};

export function circleMetrics(radius) {
  const r = nonNegative(radius, 'radius');
  return { radius: r, area: Math.PI * r * r, circumference: 2 * Math.PI * r, formula: 'A = πr²; C = 2πr' };
}
export function rectangleMetrics(width, height) {
  const w = nonNegative(width, 'width'), h = nonNegative(height, 'height');
  return { area: w * h, perimeter: 2 * (w + h), formula: 'A = wh; P = 2(w + h)' };
}
export function triangleMetrics(base, height) {
  const b = nonNegative(base, 'base'), h = nonNegative(height, 'height');
  return { area: 0.5 * b * h, formula: 'A = ½bh' };
}
export function sphereMetrics(radius) {
  const r = nonNegative(radius, 'radius');
  return { radius: r, volume: (4 / 3) * Math.PI * r ** 3, surfaceArea: 4 * Math.PI * r * r, formula: 'V = 4/3πr³; A = 4πr²' };
}
export function cylinderMetrics(radius, height) {
  const r = nonNegative(radius, 'radius'), h = nonNegative(height, 'height');
  return { volume: Math.PI * r * r * h, surfaceArea: 2 * Math.PI * r * (r + h), formula: 'V = πr²h; A = 2πr(r + h)' };
}

export function kinematicsFinalVelocity({ initialVelocity = 0, acceleration = 0, time = 0 } = {}) {
  const u = finite(initialVelocity, 'initial velocity'), a = finite(acceleration, 'acceleration'), t = finite(time, 'time');
  return u + a * t;
}
export function kinematicsDisplacement({ initialVelocity = 0, acceleration = 0, time = 0 } = {}) {
  const u = finite(initialVelocity, 'initial velocity'), a = finite(acceleration, 'acceleration'), t = finite(time, 'time');
  return u * t + 0.5 * a * t * t;
}
export function kineticEnergy({ mass = 0, velocity = 0 } = {}) {
  const m = nonNegative(mass, 'mass'), v = finite(velocity, 'velocity');
  return 0.5 * m * v * v;
}
export function potentialEnergy({ mass = 0, height = 0, gravity = 9.80665 } = {}) {
  return nonNegative(mass, 'mass') * finite(gravity, 'gravity') * finite(height, 'height');
}
export function vectorMagnitude(...components) {
  const values = components.flat().map((value, index) => finite(value, `component ${index + 1}`));
  return Math.hypot(...values);
}

const ATOMIC_MASS = {
  H: 1.008, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011, N: 14.007, O: 15.999, F: 18.998, Ne: 20.180,
  Na: 22.990, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45, Ar: 39.948, K: 39.0983, Ca: 40.078,
  Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996, Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38,
  Br: 79.904, Ag: 107.8682, I: 126.90447, Ba: 137.327, Pt: 195.084, Au: 196.96657, Hg: 200.592, Pb: 207.2,
};

function parseFormula(formula) {
  const source = String(formula || '').trim();
  if (!source) throw new Error('Chemical formula is required.');
  let index = 0;
  const readNumber = () => {
    const start = index;
    while (/\d/.test(source[index] || '')) index += 1;
    return start === index ? 1 : Number(source.slice(start, index));
  };
  const group = stopAtParen => {
    const counts = {};
    while (index < source.length) {
      if (source[index] === ')') {
        if (!stopAtParen) throw new Error('Unexpected closing parenthesis.');
        index += 1;
        return { counts, multiplier: readNumber() };
      }
      if (source[index] === '(') {
        index += 1;
        const nested = group(true);
        for (const [element, count] of Object.entries(nested.counts)) counts[element] = (counts[element] || 0) + count * nested.multiplier;
        continue;
      }
      const match = source.slice(index).match(/^[A-Z][a-z]?/);
      if (!match) throw new Error(`Invalid chemical formula near “${source.slice(index)}”.`);
      const element = match[0];
      if (!ATOMIC_MASS[element]) throw new Error(`Unknown element: ${element}.`);
      index += element.length;
      counts[element] = (counts[element] || 0) + readNumber();
    }
    if (stopAtParen) throw new Error('Unclosed parenthesis in chemical formula.');
    return { counts, multiplier: 1 };
  };
  return group(false).counts;
}

export function molarMass(formula) {
  const counts = parseFormula(formula);
  return Object.entries(counts).reduce((sum, [element, count]) => sum + ATOMIC_MASS[element] * count, 0);
}
export function molesFromMass(massGrams, formula) {
  return nonNegative(massGrams, 'mass') / molarMass(formula);
}
export function dilution(values = {}) {
  const keys = ['c1', 'v1', 'c2', 'v2'];
  const missing = keys.filter(key => values[key] === undefined || values[key] === null || values[key] === '');
  if (missing.length !== 1) throw new Error('Provide exactly three dilution values.');
  const result = {};
  for (const key of keys) if (!missing.includes(key)) result[key] = nonNegative(values[key], key);
  const key = missing[0];
  if (key === 'c1') result.c1 = result.c2 * result.v2 / result.v1;
  if (key === 'v1') result.v1 = result.c2 * result.v2 / result.c1;
  if (key === 'c2') result.c2 = result.c1 * result.v1 / result.v2;
  if (key === 'v2') result.v2 = result.c1 * result.v1 / result.c2;
  if (!Number.isFinite(result[key])) throw new Error('Dilution values must be greater than zero where used as divisors.');
  return { ...result, formula: 'C₁V₁ = C₂V₂' };
}

export function ohmsLaw(values = {}) {
  let { voltage, current, resistance } = values;
  const known = [voltage, current, resistance].filter(value => value !== undefined && value !== null && value !== '').length;
  if (known !== 2) throw new Error('Provide exactly two of voltage, current, and resistance.');
  if (voltage === undefined || voltage === null || voltage === '') voltage = finite(current, 'current') * finite(resistance, 'resistance');
  else if (current === undefined || current === null || current === '') current = finite(voltage, 'voltage') / finite(resistance, 'resistance');
  else if (resistance === undefined || resistance === null || resistance === '') resistance = finite(voltage, 'voltage') / finite(current, 'current');
  voltage = finite(voltage, 'voltage'); current = finite(current, 'current'); resistance = finite(resistance, 'resistance');
  return { voltage, current, resistance, power: voltage * current, formula: 'V = IR; P = VI' };
}
export function voltageDivider({ inputVoltage = 0, r1 = 0, r2 = 0 } = {}) {
  const vin = finite(inputVoltage, 'input voltage'), top = nonNegative(r1, 'R1'), bottom = nonNegative(r2, 'R2');
  if (top + bottom === 0) throw new Error('R1 + R2 must be greater than zero.');
  return vin * bottom / (top + bottom);
}
export function equivalentResistance(resistors, mode = 'series') {
  if (!Array.isArray(resistors) || !resistors.length) throw new Error('At least one resistor is required.');
  const values = resistors.map((value, index) => nonNegative(value, `resistor ${index + 1}`));
  if (mode === 'series') return values.reduce((sum, value) => sum + value, 0);
  if (mode === 'parallel') {
    if (values.some(value => value === 0)) return 0;
    return 1 / values.reduce((sum, value) => sum + 1 / value, 0);
  }
  throw new Error('Resistance mode must be series or parallel.');
}
