import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const sources = ['part-01.txt','part-02.txt','part-03.txt','part-04.txt'];
const sourceDir = join(dir, 'dictionaries', 'source');
const output = join(dir, 'dictionaries', 'towers-of-babble.txt');
const EXPECTED_SHA = 'ab0541b0220f86b1d7b28860d45aab1f9a0d49ca';

export async function buildDictionary(destination = output) {
  const parts = await Promise.all(sources.map(name => readFile(join(sourceDir, name), 'utf8')));
  const raw = parts.join('').trimEnd().split(/\r?\n/);
  if (raw.length !== 195492) throw Error('Raw game word list size mismatch: ' + raw.length);
  if (raw[0] !== 'aa' || raw[raw.length - 1] !== 'zzz') throw Error('Game source fragments are incomplete.');
  const supplemental = (await readFile(join(sourceDir, 'cursed-extra.txt'), 'utf8')).trim().split(/\r?\n/);
  if (supplemental.length !== 49) throw Error('Expected 49 missing cursed entries.');
  const playable = [...new Set([...raw, ...supplemental].filter(word => /^[a-z]{3,}$/.test(word)))].sort();
  if (playable.length !== 195415) throw Error('Expected 195,415 playable words; got ' + playable.length);
  const content = playable.join('\n') + '\n';
  const sha = createHash('sha1').update('blob ' + Buffer.byteLength(content) + '\0').update(content).digest('hex');
  if (sha !== EXPECTED_SHA) throw Error('Playable word list differs from the supplied 3_plus_letters.txt source: ' + sha);
  await mkdir(dirname(destination), { recursive:true });
  await writeFile(destination, content);
  return { file:destination, entries:playable.length, sha, bytes:Buffer.byteLength(content) };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildDictionary();
  process.stdout.write('Towers of Babble: ' + result.entries + ' playable words, ' + result.bytes + ' bytes\n');
}
