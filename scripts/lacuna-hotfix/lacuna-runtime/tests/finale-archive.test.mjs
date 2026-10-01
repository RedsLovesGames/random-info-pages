import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

import {
  ARCHIVE_READ_COOKIE,
  SUBJECT00_COMMIT_COOKIE,
  FINAL_COMMAND,
  SOURCE_INTERVAL_UNREAD,
  gateFinalCommand,
  isFinalCommand,
  resolveFinaleRoute,
} from '../dist/lacuna-runtime/src/finaleGate.js';
import {
  ARCHIVE_FILE_NAME,
  MISSING_INTERVAL_GZIP_BASE64,
  MISSING_INTERVAL_SHA256,
} from '../dist/lacuna-runtime/src/finaleArchiveText.js';

const read = (relative) => fs.readFileSync(new URL(relative, import.meta.url), 'utf8');

test('Subject 00 commit command is singular and normalized', () => {
  assert.equal(FINAL_COMMAND, 'reconstruct subject_00 /commit');
  assert.equal(isFinalCommand('reconstruct subject_00 /commit'), true);
  assert.equal(isFinalCommand('  RECONSTRUCT   SUBJECT_00   /COMMIT  '), true);
  assert.equal(isFinalCommand('reconstruct subject_00'), false);
  assert.equal(isFinalCommand('run'), false);
});

test('final command is rejected until MISSING_INTERVAL.arc has been read', () => {
  const locked = gateFinalCommand(FINAL_COMMAND, '');
  assert.deepEqual(locked, { handled: true, accepted: false, error: SOURCE_INTERVAL_UNREAD });
  assert.equal(locked.error, 'ERROR: SOURCE INTERVAL UNREAD');

  const unlocked = gateFinalCommand(FINAL_COMMAND, `${ARCHIVE_READ_COOKIE}=1`);
  assert.deepEqual(unlocked, { handled: true, accepted: true, error: null });

  const unrelated = gateFinalCommand('dir', `${ARCHIVE_READ_COOKIE}=1`);
  assert.equal(unrelated.handled, false);
});

test('legacy finale state migrates into archive instead of bypassing the story', () => {
  assert.equal(resolveFinaleRoute({ legacyFinaleReached: true }), 'archive');
  assert.equal(resolveFinaleRoute({ legacyFinaleReached: true, archiveRead: true }), 'archive');
  assert.equal(resolveFinaleRoute({ legacyFinaleReached: true, committed: true }), 'complete');
  assert.equal(resolveFinaleRoute({}), 'normal');
});

test('archive keeps the canonical evidence hierarchy and ends on the one commit command', () => {
  assert.equal(ARCHIVE_FILE_NAME, 'MISSING_INTERVAL.arc');
  const archive = gunzipSync(Buffer.from(MISSING_INTERVAL_GZIP_BASE64, 'base64')).toString('utf8');
  assert.equal(createHash('sha256').update(archive).digest('hex'), MISSING_INTERVAL_SHA256);
  const lastLine = archive.trimEnd().split(/\r?\n/).at(-1);
  assert.equal(lastLine, FINAL_COMMAND);

  for (const anchor of [
    '96.2',
    'OPR019',
    'OPR022',
    'FINAL RECONSTRUCTION PENDING',
    'ARCHIVE SERVICE: RUNNING',
    'PENDING RECONSTRUCTIONS: 1',
    'PROVENANCE: LATE-LAYER',
  ]) {
    assert.match(archive, new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), anchor);
  }

  assert.doesNotMatch(archive, /Three Possible Reconstructions/);
  assert.doesNotMatch(archive, /THREE ACTIONS AVAILABLE/);
  assert.doesNotMatch(archive.slice(-12000), /CURRENT SESSION WILL BE ADDED TO ACTIVE MODEL/);
});

test('browser overlay intercepts legacy ending buttons and terminal commit', () => {
  const browser = read('../src/finaleArchive.ts');
  assert.match(browser, /addEventListener\('submit'.*true\)/s);
  assert.match(browser, /LEGACY_ENDING_LABELS = new Set\(\['RUN', 'EXPORT', 'SHUT DOWN'\]\)/);
  assert.match(browser, /OPEN MISSING_INTERVAL\.arc/);
  assert.match(browser, /SOURCE_INTERVAL_UNREAD/);
  assert.match(browser, /lacunaSubject00Complete/);
  assert.match(browser, /PENDING RECONSTRUCTIONS: 0/);
  assert.match(browser, /document\.cookie/);
  assert.doesNotMatch(browser, /localStorage\.setItem\([^)]*(missing_interval|subject00)/i);
});

test('terminal runtime installs the finale overlay without replacing normal terminal behavior', () => {
  const terminal = read('../src/ui/terminalApp.ts');
  assert.match(terminal, /import '\.\.\/finaleArchive\.js';/);
  assert.match(terminal, /executeTerminalCommand/);
  assert.match(terminal, /class="lac-terminal-form"/);
});
