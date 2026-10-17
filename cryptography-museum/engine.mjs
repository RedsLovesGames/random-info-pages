export const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const mod = n => ((n % 26) + 26) % 26;
const letter = n => ABC[mod(n)];
const mapLetters = (text, fn) => Array.from(String(text)).map(c => /^[a-z]$/i.test(c) ? fn(c.toUpperCase()) : c).join('');
export function caesar(text, shift, inverse = false) {
  if (!Number.isInteger(Number(shift))) throw new Error('Shift must be an integer.');
  return mapLetters(text, c => letter(ABC.indexOf(c) + Number(shift) * (inverse ? -1 : 1)));
}
export function substitute(text, alphabet, inverse = false) {
  alphabet = String(alphabet).toUpperCase();
  if (!/^[A-Z]{26}$/.test(alphabet) || new Set(alphabet).size !== 26) throw new Error('Use 26 unique letters, A–Z.');
  return mapLetters(text, c => inverse ? ABC[alphabet.indexOf(c)] : alphabet[ABC.indexOf(c)]);
}
export function vigenere(text, key, inverse = false) {
  key = String(key).toUpperCase();
  if (!/^[A-Z]+$/.test(key)) throw new Error('The key must contain only letters A–Z.');
  let i = 0;
  return mapLetters(text, c => letter(ABC.indexOf(c) + ABC.indexOf(key[i++ % key.length]) * (inverse ? -1 : 1)));
}
export function frequencies(text) {
  const counts = Array(26).fill(0);
  mapLetters(text, c => { counts[ABC.indexOf(c)]++; return c; });
  return counts;
}
export const ROTORS = {
  I: ['EKMFLGDQVZNTOWYHXUSPAIBRCJ', 'Q'],
  II: ['AJDKSIRUXBLHWTMCQGZNPYFVOE', 'E'],
  III: ['BDFHJLCPRTXVZNYEIWGAKMUSQO', 'V'],
  IV: ['ESOVPZJAYQUIRHXLNFTGKDCMWB', 'J'],
  V: ['VZBRGITYUPSDNHLXAWMJQOFECK', 'Z']
};
const REFLECTORS = {B:'YRUHQSLDPXNGOKMIEBFZCWVJAT', C:'FVPJIAOYEDRZXWGCTKUQSBNMHL'};
export class Enigma {
  constructor({rotors = ['I','II','III'], positions = 'AAA', rings = 'AAA', plugboard = '', reflector = 'B'} = {}) {
    if (!Array.isArray(rotors) || rotors.length !== 3 || new Set(rotors).size !== 3 || rotors.some(r => !ROTORS[r])) throw new Error('Choose three different rotors I–V.');
    if (!/^[A-Z]{3}$/.test(positions) || !/^[A-Z]{3}$/.test(rings)) throw new Error('Positions and rings each need three letters A–Z.');
    if (!REFLECTORS[reflector]) throw new Error('Choose reflector B or C.');
    this.rotors = rotors; this.p = [...positions].map(c => ABC.indexOf(c)); this.r = [...rings].map(c => ABC.indexOf(c)); this.reflector = reflector;
    this.plugs = [...Array(26).keys()];
    const used = new Set();
    const pairs = plugboard.toUpperCase().trim().split(/\s+/).filter(Boolean);
    if (pairs.length > 10) throw new Error('Use at most ten plugboard pairs.');
    for (const pair of pairs) {
      if (!/^[A-Z]{2}$/.test(pair) || pair[0] === pair[1]) throw new Error('Plugboard pairs must be two different letters.');
      for (const c of pair) { if (used.has(c)) throw new Error('Each plugboard letter may appear only once.'); used.add(c); }
      const [a,b] = [...pair].map(c => ABC.indexOf(c)); this.plugs[a] = b; this.plugs[b] = a;
    }
  }
  get positions() { return this.p.map(letter).join(''); }
  step() {
    // Notches move with the alphabet ring: window turnover letters do not depend on ring setting.
    const middleNotch = ROTORS[this.rotors[1]][1].includes(letter(this.p[1]));
    const rightNotch = ROTORS[this.rotors[2]][1].includes(letter(this.p[2]));
    if (middleNotch) this.p[0] = mod(this.p[0] + 1);
    if (middleNotch || rightNotch) this.p[1] = mod(this.p[1] + 1);
    this.p[2] = mod(this.p[2] + 1);
  }
  process(text) {
    const traces = [];
    const output = mapLetters(text, c => {
      const before = this.positions; this.step();
      let n = ABC.indexOf(c); const path = [{stage:'Key', letter:c}];
      const record = stage => path.push({stage, letter:letter(n)});
      n = this.plugs[n]; record('Plugboard →');
      for (const i of [2,1,0]) { const offset = this.p[i] - this.r[i]; n = mod(ABC.indexOf(ROTORS[this.rotors[i]][0][mod(n + offset)]) - offset); record(`Rotor ${this.rotors[i]} →`); }
      n = ABC.indexOf(REFLECTORS[this.reflector][n]); record(`Reflector ${this.reflector}`);
      for (const i of [0,1,2]) { const offset = this.p[i] - this.r[i]; n = mod(ROTORS[this.rotors[i]][0].indexOf(letter(n + offset)) - offset); record(`Rotor ${this.rotors[i]} ←`); }
      n = this.plugs[n]; record('Plugboard ←'); record('Lamp');
      traces.push({before, after:this.positions, path}); return letter(n);
    });
    return {text:output, positions:this.positions, traces};
  }
}
function cryptoAPI() {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto needs HTTPS or localhost in this browser.');
  return globalThis.crypto;
}
const encode = value => new TextEncoder().encode(value);
const to64 = bytes => btoa(Array.from(new Uint8Array(bytes), b => String.fromCharCode(b)).join(''));
function from64(value) { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
export async function sha256(text) { return Array.from(new Uint8Array(await cryptoAPI().subtle.digest('SHA-256', encode(text))), b => b.toString(16).padStart(2,'0')).join(''); }
export function hashDistance(a,b) { if(a.length !== b.length) throw new Error('Hashes need equal lengths.'); return [...a].reduce((sum,c,i) => sum + (parseInt(c,16) ^ parseInt(b[i],16)).toString(2).replaceAll('0','').length, 0); }
const ITERATIONS = 600000;
async function derive(passphrase, salt, iterations) {
  if (!passphrase) throw new Error('Enter a passphrase.');
  const subtle = cryptoAPI().subtle;
  const material = await subtle.importKey('raw', encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({name:'PBKDF2', hash:'SHA-256', salt, iterations}, material, {name:'AES-GCM',length:256}, false, ['encrypt','decrypt']);
}
export async function encrypt(text, passphrase) {
  const api = cryptoAPI(), salt = api.getRandomValues(new Uint8Array(16)), iv = api.getRandomValues(new Uint8Array(12));
  const key = await derive(passphrase, salt, ITERATIONS);
  const data = await api.subtle.encrypt({name:'AES-GCM', iv, tagLength:128}, key, encode(text));
  return {version:1, algorithm:'AES-256-GCM', kdf:'PBKDF2-SHA256', iterations:ITERATIONS, salt:to64(salt), iv:to64(iv), data:to64(data)};
}
export async function decrypt(envelope, passphrase) {
  let salt, iv, data;
  try {
    if (!envelope || envelope.version !== 1 || envelope.algorithm !== 'AES-256-GCM' || envelope.kdf !== 'PBKDF2-SHA256' || envelope.iterations !== ITERATIONS) throw 0;
    if ([envelope.salt, envelope.iv, envelope.data].some(x => typeof x !== 'string' || x.length > 200000)) throw 0;
    salt = from64(envelope.salt); iv = from64(envelope.iv); data = from64(envelope.data);
    if (salt.length !== 16 || iv.length !== 12 || data.length < 16) throw 0;
  } catch { throw new Error('Invalid encrypted envelope. Keep the original JSON fields and supported settings.'); }
  const key = await derive(passphrase, salt, ITERATIONS);
  try { return new TextDecoder('utf-8', {fatal:true}).decode(await cryptoAPI().subtle.decrypt({name:'AES-GCM', iv, tagLength:128}, key, data)); }
  catch { throw new Error('Authentication failed: the passphrase is wrong or the encrypted data was changed. No plaintext released.'); }
}
export async function generateSigningKeys() { return cryptoAPI().subtle.generateKey({name:'RSA-PSS',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'}, false, ['sign','verify']); }
export async function sign(text, privateKey) { return to64(await cryptoAPI().subtle.sign({name:'RSA-PSS',saltLength:32}, privateKey, encode(text))); }
export async function verify(text, signature, publicKey) { try { return await cryptoAPI().subtle.verify({name:'RSA-PSS',saltLength:32}, publicKey, from64(signature), encode(text)); } catch { return false; } }
