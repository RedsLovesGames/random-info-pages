const VALID_OS = Object.freeze(['windows', 'linux', 'apple', 'android']);

/** Return a world based on platform hints. Android must be checked before Linux. */
export function detectOS(userAgent = '', platform = '', maxTouchPoints = 0) {
  const ua = String(userAgent);
  const p = String(platform);
  if (/Android/i.test(ua) || /Android/i.test(p)) return 'android';
  if (/iPad|iPhone|iPod/i.test(ua) || (/Mac/i.test(p) && Number(maxTouchPoints) > 1)) return 'apple';
  if (/Windows|Win32|Win64|WinCE/i.test(ua) || /^Win/i.test(p)) return 'windows';
  if (/Macintosh|Mac OS X/i.test(ua) || /Mac/i.test(p)) return 'apple';
  if (/Linux|X11|CrOS|Ubuntu|Fedora/i.test(ua) || /Linux|X11/i.test(p)) return 'linux';
  return 'windows';
}

/** Explicit ?os= links take precedence, without saving overrides across sessions. */
export function resolveOS(query = '', userAgent = '', platform = '', maxTouchPoints = 0) {
  const forced = new URLSearchParams(query).get('os');
  const selected = VALID_OS.includes(forced) ? forced : null;
  return { os: selected || detectOS(userAgent, platform, maxTouchPoints), automatic: !selected };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const $ = (id) => document.getElementById(id);
  const chooser = $('worldChooser');
  const worlds = Array.from(document.querySelectorAll('[data-os]'));
  const buttons = Array.from(document.querySelectorAll('[data-world]'));
  const UA = navigator.userAgent || '';
  const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  const touchPoints = navigator.maxTouchPoints || 0;
  let currentOS = null;
  let breatheTimeouts = [];

  function selectedWorld() {
    return resolveOS(window.location.search, UA, platform, touchPoints);
  }

  function presentWorld(focusHeading = false) {
    const selection = selectedWorld();
    currentOS = selection.os;
    worlds.forEach((world) => { world.hidden = world.dataset.os !== selection.os; });
    $('currentWorld').textContent = selection.os.toUpperCase();
    $('detectionLabel').textContent = selection.automatic ? '/ AUTO-DETECTED' : '/ MANUALLY SELECTED';
    buttons.forEach((button) => {
      if (button.dataset.world === selection.os) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    document.title = ({
      windows: 'A Little Window Into Everything',
      linux: 'guest@the-internet:~',
      apple: 'A Little Less Internet',
      android: 'A Whole World, One Thumb'
    })[selection.os] + ' | Random Info Pages';
    const colors = { windows: '#173d6e', linux: '#101612', apple: '#f7f3ed', android: '#161d16' };
    document.querySelector('meta[name="theme-color"]').setAttribute('content', colors[selection.os]);
    if (selection.os !== 'apple') stopBreathing();
    if (focusHeading) {
      const heading = $('world-' + selection.os).querySelector('h1');
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  function navigate(os) {
    const url = new URL(window.location.href);
    if (os === null) url.searchParams.delete('os');
    else url.searchParams.set('os', os);
    window.history.pushState({}, '', url);
    if (chooser.open) chooser.close();
    presentWorld(true);
  }

  $('showAll').addEventListener('click', () => chooser.showModal());
  $('closeChooser').addEventListener('click', () => chooser.close());
  chooser.addEventListener('click', (event) => { if (event.target === chooser) chooser.close(); });
  buttons.forEach((button) => button.addEventListener('click', () => navigate(button.dataset.world)));
  $('returnAuto').addEventListener('click', () => navigate(null));
  window.addEventListener('popstate', () => presentWorld());

  // WINDOWS: faux desktop windows and a deliberately small Start menu.
  const winFiles = {
    about: {
      title: 'READ_ME.txt',
      html: '<strong>You found the side quest.</strong><p>This is a miniature desktop living inside a webpage. Three shortcuts, zero actual files touched, and a little bit of nostalgia.</p><p>Best opened while procrastinating responsibly.</p>'
    },
    files: {
      title: 'My things',
      html: '<strong>/CURIOSITIES</strong><ul><li><a href="../algorithm-arena/">Algorithm Arena ↗</a></li><li><a href="../cryptography-museum/">Cryptography Museum ↗</a></li><li><a href="../music-microscope/">Music Microscope ↗</a></li></ul>'
    },
    secret: {
      title: 'absolutely_not_a_secret.txt',
      html: '<strong>CONFIDENTIAL: Level zero.</strong><p>You clicked on a folder explicitly labeled not a secret. That level of curiosity is precisely why this entire website exists.</p><p>Achievement unlocked: suspiciously observant.</p>'
    }
  };
  const startMenu = $('startMenu');
  function openWindow(key) {
    const file = winFiles[key];
    if (!file) return;
    $('winWindowTitle').textContent = file.title;
    $('winWindowBody').innerHTML = file.html; // Closed set of author-written markup, never user input.
    $('winWindow').hidden = false;
    startMenu.hidden = true;
    $('winStart').setAttribute('aria-expanded', 'false');
  }
  document.querySelectorAll('[data-win]').forEach((button) =>
    button.addEventListener('click', () => openWindow(button.dataset.win)));
  $('winClose').addEventListener('click', () => { $('winWindow').hidden = true; });
  $('winStart').addEventListener('click', () => {
    startMenu.hidden = !startMenu.hidden;
    $('winStart').setAttribute('aria-expanded', String(!startMenu.hidden));
  });
  $('winRestart').addEventListener('click', () => {
    $('winWindow').hidden = true;
    startMenu.hidden = true;
    $('winStart').setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('click', (event) => {
    if (!startMenu.hidden && !event.target.closest('#startMenu') && !event.target.closest('#winStart')) {
      startMenu.hidden = true;
      $('winStart').setAttribute('aria-expanded', 'false');
    }
  });
  function updateClocks() {
    const now = new Date();
    const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(now);
    $('winClock').textContent = time;
    $('phoneClock').textContent = time;
    $('phoneDay').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(now).toUpperCase();
    $('appleGreeting').textContent = now.getHours() < 12 ? 'GOOD MORNING.' : now.getHours() < 17 ? 'GOOD AFTERNOON.' : 'GOOD EVENING.';
    $('appleDeviceLabel').textContent = /iPad|iPhone|iPod/i.test(UA) || (/Mac/i.test(platform) && touchPoints > 1) ? 'MADE FOR A SMALL SCREEN' : 'MADE FOR A BIG SCREEN';
  }
  updateClocks();
  window.setInterval(updateClocks, 60000);

  // LINUX: deterministic fake commands. No shell, subprocesses, network requests, or eval.
  const termOutput = $('terminalOutput');
  const commandInput = $('terminalCommand');
  const fortunes = [
    'You have successfully avoided doing something productive.',
    'Every rabbit hole is a valid destination if you learn something.',
    'There is no exit command for curiosity.',
    'The best bugs are the ones you can turn into features.'
  ];
  let fortuneIndex = 0;
  function termLine(value, kind) {
    const line = document.createElement('p');
    line.className = kind || 'term-answer';
    line.textContent = value;
    termOutput.append(line);
    termOutput.scrollTop = termOutput.scrollHeight;
  }
  function runCommand(raw) {
    const cmd = raw.trim();
    if (!cmd) return;
    termLine('guest@random:~$ ' + cmd, 'term-line');
    const args = cmd.split(/\s+/);
    const head = args[0].toLowerCase();
    if (head === 'clear') { termOutput.replaceChildren(); return; }
    const simple = {
      help: 'help   ls   cat notes.txt   uname   whoami   pwd   date   echo TEXT   fortune   neofetch   sudo   coffee   clear   open',
      ls: 'notes.txt   tiny-ideas/   do-not-delete/   readme.md',
      pwd: '/home/guest/curiosity',
      whoami: 'guest (professionally curious)',
      uname: 'Random Info OS (simulated) / Linux-ish / browser',
      date: new Date().toLocaleString(),
      'cat notes.txt': 'RULE #1: Build the strange idea.\nRULE #2: Make it work.\nRULE #3: See rule #1.',
      'cat readme.md': '# Welcome.\nThis is a playful command interpreter, not a real Linux shell.',
      neofetch: '   /\\_/\\     guest@random\n  ( o.o )    OS: Imagination 1.0\n   > ^ <     Shell: tinysh\n             Uptime: since you arrived',
      coffee: 'Brewing… done. (No coffee was actually produced.)'
    };
    if (Object.hasOwn(simple, cmd.toLowerCase())) termLine(simple[cmd.toLowerCase()]);
    else if (head === 'fortune') { termLine(fortunes[fortuneIndex % fortunes.length]); fortuneIndex++; }
    else if (head === 'echo') termLine(cmd.slice(4).trim());
    else if (head === 'sudo') termLine('Access denied. You already have permission to be curious.', 'term-error');
    else if (head === 'cat') termLine('cat: ' + (args[1] || 'file') + ': no such file. Try ls.', 'term-error');
    else if (head === 'open') {
      termLine('Found the public directory:');
      const row = document.createElement('p');
      row.className = 'term-answer';
      const links = [['The index', '../'], ['Algorithm Arena', '../algorithm-arena/'], ['Cryptography Museum', '../cryptography-museum/']];
      links.forEach((item, i) => {
        const link = document.createElement('a');
        link.href = item[1];
        link.textContent = '[' + item[0] + ']';
        link.style.cssText = 'color:#b5ed84;text-decoration:underline;margin-right:16px';
        row.append(link);
      });
      termOutput.append(row);
    }
    else termLine('command not found: ' + head + '. Type help.', 'term-error');
    termOutput.scrollTop = termOutput.scrollHeight;
  }
  $('terminalForm').addEventListener('submit', (event) => {
    event.preventDefault();
    runCommand(commandInput.value.slice(0, 180));
    commandInput.value = '';
  });

  // APPLE: a paced breathing orb and an optional browser-local note.
  const orb = $('appleOrb');
  const breathLabel = $('appleBreathLabel');
  let breathActive = false;
  function stopBreathing() {
    breatheTimeouts.forEach(window.clearTimeout);
    breatheTimeouts = [];
    orb.classList.remove('is-breathing');
    breathActive = false;
    $('appleBreathe').firstChild.textContent = 'Breathe with the page ';
    breathLabel.textContent = 'A moment to yourself';
  }
  $('appleBreathe').addEventListener('click', () => {
    if (breathActive) { stopBreathing(); return; }
    breathActive = true;
    orb.classList.add('is-breathing');
    $('appleBreathe').firstChild.textContent = 'End this moment ';
    breathLabel.textContent = 'Breathe in · 4 seconds';
    breatheTimeouts.push(window.setTimeout(() => { breathLabel.textContent = 'Breathe out · 4 seconds'; }, 4000));
    breatheTimeouts.push(window.setTimeout(() => { breathLabel.textContent = 'Breathe in · 4 seconds'; }, 8000));
    breatheTimeouts.push(window.setTimeout(() => { breathLabel.textContent = 'Breathe out · 4 seconds'; }, 12000));
    breatheTimeouts.push(window.setTimeout(stopBreathing, 16000));
  });
  $('appleNoteToggle').addEventListener('click', () => {
    const noteArea = $('appleNoteWrap');
    noteArea.hidden = !noteArea.hidden;
    $('appleNoteToggle').setAttribute('aria-expanded', String(!noteArea.hidden));
    if (!noteArea.hidden) $('appleNote').focus();
  });
  try {
    $('appleNote').value = localStorage.getItem('rip-device-worlds-note') || '';
  } catch { $('appleSaveStatus').textContent = 'Local saving is unavailable in this browser.'; }
  $('appleNote').addEventListener('input', () => {
    try {
      localStorage.setItem('rip-device-worlds-note', $('appleNote').value);
      $('appleSaveStatus').textContent = 'Saved locally on this device, not sent anywhere.';
    } catch {
      $('appleSaveStatus').textContent = 'Local saving is unavailable. Your note remains here until you leave.';
    }
  });

  // ANDROID: each mock phone control visibly does something on the page.
  const phone = $('androidPhone');
  const notification = $('phoneNotification');
  const colors = document.querySelectorAll('.color-choice[data-accent]');
  const night = $('phoneGlow');
  const notify = $('phoneNotify');
  const message = notification.querySelector('span:last-child');
  function setAccent(color) {
    phone.dataset.accent = color;
    colors.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.accent === color)));
  }
  colors.forEach((b) => b.addEventListener('click', () => setAccent(b.dataset.accent)));
  function showMessage(title, body) {
    notification.hidden = false;
    message.replaceChildren();
    const strong = document.createElement('strong');
    strong.textContent = title;
    message.append(strong, document.createElement('br'), document.createTextNode(body));
    notify.setAttribute('aria-pressed', 'false');
    notify.querySelector('small').textContent = 'OPEN';
  }
  night.addEventListener('click', () => {
    const active = phone.classList.toggle('is-night');
    night.setAttribute('aria-pressed', String(active));
    night.querySelector('small').textContent = active ? 'ON' : 'OFF';
  });
  notify.addEventListener('click', () => {
    notification.hidden = !notification.hidden;
    notify.setAttribute('aria-pressed', String(notification.hidden));
    notify.querySelector('small').textContent = notification.hidden ? 'HIDDEN' : 'OPEN';
  });
  $('phoneWeather').addEventListener('click', () => showMessage('Forecast updated', 'Scattered ideas with a high chance of falling down a rabbit hole.'));
  $('phoneHello').addEventListener('click', () => showMessage('Hey, you.', 'This is a website saying hello, not your actual phone.'));
  const surpriseMessages = [
    'Today is an excellent day to invent something useless.',
    'A website can be weird and still be useful.',
    'Fun fact: the home button down there is painted on.'
  ];
  let surpriseIndex = 0;
  $('phoneSurprise').addEventListener('click', () => {
    showMessage('An unsolicited thought', surpriseMessages[surpriseIndex % surpriseMessages.length]);
    surpriseIndex++;
  });
  $('phoneReset').addEventListener('click', () => {
    setAccent('lime');
    phone.classList.remove('is-night');
    night.setAttribute('aria-pressed', 'false');
    night.querySelector('small').textContent = 'OFF';
    showMessage('System message', "You're exactly where you need to be.");
  });

  presentWorld();
}
