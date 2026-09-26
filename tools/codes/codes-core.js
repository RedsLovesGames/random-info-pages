const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?';
const WORDS = [
  'amber','anchor','apple','atlas','bamboo','beacon','birch','blue','cedar','cinder','cloud','coral','cosmos','crane',
  'delta','ember','falcon','fern','fjord','flint','forest','frost','globe','harbor','hazel','island','ivory','jade','juniper',
  'lagoon','lark','lemon','lotus','maple','marble','meadow','meteor','mint','moon','nova','oasis','ocean','opal','orbit',
  'pearl','pine','pixel','plum','quartz','raven','reef','river','sage','shell','solar','spruce','stone','storm','tide',
  'violet','willow','wind','zephyr',
];

function wifiEscape(value) {
  return String(value ?? '').replace(/([\\;,:\"])/g, '\\$1');
}

function escapeVcard(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function buildCodePayload(type, fields = {}) {
  switch (type) {
    case 'text':
    case 'url':
      return String(fields.text ?? fields.url ?? '');
    case 'wifi': {
      const security = String(fields.security || 'WPA').toUpperCase();
      const hidden = fields.hidden ? 'H:true;' : '';
      return `WIFI:T:${wifiEscape(security)};S:${wifiEscape(fields.ssid)};P:${wifiEscape(fields.password)};${hidden};`;
    }
    case 'email': {
      const address = String(fields.email || '');
      const params = new URLSearchParams();
      if (fields.subject) params.set('subject', String(fields.subject));
      if (fields.body) params.set('body', String(fields.body));
      const query = params.toString().replace(/\+/g, '%20');
      return `mailto:${address}${query ? `?${query}` : ''}`;
    }
    case 'sms': {
      const number = String(fields.phone || '');
      return `sms:${number}${fields.message ? `?body=${encodeURIComponent(String(fields.message))}` : ''}`;
    }
    case 'vcard': {
      const name = escapeVcard(fields.name || '');
      const phone = escapeVcard(fields.phone || '');
      const email = escapeVcard(fields.email || '');
      const org = escapeVcard(fields.organization || '');
      return ['BEGIN:VCARD','VERSION:3.0',`FN:${name}`,phone && `TEL:${phone}`,email && `EMAIL:${email}`,org && `ORG:${org}`,'END:VCARD'].filter(Boolean).join('\n');
    }
    case 'calendar': {
      const start = String(fields.start || '').replace(/[-:]/g, '').replace(/\.\d+/, '');
      const end = String(fields.end || '').replace(/[-:]/g, '').replace(/\.\d+/, '');
      return ['BEGIN:VEVENT',`SUMMARY:${String(fields.title || '').replace(/\n/g, ' ')}`,start && `DTSTART:${start}`,end && `DTEND:${end}`,fields.location && `LOCATION:${String(fields.location).replace(/\n/g, ' ')}`,'END:VEVENT'].filter(Boolean).join('\n');
    }
    default:
      throw new Error(`Unsupported payload type: ${type}.`);
  }
}

function chooseIndex(length, rng) {
  const value = Number(rng());
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Random source must return 0–1.');
  return Math.floor(value * length);
}

export function secureRandom() {
  if (!globalThis.crypto?.getRandomValues) return Math.random();
  const buffer = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buffer);
  return buffer[0] / 4294967296;
}

export function generatePassword({ length = 20, lower = true, upper = true, digits = true, symbols = true } = {}, rng = secureRandom) {
  length = Math.trunc(Number(length));
  if (!Number.isInteger(length) || length < 4 || length > 512) throw new Error('Password length must be between 4 and 512.');
  let alphabet = '';
  if (lower) alphabet += LOWER;
  if (upper) alphabet += UPPER;
  if (digits) alphabet += DIGITS;
  if (symbols) alphabet += SYMBOLS;
  if (!alphabet) throw new Error('Select at least one character set.');
  return Array.from({ length }, () => alphabet[chooseIndex(alphabet.length, rng)]).join('');
}

export function generatePassphrase({ words = 5, separator = '-', capitalize = false } = {}, rng = secureRandom) {
  words = Math.trunc(Number(words));
  if (!Number.isInteger(words) || words < 2 || words > 20) throw new Error('Passphrase word count must be between 2 and 20.');
  return Array.from({ length: words }, () => {
    const word = WORDS[chooseIndex(WORDS.length, rng)];
    return capitalize ? word[0].toUpperCase() + word.slice(1) : word;
  }).join(String(separator));
}

export function secureBytes(length = 16) {
  length = Math.trunc(Number(length));
  if (!Number.isInteger(length) || length < 1 || length > 4096) throw new Error('Byte length must be between 1 and 4096.');
  const bytes = new Uint8Array(length);
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure random generation is unavailable in this browser.');
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export function tokenFromBytes(bytes, format = 'hex') {
  const data = Uint8Array.from(bytes || []);
  if (format === 'hex') return [...data].map(value => value.toString(16).padStart(2, '0')).join('');
  if (format === 'base64url') {
    const binary = [...data].map(value => String.fromCharCode(value)).join('');
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  throw new Error('Token format must be hex or base64url.');
}

export function uuidFromBytes(bytes) {
  const data = Uint8Array.from(bytes || []);
  if (data.length !== 16) throw new Error('UUID requires exactly 16 bytes.');
  data[6] = (data[6] & 0x0f) | 0x40;
  data[8] = (data[8] & 0x3f) | 0x80;
  const hex = [...data].map(value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function generateUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return uuidFromBytes(secureBytes(16));
}

function mod10Valid(value) {
  if (!/^\d+$/.test(value)) return false;
  const digits = [...value].map(Number);
  const check = digits.pop();
  let sum = 0;
  for (let index = digits.length - 1, weight = 3; index >= 0; index -= 1, weight = weight === 3 ? 1 : 3) sum += digits[index] * weight;
  return (10 - (sum % 10)) % 10 === check;
}

export function validateBarcodeInput(format, text) {
  text = String(text ?? '').trim();
  if (!text) return { valid: false, message: 'Enter a value to encode.' };
  if (format === 'ean13') return { valid: /^\d{13}$/.test(text) && mod10Valid(text), message: 'EAN-13 requires 13 digits with a valid check digit.' };
  if (format === 'upca') return { valid: /^\d{12}$/.test(text) && mod10Valid(text), message: 'UPC-A requires 12 digits with a valid check digit.' };
  if (format === 'code128') return { valid: /^[\x20-\x7e]+$/.test(text), message: 'Code 128 supports printable ASCII in this workspace.' };
  if (format === 'qrcode' || format === 'datamatrix') return { valid: text.length <= 2000, message: 'Keep 2D code content under 2,000 characters.' };
  return { valid: false, message: 'Unsupported barcode format.' };
}

export function barcodeOptions(format, text) {
  const validation = validateBarcodeInput(format, text);
  if (!validation.valid) throw new Error(validation.message);
  const twoDimensional = format === 'qrcode' || format === 'datamatrix';
  return {
    bcid: format,
    text: String(text),
    scale: twoDimensional ? 4 : 3,
    includetext: !twoDimensional,
    textxalign: 'center',
    padding: 8,
  };
}
