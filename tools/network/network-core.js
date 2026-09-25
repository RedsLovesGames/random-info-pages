const DATA_UNITS = {
  bit: 1 / 8,
  B: 1,
  KB: 1e3,
  MB: 1e6,
  GB: 1e9,
  TB: 1e12,
  KiB: 1024,
  MiB: 1024 ** 2,
  GiB: 1024 ** 3,
  TiB: 1024 ** 4,
};

const RATE_UNITS = {
  bps: 1,
  Kbps: 1e3,
  Mbps: 1e6,
  Gbps: 1e9,
  Tbps: 1e12,
  Bps: 8,
  KBps: 8e3,
  MBps: 8e6,
  GBps: 8e9,
};

function assertFinite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be a finite number.`);
  return number;
}

function ipv4ToNumber(address) {
  const parts = String(address).trim().split('.');
  if (parts.length !== 4) throw new Error('IPv4 address must contain four octets.');
  const octets = parts.map(part => {
    if (!/^\d{1,3}$/.test(part)) throw new Error('IPv4 octets must be decimal numbers.');
    const value = Number(part);
    if (value < 0 || value > 255) throw new Error('IPv4 octets must be between 0 and 255.');
    return value;
  });
  return (((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3]) >>> 0;
}

function numberToIpv4(value) {
  const n = Number(BigInt.asUintN(32, BigInt(value)));
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

function masked(n, mask) {
  return (n & mask) >>> 0;
}

function classifyIpv4(n) {
  if (masked(n, 0xff000000) === 0x0a000000) return 'Private';
  if (masked(n, 0xfff00000) === 0xac100000) return 'Private';
  if (masked(n, 0xffff0000) === 0xc0a80000) return 'Private';
  if (masked(n, 0xff000000) === 0x7f000000) return 'Loopback';
  if (masked(n, 0xffff0000) === 0xa9fe0000) return 'Link-local';
  if (masked(n, 0xf0000000) === 0xe0000000) return 'Multicast';
  if (masked(n, 0xff000000) === 0x00000000) return 'This network / unspecified';
  return 'Public';
}

export function ipv4CidrInfo(address, prefix = 24) {
  const ip = ipv4ToNumber(address);
  prefix = Math.trunc(assertFinite(prefix, 'Prefix'));
  if (prefix < 0 || prefix > 32) throw new Error('IPv4 prefix must be between 0 and 32.');
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const totalAddresses = 2 ** (32 - prefix);
  let usableHosts;
  let firstHost;
  let lastHost;
  if (prefix === 32) {
    usableHosts = 1;
    firstHost = lastHost = network;
  } else if (prefix === 31) {
    usableHosts = 2;
    firstHost = network;
    lastHost = broadcast;
  } else {
    usableHosts = Math.max(0, totalAddresses - 2);
    firstHost = network + 1;
    lastHost = broadcast - 1;
  }
  return {
    address: numberToIpv4(ip),
    prefix,
    network: numberToIpv4(network),
    broadcast: numberToIpv4(broadcast),
    firstHost: numberToIpv4(firstHost),
    lastHost: numberToIpv4(lastHost),
    totalAddresses,
    usableHosts,
    classification: classifyIpv4(ip),
    mask: numberToIpv4(mask),
  };
}

function parseIpv6(address) {
  let input = String(address || '').trim().toLowerCase();
  if (!input) throw new Error('Enter an IPv6 address.');
  if (input.includes('%')) input = input.split('%')[0];
  if (input.includes('.')) {
    const lastColon = input.lastIndexOf(':');
    const v4 = ipv4ToNumber(input.slice(lastColon + 1));
    const hi = ((v4 >>> 16) & 0xffff).toString(16);
    const lo = (v4 & 0xffff).toString(16);
    input = `${input.slice(0, lastColon)}:${hi}:${lo}`;
  }
  const halves = input.split('::');
  if (halves.length > 2) throw new Error('Invalid IPv6 address.');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  if (halves.length === 1 && left.length !== 8) throw new Error('IPv6 address must contain eight groups or use :: compression.');
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 2 && missing < 1)) throw new Error('Invalid IPv6 group count.');
  const groups = [...left, ...Array(missing).fill('0'), ...right].map(part => {
    if (!/^[0-9a-f]{1,4}$/.test(part)) throw new Error('IPv6 groups must contain 1–4 hexadecimal digits.');
    return Number.parseInt(part, 16);
  });
  if (groups.length !== 8) throw new Error('Invalid IPv6 address.');
  let value = 0n;
  for (const group of groups) value = (value << 16n) | BigInt(group);
  return value;
}

function ipv6Groups(value) {
  const groups = [];
  let n = BigInt.asUintN(128, BigInt(value));
  for (let i = 0; i < 8; i += 1) {
    groups.unshift(Number(n & 0xffffn));
    n >>= 16n;
  }
  return groups;
}

function formatIpv6(value) {
  const groups = ipv6Groups(value);
  let bestStart = -1;
  let bestLength = 0;
  for (let i = 0; i < groups.length;) {
    if (groups[i] !== 0) { i += 1; continue; }
    let j = i;
    while (j < groups.length && groups[j] === 0) j += 1;
    if (j - i > bestLength && j - i >= 2) { bestStart = i; bestLength = j - i; }
    i = j;
  }
  if (bestStart < 0) return groups.map(group => group.toString(16)).join(':');
  const left = groups.slice(0, bestStart).map(group => group.toString(16)).join(':');
  const right = groups.slice(bestStart + bestLength).map(group => group.toString(16)).join(':');
  if (!left && !right) return '::';
  if (!left) return `::${right}`;
  if (!right) return `${left}::`;
  return `${left}::${right}`;
}

function classifyIpv6(value) {
  if (value === 0n) return 'Unspecified';
  if (value === 1n) return 'Loopback';
  if ((value >> 96n) === 0x20010db8n) return 'Documentation';
  if ((value >> 121n) === 0x7en) return 'Unique local';
  if ((value >> 118n) === 0x3fan) return 'Link-local';
  if ((value >> 120n) === 0xffn) return 'Multicast';
  return 'Global / other';
}

export function ipv6CidrInfo(address, prefix = 64) {
  const ip = parseIpv6(address);
  prefix = Math.trunc(assertFinite(prefix, 'Prefix'));
  if (prefix < 0 || prefix > 128) throw new Error('IPv6 prefix must be between 0 and 128.');
  const hostBits = 128 - prefix;
  const full = (1n << 128n) - 1n;
  const mask = prefix === 0 ? 0n : (full << BigInt(hostBits)) & full;
  const network = ip & mask;
  const lastAddress = network | (full ^ mask);
  return {
    address: formatIpv6(ip),
    prefix,
    network: formatIpv6(network),
    lastAddress: formatIpv6(lastAddress),
    totalAddresses: (1n << BigInt(hostBits)).toString(),
    classification: classifyIpv6(ip),
  };
}

export function convertDataSize(value, fromUnit, toUnit) {
  const amount = assertFinite(value, 'Value');
  const from = DATA_UNITS[fromUnit];
  const to = DATA_UNITS[toUnit];
  if (!from || !to) throw new Error('Unsupported data-size unit.');
  return amount * from / to;
}

export function transferSeconds({ size, sizeUnit = 'GB', speed, speedUnit = 'Mbps' } = {}) {
  const bytes = convertDataSize(size, sizeUnit, 'B');
  if (!RATE_UNITS[speedUnit]) throw new Error('Unsupported transfer-rate unit.');
  const rate = assertFinite(speed, 'Speed') * RATE_UNITS[speedUnit];
  if (rate <= 0) throw new Error('Speed must be greater than zero.');
  return bytes * 8 / rate;
}

export function mediaBytes({ bitrate, bitrateUnit = 'Mbps', durationSeconds } = {}) {
  if (!RATE_UNITS[bitrateUnit]) throw new Error('Unsupported bitrate unit.');
  const rate = assertFinite(bitrate, 'Bitrate') * RATE_UNITS[bitrateUnit];
  const duration = assertFinite(durationSeconds, 'Duration');
  if (rate < 0 || duration < 0) throw new Error('Bitrate and duration cannot be negative.');
  return rate * duration / 8;
}

function gcd(a, b) {
  a = Math.abs(Math.trunc(a)); b = Math.abs(Math.trunc(b));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function displayMetrics({ widthPx, heightPx, diagonalInches } = {}) {
  const width = assertFinite(widthPx, 'Width');
  const height = assertFinite(heightPx, 'Height');
  const diagonal = assertFinite(diagonalInches, 'Diagonal');
  if (width <= 0 || height <= 0 || diagonal <= 0) throw new Error('Display dimensions must be greater than zero.');
  const divisor = gcd(width, height);
  const diagonalPx = Math.hypot(width, height);
  const ppi = diagonalPx / diagonal;
  return {
    aspectRatio: `${Math.round(width / divisor)}:${Math.round(height / divisor)}`,
    ppi,
    widthInches: width / ppi,
    heightInches: height / ppi,
    diagonalPx,
  };
}

export const dataUnits = () => Object.keys(DATA_UNITS);
export const rateUnits = () => Object.keys(RATE_UNITS);
