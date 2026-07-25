const API = "/api";
const IST_TZ = "Asia/Kolkata";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function getISTParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const map = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });
  return { hour: parseInt(map.hour, 10), minute: parseInt(map.minute, 10) };
}

function todayNiceIST() {
  return new Date().toLocaleDateString("en-US", {
    timeZone: IST_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function updateClock() {
  const { hour, minute } = getISTParts();
  document.getElementById("todayDate").textContent =
    `${todayNiceIST()} · ${pad2(hour)}:${pad2(minute)} IST`;
}

async function api(path, opts) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

updateClock();
setInterval(updateClock, 30000);

// ---------- Habits ----------
async function loadHabits() {
  const habits = await api("/habits");
  const grid = document.getElementById("habitsGrid");
  const empty = document.getElementById("habitsEmpty");
  grid.innerHTML = "";
  empty.hidden = habits.length > 0;

  habits.forEach((h) => grid.appendChild(renderHabitCard(h)));
}

function renderHabitCard(h) {
  const card = document.createElement("div");
  card.className = `habit-card ${h.type}`;

  const actionLabel =
    h.type === "good"
      ? h.markedToday
        ? "Done Today ✓"
        : "Mark Done"
      : h.markedToday
        ? "Logged Relapse"
        : "I Slipped Today";

  card.innerHTML = `
    <button class="habit-delete" title="Delete habit">&times;</button>
    <span class="habit-badge ${h.type}">${h.type === "good" ? "Building" : "Quitting"}</span>
    <div class="habit-name">${escapeHtml(h.name)}</div>
    <div class="habit-streak">${h.streak}</div>
    <div class="habit-streak-label">${h.type === "good" ? "day streak" : "days clean"}</div>
    <div class="habit-milestone">${h.nextMilestone ? `${h.nextMilestone - h.streak} days to next milestone (${h.nextMilestone})` : "All milestones reached"}</div>
    <div class="habit-actions">
      <button class="habit-btn ${h.type === "good" ? "mark-good" : "mark-bad"} ${h.markedToday ? "marked" : ""}" data-action="mark">${actionLabel}</button>
    </div>
  `;

  card
    .querySelector('[data-action="mark"]')
    .addEventListener("click", async () => {
      if (h.markedToday) {
        await api(`/habits/${h.id}/undo`, { method: "POST" });
      } else {
        const updated = await api(`/habits/${h.id}/mark`, { method: "POST" });
        if (updated.hitMilestoneToday) showMilestoneToast(updated.streak);
      }
      loadHabits();
    });

  card.querySelector(".habit-delete").addEventListener("click", async () => {
    if (confirm(`Delete "${h.name}"? This can't be undone.`)) {
      await api(`/habits/${h.id}`, { method: "DELETE" });
      loadHabits();
    }
  });

  return card;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showMilestoneToast(streak) {
  const toast = document.getElementById("milestoneToast");
  document.getElementById("milestoneNum").textContent = streak;
  toast.querySelector(".milestone-text").textContent = "days. Keep going.";
  toast.hidden = false;
  setTimeout(() => {
    toast.hidden = true;
  }, 3500);
}

// ---------- Add Habit Modal ----------
const addHabitModal = document.getElementById("addHabitModal");
const habitNameInput = document.getElementById("habitName");
const saveHabitBtn = document.getElementById("saveHabit");
let selectedType = null;

document.getElementById("addHabitBtn").addEventListener("click", () => {
  habitNameInput.value = "";
  selectedType = null;
  document
    .querySelectorAll(".type-btn")
    .forEach((b) => b.classList.remove("selected"));
  saveHabitBtn.disabled = true;
  addHabitModal.hidden = false;
  habitNameInput.focus();
});

document.getElementById("cancelAddHabit").addEventListener("click", () => {
  addHabitModal.hidden = true;
});

document.querySelectorAll(".type-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedType = btn.dataset.type;
    document
      .querySelectorAll(".type-btn")
      .forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    checkSaveEnabled();
  });
});

habitNameInput.addEventListener("input", checkSaveEnabled);
function checkSaveEnabled() {
  saveHabitBtn.disabled = !(habitNameInput.value.trim() && selectedType);
}

saveHabitBtn.addEventListener("click", async () => {
  await api("/habits", {
    method: "POST",
    body: JSON.stringify({
      name: habitNameInput.value.trim(),
      type: selectedType,
    }),
  });
  addHabitModal.hidden = true;
  loadHabits();
});

// ---------- Night Routine manifestations (management list) ----------
async function loadNightChecklist() {
  const items = await api("/routine-items?period=night");
  const container = document.getElementById("nightChecklist");
  container.innerHTML = "";
  if (!items.length) {
    container.innerHTML =
      '<div class="routine-empty">No manifestations yet. Add one below — say it like it\'s already true.</div>';
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "routine-item";
    row.innerHTML = `
      <span class="routine-item-text">${escapeHtml(item.text)}</span>
      <button class="routine-item-delete">&times;</button>
    `;
    row
      .querySelector(".routine-item-delete")
      .addEventListener("click", async () => {
        if (confirm("Remove this manifestation?")) {
          await api(`/routine-items/${item._id}`, { method: "DELETE" });
          loadNightChecklist();
        }
      });
    container.appendChild(row);
  });
}

