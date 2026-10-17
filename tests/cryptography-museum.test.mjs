import test from 'node:test';
import assert from 'node:assert/strict';
import {caesar, substitute, vigenere, frequencies, Enigma, sha256, hashDistance, encrypt, decrypt, generateSigningKeys, sign, verify} from '../cryptography-museum/engine.mjs';

test('classical ciphers preserve Unicode and punctuation and round trip', () => {
  assert.equal(caesar('Attack, café! 🗝', 3), 'DWWDFN, FDIé! 🗝');
  assert.equal(caesar('DWWDFN', 3, true), 'ATTACK');
  const alphabet = 'QWERTYUIOPASDFGHJKLZXCVBNM';
  assert.equal(substitute(substitute('HELLO, 🌙!', alphabet), alphabet, true), 'HELLO, 🌙!');
  assert.throws(() => substitute('A', 'AAAAAAAAAAAAAAAAAAAAAAAAAA'), /unique/);
  assert.equal(vigenere('ATTACK AT DAWN!', 'LEMON'), 'LXFOPV EF RNHR!');
  assert.equal(vigenere('LXFOPV EF RNHR!', 'LEMON', true), 'ATTACK AT DAWN!');
  assert.throws(() => vigenere('A', '123'), /key/i);
  assert.deepEqual(frequencies('Aa!Bé').slice(0, 3), [2, 1, 0]);
});

test('Enigma standard vectors and reciprocal encryption', () => {
  assert.equal(new Enigma().process('AAAAA').text, 'BDZGO');
  assert.equal(new Enigma().process('HELLOWORLD').text, 'ILBDAAMTAZ');
  const config = {rotors:['II','IV','V'], positions:'WXC', rings:'BDF', plugboard:'AV BS CG DL FU HZ IN KM OW RX', reflector:'C'};
  const message = 'THEQUICKBROWNFOX';
  assert.equal(new Enigma(config).process(new Enigma(config).process(message).text).text, message);
  // Published py-enigma guide: army procedure example derived from a real message.
  const historical = {rotors:['II','IV','V'], rings:'BUL', plugboard:'AV BS CG DL FU HZ IN KM OW RX', positions:'WXC'};
  assert.equal(new Enigma(historical).process('BLA').text, 'KCH');
  assert.equal(new Enigma({...historical, positions:'BLA'}).process('THEXRUSSIANSXAREXCOMINGX').text, 'NIBLFMYMLLUFWCASCSSNVHAZ');
});

test('Enigma double steps before electrical traversal and validates settings', () => {
  const machine = new Enigma({positions:'ADU'});
  assert.equal(machine.process('A').positions, 'ADV');
  assert.equal(machine.process('A').positions, 'AEW');
  assert.equal(machine.process('A').positions, 'BFX');
  assert.equal(new Enigma({positions:'ADU', rings:'XYZ'}).process('AAA').positions, 'BFX');
  assert.throws(() => new Enigma({rotors:['I','I','III']}), /different/);
  assert.throws(() => new Enigma({plugboard:'AB AC'}), /once/);
  assert.throws(() => new Enigma({rings:'AA'}), /three/);
  assert.equal(new Enigma().process('! 🗝').positions, 'AAA');
});

test('real SHA-256 known answer and bit distance', async () => {
  assert.equal(await sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(hashDistance('00', 'ff'), 8);
});

test('Web Crypto AES-GCM randomized Unicode round trip and authentication', async () => {
  const a = await encrypt('secret 🌙', 'correct horse battery');
  const b = await encrypt('secret 🌙', 'correct horse battery');
  assert.notEqual(a.iv, b.iv);
  assert.notEqual(a.salt, b.salt);
  assert.equal(await decrypt(a, 'correct horse battery'), 'secret 🌙');
  await assert.rejects(decrypt(a, 'wrong password'), /authentication/i);
  const tampered = {...a, data:(a.data[0] === 'A' ? 'B' : 'A') + a.data.slice(1)};
  await assert.rejects(decrypt(tampered, 'correct horse battery'), /authentication/i);
  await assert.rejects(decrypt({...a, iterations:1e9}, 'password'), /envelope/i);
  await assert.rejects(decrypt({}, 'password'), /envelope/i);
});

test('real RSA-PSS signatures verify only the original message and key', async () => {
  const keys = await generateSigningKeys();
  const signature = await sign('Signed exhibit 🗝', keys.privateKey);
  assert.equal(await verify('Signed exhibit 🗝', signature, keys.publicKey), true);
  assert.equal(await verify('Changed exhibit', signature, keys.publicKey), false);
  const other = await generateSigningKeys();
  assert.equal(await verify('Signed exhibit 🗝', signature, other.publicKey), false);
});
