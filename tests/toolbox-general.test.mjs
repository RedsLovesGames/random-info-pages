import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getVisibleWorkspaces, findToolboxMatches } from '../tools/shared/registry.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

function sequence(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

test('Random & Decision core supports reproducible picks, teams, numbers, and chance', async () => {
  const {
    parseWeightedList, createSeededRandom, weightedPick, shuffleItems,
    makeTeams, randomIntegers, rollDice, runChanceTrials,
  } = await import('../tools/random/random-core.js');

  assert.deepEqual(parseWeightedList('Alex | 2\nRita | 1\nNora'), [
    { label: 'Alex', weight: 2 },
    { label: 'Rita', weight: 1 },
    { label: 'Nora', weight: 1 },
  ]);

  const a = createSeededRandom('toolbox-seed');
  const b = createSeededRandom('toolbox-seed');
  assert.deepEqual(Array.from({ length: 6 }, () => a()), Array.from({ length: 6 }, () => b()));

  assert.equal(weightedPick([{ label: 'A', weight: 2 }, { label: 'B', weight: 1 }], () => 0.9).label, 'B');
  assert.deepEqual([...shuffleItems(['a', 'b', 'c', 'd'], createSeededRandom('same'))].sort(), ['a', 'b', 'c', 'd']);
  assert.deepEqual(makeTeams(['a', 'b', 'c', 'd', 'e', 'f'], 2, createSeededRandom('teams')).map(team => team.length), [3, 3]);
  const numbers = randomIntegers({ min: 1, max: 20, count: 8, unique: true }, createSeededRandom('numbers'));
  assert.equal(new Set(numbers).size, 8);
  assert.deepEqual(rollDice(2, 6, () => 0), { rolls: [1, 1], total: 2 });
  assert.deepEqual(runChanceTrials(0.5, 4, sequence([0.1, 0.9, 0.2, 0.8])), { successes: 2, trials: 4, rate: 0.5 });
});

test('Codes core builds payloads and secure-generator primitives deterministically', async () => {
  const {
    buildCodePayload, generatePassword, tokenFromBytes, uuidFromBytes,
    validateBarcodeInput, barcodeOptions,
  } = await import('../tools/codes/codes-core.js');

  assert.equal(buildCodePayload('wifi', { ssid: 'Lab;Net', password: 'a\\b;c', security: 'WPA' }), 'WIFI:T:WPA;S:Lab\\;Net;P:a\\\\b\\;c;;');
  assert.equal(buildCodePayload('email', { email: 'test@example.com', subject: 'Hello world', body: 'Line one' }), 'mailto:test@example.com?subject=Hello%20world&body=Line%20one');
  assert.equal(generatePassword({ length: 8, lower: true, upper: false, digits: false, symbols: false }, () => 0), 'aaaaaaaa');
  assert.equal(tokenFromBytes(Uint8Array.from([0, 1, 2, 255]), 'hex'), '000102ff');
  assert.equal(uuidFromBytes(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])), '00010203-0405-4607-8809-0a0b0c0d0e0f');
  assert.equal(validateBarcodeInput('ean13', '5901234123457').valid, true);
  assert.equal(validateBarcodeInput('ean13', '5901234123458').valid, false);
  assert.equal(barcodeOptions('datamatrix', 'hello').bcid, 'datamatrix');
  assert.equal(barcodeOptions('qrcode', 'https://example.com').bcid, 'qrcode');
});

test('Network core covers IPv4/IPv6 CIDR, storage, transfer, media, and display math', async () => {
  const {
    ipv4CidrInfo, ipv6CidrInfo, convertDataSize, transferSeconds,
    mediaBytes, displayMetrics,
  } = await import('../tools/network/network-core.js');

  assert.deepEqual(ipv4CidrInfo('192.168.1.130', 24), {
    address: '192.168.1.130', prefix: 24, network: '192.168.1.0', broadcast: '192.168.1.255',
    firstHost: '192.168.1.1', lastHost: '192.168.1.254', totalAddresses: 256, usableHosts: 254,
    classification: 'Private', mask: '255.255.255.0',
  });

  const v6 = ipv6CidrInfo('2001:db8::1234', 64);
  assert.equal(v6.network, '2001:db8::');
  assert.equal(v6.lastAddress, '2001:db8::ffff:ffff:ffff:ffff');
  assert.equal(v6.totalAddresses, '18446744073709551616');
  assert.equal(v6.classification, 'Documentation');

  assert.ok(Math.abs(convertDataSize(1, 'GiB', 'MB') - 1073.741824) < 1e-9);
  assert.equal(transferSeconds({ size: 1, sizeUnit: 'GB', speed: 100, speedUnit: 'Mbps' }), 80);
  assert.equal(mediaBytes({ bitrate: 8, bitrateUnit: 'Mbps', durationSeconds: 60 }), 60_000_000);
  const display = displayMetrics({ widthPx: 1920, heightPx: 1080, diagonalInches: 24 });
  assert.equal(display.aspectRatio, '16:9');
  assert.ok(Math.abs(display.ppi - 91.7878) < 0.001);
});

test('three general utility workspaces expose planned persistent input modes', () => {
  const random = read('../tools/random/index.html');
  for (const mode of ['pick', 'shuffle', 'teams', 'numbers', 'chance', 'seed']) assert.match(random, new RegExp(`data-random-mode="${mode}"`));
  assert.match(random, /\.\.\/\.\.\/wheel\//);
  assert.match(random, /random-app\.js/);

  const codes = read('../tools/codes/index.html');
  for (const mode of ['qr', 'barcode', 'scan', 'password', 'uuid']) assert.match(codes, new RegExp(`data-codes-mode="${mode}"`));
  assert.match(codes, /codeCanvas/);
  assert.match(codes, /scanFile/);
  assert.match(codes, /codes-app\.js/);

  const network = read('../tools/network/index.html');
  for (const mode of ['subnet', 'storage', 'transfer', 'media-size', 'display', 'device']) assert.match(network, new RegExp(`data-network-mode="${mode}"`));
  assert.match(network, /deviceCapabilities/);
  assert.match(network, /network-app\.js/);
});

test('Step 9 publishes all 13 workspaces and natural-search deep links', () => {
  assert.deepEqual(getVisibleWorkspaces().map(workspace => workspace.id), [
    'time', 'image', 'money', 'text', 'pdf', 'files', 'media', 'data', 'developer', 'math', 'random', 'codes', 'network',
  ]);
  for (const [query, workspaceId, actionId] of [
    ['weighted random picker', 'random', 'pick'],
    ['random teams', 'random', 'teams'],
    ['seeded random', 'random', 'seed'],
    ['wifi qr', 'codes', 'qr'],
    ['data matrix barcode', 'codes', 'barcode'],
    ['secure token', 'codes', 'uuid'],
    ['ipv6 cidr', 'network', 'subnet'],
    ['download time', 'network', 'transfer'],
    ['ppi calculator', 'network', 'display'],
    ['browser capabilities', 'network', 'device'],
  ]) {
    const match = findToolboxMatches(query)[0];
    assert.equal(match?.workspaceId, workspaceId, query);
    assert.equal(match?.actionId, actionId, query);
    assert.equal(match?.available, true, query);
    assert.equal(match?.route, `./${workspaceId}/?action=${actionId}`, query);
  }
});
