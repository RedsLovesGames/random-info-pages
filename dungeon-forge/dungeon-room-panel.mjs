import { contentFields, doorKinds, furnishingNames } from './dungeon-project.mjs';
import { roomFeatures } from './adventure.mjs';
import { srdPdf } from './adventure-monsters.mjs';

export function textElement(tag, content, className) {
  const element = document.createElement(tag);
  element.textContent = content;
  if (className) element.className = className;
  return element;
}

export function labeledList(entries) {
  const list = document.createElement('dl');
  for (const [term, detail] of entries) list.append(textElement('dt', term), textElement('dd', detail));
  return list;
}

function button(name, action) {
  const element = textElement('button', name);
  element.type = 'button';
  element.addEventListener('click', action);
  return element;
}

function labeled(name, element) {
  const label = textElement('label', name, 'battlemap-field');
  element.setAttribute('aria-label', name);
  label.append(element);
  return label;
}

function choice(name, options, selected, onChange) {
  const field = document.createElement('select');
  for (const [key, label] of options) field.add(new Option(label, key));
  field.value = selected;
  field.addEventListener('change', () => onChange(field.value));
  return labeled(name, field);
}

function editText(name, value, limit, onChange, multiline = false, event = 'change') {
  const input = document.createElement(multiline ? 'textarea' : 'input');
  if (multiline) input.rows = 3;
  input.maxLength = limit;
  input.value = value;
  input.addEventListener(event, () => onChange(input.value));
  return labeled(name, input);
}

function toggle(name, checked, onChange) {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  const label = textElement('label', name, 'battlemap-toggle');
  label.prepend(input);
  return label;
}

function capitalize(value) { return value[0].toUpperCase() + value.slice(1); }

function encounterPanel(room, running, state, actions) {
  const enc = room.encounter;
  const section = textElement('div', '', 'battlemap-encounter');
  section.append(textElement('h4', enc.totalXp.toLocaleString() + ' / ' + enc.budget.toLocaleString() + ' XP'));
  for (const [group, monster] of enc.monsters.entries()) {
    const card = textElement('article', '', 'battlemap-monster');
    const anchor = textElement('a', monster.name + ' stat block');
    anchor.href = srdPdf + '#page=' + monster.page;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    const initiative = (monster.initiative >= 0 ? '+' : '') + monster.initiative;
    card.append(textElement('b', monster.positions.length + ' × ' + monster.name),
      textElement('p', 'AC ' + monster.ac + ' · HP ' + monster.hp + ' · Initiative ' + initiative +
        ' · CR ' + monster.cr + ' · ' + monster.xp.toLocaleString() + ' XP each'), anchor);
    for (const [index, position] of monster.positions.entries()) {
      const identity = monster.name + ' ' + (index + 1);
      if (running) {
        const key = group + ':' + index;
        const input = document.createElement('input');
        input.type = 'number';
        input.min = 0;
        input.max = monster.hp;
        input.value = Math.min(monster.hp, state.hp[key] ?? monster.hp);
        const update = value => {
          input.value = Math.min(monster.hp, Math.max(0, Number.parseInt(value, 10) || 0));
          actions.hp(key, Number(input.value));
        };
        input.addEventListener('change', () => update(input.value));
        const hp = textElement('div', '', 'battlemap-hp');
        const minus = button('−5', () => update(Number(input.value) - 5));
        const plus = button('+5', () => update(Number(input.value) + 5));
        minus.setAttribute('aria-label', 'Remove 5 HP from ' + identity);
        plus.setAttribute('aria-label', 'Restore 5 HP to ' + identity);
        hp.append(labeled(identity + ' HP', input), minus, plus);
        card.append(hp);
      } else {
        card.append(button('Move ' + identity + ' · ' + (position.x + 1) + ',' + (position.y + 1),
          () => actions.beginPlacement({ group, index, position })));
      }
    }
    section.append(card);
  }
  return section;
}

