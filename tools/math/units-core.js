const linear = (dimension, factor, label) => ({ dimension, label, toBase: value => value * factor, fromBase: value => value / factor });
const units = {
  m: linear('length', 1, 'meters'), km: linear('length', 1000, 'kilometers'), cm: linear('length', 0.01, 'centimeters'), mm: linear('length', 0.001, 'millimeters'),
  in: linear('length', 0.0254, 'inches'), ft: linear('length', 0.3048, 'feet'), yd: linear('length', 0.9144, 'yards'), mi: linear('length', 1609.344, 'miles'),
  kg: linear('mass', 1, 'kilograms'), g: linear('mass', 0.001, 'grams'), mg: linear('mass', 1e-6, 'milligrams'), lb: linear('mass', 0.45359237, 'pounds'), oz: linear('mass', 0.028349523125, 'ounces'),
  s: linear('time', 1, 'seconds'), min: linear('time', 60, 'minutes'), h: linear('time', 3600, 'hours'), day: linear('time', 86400, 'days'),
  'm/s': linear('speed', 1, 'meters/second'), 'km/h': linear('speed', 1 / 3.6, 'kilometers/hour'), mph: linear('speed', 0.44704, 'miles/hour'), 'ft/s': linear('speed', 0.3048, 'feet/second'),
  m2: linear('area', 1, 'square meters'), km2: linear('area', 1e6, 'square kilometers'), ft2: linear('area', 0.09290304, 'square feet'), acre: linear('area', 4046.8564224, 'acres'),
  L: linear('volume', 1, 'liters'), mL: linear('volume', 0.001, 'milliliters'), m3: linear('volume', 1000, 'cubic meters'), gal: linear('volume', 3.785411784, 'US gallons'),
  C: { dimension: 'temperature', label: 'Celsius', toBase: value => value + 273.15, fromBase: value => value - 273.15 },
  F: { dimension: 'temperature', label: 'Fahrenheit', toBase: value => (value - 32) * 5 / 9 + 273.15, fromBase: value => (value - 273.15) * 9 / 5 + 32 },
  K: { dimension: 'temperature', label: 'Kelvin', toBase: value => value, fromBase: value => value },
};

export function convertUnit(value, from, to) {
  const source = units[from], target = units[to], numeric = Number(value);
  if (!source || !target) throw new Error('Unknown unit.');
  if (source.dimension !== target.dimension) throw new Error(`Unit dimension mismatch: ${source.dimension} → ${target.dimension}.`);
  if (!Number.isFinite(numeric)) throw new Error('Value must be numeric.');
  return target.fromBase(source.toBase(numeric));
}

export function listUnitsForDimension(dimension) {
  return Object.entries(units).filter(([, unit]) => unit.dimension === dimension).map(([symbol]) => symbol);
}

export function unitInfo(symbol) {
  const unit = units[symbol];
  return unit ? { symbol, dimension: unit.dimension, label: unit.label } : null;
}

export const UNIT_DIMENSIONS = [...new Set(Object.values(units).map(unit => unit.dimension))];