document
  .getElementById("nightItemForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("nightItemInput");
    const text = input.value.trim();
    if (!text) return;
    await api("/routine-items", {
      method: "POST",
      body: JSON.stringify({ text, period: "night" }),
    });
    input.value = "";
    loadNightChecklist();
  });

async function loadNightStatus() {
  const today = await api("/routine/today");
  const btn = document.getElementById("startNightBtn");
  const status = document.getElementById("nightDoneStatus");
  if (today.nightCheckIn && today.nightCheckIn.completed) {
    status.hidden = false;
    status.classList.add("success");
    status.textContent = "Completed today. Come back tomorrow night.";
    btn.textContent = "Re-enter Night Routine";
    btn.disabled = false;
  } else if (!today.window.nightAllowed) {
    status.hidden = false;
    status.classList.remove("success");
    status.textContent = `Night routine opens at 9:00 PM IST — it's ${pad2(today.window.hour)}:${pad2(today.window.minute)} IST now.`;
    btn.disabled = true;
  } else {
    status.hidden = true;
    btn.disabled = false;
  }
}

// ---------- Daily Routine checklist ----------
async function loadDayChecklist() {
  const [items, todayLog] = await Promise.all([
    api("/routine-items?period=day"),
    api("/routine/today"),
  ]);
  const container = document.getElementById("dayChecklist");
  container.innerHTML = "";
  if (!items.length) {
    container.innerHTML =
      '<div class="routine-empty">No daily tasks yet. Add your first below.</div>';
  }
  items.forEach((item) => {
    const done = todayLog.dayItemsDone.includes(item._id);
    container.appendChild(
      renderRoutineRow(
        item,
        done,
        async () => {
          await api("/routine/day/toggle", {
            method: "POST",
            body: JSON.stringify({ itemId: item._id }),
          });
          loadDayChecklist();
        },
        async () => {
          await api(`/routine-items/${item._id}`, { method: "DELETE" });
          loadDayChecklist();
        },
      ),
    );
  });
  const doneCount = items.filter((i) =>
    todayLog.dayItemsDone.includes(i._id),
  ).length;
  document.getElementById("dayProgressLabel").textContent =
    `${doneCount} / ${items.length}`;

  if (todayLog.dayCompleted) {
    document.getElementById("dayCompleteStatus").hidden = false;
    document.getElementById("completeDayBtn").textContent =
      "Day Marked Complete ✓";
  }
}

function renderRoutineRow(item, done, onToggle, onDelete) {
  const row = document.createElement("div");
  row.className = `routine-item ${done ? "done" : ""}`;
  row.innerHTML = `
    <button class="routine-check ${done ? "checked" : ""}">${done ? "✓" : ""}</button>
    <span class="routine-item-text">${escapeHtml(item.text)}</span>
    <button class="routine-item-delete">&times;</button>
  `;
  row.querySelector(".routine-check").addEventListener("click", onToggle);
  row.querySelector(".routine-item-delete").addEventListener("click", () => {
    if (confirm("Remove this item?")) onDelete();
  });
  return row;
}

document.getElementById("dayItemForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("dayItemInput");
  const text = input.value.trim();
  if (!text) return;
  await api("/routine-items", {
    method: "POST",
    body: JSON.stringify({ text, period: "day" }),
  });
  input.value = "";
  loadDayChecklist();
});

document
  .getElementById("completeDayBtn")
  .addEventListener("click", async () => {
    await api("/routine/day/complete", { method: "POST" });
    document.getElementById("dayCompleteStatus").hidden = false;
    document.getElementById("completeDayBtn").textContent =
      "Day Marked Complete ✓";
    loadStats();
  });

