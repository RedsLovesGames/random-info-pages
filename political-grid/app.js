"use strict";

const SUPABASE_URL = "https://bpudsyyepiminpdxlquz.supabase.co";
const SUPABASE_KEY = "sb_publishable_Hnbwm_iTFUzUCZ4qhpaBwg_tenP3pdp";
const DRAFT_KEY = "rip_political_grid_draft_v1";
const GROUPS = [
  {
    key: "rose", name: "Upper left", color: "#f6aeaf",
    statements: [
      "Execute all capitalists", "Stalin was right", "North Korea is best Korea",
      "National Bolshevist", "Osama bin Laden was right",
      "Jail all capitalists", "Labor camps are justified",
      "1984 isn't a warning, it's a guide", "Supports Hamas/Hezbollah", "\"Z\"",
      "Eliminate all property", "Communist", "Anti-democracy",
      "Supports Islamic democracy", "Supports mandatory military service",
      "Marx was right", "Ban religion", "Atheist", "Zohran Mamdani fan",
      "Supports mandatory community service",
      "Hates rich people", "#FreeLuigi", "Bernie Sanders fan",
      "Democratic socialist", "Supports universal health care"
    ]
  },
  {
    key: "blue", name: "Upper right", color: "#86d1f0",
    statements: [
      "Hitler was right", "Holocaust never happened", "Genocide is justified",
      "Supports absolute monarchy", "Supports absolute theocracy",
      "Mussolini was right", "Ban porn", "Ban pre-marital sex",
      "Ban all sex outside of procreation", "Slavery is justified",
      "Ban alcohol", "Groyper", "Supports remigration",
      "Anti-feminist", "Women are property",
      "Blue Lives Matter", "Pro-life", "MAGA", "Ban Islam",
      "Racism is justified", "Opposes illegal immigration", "Religious",
      "Imperialism is justified", "Kanye West fan", "Hates black people"
    ]
  },
  {
    key: "green", name: "Lower left", color: "#c3dfb8",
    statements: [
      "Hates white people", "Supports universal basic income",
      "Participated in BLM protests", "Is a member of a labor union",
      "Supports 2SLGBTQIA+", "Decriminalize crime", "Believes in astrology",
      "Ban GMOs", "Avoids eating seed oils", "Redditor",
      "Anti-electricity", "Anti-nuclear power", "\"Spiritual\"",
      "Vegan", "Pro-choice", "Anarcho-communist",
      "Supports Greenpeace/eco-terrorism", "Luddite",
      "Prostitution should be legal", "Defund the police",
      "Supports human extinction", "Anarcho-primitivist",
      "A.I. will lead to a dystopia",
      "Has been a sex worker before (including OnlyFans)", "Supports open borders"
    ]
  },
  {
    key: "yellow", name: "Lower right", color: "#f6ef99",
    statements: [
      "Gamer", "Corporations are people", "Capitalism is the best system",
      "Elon Musk fan", "Hates poor people",
      "Owns an electric car", "Pays for an LLM subscription",
      "Eliminate the income tax", "Supports the gold standard",
      "Jail all communists",
      "Owns crypto", "Hate speech is free speech", "Self-employed",
      "Javier Milei fan", "Jail all socialists",
      "Only uses FOSS", "Anti-masker", "Anti-vaxxer",
      "Minarchist", "All taxation is theft",
      "All drugs should be legal", "😭", "A.I. will lead to a utopia",
      "Is in the top 1%", "Unironic anarcho-capitalist"
    ]
  }
];

const STATEMENTS = GROUPS.flatMap((group, gi) =>
  group.statements.map((label, position) => ({
    id: gi * 25 + position, label, group: group.key, groupName: group.name, color: group.color
  }))
);
const $ = (id) => document.getElementById(id);
const tileMap = new Map();
let savedDraft = null;
try { savedDraft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch { /* Storage may be unavailable */ }

const state = {
  picks: new Set(Array.isArray(savedDraft && savedDraft.picks)
    ? savedDraft.picks.filter((id) => Number.isInteger(id) && id >= 0 && id < 100)
    : []),
  name: typeof (savedDraft && savedDraft.name) === "string" ? savedDraft.name : "",
  token: typeof (savedDraft && savedDraft.token) === "string" ? savedDraft.token : "",
  dirty: !!(savedDraft && savedDraft.dirty),
  stats: null,
  showAll: false,
  saving: false
};

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      picks: [...state.picks].sort((a, b) => a - b),
      name: state.name, token: state.token, dirty: state.dirty
    }));
  } catch { /* Non-persistent mode; submission still works */ }
}

