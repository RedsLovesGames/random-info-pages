// @ts-nocheck

import {
  ARCHIVE_READ_COOKIE,
  SUBJECT00_COMMIT_COOKIE,
  FINAL_COMMAND,
  SOURCE_INTERVAL_UNREAD,
  gateFinalCommand,
  hasArchiveRead,
  hasSubject00Commit,
} from './finaleGate.js';
import { ARCHIVE_FILE_NAME, loadMissingIntervalArc } from './finaleArchiveText.js';
const LEGACY_ENDING_LABELS = new Set(['RUN', 'EXPORT', 'SHUT DOWN']);
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

let archiveTextPromise = null;
let archiveOverlay = null;
let cinematicOverlay = null;
let archiveOpening = false;

function setFlagCookie(name) {
  document.cookie = `${encodeURIComponent(name)}=1; Path=/; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;
}

function injectStyles() {
  if (document.getElementById('lacuna-final-archive-styles')) return;
  const style = document.createElement('style');
  style.id = 'lacuna-final-archive-styles';
  style.textContent = `
    .lac-archive-overlay{position:fixed;inset:0;z-index:2147483600;background:rgba(0,0,0,.84);display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;font-family:"MS Sans Serif",Arial,sans-serif}
    .lac-archive-shell{width:min(980px,100%);height:min(760px,100%);background:#c0c0c0;border:2px outset #fff;box-shadow:8px 8px 0 rgba(0,0,0,.55);display:flex;flex-direction:column;min-height:0}
    .lac-archive-titlebar{height:24px;flex:0 0 auto;background:#000080;color:#fff;display:flex;align-items:center;padding:2px 4px;gap:6px;font-weight:700;font-size:12px}
    .lac-archive-titlebar strong{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .lac-archive-titlebar button,.lac-archive-footer button{font:12px "MS Sans Serif",Arial,sans-serif;background:#c0c0c0;border:2px outset #fff;color:#000;padding:2px 8px}
    .lac-archive-titlebar button:active,.lac-archive-footer button:active{border-style:inset}
    .lac-final-route-migrated{font:700 11px "MS Sans Serif",Arial,sans-serif;border:1px solid #808080;background:#ffffe1;color:#000;padding:5px 7px;margin:6px 0}
    .lac-archive-meta{flex:0 0 auto;border-bottom:1px solid #808080;padding:6px 9px;background:#c0c0c0;font:11px "Courier New",monospace;display:flex;gap:14px;flex-wrap:wrap}
    .lac-archive-reader{flex:1;min-height:0;overflow:auto;background:#0b0d0f;color:#d7dde2;border:2px inset #fff;padding:18px 22px;box-sizing:border-box;scrollbar-color:#808080 #111}
    .lac-archive-reader pre{white-space:pre-wrap;overflow-wrap:break-word;margin:0;font:14px/1.52 "Courier New",monospace}
    .lac-archive-sentinel{height:2px}
    .lac-archive-footer{flex:0 0 auto;min-height:54px;padding:8px 10px;box-sizing:border-box;border-top:1px solid #fff;display:flex;align-items:center;gap:12px;justify-content:space-between}
    .lac-archive-status{font:11px "MS Sans Serif",Arial,sans-serif;line-height:1.25}
    .lac-archive-command{font:700 13px "Courier New",monospace;background:#000;color:#9dff9d;border:2px inset #fff;padding:6px 9px;user-select:text}
    .lac-archive-command[hidden]{display:none}
    .lac-subject00-cinematic{position:fixed;inset:0;z-index:2147483647;background:#000;color:#c8d0d8;font-family:"Courier New",monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px;box-sizing:border-box}
    .lac-subject00-cinematic .frame{width:min(820px,100%);border:1px solid #2c3944;background:#050709;padding:24px;box-sizing:border-box}
    .lac-subject00-cinematic h1{font-size:18px;font-weight:400;letter-spacing:.12em;margin:0 0 24px;color:#e7edf2}
    .lac-subject00-lines{min-height:330px;white-space:pre-wrap;font-size:14px;line-height:1.7}
    .lac-subject00-line{opacity:0;transform:translateY(3px);animation:lacLineIn .18s ease forwards}
    .lac-subject00-line.confirmed{color:#a9d8b0}.lac-subject00-line.unresolved{color:#e7c77b}.lac-subject00-line.final{color:#f0f4f7;font-weight:700}
    .lac-subject00-meter{height:12px;border:1px solid #52606b;margin:18px 0;background:#090d10;overflow:hidden}
    .lac-subject00-meter>span{display:block;height:100%;width:0;background:#d9e1e8;transition:width 1.2s linear}
    .lac-subject00-coda{border-top:1px solid #29343d;padding-top:16px;margin-top:12px;color:#9ba9b5;font-size:12px;line-height:1.55;white-space:pre-wrap}
    @keyframes lacLineIn{to{opacity:1;transform:none}}
    @media(max-width:650px){.lac-archive-overlay{padding:4px}.lac-archive-shell{height:calc(100vh - 8px)}.lac-archive-reader{padding:12px}.lac-archive-meta{gap:6px}.lac-archive-footer{align-items:flex-start;flex-direction:column}.lac-subject00-cinematic{padding:10px}.lac-subject00-cinematic .frame{padding:16px}}
    @media(prefers-reduced-motion:reduce){.lac-subject00-line{opacity:1;transform:none;animation:none}.lac-subject00-meter>span{transition:none}}
  `;
  document.head.appendChild(style);
}

function archiveText() {
  if (!archiveTextPromise) archiveTextPromise = loadMissingIntervalArc();
  return archiveTextPromise;
}

function legacyFinaleRoots() {
  return [...document.querySelectorAll('.lac-finale,.lac-ending,.lac-window')].filter((element) => {
    if (element.closest('.lac-archive-overlay,.lac-subject00-cinematic')) return false;
    const text = (element.textContent || '').toUpperCase();
    return element.classList.contains('lac-finale') ||
      element.classList.contains('lac-ending') ||
      text.includes('LACUNA — FINAL MODEL') ||
      (text.includes('RUN') && text.includes('EXPORT') && text.includes('SHUT DOWN'));
  });
}

function prepareLegacyFinale() {
  for (const root of legacyFinaleRoots()) {
    if (root.dataset.lacunaFinaleMigrated === 'true') continue;
    const buttons = [...root.querySelectorAll('button')].filter((button) =>
      LEGACY_ENDING_LABELS.has((button.textContent || '').trim().toUpperCase())
    );
    if (!buttons.length) continue;

    const primary = buttons.find((button) => (button.textContent || '').trim().toUpperCase() === 'RUN') || buttons[0];
    for (const button of buttons) {
      const original = (button.textContent || '').trim().toUpperCase();
      button.dataset.lacunaLegacyLabel = original;
      button.setAttribute('aria-label', original);
      if (button === primary) {
        button.textContent = 'OPEN MISSING_INTERVAL.arc';
        button.title = 'Recovered source interval required before Subject 00 can be committed.';
      } else {
        button.hidden = true;
        button.style.display = 'none';
      }
    }

    const banner = document.createElement('div');
    banner.className = 'lac-final-route-migrated';
    banner.textContent = 'FINAL ROUTE MIGRATED — recovered source interval required.';
    const host = primary.parentElement || root;
    host.insertBefore(banner, primary);
    root.dataset.lacunaFinaleMigrated = 'true';
  }
}

function hideLegacyFinale() {
  for (const root of legacyFinaleRoots()) {
    root.style.display = 'none';
    root.dataset.lacunaLegacyFinaleSuppressed = 'true';
  }
}

function hideArchive() {
  archiveOverlay?.remove();
  archiveOverlay = null;
  const input = document.querySelector('.lac-terminal-window .lac-terminal-form input');
  input?.focus?.();
}

function markArchiveRead(footerStatus, commandBox) {
  if (!hasArchiveRead(document.cookie)) setFlagCookie(ARCHIVE_READ_COOKIE);
  footerStatus.textContent = 'SOURCE INTERVAL READ — final reconstruction command released.';
  commandBox.hidden = false;
}

async function openArchive() {
  if (archiveOpening || cinematicOverlay) return;
  if (hasSubject00Commit(document.cookie)) {
    showCompletedState();
    return;
  }
  archiveOpening = true;
  injectStyles();
  prepareLegacyFinale();

  try {
    const text = await archiveText();
    if (archiveOverlay) {
      archiveOverlay.querySelector('.lac-archive-reader pre').textContent = text;
      return;
    }

    const overlay = document.createElement('section');
    overlay.className = 'lac-archive-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `${ARCHIVE_FILE_NAME} — LACUNA Archive`);
    overlay.innerHTML = `
      <div class="lac-archive-shell">
        <div class="lac-archive-titlebar">
          <span aria-hidden="true">▣</span>
          <strong>${ARCHIVE_FILE_NAME} — LACUNA Archive</strong>
          <button type="button" data-close aria-label="Close archive">×</button>
        </div>
        <div class="lac-archive-meta">
          <span>FILE: MISSING_INTERVAL.arc</span>
          <span>SOURCE: CURRENT RECOVERED WORKSTATION</span>
          <span>PROVENANCE: LATE-LAYER</span>
          <span>SUBJECT COUNT: 39</span>
        </div>
        <div class="lac-archive-reader" tabindex="0" aria-label="Recovered archive text">
          <pre></pre>
          <div class="lac-archive-sentinel" aria-hidden="true"></div>
        </div>
        <div class="lac-archive-footer">
          <div class="lac-archive-status"></div>
          <code class="lac-archive-command" hidden>${FINAL_COMMAND}</code>
          <button type="button" data-terminal>Return to Command Prompt</button>
        </div>
      </div>`;
    archiveOverlay = overlay;
    document.body.appendChild(overlay);

    const reader = overlay.querySelector('.lac-archive-reader');
    const pre = overlay.querySelector('pre');
    const status = overlay.querySelector('.lac-archive-status');
    const commandBox = overlay.querySelector('.lac-archive-command');
    pre.textContent = text;

    const alreadyRead = hasArchiveRead(document.cookie);
    if (alreadyRead) {
      markArchiveRead(status, commandBox);
    } else {
      status.textContent = 'FINAL RECONSTRUCTION LOCKED — read the recovered interval to the end.';
      const checkRead = () => {
        const atEnd = reader.scrollTop + reader.clientHeight >= reader.scrollHeight - 8;
        if (atEnd) markArchiveRead(status, commandBox);
      };
      reader.addEventListener('scroll', checkRead, { passive: true });
      reader.addEventListener('keydown', () => queueMicrotask(checkRead));
      requestAnimationFrame(checkRead);
    }

    overlay.querySelector('[data-close]').addEventListener('click', hideArchive);
    overlay.querySelector('[data-terminal]').addEventListener('click', hideArchive);
    reader.focus();
  } catch (error) {
    const fallback = document.createElement('div');
    fallback.className = 'lac-archive-overlay';
    fallback.innerHTML = `<div class="lac-archive-shell"><div class="lac-archive-titlebar"><strong>MISSING_INTERVAL.arc — read error</strong></div><div class="lac-archive-reader"><pre></pre></div></div>`;
    fallback.querySelector('pre').textContent = `ARCHIVE READ FAILURE\n${error instanceof Error ? error.message : String(error)}`;
    archiveOverlay = fallback;
    document.body.appendChild(fallback);
  } finally {
    archiveOpening = false;
  }
}

function appendTerminalLine(output, text, className = '') {
  const line = document.createElement('div');
  if (className) line.className = className;
  line.textContent = text || '\u00a0';
  output.appendChild(line);
}

function showCompletedState() {
  runCinematic({ immediate: true });
}

function runCinematic({ immediate = false } = {}) {
  if (cinematicOverlay) return;
  injectStyles();
  hideArchive();
  hideLegacyFinale();

  setFlagCookie(SUBJECT00_COMMIT_COOKIE);
  document.documentElement.dataset.lacunaSubject00Complete = 'true';

  const overlay = document.createElement('section');
  overlay.className = 'lac-subject00-cinematic';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.innerHTML = `
    <div class="frame">
      <h1>LACUNA // FINAL RECONSTRUCTION</h1>
      <div class="lac-subject00-lines"></div>
      <div class="lac-subject00-meter" aria-hidden="true"><span></span></div>
      <div class="lac-subject00-coda"></div>
    </div>`;
  cinematicOverlay = overlay;
  document.body.appendChild(overlay);

  const lines = [
    ['SOURCE: MISSING_INTERVAL.arc', ''],
    ['SUBJECT: 00', ''],
    ['PROVENANCE: LATE-LAYER / CURRENT SESSION', ''],
    ['VERIFYING CORROBORATED PROJECT HISTORY...', ''],
    ['ETHICS / GOVERNANCE RECORD: CONFIRMED', 'confirmed'],
    ['HISTORICAL PREDICTION CLAIM: UNRESOLVED', 'unresolved'],
    ['BINDING CURRENT INVESTIGATOR INTERVAL...', ''],
    ['RECONSTRUCTION COMMITTED', 'final'],
  ];

  const lineBox = overlay.querySelector('.lac-subject00-lines');
  const meter = overlay.querySelector('.lac-subject00-meter > span');
  const coda = overlay.querySelector('.lac-subject00-coda');
  const reduced = immediate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const delay = reduced ? 0 : 430;

  const addLine = ([text, className], index) => {
    window.setTimeout(() => {
      const row = document.createElement('div');
      row.className = `lac-subject00-line ${className}`.trim();
      row.textContent = text;
      lineBox.appendChild(row);
      const pct = Math.round(((index + 1) / lines.length) * 100);
      meter.style.width = `${pct}%`;
    }, delay * index);
  };
  lines.forEach(addLine);

  window.setTimeout(() => {
    coda.textContent =
`SUBJECT 00 // CURRENT INVESTIGATOR
SOURCE CLASS: CURRENT SESSION / LATE-LAYER
ARCHIVE SERVICE: STOPPED
PENDING RECONSTRUCTIONS: 0

The recovered record proves the governance failure.
It does not prove that the historical system saw the future.

NO FURTHER OUTPUT`;
    document.documentElement.dataset.lacunaSubject00Complete = 'true';
  }, delay * lines.length + (reduced ? 0 : 650));
}

async function recordFinalCommand(line) {
  try {
    await window.__RIP_LACUNA__?.store?.event?.({ type: 'terminal-command', target: line });
  } catch {
    // The finale remains functional even if the telemetry store is unavailable.
  }
}

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.matches('.lac-terminal-form')) return;
  const input = form.querySelector('input');
  if (!(input instanceof HTMLInputElement)) return;

  const result = gateFinalCommand(input.value, document.cookie);
  if (!result.handled) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const output = form.parentElement?.querySelector('.lac-terminal-output');
  if (!output) return;
  const prompt = form.querySelector('label span')?.textContent || '';
  const line = input.value.trim();
  appendTerminalLine(output, `${prompt}${line}`);
  input.value = '';

  void recordFinalCommand(line);

  if (!result.accepted) {
    appendTerminalLine(output, SOURCE_INTERVAL_UNREAD);
    appendTerminalLine(output, 'OPEN MISSING_INTERVAL.arc AND READ TO END.');
    output.scrollTop = output.scrollHeight;
    return;
  }

  appendTerminalLine(output, 'SOURCE INTERVAL VERIFIED.');
  appendTerminalLine(output, 'COMMIT REQUEST ACCEPTED.');
  output.scrollTop = output.scrollHeight;
  window.setTimeout(() => runCinematic(), 120);
}, true);

document.addEventListener('click', (event) => {
  const button = event.target instanceof Element ? event.target.closest('button') : null;
  if (!button) return;
  const legacyRoot = button.closest('.lac-finale,.lac-ending,.lac-window');
  if (!legacyRoot) return;
  const rootText = (legacyRoot.textContent || '').toUpperCase();
  if (legacyRoot.dataset.lacunaFinaleMigrated !== 'true' && !rootText.includes('LACUNA — FINAL MODEL')) return;
  const label = (button.dataset.lacunaLegacyLabel || button.getAttribute('aria-label') || button.textContent || '').trim().toUpperCase();
  if (!LEGACY_ENDING_LABELS.has(label)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void openArchive();
}, true);

window.addEventListener('rip-lacuna-open-finale', () => {
  queueMicrotask(() => prepareLegacyFinale());
});

const mutationObserver = new MutationObserver((mutations) => {
  if (archiveOverlay || cinematicOverlay) return;
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;
      const candidates = [node, ...node.querySelectorAll('.lac-finale,.lac-ending,.lac-window')];
      const found = candidates.some((element) => {
        const text = (element.textContent || '').toUpperCase();
        return element.classList?.contains('lac-finale') ||
          element.classList?.contains('lac-ending') ||
          text.includes('LACUNA — FINAL MODEL') ||
          (text.includes('RUN') && text.includes('EXPORT') && text.includes('SHUT DOWN'));
      });
      if (found) {
        prepareLegacyFinale();
        return;
      }
    }
  }
});

mutationObserver.observe(document.documentElement, { childList: true, subtree: true });

queueMicrotask(() => {
  const legacy = [...document.querySelectorAll('.lac-finale,.lac-ending,.lac-window')].some((element) => {
    const text = (element.textContent || '').toUpperCase();
    return element.classList.contains('lac-finale') ||
      element.classList.contains('lac-ending') ||
      text.includes('LACUNA — FINAL MODEL') ||
      (text.includes('RUN') && text.includes('EXPORT') && text.includes('SHUT DOWN'));
  });
  if (legacy) prepareLegacyFinale();
});