// ---------- Stats (morning / day / night streaks + totals) ----------
async function loadStats() {
  const stats = await api("/routine/stats");
  document.getElementById("statMorningStreak").textContent =
    stats.morningStreak;
  document.getElementById("statDayStreak").textContent = stats.dayStreak;
  document.getElementById("statNightStreak").textContent = stats.nightStreak;
  document.getElementById("statMorningTotal").textContent =
    `${stats.morningTotal} total`;
  document.getElementById("statDayTotal").textContent =
    `${stats.dayTotal} total`;
  document.getElementById("statNightTotal").textContent =
    `${stats.nightTotal} total`;
}

async function loadRitualStatus() {
  const today = await api("/routine/today");
  const btn = document.getElementById("startRitualBtn");
  const status = document.getElementById("ritualDoneStatus");
  if (today.morningCompleted) {
    status.hidden = false;
    status.classList.add("success");
    status.textContent = "Completed today. Come back tomorrow.";
    btn.textContent = "Re-enter Ritual";
    btn.disabled = false;
  } else if (!today.window.morningAllowed) {
    status.hidden = false;
    status.classList.remove("success");
    status.textContent = `Morning ritual closes at 11:00 AM IST — it's ${pad2(today.window.hour)}:${pad2(today.window.minute)} IST now. Come back tomorrow morning.`;
    btn.disabled = true;
  } else {
    status.hidden = true;
    btn.disabled = false;
  }
  loadStats();
}

// ---------- Morning Ritual ----------
const overlay = document.getElementById("ritualOverlay");
const stage = document.getElementById("ritualStage");
const actLabel = document.getElementById("ritualActLabel");
const progressFill = document.getElementById("ritualProgressFill");
let ritualCancelled = false;

document
  .getElementById("startRitualBtn")
  .addEventListener("click", startRitual);
document.getElementById("ritualExit").addEventListener("click", exitRitual);
document
  .getElementById("ritualNextBtn")
  .addEventListener("click", skipToNextAct);

let currentActIndex = 0;
let resolveAct = null;

function exitRitual() {
  ritualCancelled = true;
  window.speechSynthesis.cancel();
  overlay.hidden = true;
}

function skipToNextAct() {
  if (resolveAct) resolveAct();
}

async function startRitual() {
  ritualCancelled = false;
  currentActIndex = 0;
  overlay.hidden = false;
  for (const act of RITUAL) {
    if (ritualCancelled) return;
    overlay.dataset.theme = act.theme;
    actLabel.textContent = act.label;
    progressFill.style.width = `${(currentActIndex / RITUAL.length) * 100}%`;
    await runAct(act);
    currentActIndex += 1;
  }
  progressFill.style.width = "100%";
  if (!ritualCancelled) {
    try {
      await api("/routine/morning/complete", { method: "POST" });
    } catch (err) {
      alert(err.message);
    }
    loadRitualStatus();
    setTimeout(() => {
      overlay.hidden = true;
    }, 1500);
  }
}

// ---------- Voice engine ----------
let voicesCache = [];
const PREFERRED_VOICE_HINTS = [
  "Natural",
  "Enhanced",
  "Premium",
  "Online",
  "Google US English",
  "Google UK English Female",
  "Samantha",
  "Aria",
  "Jenny",
  "Ava",
];

function loadVoices() {
  voicesCache = window.speechSynthesis
    ? window.speechSynthesis.getVoices()
    : [];
  populateVoiceSelect();
}

if ("speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function populateVoiceSelect() {
  const select = document.getElementById("voiceSelect");
  if (!select || !voicesCache.length) return;
  const english = voicesCache.filter((v) =>
    v.lang.toLowerCase().startsWith("en"),
  );
  const pool = english.length ? english : voicesCache;
  const sorted = [...pool].sort((a, b) => {
    const score = (v) =>
      PREFERRED_VOICE_HINTS.some((h) => v.name.includes(h)) ? 0 : 1;
    return score(a) - score(b);
  });

  const current = select.value;
  select.innerHTML = "";
  sorted.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.name;
    opt.textContent = `${v.name} (${v.lang})`;
    select.appendChild(opt);
  });

  const saved = localStorage.getItem("ritualVoice");
  if (saved && sorted.some((v) => v.name === saved)) select.value = saved;
  else if (current && sorted.some((v) => v.name === current))
    select.value = current;
  else if (sorted.length) select.value = sorted[0].name;
}

function getSelectedVoice() {
  const select = document.getElementById("voiceSelect");
  const name =
    select && select.value ? select.value : localStorage.getItem("ritualVoice");
  return voicesCache.find((v) => v.name === name) || null;
}

function getSelectedRate() {
  const stored = parseFloat(localStorage.getItem("ritualRate"));
  return Number.isFinite(stored) ? stored : 0.85;
}

