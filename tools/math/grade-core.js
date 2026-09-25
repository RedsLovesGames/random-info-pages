const num = (value, name) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be numeric.`);
  return parsed;
};

export function weightedGrade(entries = []) {
  if (!Array.isArray(entries) || !entries.length) throw new Error('At least one grade is required.');
  let weighted = 0, totalWeight = 0;
  for (const [index, entry] of entries.entries()) {
    const score = num(entry.score, `score ${index + 1}`);
    const weight = num(entry.weight, `weight ${index + 1}`);
    if (weight < 0) throw new Error('Weights must be non-negative.');
    weighted += score * weight;
    totalWeight += weight;
  }
  if (totalWeight <= 0) throw new Error('Total weight must be greater than zero.');
  return weighted / totalWeight;
}

export function requiredFinalScore({ currentGrade, currentWeight, targetGrade, finalWeight } = {}) {
  const current = num(currentGrade, 'current grade');
  const currentPart = num(currentWeight, 'current weight');
  const target = num(targetGrade, 'target grade');
  const finalPart = num(finalWeight, 'final weight');
  if (currentPart < 0 || finalPart <= 0) throw new Error('Weights must be positive.');
  return (target - current * currentPart) / finalPart;
}

export function gradePoints(earned, possible) {
  const got = num(earned, 'earned points'), max = num(possible, 'possible points');
  if (max <= 0) throw new Error('Possible points must be greater than zero.');
  return got / max * 100;
}