function setSaveStatus(message, failed) {
  const el = $("save-status");
  el.textContent = message;
  el.style.color = failed ? "#ffb2a9" : "";
}

function markDirty() {
  state.dirty = true;
  saveDraft();
  setSaveStatus(state.token ? "Unsaved edits • submit to update" : "Not submitted");
}

function buildBoard() {
  const board = $("statement-board");
  const fragment = document.createDocumentFragment();
  GROUPS.forEach((group, gi) => {
    const box = document.createElement("section");
    box.className = "quadrant quadrant-" + group.key;
    box.style.setProperty("--tile", group.color);
    box.setAttribute("aria-label", group.name + " statements");
    const heading = document.createElement("div");
    heading.className = "quadrant-label";
    const label = document.createElement("span");
    label.textContent = String(gi + 1).padStart(2, "0") + " / " + group.name;
    const count = document.createElement("b");
    count.id = "group-count-" + group.key;
    count.textContent = "0 / 25";
    heading.append(label, count);
    const grid = document.createElement("div");
    grid.className = "quadrant-grid";
    group.statements.forEach((statement, position) => {
      const id = gi * 25 + position;
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "statement";
      tile.setAttribute("aria-label", statement + ". Toggle agreement.");
      tile.dataset.id = String(id);
      const index = document.createElement("span");
      index.className = "tile-index";
      index.textContent = String(id + 1).padStart(2, "0");
      index.setAttribute("aria-hidden", "true");
      const copy = document.createElement("span");
      copy.className = "statement-copy";
      copy.textContent = statement;
      const x = document.createElement("span");
      x.className = "tile-x";
      x.textContent = "✕";
      x.setAttribute("aria-hidden", "true");
      x.hidden = true;
      const percent = document.createElement("span");
      percent.className = "tile-percent";
      percent.hidden = true;
      percent.setAttribute("aria-hidden", "true");
      tile.append(index, copy, x, percent);
      tile.addEventListener("click", () => {
        if (state.picks.has(id)) state.picks.delete(id);
        else state.picks.add(id);
        markDirty();
        updateBoard();
        renderStats();
      });
      tileMap.set(id, { tile, x, percent });
      grid.append(tile);
    });
    box.append(heading, grid);
    fragment.append(box);
  });
  board.append(fragment);
  updateBoard();
}

function updateBoard() {
  const search = $("statement-search").value.trim().toLocaleLowerCase();
  const n = state.stats && state.stats.respondents;
  const overlay = $("overlay-toggle").checked;
  for (const statement of STATEMENTS) {
    const { tile, x, percent } = tileMap.get(statement.id);
    const selected = state.picks.has(statement.id);
    tile.classList.toggle("selected", selected);
    tile.classList.toggle("filtered-out", !!search && !statement.label.toLocaleLowerCase().includes(search));
    tile.setAttribute("aria-pressed", String(selected));
    x.hidden = !selected;
    percent.hidden = !(overlay && n > 0);
    if (overlay && n > 0) {
      percent.textContent = Math.round(state.stats.counts[statement.id] * 100 / n) + "% selected";
    }
  }
  $("selection-count").innerHTML = String(state.picks.size) + "<span> / 100</span>";
  GROUPS.forEach((group, gi) => {
    let marked = 0;
    for (let i = gi * 25; i < (gi + 1) * 25; i++) if (state.picks.has(i)) marked++;
    $("group-count-" + group.key).textContent = marked + " / 25";
  });
}

async function rpc(method, body) {
  const response = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + method, {
    method: "POST", cache: "no-store",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json", "Accept": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    let detail = "";
    try {
      const error = await response.json();
      detail = (error && error.message) || "";
    } catch { /* Ignore non-JSON server errors */ }
    throw new Error(detail || "Request failed (" + response.status + ")");
  }
  return response.json();
}