const voiceSettingsToggle = document.getElementById("voiceSettingsToggle");
const voicePanel = document.getElementById("voicePanel");
voiceSettingsToggle.addEventListener("click", () => {
  voicePanel.hidden = !voicePanel.hidden;
});

const voiceSelectEl = document.getElementById("voiceSelect");
voiceSelectEl.addEventListener("change", () =>
  localStorage.setItem("ritualVoice", voiceSelectEl.value),
);

const voiceRateEl = document.getElementById("voiceRate");
voiceRateEl.value = getSelectedRate();
voiceRateEl.addEventListener("input", () =>
  localStorage.setItem("ritualRate", voiceRateEl.value),
);

document.getElementById("previewVoiceBtn").addEventListener("click", () => {
  speakLine(
    "This is how the ritual will sound. Calm, unhurried, and clear.",
    parseFloat(voiceRateEl.value),
    0.95,
  );
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function speakOne(text, rate, pitch) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utter.pitch = pitch;
    const voice = getSelectedVoice();
    if (voice) utter.voice = voice;
    utter.onend = resolve;
    utter.onerror = resolve;
    window.speechSynthesis.speak(utter);
  });
}

// Splits a line into clauses so the narration pauses naturally instead of
// reading a whole paragraph in one flat, rushed breath.
async function speakLine(text, rate, pitch, isCancelled) {
  isCancelled = isCancelled || (() => false);
  const clauses = text
    .split(/(?<=[.!?])\s+|(?<=,)\s+(?=[A-Z])/)
    .filter(Boolean);
  for (const clause of clauses) {
    if (isCancelled()) return;
    await speakOne(clause, rate, pitch);
    await sleep(260);
  }
}

async function runAct(act) {
  stage.innerHTML = "";

  if (act.theme === "future") {
    const circle = document.createElement("div");
    circle.className = "breathing-circle";
    stage.appendChild(circle);
    const lineEl = document.createElement("div");
    lineEl.className = "ritual-line";
    stage.appendChild(lineEl);
    for (const line of act.lines) {
      if (ritualCancelled) return;
      lineEl.textContent = line;
      lineEl.classList.remove("visible");
      void lineEl.offsetWidth;
      lineEl.classList.add("visible");
      await Promise.race([
        speakLine(line, getSelectedRate(), act.pitch, () => ritualCancelled),
        waitOrSkip(9000),
      ]);
      if (ritualCancelled) return;
    }
    return;
  }

  const lineEl = document.createElement("div");
  lineEl.className = "ritual-line";
  stage.appendChild(lineEl);
  for (const line of act.lines) {
    if (ritualCancelled) return;
    lineEl.textContent = line;
    lineEl.classList.remove("visible");
    void lineEl.offsetWidth;
    lineEl.classList.add("visible");
    await Promise.race([
      speakLine(line, getSelectedRate(), act.pitch, () => ritualCancelled),
      waitOrSkip(8000),
    ]);
    if (ritualCancelled) return;
  }
}

function waitOrSkip(ms) {
  return new Promise((resolve) => {
    resolveAct = resolve;
    setTimeout(resolve, ms);
  });
}

// ---------- Night Ritual ----------
const nightOverlay = document.getElementById("nightOverlay");
const nightStage = document.getElementById("nightStage");
const nightActLabel = document.getElementById("nightActLabel");
const nightProgressFill = document.getElementById("nightProgressFill");
let nightCancelled = false;
let nightResolveStep = null;

document
  .getElementById("startNightBtn")
  .addEventListener("click", startNightRitual);
document.getElementById("nightExit").addEventListener("click", exitNightRitual);
document.getElementById("nightNextBtn").addEventListener("click", () => {
  if (nightResolveStep) nightResolveStep();
});

function exitNightRitual() {
  nightCancelled = true;
  window.speechSynthesis.cancel();
  nightOverlay.hidden = true;
  document.getElementById("nightNextBtn").textContent = "Continue";
}

function waitOrSkipNight(ms) {
  return new Promise((resolve) => {
    nightResolveStep = resolve;
    if (ms) setTimeout(resolve, ms);
  });
}

async function startNightRitual() {
  nightCancelled = false;
  nightOverlay.hidden = false;
  nightOverlay.dataset.theme = "future";
  nightProgressFill.style.width = "0%";

  await runManifestationsAct();
  if (nightCancelled) return;
  nightProgressFill.style.width = "45%";

  await runRecapAct();
  if (nightCancelled) return;
  nightProgressFill.style.width = "80%";

  await runCheckinAct();
  if (nightCancelled) return;
  nightProgressFill.style.width = "100%";

  loadNightStatus();
  loadStats();
  setTimeout(() => {
    nightOverlay.hidden = true;
  }, 1400);
}

