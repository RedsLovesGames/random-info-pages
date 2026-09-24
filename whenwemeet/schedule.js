(() => {
  const DATA_URL = './schedule-data.json?v=20260924';
  const CSS_URL = './schedule.css?v=20260924';
  const PEOPLE_CLASSES = { Alex: 'person-alex', Doron: 'person-doron', Mike: 'person-mike', Tommy: 'person-tommy' };
  const appMain = document.querySelector('main');
  const header = document.querySelector('.site-header');
  const headerActions = document.querySelector('.header-actions');
  if (!appMain || !header || !headerActions || document.querySelector('#general-schedule-view')) return;

  if (!document.querySelector(`link[href^="${CSS_URL.split('?')[0]}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_URL;
    document.head.append(link);
  }

  const state = {
    data: null,
    activePeople: new Set(),
    showFlexible: true,
    view: 'planner',
    previousTitle: document.title,
  };

  const nav = document.createElement('nav');
  nav.className = 'product-tabs';
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', 'WhenWeMeet sections');
  nav.innerHTML = `
    <button class="product-tab active" type="button" role="tab" aria-selected="true" data-product-tab="planner">Planner</button>
    <button class="product-tab" type="button" role="tab" aria-selected="false" data-product-tab="schedule">General schedule</button>`;
  header.insertBefore(nav, headerActions);

  const scheduleView = document.createElement('section');
  scheduleView.id = 'general-schedule-view';
  scheduleView.className = 'general-schedule-view';
  scheduleView.hidden = true;
  scheduleView.innerHTML = `
    <div class="schedule-shell">
      <div class="schedule-hero">
        <div>
          <p class="eyebrow">Alex · Doron · Mike · Tommy</p>
          <h1>General weekly schedule</h1>
          <p class="schedule-lead">Fixed classes and activities from the shared schedule sheet, aligned on one weekly timeline. Green bands show times when all four fixed schedules are free.</p>
        </div>
        <div class="schedule-key" aria-label="Schedule legend">
          <span><i class="key-fixed"></i> Fixed conflict</span>
          <span><i class="key-flex"></i> Tentative / asynchronous</span>
          <span><i class="key-free"></i> All four free</span>
        </div>
      </div>

      <section class="schedule-controls" aria-label="Schedule filters">
        <div class="schedule-filter-block">
          <span class="schedule-filter-label">People</span>
          <div id="schedule-person-filters" class="person-filters"></div>
        </div>
        <label class="schedule-toggle"><input id="schedule-flexible-toggle" type="checkbox" checked> Show tentative & online items</label>
      </section>

      <section class="free-window-card">
        <div>
          <p class="step-label">Fixed-schedule overlap</p>
          <h2>Everyone-free windows</h2>
        </div>
        <div id="free-window-list" class="free-window-list"></div>
      </section>

      <section class="calendar-card">
        <div class="calendar-card-head">
          <div>
            <p class="step-label">Week view</p>
            <h2>Busy blocks by person</h2>
          </div>
          <p>8:00 AM to 10:00 PM · scroll horizontally on smaller screens</p>
        </div>
        <div class="calendar-scroll">
          <div id="schedule-calendar" class="schedule-calendar" aria-label="Weekly schedule"></div>
        </div>
      </section>

      <section class="agenda-card">
        <div class="calendar-card-head">
          <div>
            <p class="step-label">Compact view</p>
            <h2>Weekly agenda</h2>
          </div>
        </div>
        <div id="schedule-agenda" class="schedule-agenda"></div>
      </section>

      <details class="schedule-notes">
        <summary>Modeling notes from the spreadsheet</summary>
        <ul id="schedule-notes-list"></ul>
      </details>
    </div>`;
  appMain.insertAdjacentElement('afterend', scheduleView);

  const personFilters = scheduleView.querySelector('#schedule-person-filters');
  const flexibleToggle = scheduleView.querySelector('#schedule-flexible-toggle');
  const freeWindowList = scheduleView.querySelector('#free-window-list');
  const calendar = scheduleView.querySelector('#schedule-calendar');
  const agenda = scheduleView.querySelector('#schedule-agenda');
  const notesList = scheduleView.querySelector('#schedule-notes-list');

  function formatTime(minutes) {
    if (minutes === 1440) return '12:00 AM';
    const hour24 = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    const suffix = hour24 >= 12 ? 'PM' : 'AM';
    const hour = hour24 % 12 || 12;
    return `${hour}:${String(mins).padStart(2, '0')} ${suffix}`;
  }

  function formatRange(start, end) {
    return `${formatTime(start)}–${formatTime(end)}`;
  }

  function visibleEvents() {
    if (!state.data) return [];
    return state.data.events.filter((event) => state.activePeople.has(event.person) && (state.showFlexible || event.counted));
  }

  function setView(view) {
    state.view = view === 'schedule' ? 'schedule' : 'planner';
    const scheduleActive = state.view === 'schedule';
    if (scheduleActive) state.previousTitle = document.title;
    appMain.hidden = scheduleActive;
    scheduleView.hidden = !scheduleActive;
    nav.querySelectorAll('[data-product-tab]').forEach((button) => {
      const active = button.dataset.productTab === state.view;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.title = scheduleActive ? 'General Schedule | WhenWeMeet' : state.previousTitle;
    if (scheduleActive && state.data) requestAnimationFrame(() => calendar.scrollLeft = 0);
  }

  function renderFilters() {
    personFilters.replaceChildren();
    const all = document.createElement('button');
    all.type = 'button';
    all.className = `person-filter all${state.activePeople.size === state.data.people.length ? ' active' : ''}`;
    all.textContent = 'All';
    all.addEventListener('click', () => {
      state.activePeople = new Set(state.data.people);
      renderAll();
    });
    personFilters.append(all);

    for (const person of state.data.people) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `person-filter ${PEOPLE_CLASSES[person] || ''}${state.activePeople.has(person) ? ' active' : ''}`;
      button.textContent = person;
      button.setAttribute('aria-pressed', state.activePeople.has(person) ? 'true' : 'false');
      button.addEventListener('click', () => {
        if (state.activePeople.has(person) && state.activePeople.size > 1) state.activePeople.delete(person);
        else state.activePeople.add(person);
        renderAll();
      });
      personFilters.append(button);
    }
  }

  function renderFreeWindows() {
    freeWindowList.replaceChildren();
    for (const day of state.data.days) {
      const item = document.createElement('div');
      item.className = 'free-window-item';
      const strong = document.createElement('strong');
      strong.textContent = day.slice(0, 3);
      const spans = document.createElement('div');
      const windows = state.data.allFreeWindows[day] || [];
      if (!windows.length) spans.textContent = 'No shared window';
      else windows.forEach((window) => {
        const tag = document.createElement('span');
        tag.textContent = formatRange(window.start, window.end);
        spans.append(tag);
      });
      item.append(strong, spans);
      freeWindowList.append(item);
    }
  }

  function makeEventBlock(event, activePeople, startMinute, endMinute) {
    const block = document.createElement('article');
    const personIndex = Math.max(0, activePeople.indexOf(event.person));
    const laneCount = Math.max(1, activePeople.length);
    const clippedStart = Math.max(startMinute, event.start);
    const clippedEnd = Math.min(endMinute, event.end);
    const heightMinutes = Math.max(15, clippedEnd - clippedStart);
    block.className = `schedule-event ${PEOPLE_CLASSES[event.person] || ''}${event.counted ? '' : ' flexible'}`;
    block.style.top = `${(clippedStart - startMinute) * 1.08}px`;
    block.style.height = `${Math.max(28, heightMinutes * 1.08)}px`;
    block.style.left = `calc(${personIndex * (100 / laneCount)}% + 3px)`;
    block.style.width = `calc(${100 / laneCount}% - 6px)`;
    block.title = `${event.person}: ${event.event} · ${formatRange(event.start, event.end)}${event.notes ? ` · ${event.notes}` : ''}`;
    const who = document.createElement('span');
    who.className = 'schedule-event-person';
    who.textContent = event.person;
    const name = document.createElement('strong');
    name.textContent = event.event;
    const time = document.createElement('span');
    time.className = 'schedule-event-time';
    time.textContent = formatRange(event.start, event.end);
    block.append(who, name, time);
    return block;
  }

  function renderCalendar() {
    calendar.replaceChildren();
    const startMinute = state.data.range.start;
    const endMinute = state.data.range.end;
    const totalHeight = (endMinute - startMinute) * 1.08;
    const activePeople = state.data.people.filter((person) => state.activePeople.has(person));
    calendar.style.setProperty('--schedule-height', `${totalHeight}px`);

    const corner = document.createElement('div');
    corner.className = 'schedule-day-head schedule-corner';
    corner.textContent = 'Time';
    calendar.append(corner);
    state.data.days.forEach((day) => {
      const head = document.createElement('div');
      head.className = 'schedule-day-head';
      head.innerHTML = `<strong>${day.slice(0, 3)}</strong><span>${day}</span>`;
      calendar.append(head);
    });

    const timeRail = document.createElement('div');
    timeRail.className = 'schedule-time-rail';
    timeRail.style.height = `${totalHeight}px`;
    for (let minute = startMinute; minute <= endMinute; minute += 60) {
      const label = document.createElement('span');
      label.style.top = `${(minute - startMinute) * 1.08}px`;
      label.textContent = formatTime(minute).replace(':00 ', ' ');
      timeRail.append(label);
    }
    calendar.append(timeRail);

    const events = visibleEvents();
    state.data.days.forEach((day) => {
      const column = document.createElement('div');
      column.className = 'schedule-day-column';
      column.style.height = `${totalHeight}px`;
      for (let minute = startMinute; minute <= endMinute; minute += 60) {
        const line = document.createElement('i');
        line.className = 'hour-line';
        line.style.top = `${(minute - startMinute) * 1.08}px`;
        column.append(line);
      }
      for (const window of state.data.allFreeWindows[day] || []) {
        const band = document.createElement('div');
        band.className = 'all-free-band';
        band.style.top = `${(window.start - startMinute) * 1.08}px`;
        band.style.height = `${(window.end - window.start) * 1.08}px`;
        band.title = `All four fixed schedules free: ${formatRange(window.start, window.end)}`;
        column.append(band);
      }
      events
        .filter((event) => event.day === day && event.end > startMinute && event.start < endMinute)
        .sort((a, b) => a.start - b.start || a.person.localeCompare(b.person))
        .forEach((event) => column.append(makeEventBlock(event, activePeople, startMinute, endMinute)));
      calendar.append(column);
    });
  }

  function renderAgenda() {
    agenda.replaceChildren();
    const events = visibleEvents();
    for (const day of state.data.days) {
      const section = document.createElement('section');
      section.className = 'agenda-day';
      const heading = document.createElement('h3');
      heading.textContent = day;
      section.append(heading);
      const dayEvents = events.filter((event) => event.day === day).sort((a, b) => a.start - b.start || a.person.localeCompare(b.person));
      if (!dayEvents.length) {
        const empty = document.createElement('p');
        empty.className = 'agenda-empty';
        empty.textContent = 'No listed commitments.';
        section.append(empty);
      } else {
        dayEvents.forEach((event) => {
          const row = document.createElement('div');
          row.className = `agenda-row ${PEOPLE_CLASSES[event.person] || ''}${event.counted ? '' : ' flexible'}`;
          row.innerHTML = `<span class="agenda-time">${formatRange(event.start, event.end)}</span><span class="agenda-person">${event.person}</span><strong>${event.event}</strong><span class="agenda-category">${event.category}</span>`;
          if (event.notes) row.title = event.notes;
          section.append(row);
        });
      }
      agenda.append(section);
    }
  }

  function renderAll() {
    if (!state.data) return;
    renderFilters();
    renderFreeWindows();
    renderCalendar();
    renderAgenda();
  }

  async function loadData() {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Schedule data failed (${response.status})`);
      state.data = await response.json();
      state.activePeople = new Set(state.data.people);
      state.showFlexible = true;
      flexibleToggle.checked = true;
      notesList.replaceChildren(...state.data.notes.map((note) => {
        const li = document.createElement('li');
        li.textContent = note;
        return li;
      }));
      renderAll();
    } catch (error) {
      console.error(error);
      calendar.innerHTML = '<div class="schedule-load-error">The general schedule could not be loaded.</div>';
    }
  }

  nav.addEventListener('click', (event) => {
    const button = event.target.closest('[data-product-tab]');
    if (button) setView(button.dataset.productTab);
  });
  flexibleToggle.addEventListener('change', () => {
    state.showFlexible = flexibleToggle.checked;
    renderCalendar();
    renderAgenda();
  });

  loadData();
})();