async function refreshStats() {
  $("refresh-button").disabled = true;
  $("stats-status").textContent = "Refreshing shared statistics…";
  try {
    const data = await rpc("political_grid_stats", {});
    if (!data || !Array.isArray(data.counts) || data.counts.length !== 100) {
      throw new Error("Statistics were returned in an unexpected format.");
    }
    const respondents = Number(data.respondents);
    if (!Number.isInteger(respondents) || respondents < 0 ||
        data.counts.some((c) => !Number.isInteger(c) || c < 0 || c > respondents)) {
      throw new Error("Invalid aggregate statistics.");
    }
    state.stats = data;
    $("stats-status").textContent = respondents
      ? "Live totals from " + respondents.toLocaleString() + " saved responses."
      : "No submissions yet. Be the first to contribute.";
  } catch (error) {
    $("stats-status").textContent = "Statistics unavailable: " + error.message;
  } finally {
    $("refresh-button").disabled = false;
    updateBoard();
    renderStats();
  }
}

async function restoreSubmission() {
  if (!state.token) return;
  try {
    const record = await rpc("political_grid_load", { p_token: state.token });
    if (!record) {
      setSaveStatus("Previous response not found; submit to save");
      return;
    }
    if (!state.dirty) {
      state.picks = new Set((record.picks || []).filter((id) => Number.isInteger(id) && id >= 0 && id < 100));
      state.name = record.name || state.name;
      $("participant-name").value = state.name;
      updateBoard();
      renderStats();
    }
    $("save-button").innerHTML = "Update answers <span aria-hidden='true'>↗</span>";
    setSaveStatus(state.dirty ? "Unsaved edits • submit to update" : "Previously saved • edits can be updated");
    saveDraft();
  } catch (error) {
    setSaveStatus("Could not restore saved response: " + error.message, true);
  }
}

async function submit() {
  if (state.saving) return;
  state.name = $("participant-name").value.trim();
  if (state.name.length < 2 || state.name.length > 40 || /[\x00-\x1f\x7f]/.test(state.name)) {
    $("participant-name").focus();
    setSaveStatus("Enter a name between 2 and 40 characters.", true);
    return;
  }
  if (!state.token) {
    if (!globalThis.crypto || typeof crypto.randomUUID !== "function") {
      setSaveStatus("A secure browser is required to create a submission.", true);
      return;
    }
    state.token = crypto.randomUUID();
  }
  const submittedName = state.name;
  const submittedPicks = [...state.picks].sort((a, b) => a - b);
  state.saving = true;
  state.dirty = true;
  saveDraft();
  $("save-button").disabled = true;
  setSaveStatus("Saving your selections…");
  try {
    await rpc("political_grid_submit", {
      p_name: submittedName, p_token: state.token, p_picks: submittedPicks
    });
    state.dirty = state.name !== submittedName || state.picks.size !== submittedPicks.length || submittedPicks.some((id) => !state.picks.has(id));
    saveDraft();
    $("save-button").innerHTML = "Update answers <span aria-hidden='true'>↗</span>";
    setSaveStatus(state.dirty ? "Saved earlier selections • newer edits are unsaved" : "Saved to the shared database ✓");
    await refreshStats();
  } catch (error) {
    setSaveStatus("Could not save: " + error.message, true);
  } finally {
    state.saving = false;
    $("save-button").disabled = false;
  }
}

function makeBar(parent, name, value, display, color) {
  const row = document.createElement("div");
  const head = document.createElement("div");
  head.className = "group-row-head";
  const heading = document.createElement("span");
  heading.textContent = name;
  const result = document.createElement("span");
  result.textContent = display;
  head.append(heading, result);
  const track = document.createElement("div");
  track.className = "bar-track";
  track.setAttribute("role", "img");
  track.setAttribute("aria-label", name + ": " + display);
  const fill = document.createElement("div");
  fill.className = "bar-fill";
  fill.style.setProperty("--bar", color);
  fill.style.width = Math.min(100, Math.max(0, value)) + "%";
  track.append(fill);
  row.append(head, track);
  parent.append(row);
}