async function runManifestationsAct() {
  nightActLabel.textContent = "MANIFESTATIONS";
  nightStage.innerHTML = "";
  const [items, todayLog] = await Promise.all([
    api("/routine-items?period=night"),
    api("/routine/today"),
  ]);

  const lineEl = document.createElement("div");
  lineEl.className = "ritual-line";
  nightStage.appendChild(lineEl);

  if (!items.length) {
    lineEl.textContent =
      "No manifestations added yet — you can add some below, after tonight.";
    lineEl.classList.add("visible");
    await waitOrSkipNight(2600);
    return;
  }

  for (const item of items) {
    if (nightCancelled) return;
    lineEl.textContent = item.text;
    lineEl.classList.remove("visible");
    void lineEl.offsetWidth;
    lineEl.classList.add("visible");
    await Promise.race([
      speakLine(item.text, getSelectedRate(), 1.0, () => nightCancelled),
      waitOrSkipNight(7000),
    ]);
    if (nightCancelled) return;
    if (!todayLog.nightItemsDone.includes(item._id)) {
      await api("/routine/night/toggle", {
        method: "POST",
        body: JSON.stringify({ itemId: item._id }),
      }).catch(() => {});
    }
  }
}

function recapMessage(
  dayDone,
  dayTotal,
  badProtected,
  badTotal,
  goodDone,
  goodTotal,
) {
  const allDay = dayTotal > 0 && dayDone === dayTotal;
  const allBad = badTotal === 0 || badProtected === badTotal;
  const anyGood = goodDone > 0;
  if (allDay && allBad && anyGood)
    return "A clean sweep. This is what discipline looks like — remember this feeling.";
  if (allBad && anyGood)
    return "Every streak still standing, and you showed up for yourself today. That's the whole game.";
  if (badProtected > 0 || anyGood || dayDone > 0)
    return "Not perfect, not required. You still moved forward today — that counts.";
  return "Tomorrow is a clean page. Show up again.";
}

async function runRecapAct() {
  nightActLabel.textContent = "TODAY'S NUMBERS";
  nightStage.innerHTML = "";

  const [habits, dayItems, todayLog] = await Promise.all([
    api("/habits"),
    api("/routine-items?period=day"),
    api("/routine/today"),
  ]);

  const dayDoneCount = dayItems.filter((i) =>
    todayLog.dayItemsDone.includes(i._id),
  ).length;
  const goodHabits = habits.filter((h) => h.type === "good");
  const badHabits = habits.filter((h) => h.type === "bad");
  const badProtected = badHabits.filter((h) => !h.markedToday);
  const goodShowedUp = goodHabits.filter((h) => h.markedToday);

  const lines = [];
  if (dayItems.length)
    lines.push(
      `Daily routine: ${dayDoneCount} of ${dayItems.length} done today.`,
    );
  if (badHabits.length)
    lines.push(
      `${badProtected.length} of ${badHabits.length} bad habits kept clean today — no slips logged.`,
    );
  if (goodHabits.length)
    lines.push(
      `${goodShowedUp.length} of ${goodHabits.length} good habits showed up today.`,
    );
  lines.push(
    recapMessage(
      dayDoneCount,
      dayItems.length,
      badProtected.length,
      badHabits.length,
      goodShowedUp.length,
      goodHabits.length,
    ),
  );

  const lineEl = document.createElement("div");
  lineEl.className = "ritual-line";
  nightStage.appendChild(lineEl);

  for (const line of lines) {
    if (nightCancelled) return;
    lineEl.textContent = line;
    lineEl.classList.remove("visible");
    void lineEl.offsetWidth;
    lineEl.classList.add("visible");
    await Promise.race([
      speakLine(line, getSelectedRate(), 1.0, () => nightCancelled),
      waitOrSkipNight(6500),
    ]);
    if (nightCancelled) return;
  }

  const grid = document.createElement("div");
  grid.className = "recap-grid";
  [...goodHabits, ...badHabits].forEach((h) => {
    const chip = document.createElement("div");
    chip.className = `recap-chip ${h.type}`;
    chip.textContent = `${h.name} · ${h.streak}d`;
    grid.appendChild(chip);
  });
  if (grid.children.length) nightStage.appendChild(grid);

  await waitOrSkipNight();
}

