(() => {
  const FOLDERS = {
    tools: {
      title: 'Tools',
      projects: [
        ['Toolbox', '../tools/'],
        ['Wheel', '../wheel/'],
        ['When We Meet', '../whenwemeet/'],
      ],
    },
    school: {
      title: 'School',
      projects: [['School Schedule', '../school-schedule/']],
    },
    friends: {
      title: 'Friends',
      projects: [['Friend Group Hub', '../friends/']],
    },
    games: {
      title: 'Games',
      projects: [
        ['Tideborne', '../tideborne/'],
        ['Fishing System 2.0', '../tide2/'],
        ['VCT Scout Board', '../vct-scout/'],
      ],
    },
    data: {
      title: 'Data',
      projects: [
        ['Old Ass Politic', '../oldasspolitic/'],
        ['10Groups Heatmap', '../heatmap/'],
      ],
    },
    experiments: {
      title: 'Experiments',
      projects: [
        ['Emperor Director', '../wanuiv2/'],
        ['Nerdcore Prompts', '../nerdcore-prompts/'],
      ],
    },
  };

  const LEGACY = {
    doom: {
      title: 'Doom',
      icon: 'https://raw.githubusercontent.com/henryjeff/portfolio-inner-site/master/src/assets/icons/doomIcon.png',
      copy: 'Legacy Doom shortcut retained from the original desktop. The DOS runtime is not bundled into Random Info OS yet.',
    },
    trail: {
      title: 'The Oregon Trail',
      icon: 'https://raw.githubusercontent.com/henryjeff/portfolio-inner-site/master/src/assets/icons/trailIcon.png',
      copy: 'Legacy Oregon Trail shortcut retained from the original desktop. The DOS runtime is not bundled into Random Info OS yet.',
    },
  };

  const pointerEvents = new Set(['mousemove', 'mousedown', 'mouseup']);
  const keyboardEvents = new Set(['keydown', 'keyup']);
  const status = document.getElementById('inputStatus');
  const layer = document.getElementById('windowLayer');
  const taskButtons = document.getElementById('taskButtons');
  const startButton = document.getElementById('startButton');
  const startMenu = document.getElementById('startMenu');
  const clock = document.getElementById('clock');
  let zCounter = 20;
  let windowCounter = 0;

  function forwardEvent(type, event) {
    let payload;
    if (pointerEvents.has(type)) {
      payload = { type, clientX: event.clientX, clientY: event.clientY };
    } else if (keyboardEvents.has(type)) {
      payload = { type, key: event.key };
    } else {
      return;
    }

    document.documentElement.dataset.lastEvent = type;
    if (status) status.value = `INPUT: ${type.toUpperCase()}`;
    if (window.parent !== window) {
      parent.postMessage(payload, window.location.origin);
    }
  }

  function bringToFront(win) {
    if (!win) return;
    zCounter += 1;
    win.style.zIndex = String(zCounter);
    document.querySelectorAll('.explorer-window').forEach((candidate) => {
      candidate.classList.toggle('active-window', candidate === win);
      const title = candidate.querySelector('.window-titlebar');
      if (title) title.classList.toggle('inactive', candidate !== win);
    });
  }

  function makeDraggable(win, titlebar) {
    let drag = null;
    titlebar.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button')) return;
      bringToFront(win);
      const rect = win.getBoundingClientRect();
      drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      titlebar.setPointerCapture?.(event.pointerId);
    });
    titlebar.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const maxX = Math.max(0, window.innerWidth - win.offsetWidth);
      const maxY = Math.max(0, window.innerHeight - 70);
      win.style.left = `${Math.max(0, Math.min(maxX, event.clientX - drag.x))}px`;
      win.style.top = `${Math.max(0, Math.min(maxY, event.clientY - drag.y))}px`;
    });
    const stop = () => { drag = null; };
    titlebar.addEventListener('pointerup', stop);
    titlebar.addEventListener('pointercancel', stop);
  }

  function addTaskButton(id, title, win) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'task-button';
    button.dataset.windowId = id;
    button.textContent = title;
    button.addEventListener('click', () => {
      const hidden = win.style.display === 'none';
      if (hidden) win.style.display = '';
      if (!hidden && win.classList.contains('active-window')) {
        win.style.display = 'none';
        return;
      }
      bringToFront(win);
    });
    taskButtons.append(button);
  }

  function createWindow(title, bodyHtml, statusText = '') {
    windowCounter += 1;
    const id = `win-${windowCounter}`;
    const win = document.createElement('section');
    win.className = 'explorer-window active-window';
    win.dataset.windowId = id;
    const offset = ((windowCounter - 1) % 6) * 18;
    win.style.left = `${Math.min(155 + offset, Math.max(14, window.innerWidth - 445))}px`;
    win.style.top = `${58 + offset}px`;
    win.innerHTML = `
      <div class="window-titlebar">
        <span class="window-title-icon" aria-hidden="true"></span>
        <span class="window-title">${title}</span>
        <button class="win95-control minimize-window" type="button" aria-label="Minimize">_</button>
        <button class="win95-control close-window" type="button" aria-label="Close">×</button>
      </div>
      <div class="window-menubar"><span>File</span><span>Edit</span><span>View</span><span>Help</span></div>
      ${bodyHtml}
      <div class="window-statusbar"><span class="status-panel">${statusText || title}</span></div>`;
    layer.append(win);
    bringToFront(win);

    const titlebar = win.querySelector('.window-titlebar');
    makeDraggable(win, titlebar);
    win.addEventListener('pointerdown', () => bringToFront(win));

    win.querySelector('.close-window').addEventListener('click', () => {
      win.remove();
      taskButtons.querySelector(`[data-window-id="${id}"]`)?.remove();
    });
    win.querySelector('.minimize-window').addEventListener('click', () => {
      win.style.display = 'none';
    });

    addTaskButton(id, title, win);
    return win;
  }

  function openFolderWindow(folderKey) {
    const folder = FOLDERS[folderKey];
    if (!folder) return;
    const files = folder.projects.map(([name, route]) => `
      <a class="project-file" href="${route}" target="_top">
        <span class="project-file-icon" aria-hidden="true"></span>
        <span>${name}</span>
      </a>`).join('');
    createWindow(
      folder.title,
      `<div class="window-address"><span class="address-label">Address</span><span class="address-path">C:\\RIP\\${folder.title.toUpperCase()}</span></div><div class="window-content">${files}</div>`,
      `${folder.projects.length} object${folder.projects.length === 1 ? '' : 's'}`
    );
  }

  function openLegacyWindow(key) {
    const legacy = LEGACY[key];
    if (!legacy) return;
    createWindow(
      legacy.title,
      `<div class="window-content legacy-content"><img class="legacy-icon-large" src="${legacy.icon}" alt=""><p><b>${legacy.title}</b></p><p>${legacy.copy}</p><p>The icon itself is the same artwork used on Henry Heffernan's original desktop.</p></div>`,
      'Legacy game shortcut'
    );
  }

  function selectShortcut(button) {
    document.querySelectorAll('.desktop-shortcut').forEach((item) => item.classList.toggle('selected', item === button));
  }

  function activateShortcut(button) {
    if (button.dataset.folder) openFolderWindow(button.dataset.folder);
    if (button.dataset.legacy) openLegacyWindow(button.dataset.legacy);
  }

  document.querySelectorAll('.desktop-shortcut').forEach((button) => {
    button.addEventListener('click', () => {
      selectShortcut(button);
      if (window.matchMedia('(pointer: coarse)').matches) activateShortcut(button);
    });
    button.addEventListener('dblclick', () => activateShortcut(button));
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activateShortcut(button);
      }
    });
  });

  startButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = startMenu.hidden;
    startMenu.hidden = !willOpen;
    startButton.setAttribute('aria-expanded', String(willOpen));
  });
  startMenu.addEventListener('click', (event) => event.stopPropagation());
  document.addEventListener('click', () => {
    startMenu.hidden = true;
    startButton.setAttribute('aria-expanded', 'false');
  });

  document.getElementById('aboutComputer').addEventListener('click', () => {
    startMenu.hidden = true;
    createWindow(
      'About Random Info OS',
      '<div class="window-content legacy-content win95-about"><p><b>Random Info OS 95</b></p><p>A Windows 95-style gateway into the Random Info Pages archive.</p><p>Desktop shell: Random Info Pages. 3D CRT shell: adapted from Henry Heffernan\'s open-source portfolio.</p></div>',
      'Random Info Pages'
    );
  });

  function updateClock() {
    const now = new Date();
    if (clock) clock.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  updateClock();
  setInterval(updateClock, 15000);

  document.addEventListener('mousemove', (event) => forwardEvent('mousemove', event), { passive: true });
  document.addEventListener('mousedown', (event) => forwardEvent('mousedown', event), { passive: true });
  document.addEventListener('mouseup', (event) => forwardEvent('mouseup', event), { passive: true });
  document.addEventListener('keydown', (event) => forwardEvent('keydown', event));
  document.addEventListener('keyup', (event) => forwardEvent('keyup', event));
  window.addEventListener('load', () => document.body.focus());
})();