function renderStats() {
  const stats = state.stats;
  const n = stats && stats.respondents;
  const counts = stats && stats.counts;
  $("respondents-stat").textContent = stats ? n.toLocaleString() : "—";
  $("marks-stat").textContent = stats ? Number(stats.total_selections).toLocaleString() : "—";
  $("average-stat").textContent = n ? (stats.total_selections / n).toFixed(1) : (stats ? "0" : "—");
  if (n) {
    let matches = 0;
    for (const statement of STATEMENTS) {
      const count = counts[statement.id];
      matches += state.picks.has(statement.id) ? count : n - count;
    }
    $("match-stat").textContent = (100 * matches / (100 * n)).toFixed(1) + "%";
  } else {
    $("match-stat").textContent = "—";
  }

  const groupBars = $("group-bars");
  const personalBars = $("personal-bars");
  groupBars.replaceChildren();
  personalBars.replaceChildren();
  GROUPS.forEach((group, index) => {
    const marks = [...state.picks].filter((id) => Math.floor(id / 25) === index).length;
    makeBar(personalBars, group.name, marks * 4, marks + " / 25", group.color);
    if (n) {
      let groupTotal = 0;
      for (let i = index * 25; i < index * 25 + 25; i++) groupTotal += counts[i];
      const percent = 100 * groupTotal / (n * 25);
      makeBar(groupBars, group.name, percent, percent.toFixed(1) + "%", group.color);
    } else {
      makeBar(groupBars, group.name, 0, n === 0 ? "No data" : "—", group.color);
    }
  });
  const list = $("ranking-list");
  list.replaceChildren();
  if (!n) {
    const blank = document.createElement("div");
    blank.className = "empty";
    blank.textContent = "Rankings appear after the first saved submission.";
    list.append(blank);
    return;
  }
  const sorted = [...STATEMENTS].sort((a, b) => counts[b.id] - counts[a.id] || a.id - b.id);
  const visible = state.showAll ? sorted : sorted.slice(0, 15);
  visible.forEach((statement, index) => {
    const percent = 100 * counts[statement.id] / n;
    const row = document.createElement("div");
    row.className = "ranking";
    row.style.setProperty("--bar", statement.color);
    const number = document.createElement("div");
    number.className = "rank-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const label = document.createElement("div");
    label.className = "rank-label";
    label.textContent = statement.label;
    const group = document.createElement("small");
    group.textContent = statement.groupName + " · " + counts[statement.id].toLocaleString() + " selected";
    label.append(group);
    const bar = document.createElement("div");
    bar.className = "rank-bar";
    const fill = document.createElement("i");
    fill.style.width = percent + "%";
    bar.append(fill);
    const pct = document.createElement("div");
    pct.className = "rank-pct";
    pct.textContent = percent.toFixed(1) + "%";
    row.append(number, label, bar, pct);
    list.append(row);
  });
  if (!state.showAll && sorted.length > 15) {
    const more = document.createElement("button");
    more.type = "button";
    more.className = "quiet-button";
    more.style.cssText = "width:100%;border:0;border-radius:0;padding:18px";
    more.textContent = "See all 100 ranked statements ↓";
    more.addEventListener("click", () => { state.showAll = true; renderStats(); });
    list.append(more);
  }
}

function exportCsv() {
  if (!state.stats || !state.stats.respondents) {
    $("stats-status").textContent = "No aggregate results available to export.";
    return;
  }
  const csvCell = (value) => '"' + String(value).replace(/"/g, '""') + '"';
  const n = state.stats.respondents;
  const lines = [["Statement ID", "Color group", "Statement", "Selected", "Saved responses", "Selected percent"].map(csvCell).join(",")];
  STATEMENTS.forEach((statement) => {
    const count = state.stats.counts[statement.id];
    lines.push([statement.id + 1, statement.groupName, statement.label, count, n, (100 * count / n).toFixed(2)]
      .map(csvCell).join(","));
  });
  const blob = new Blob(["\uFEFF", lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "political-grid-aggregate.csv";
  document.body.append(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function setup() {
  $("participant-name").value = state.name;
  buildBoard();
  $("participant-name").addEventListener("input", (event) => {
    state.name = event.target.value;
    markDirty();
  });
  $("participant-name").addEventListener("keydown", (event) => {
    if (event.key === "Enter") submit();
  });
  $("save-button").addEventListener("click", submit);
  $("statement-search").addEventListener("input", updateBoard);
  $("overlay-toggle").addEventListener("change", updateBoard);
  $("refresh-button").addEventListener("click", refreshStats);
  $("export-button").addEventListener("click", exportCsv);
  $("clear-button").addEventListener("click", () => {
    const dialog = $("clear-dialog");
    if (typeof dialog.showModal === "function") {
      dialog.returnValue = "cancel";
      dialog.showModal();
    }
    else if (confirm("Clear your selections?")) clearMarks();
  });
  $("clear-dialog").addEventListener("close", () => {
    if ($("clear-dialog").returnValue === "confirm") clearMarks();
  });
  renderStats();
  Promise.allSettled([refreshStats(), restoreSubmission()]);
}

function clearMarks() {
  state.picks.clear();
  markDirty();
  updateBoard();
  renderStats();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
else setup();