async function runCheckinAct() {
  nightActLabel.textContent = "CLOSE THE DAY";
  nightStage.innerHTML = "";

  const form = document.createElement("div");
  form.className = "night-inline-form";
  form.innerHTML = `
    <label class="field-label">One win from today</label>
    <textarea id="ovWins" rows="2" placeholder="e.g. Didn't reach for my phone during dinner"></textarea>
    <div class="toggle-row">
      <span>Tempted today?</span>
      <label class="switch">
        <input type="checkbox" id="ovTempted" />
        <span class="slider"></span>
      </label>
    </div>
    <label class="field-label">Anything else</label>
    <textarea id="ovNotes" rows="2" placeholder="Optional"></textarea>
  `;
  nightStage.appendChild(form);

  const nextBtn = document.getElementById("nightNextBtn");
  nextBtn.textContent = "Log & Close the Day";

  await waitOrSkipNight();

  if (nightCancelled) return;
  nextBtn.textContent = "Continue";

  await api("/routine/night", {
    method: "POST",
    body: JSON.stringify({
      wins: document.getElementById("ovWins").value,
      tempted: document.getElementById("ovTempted").checked,
      notes: document.getElementById("ovNotes").value,
    }),
  });
}

// ---------- Quick Daily Check (sleep / exercise / hydration) ----------
let qcExerciseOn = false;
let qcHydratedOn = false;

function renderQuickCheckSummary(dc) {
  const parts = [];
  parts.push(
    dc.sleepHours != null ? `${dc.sleepHours} hrs sleep` : "sleep skipped",
  );
  parts.push(dc.exercised ? "🏃 exercised" : "no exercise logged");
  parts.push(dc.hydrated ? "💧 hydrated" : "hydration skipped");
  document.getElementById("quickCheckSummaryText").textContent =
    `Today: ${parts.join(" · ")}`;
}

async function loadQuickCheck() {
  const today = await api("/routine/today");
  const dc = today.dailyCheck || {};
  const form = document.getElementById("quickCheckForm");
  const summary = document.getElementById("quickCheckSummary");

  if (dc.sleepHours != null)
    document.getElementById("qcSleep").value = dc.sleepHours;
  qcExerciseOn = !!dc.exercised;
  qcHydratedOn = !!dc.hydrated;
  document
    .getElementById("qcExercise")
    .classList.toggle("active", qcExerciseOn);
  document
    .getElementById("qcHydrated")
    .classList.toggle("active", qcHydratedOn);

  if (dc.submitted) {
    renderQuickCheckSummary(dc);
    form.hidden = true;
    summary.hidden = false;
  } else {
    form.hidden = false;
    summary.hidden = true;
  }
}

document.getElementById("qcExercise").addEventListener("click", () => {
  qcExerciseOn = !qcExerciseOn;
  document
    .getElementById("qcExercise")
    .classList.toggle("active", qcExerciseOn);
});
document.getElementById("qcHydrated").addEventListener("click", () => {
  qcHydratedOn = !qcHydratedOn;
  document
    .getElementById("qcHydrated")
    .classList.toggle("active", qcHydratedOn);
});

document.getElementById("qcSave").addEventListener("click", async () => {
  const sleepHours = document.getElementById("qcSleep").value;
  await api("/routine/daily-check", {
    method: "POST",
    body: JSON.stringify({
      sleepHours: sleepHours === "" ? null : sleepHours,
      exercised: qcExerciseOn,
      hydrated: qcHydratedOn,
    }),
  });
  loadQuickCheck();
  loadInsights();
});

document.getElementById("qcEditBtn").addEventListener("click", () => {
  document.getElementById("quickCheckForm").hidden = false;
  document.getElementById("quickCheckSummary").hidden = true;
});

// ---------- CBT Reframe ----------
async function loadReframes() {
  const entries = await api("/reframes?limit=10");
  document.getElementById("reframeCountLabel").textContent =
    `${entries.length} logged`;
  const list = document.getElementById("reframeList");
  list.innerHTML = "";
  entries.forEach((e) => {
    const el = document.createElement("div");
    el.className = "reframe-item";
    el.innerHTML = `
      <div class="rf-trigger">${escapeHtml(e.trigger)}</div>
      <div class="rf-thought">${escapeHtml(e.automaticThought)}</div>
      <div class="rf-reframe">→ ${escapeHtml(e.reframe)}</div>
      ${e.distortion ? `<span class="rf-distortion">${escapeHtml(e.distortion)}</span>` : ""}
    `;
    list.appendChild(el);
  });
}

document.getElementById("reframeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const trigger = document.getElementById("rfTrigger").value.trim();
  const automaticThought = document.getElementById("rfThought").value.trim();
  const distortion = document.getElementById("rfDistortion").value;
  const reframe = document.getElementById("rfReframe").value.trim();
  if (!trigger || !automaticThought || !reframe) return;
  await api("/reframes", {
    method: "POST",
    body: JSON.stringify({ trigger, automaticThought, distortion, reframe }),
  });
  e.target.reset();
  loadReframes();
  loadInsights();
});