function positionEditor(placement, actions) {
  const form = textElement('form', '', 'battlemap-position');
  const title = placement.cover ? 'Add or remove cover' : 'Move monster';
  form.append(textElement('p', title + ' by clicking a square on the map or entering its coordinates.'));
  const column = document.createElement('input');
  const row = document.createElement('input');
  for (const input of [column, row]) {
    input.type = 'number';
    input.min = 1;
    input.required = true;
  }
  column.value = placement.position.x + 1;
  row.value = placement.position.y + 1;
  const place = textElement('button', placement.cover ? 'Toggle cover' : 'Place monster');
  place.type = 'submit';
  form.append(labeled('Column', column), labeled('Row', row), place, button('Cancel placement', actions.cancelPlacement));
  form.addEventListener('submit', event => {
    event.preventDefault();
    actions.place(Number(column.value) - 1, Number(row.value) - 1);
  });
  return form;
}

function editControls(room, project, actions) {
  const section = textElement('div', '', 'battlemap-room-content');
  section.append(editText('Room title', room.name, 100, value => actions.text('name', value)),
    editText('Read aloud', room.readAloud, 1200, value => actions.text('readAloud', value), true),
    choice('Furnishings', furnishingNames.map(name => [name, capitalize(name)]), project.style[room.id] ?? 'auto', actions.furnishing),
    button('Place or remove cover', () => actions.beginPlacement({cover: true, position: { x: room.x, y: room.y }})));
  if (room.furnishings.length) section.append(textElement('p', 'On the map · ' + [...new Set(room.furnishings)].join(', ')));

  const controls = textElement('div', '', 'battlemap-room-actions');
  for (const field of contentFields) {
    const locked = project.changes[room.id]?.[field]?.locked === true;
    const row = textElement('div', '', 'battlemap-edit-field');
    const fieldName = capitalize(field);
    const roll = button(room[field] ? 'Reroll ' + field : 'Add ' + field, () => actions.roll(field));
    const remove = button('Remove ' + field, () => actions.roll(field, true));
    roll.disabled = locked;
    remove.disabled = locked || !room[field];
    const lock = button(locked ? 'Unlock ' + field : 'Lock ' + field, () => actions.lock(field));
    lock.setAttribute('aria-pressed', String(locked));
    row.append(textElement('b', fieldName), roll, lock);
    if (room[field]) row.append(remove);
    controls.append(row);
  }
  section.append(controls, button('Reroll this room', actions.rerollRoom));
  for (const index of room.doors) {
    section.append(choice(actions.doorLabel(index), doorKinds.map(kind => [kind, capitalize(kind)]),
      actions.doorKind(index), value => actions.door(index, value)));
  }
  return section;
}

export function roomPanel({room, project, running, state, placement, actions}) {
  const section = textElement('article', '', 'battlemap-room-content');
  section.append(textElement('h4', String(room.number).padStart(2, '0') + ' · ' + room.name),
    textElement('p', capitalize(room.role), 'battlemap-room-role'));
  if (running) {
    const links = textElement('div', '', 'battlemap-room-links');
    links.append(...room.links.map(number => button('Go to room ' + number, () => actions.go(number))));
    section.append(textElement('blockquote', room.readAloud), links);
    if (room.trap) section.append(toggle('Trap sprung', state.trap, value => actions.flag('trap', value)));
    if (room.treasure) section.append(toggle('Loot claimed', state.loot, value => actions.flag('loot', value)));
    for (const index of room.doors) {
      const door = actions.doorKind(index);
      section.append(toggle(actions.doorLabel(index) + ' · open (' + door + ')', project.session.doors[index] ?? door === 'open',
        value => actions.sessionDoor(index, value)));
    }
  } else {
    const editor = document.createElement('details');
    editor.className = 'battlemap-help';
    editor.append(textElement('summary', 'Edit room and contents'), editControls(room, project, actions));
    editor.open = actions.editorOpen;
    editor.addEventListener('toggle', () => actions.keepEditorOpen(editor.open));
    section.append(editor);
    if (placement) section.append(positionEditor(placement, actions));
  }
  if (running && room.encounter) section.append(encounterPanel(room, true, state, actions));
  section.append(labeledList(roomFeatures(room)));
  if (room.placementConflict) section.append(textElement('p', 'Saved starting spaces overlap the current terrain. Change furnishings or reroll the encounter.'));
  if (!running && room.encounter) section.append(encounterPanel(room, false, state, actions));
  const note = project.notes[room.id] ?? '';
  section.append(editText('GM notes', note, 2000, actions.note, true, 'input'));
  return section;
}
