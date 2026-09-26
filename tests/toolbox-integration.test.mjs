import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  putArtifact, getArtifact, listArtifacts, clearExpiredArtifacts, clearAllArtifacts,
  artifactHref, artifactIdFromSearch,
} from '../tools/shared/artifacts.js';
import { searchCommands } from '../tools/shared/command-core.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('artifact store supports local handoff metadata, TTL cleanup, listing, and clearing', async () => {
  await clearAllArtifacts();
  const id = await putArtifact({ data: 'hello', type: 'text/plain', name: 'hello.txt', sourceWorkspace: 'pdf', ttlMs: 10000 });
  const artifact = await getArtifact(id);
  assert.equal(artifact.data, 'hello');
  assert.equal(artifact.type, 'text/plain');
  assert.equal(artifact.name, 'hello.txt');
  assert.equal(artifact.sourceWorkspace, 'pdf');
  assert.ok(artifact.expiresAt > artifact.createdAt);
  assert.equal((await listArtifacts()).length, 1);

  const expired = await putArtifact({ data: 'old', type: 'text/plain', sourceWorkspace: 'test', ttlMs: -1 });
  await clearExpiredArtifacts();
  assert.equal(await getArtifact(expired), null);
  assert.equal((await listArtifacts()).length, 1);

  await clearAllArtifacts();
  assert.equal((await listArtifacts()).length, 0);
});

test('artifact handoff URLs keep payloads out of query strings', () => {
  const href = artifactHref('../text/', 'tb_example', { action: 'analyze' });
  assert.equal(href, '../text/?artifact=tb_example&action=analyze');
  assert.equal(artifactIdFromSearch('?artifact=tb_example&action=analyze'), 'tb_example');
  assert.equal(artifactIdFromSearch('?action=analyze'), null);
});

test('command search returns available nested actions with deep links and exact ranking', () => {
  const base64 = searchCommands('base64');
  assert.equal(base64[0].workspaceId, 'developer');
  assert.equal(base64[0].actionId, 'base64');
  assert.equal(base64[0].route, './developer/?action=base64');

  const merge = searchCommands('merge pdf');
  assert.equal(merge[0].workspaceId, 'pdf');
  assert.equal(merge[0].actionId, 'merge');

  const subnet = searchCommands('ipv6 cidr');
  assert.equal(subnet[0].workspaceId, 'network');
  assert.equal(subnet[0].actionId, 'subnet');
  assert.equal(subnet.every(match => match.available), true);
});

test('Step 10 hub and handoff producers/receivers are wired', () => {
  const hub = read('../tools/index.html');
  assert.match(hub, /shared\/command\.js/);

  const producer = read('../tools/shared/handoff-producers.js');
  assert.match(producer, /Open in Text Studio/);
  assert.match(producer, /Open JSON in Developer Lab/);
  assert.match(producer, /Open metadata in Data Studio/);
  assert.match(producer, /putArtifact/);

  const receiver = read('../tools/shared/handoff-receiver.js');
  assert.match(receiver, /artifactIdFromSearch/);
  assert.match(receiver, /getArtifact/);
  assert.match(receiver, /#textInput/);
  assert.match(receiver, /#developerInput/);
  assert.match(receiver, /#dataPicker/);

  const pdfApp = read('../tools/pdf/pdf-app.js');
  assert.match(pdfApp, /id=\\?"textResult\\?"/);
  assert.match(pdfApp, /class=\\?"pdf-actions-row\\?"/);

  assert.match(read('../tools/pdf/index.html'), /handoff-producers\.js/);
  assert.match(read('../tools/files/index.html'), /handoff-producers\.js/);
  assert.match(read('../tools/data/index.html'), /handoff-producers\.js/);
  assert.match(read('../tools/data/index.html'), /handoff-receiver\.js/);
  assert.match(read('../tools/text/index.html'), /handoff-receiver\.js/);
  assert.match(read('../tools/developer/index.html'), /handoff-receiver\.js/);
});
