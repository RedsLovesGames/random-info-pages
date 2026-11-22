// Generated frontends are built by other projects before Pages stages them.
import { readFile, writeFile } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';

const staging = process.argv[2];
if (!staging) throw new Error('Supply the staged site directory.');

for (const [filename, nativeAppearance] of [
  ['computer/index.html', 'dark'],
  ['os/index.html', 'dark'],
  ['chirality/ketcher-ui/index.html', 'light']
]) {
  const page = join(staging, filename);
  const source = await readFile(page, 'utf8');
  if (source.includes('design-system/appearance.js')) continue;
  if (!/<\/head>/i.test(source)) throw new Error('Missing document head in ' + filename);
  const url = relative(dirname(page), join(staging, 'design-system/appearance.js')).split('\\').join('/');
  const tag = '<script src="' + url + '" defer data-native-appearance="' + nativeAppearance + '"></script>';
  await writeFile(page, source.replace(/<\/head>/i, tag + '$&'));
}