// ---------- Stillness (progressive silence timer) ----------
let silenceTargetSeconds = 120;
let silenceElapsed = 0;
let silenceIntervalId = null;

function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${pad2(s)}`;
}

async function loadSilenceStatus() {
  const info = await api("/silence/target");
  silenceTargetSeconds = info.targetSeconds;
  document.getElementById("silenceTargetLabel").textContent =
    `Target: ${formatMMSS(silenceTargetSeconds)}`;
  document.getElementById("silenceCompletedLabel").textContent =
    `${info.completedCount} completed`;
}

const silenceOverlay = document.getElementById("silenceOverlay");
document
  .getElementById("startSilenceBtn")
  .addEventListener("click", startSilenceSession);
document
  .getElementById("silenceExit")
  .addEventListener("click", () => endSilenceSession(false));
document
  .getElementById("silenceDoneBtn")
  .addEventListener("click", () => endSilenceSession(true));

function startSilenceSession() {
  silenceElapsed = 0;
  silenceOverlay.dataset.theme = "future";
  silenceOverlay.hidden = false;
  document.getElementById("silenceTimerDisplay").textContent = formatMMSS(0);
  silenceIntervalId = setInterval(() => {
    silenceElapsed += 1;
    document.getElementById("silenceTimerDisplay").textContent =
      formatMMSS(silenceElapsed);
  }, 1000);
}

async function endSilenceSession(finishedNaturally) {
  clearInterval(silenceIntervalId);
  silenceOverlay.hidden = true;
  try {
    await api("/silence", {
      method: "POST",
      body: JSON.stringify({ actualSeconds: silenceElapsed }),
    });
  } catch (err) {
    /* non-critical */
  }
  loadSilenceStatus();
  loadInsights();
}

// ---------- Urge Logger + 10-Minute Surf Timer ----------
const urgeModal = document.getElementById("urgeModal");
const urgeIntensityEl = document.getElementById("urgeIntensity");
let selectedContext = new Set();
let currentUrgeId = null;
let urgeIntervalId = null;

document.getElementById("urgeFabBtn").addEventListener("click", () => {
  urgeIntensityEl.value = 5;
  document.getElementById("urgeIntensityVal").textContent = "5";
  document.getElementById("urgeTrigger").value = "";
  selectedContext = new Set();
  document
    .querySelectorAll(".context-chip")
    .forEach((c) => c.classList.remove("selected"));
  urgeModal.hidden = false;
});

urgeIntensityEl.addEventListener("input", () => {
  document.getElementById("urgeIntensityVal").textContent =
    urgeIntensityEl.value;
});

document.querySelectorAll(".context-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const ctx = chip.dataset.ctx;
    if (selectedContext.has(ctx)) {
      selectedContext.delete(ctx);
      chip.classList.remove("selected");
    } else {
      selectedContext.add(ctx);
      chip.classList.add("selected");
    }
  });
});

document.getElementById("cancelUrge").addEventListener("click", () => {
  urgeModal.hidden = true;
});

document
  .getElementById("startUrgeTimer")
  .addEventListener("click", async () => {
    const intensity = parseInt(urgeIntensityEl.value, 10);
    const trigger = document.getElementById("urgeTrigger").value.trim();
    const entry = await api("/urges", {
      method: "POST",
      body: JSON.stringify({
        intensity,
        trigger,
        context: [...selectedContext],
      }),
    });
    currentUrgeId = entry._id;
    urgeModal.hidden = true;
    startUrgeTimer();
  });

const urgeTimerOverlay = document.getElementById("urgeTimerOverlay");
const URGE_TIMER_SECONDS = 600; // 10 minutes
let urgePromptIntervalId = null;

const URGE_COPING_PROMPTS = [
  "Notice the urge. You don't have to act on it or fight it — just watch it.",
  "Urges rise, peak, and fall like a wave — whether you act or not.",
  "Where do you feel this in your body? Notice it without judging it.",
  "Breathe in for 4, hold for 4, breathe out for 6.",
  "This isn't willpower. It's just 10 minutes. You've done harder things.",
  "You are not the craving. You're the one watching it pass through.",
  "If you can, stand up and change your environment — even just the room.",
  "The urge will pass whether you feed it or not. You're just waiting it out.",
  "Name it: 'This is an urge. It's uncomfortable. It's temporary.'",
  "You don't need to win against it. You just need to outlast it.",
];

function cycleUrgePrompt() {
  const el = document.getElementById("urgeCopingPrompt");
  const next =
    URGE_COPING_PROMPTS[Math.floor(Math.random() * URGE_COPING_PROMPTS.length)];
  el.classList.remove("visible");
  setTimeout(() => {
    el.textContent = next;
    void el.offsetWidth;
    el.classList.add("visible");
  }, 400);
}

function startUrgeTimer() {
  let remaining = URGE_TIMER_SECONDS;
  document.getElementById("urgeTimerDisplay").textContent =
    formatMMSS(remaining);
  urgeTimerOverlay.dataset.theme = "future";
  urgeTimerOverlay.hidden = false;

  cycleUrgePrompt();
  clearInterval(urgePromptIntervalId);
  urgePromptIntervalId = setInterval(cycleUrgePrompt, 25000);

  urgeIntervalId = setInterval(() => {
    remaining -= 1;
    document.getElementById("urgeTimerDisplay").textContent = formatMMSS(
      Math.max(remaining, 0),
    );
    if (remaining <= 0) clearInterval(urgeIntervalId);
  }, 1000);
}

async function resolveUrge(outcome) {
  clearInterval(urgeIntervalId);
  clearInterval(urgePromptIntervalId);
  urgeTimerOverlay.hidden = true;
  if (currentUrgeId) {
    await api(`/urges/${currentUrgeId}/outcome`, {
      method: "POST",
      body: JSON.stringify({ outcome }),
    }).catch(() => {});
    currentUrgeId = null;
  }
  if (outcome === "surfed")
    showMilestoneToastText("Urge surfed. That's a rep in the bank.");
  loadInsights();
}

document
  .getElementById("urgeSurfedBtn")
  .addEventListener("click", () => resolveUrge("surfed"));
document
  .getElementById("urgeActedBtn")
  .addEventListener("click", () => resolveUrge("acted"));
document
  .getElementById("urgeTimerExit")
  .addEventListener("click", () => resolveUrge("acted"));

function showMilestoneToastText(text) {
  const toast = document.getElementById("milestoneToast");
  toast.querySelector(".milestone-num").textContent = "";
  toast.querySelector(".milestone-text").textContent = text;
  toast.hidden = false;
  setTimeout(() => {
    toast.hidden = true;
  }, 3500);
}

// ---------- Weekly Insights ----------
async function loadInsights() {
  const [insights, urgeSummary] = await Promise.all([
    api("/routine/insights"),
    api("/urges/summary"),
  ]);

  document.getElementById("insUrgeTotal").textContent = insights.urgeTotal;
  document.getElementById("insSurfRate").textContent =
    insights.urgeSurfRate != null ? `${insights.urgeSurfRate}%` : "—";
  document.getElementById("insReframeCount").textContent =
    insights.reframeCount;
  document.getElementById("insSilenceMinutes").textContent =
    insights.silenceMinutesTotal;

  const corrLines = [];
  if (
    insights.avgIntensityWellRested != null &&
    insights.avgIntensityUnderslept != null
  ) {
    corrLines.push(
      `Avg urge intensity: ${insights.avgIntensityWellRested}/10 on 7+ hr sleep nights vs ${insights.avgIntensityUnderslept}/10 on less sleep.`,
    );
  }
  if (
    insights.avgIntensityExerciseDays != null &&
    insights.avgIntensityNonExerciseDays != null
  ) {
    corrLines.push(
      `Avg urge intensity: ${insights.avgIntensityExerciseDays}/10 on exercise days vs ${insights.avgIntensityNonExerciseDays}/10 on rest days.`,
    );
  }
  if (!corrLines.length)
    corrLines.push(
      "Log sleep/exercise for a few more days to see correlations here.",
    );
  document.getElementById("insightCorrelations").innerHTML = corrLines
    .map((l) => `<div>${l}</div>`)
    .join("");

  const triggerHtml = urgeSummary.topTriggers.length
    ? urgeSummary.topTriggers
        .map(
          (t) =>
            `<span class="trigger-chip">${escapeHtml(t.trigger)} · ${t.count}</span>`,
        )
        .join("")
    : "<span>No urges logged yet — that's a good sign, or you just haven't opened the Urge button yet.</span>";
  document.getElementById("insightTriggers").innerHTML =
    `<div style="margin-bottom:6px;">Top triggers (30d):</div>${triggerHtml}`;
}

// ---------- Init ----------
loadHabits();
loadRitualStatus();
loadDayChecklist();
loadNightChecklist();
loadNightStatus();
loadQuickCheck();
loadReframes();
loadSilenceStatus();
loadInsights();

setInterval(() => {
  loadRitualStatus();
  loadNightStatus();
}, 60000);
