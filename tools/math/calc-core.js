const FUNCTIONS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sqrt: Math.sqrt, abs: Math.abs, ln: Math.log,
  log: Math.log10, exp: Math.exp, floor: Math.floor,
  ceil: Math.ceil, round: Math.round,
};
const CONSTANTS = { pi: Math.PI, e: Math.E };

function tokenize(source) {
  const tokens = [];
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    const whitespace = rest.match(/^\s+/);
    if (whitespace) { i += whitespace[0].length; continue; }
    const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    if (number) { tokens.push({ type: 'number', value: Number(number[0]) }); i += number[0].length; continue; }
    const identifier = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (identifier) { tokens.push({ type: 'identifier', value: identifier[0].toLowerCase() }); i += identifier[0].length; continue; }
    const char = source[i];
    if ('+-*/^(),'.includes(char)) { tokens.push({ type: char, value: char }); i += 1; continue; }
    throw new Error(`Unexpected token at position ${i + 1}.`);
  }
  tokens.push({ type: 'eof' });
  return tokens;
}

export function evaluateExpression(source, variables = {}) {
  if (typeof source !== 'string' || !source.trim()) throw new Error('Expression is required.');
  const tokens = tokenize(source);
  let at = 0;
  const peek = () => tokens[at];
  const take = type => {
    if (peek().type !== type) throw new Error(`Expected ${type} in expression.`);
    return tokens[at++];
  };

  function primary() {
    const token = peek();
    if (token.type === 'number') { at += 1; return token.value; }
    if (token.type === '(') { at += 1; const value = addSub(); take(')'); return value; }
    if (token.type === 'identifier') {
      at += 1;
      const name = token.value;
      if (peek().type === '(') {
        at += 1;
        if (!FUNCTIONS[name]) throw new Error(`Unknown function identifier: ${name}.`);
        const value = addSub();
        take(')');
        return FUNCTIONS[name](value);
      }
      if (Object.hasOwn(CONSTANTS, name)) return CONSTANTS[name];
      if (Object.hasOwn(variables, name) && Number.isFinite(Number(variables[name]))) return Number(variables[name]);
      throw new Error(`Unknown identifier: ${name}.`);
    }
    throw new Error('Invalid expression.');
  }
  function power() {
    const left = primary();
    if (peek().type === '^') { at += 1; return Math.pow(left, unary()); }
    return left;
  }
  function unary() {
    if (peek().type === '+') { at += 1; return unary(); }
    if (peek().type === '-') { at += 1; return -unary(); }
    return power();
  }
  function mulDiv() {
    let value = unary();
    while (peek().type === '*' || peek().type === '/') {
      const op = tokens[at++].type;
      const right = unary();
      value = op === '*' ? value * right : value / right;
    }
    return value;
  }
  function addSub() {
    let value = mulDiv();
    while (peek().type === '+' || peek().type === '-') {
      const op = tokens[at++].type;
      const right = mulDiv();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  }

  const result = addSub();
  if (peek().type !== 'eof') throw new Error('Unexpected token after expression.');
  if (!Number.isFinite(result)) throw new Error('Expression result is not finite.');
  return result;
}

export function determinant2(matrix) {
  if (!Array.isArray(matrix) || matrix.length !== 2 || matrix.some(row => !Array.isArray(row) || row.length !== 2)) throw new Error('A 2×2 matrix is required.');
  const [[a, b], [c, d]] = matrix.map(row => row.map(Number));
  if (![a, b, c, d].every(Number.isFinite)) throw new Error('Matrix entries must be numbers.');
  return a * d - b * c;
}

export function solveLinear2(matrix, constants) {
  const det = determinant2(matrix);
  if (Math.abs(det) < 1e-12) throw new Error('System has no unique solution.');
  if (!Array.isArray(constants) || constants.length !== 2 || constants.some(value => !Number.isFinite(Number(value)))) throw new Error('Two numeric constants are required.');
  const [[a, b], [c, d]] = matrix.map(row => row.map(Number));
  const [e, f] = constants.map(Number);
  return { x: (e * d - b * f) / det, y: (a * f - e * c) / det };
}

export function quadraticRoots(a, b, c) {
  a = Number(a); b = Number(b); c = Number(c);
  if (![a, b, c].every(Number.isFinite) || Math.abs(a) < 1e-15) throw new Error('Quadratic coefficient a must be non-zero.');
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  if (Math.abs(discriminant) < 1e-15) return [-b / (2 * a)];
  const root = Math.sqrt(discriminant);
  return [(-b - root) / (2 * a), (-b + root) / (2 * a)].sort((x, y) => x - y);
}

export function sampleFunction(expression, minX = -10, maxX = 10, count = 201) {
  minX = Number(minX); maxX = Number(maxX); count = Math.trunc(Number(count));
  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || maxX <= minX) throw new Error('Graph range must have max > min.');
  if (!Number.isInteger(count) || count < 2 || count > 2000) throw new Error('Sample count must be between 2 and 2000.');
  const step = (maxX - minX) / (count - 1);
  return Array.from({ length: count }, (_, index) => {
    const x = index === count - 1 ? maxX : minX + step * index;
    let y = null;
    try { y = evaluateExpression(expression, { x }); } catch (_) { y = null; }
    return { x, y };
  });
}