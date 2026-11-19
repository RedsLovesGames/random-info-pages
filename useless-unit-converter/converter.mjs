import { convertUnit, unitInfo } from '../tools/math/units-core.js';

export const categories = {
  length: {
    base: 'm',
    inputs: { cm: 'Centimeters', m: 'Meters', km: 'Kilometers', in: 'Inches', ft: 'Feet', yd: 'Yards', mi: 'Miles', mm: 'Millimeters' },
    presets: [
      { label: '180 cm tall', amount: '180', unit: 'cm' },
      { label: 'A 5K', amount: '5', unit: 'km' },
      { label: 'A mile', amount: '1', unit: 'mi' },
    ],
    comparisons: [
      { id: 'banana', name: 'banana', plural: 'bananas', size: 0.18, definition: '18 cm from end to end' },
      { id: 'pizza', name: 'pizza box', plural: 'pizza boxes', size: 0.3556, definition: '14 inches across' },
      { id: 'noodle', name: 'pool noodle', plural: 'pool noodles', size: 1.5, definition: '1.5 meters long' },
      { id: 'cart', name: 'shopping cart', plural: 'shopping carts', size: 1, definition: '1 meter front to back' },
      { id: 'hotdog', name: 'hot dog', plural: 'hot dogs', size: 0.1524, definition: '6 inches long' },
      { id: 'keyboard', name: 'full-size keyboard', plural: 'full-size keyboards', size: 0.45, definition: '45 cm from edge to edge' },
    ],
  },
  time: {
    base: 's',
    inputs: { s: 'Seconds', min: 'Minutes', h: 'Hours', day: 'Days' },
    presets: [
      { label: '30-min commute', amount: '30', unit: 'min' },
      { label: '8 hours of sleep', amount: '8', unit: 'h' },
      { label: 'One week', amount: '7', unit: 'day' },
    ],
    comparisons: [
      { id: 'minecraft', name: 'Minecraft day', plural: 'Minecraft days', size: 1200, definition: '20 minutes for a full day-night cycle',
        source: 'https://minecraft.wiki/w/Daylight_cycle' },
      { id: 'ad', name: '30-second ad', plural: '30-second ads', size: 30, definition: '30 seconds before your video starts' },
      { id: 'sitcom', name: 'sitcom episode', plural: 'sitcom episodes', size: 1320, definition: '22 minutes without ads' },
      { id: 'song', name: 'pop song', plural: 'pop songs', size: 210, definition: '3 minutes and 30 seconds' },
      { id: 'popcorn', name: 'microwave popcorn cycle', plural: 'microwave popcorn cycles', size: 150, definition: '2 minutes and 30 seconds' },
      { id: 'nap', name: 'catnap', plural: 'catnaps', size: 900, definition: '15 minutes with your eyes shut' },
    ],
  },
};

const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });
const smallDecimal = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 4 });

export function formatNumber(value) {
  if ((value > 0 && value < 0.001) || value >= 1e9) return value.toExponential(3).replace(/\.?0+e\+?/, 'e').replace('e+', 'e');
  return (value > 0 && value < 1 ? smallDecimal : decimal).format(value);
}

export function calculateComparison(rawAmount, inputUnit, comparisonId) {
  const dimension = unitInfo(inputUnit)?.dimension;
  const category = Object.hasOwn(categories, dimension) ? categories[dimension] : null;
  const comparison = category?.comparisons.find(item => item.id === comparisonId);
  const amount = Number(rawAmount);
  if (!comparison || rawAmount.trim() === '' || !Number.isFinite(amount) || amount < 0) return null;

  const amountInBase = convertUnit(amount, inputUnit, category.base);
  const count = amountInBase / comparison.size;
  if (!Number.isFinite(count)) return null;
  return { amount, amountInBase, count, base: category.base, comparison };
}
