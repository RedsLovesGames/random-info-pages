import { executeTerminalCommand, parseTerminalLine } from '../../../win95-overrides/src/arg/engine/terminal.js';
import { ArgRuntimeStore } from '../state.js';
import { createWindow, escapeHtml } from './windowing.js';

export function openTerminal(store: ArgRuntimeStore): void {
  const ui = createWindow({ key: 'terminal', title: 'MS-DOS Prompt', icon: '▣', width: 640, height: 400, className: 'lac-terminal-window' });
  let cwd = 'C:\\Users\\evale';
  const history: string[] = [];
  const output: string[] = ['Microsoft(R) Windows 95', '   (C)Copyright Microsoft Corp 1981-1995.', '', 'Random Info OS compatibility shell.', ''];

  const render = (): void => {
    ui.body.innerHTML = `<div class="lac-terminal-output" aria-live="polite">${output.map((line)=>`<div class="lac-terminal-line">${escapeHtml(line) || '&nbsp;'}</div>`).join('')}</div><form class="lac-terminal-form"><label><span>${escapeHtml(cwd)}&gt;</span><input autocomplete="off" spellcheck="false" aria-label="Command"></label></form>`;
    const out = ui.body.querySelector<HTMLElement>('.lac-terminal-output')!;
    out.style.setProperty('display', 'flex', 'important');
    out.style.setProperty('flex-direction', 'column', 'important');
    out.style.setProperty('align-items', 'flex-start', 'important');
    out.querySelectorAll<HTMLElement>('.lac-terminal-line').forEach((lineElement) => {
      lineElement.style.setProperty('display', 'block', 'important');
      lineElement.style.setProperty('flex', '0 0 auto', 'important');
      lineElement.style.setProperty('min-width', '100%');
      lineElement.style.setProperty('width', 'max-content');
      lineElement.style.setProperty('box-sizing', 'border-box');
    });
    out.scrollTop = out.scrollHeight;
    const form = ui.body.querySelector<HTMLFormElement>('.lac-terminal-form')!;
    const input = form.querySelector<HTMLInputElement>('input')!; input.focus();
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const line = input.value.trim();
      output.push(`${cwd}>${line}`);
      if (!line) { render(); return; }
      history.push(line);
      const result = executeTerminalCommand(store.snapshot.filesystem, parseTerminalLine(line), { cwd, history: history.slice(0, -1) });
      cwd = result.cwd;
      if (result.clear) output.splice(0, output.length); else output.push(...result.lines);
      if (result.state) await store.applyFilesystem(result.state, result.event ? { ...result.event } : { type: 'terminal-command', target: line });
      else if (result.event) await store.event(result.event);
      await store.event({ type: 'terminal-command', target: line });
      render();
    });
  };
  render();
}
