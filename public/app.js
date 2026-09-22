/* ============ CONFIG ============ */
const VAPID_PUBLIC_KEY = "BEXq4MHCMKT324tFzZV5zWXVr_34J_rue7Br1-fVGsEWINxEpcimec7o5APsKHmP1KvTcAA85JRgpg-ZKCqHzik";
const POINTS_SESSION = 15;
const POINTS_BY_DIFFICULTY = { facile: 45, moyen: 75, difficile: 100 };
const DIFFICULTY_LABELS = { facile: "Facile", moyen: "Moyen", difficile: "Difficile" };

let sessions = [];
let goals = [];
let customExercises = [];
let selectedCategory = "all";       // filtre bibliothèque d'exercices
let sessionModalCategory = null;    // catégorie choisie dans la modale séance
let checkedExerciseIds = new Set(); // exos cochés dans la modale séance
let exerciseTrackingData = {};      // { exerciseId: { minutes, km } } pour les exos cardio
let planningMode = "week";
let planningAnchor = new Date();
let currentSide = "front";

/* ============ HELPERS ============ */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function toISO(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function isoToday() { return toISO(new Date()); }
function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
}
function catLabel(id) {
  const c = CATEGORIES.find((c) => c.id === id);
  return c ? c.label : id;
}
function allExercises() {
  return EXERCISES.concat(customExercises.map((e) => ({ ...e, isCustom: true })));
}
function exerciseById(id) { return allExercises().find((e) => e.id === id); }
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ============ API ============ */
function makeApi(endpoint) {
  return {
    list: async () => { const r = await fetch(endpoint); if (!r.ok) throw new Error("load"); return r.json(); },
    create: async (data) => { const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); if (!r.ok) throw new Error("create"); return r.json(); },
    update: async (data) => { const r = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); if (!r.ok) throw new Error("update"); return r.json(); },
    delete: async (id) => { const r = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, { method: "DELETE" }); if (!r.ok && r.status !== 204) throw new Error("delete"); },
  };
}
const sessionApi = makeApi("/api/sessions");
const goalApi = makeApi("/api/goals");
const customExerciseApi = makeApi("/api/custom-exercises");

/* ============ LOAD ============ */
async function loadAll() {
  try {
    [sessions, goals, customExercises] = await Promise.all([sessionApi.list(), goalApi.list(), customExerciseApi.list()]);
  } catch (e) {
    console.error(e);
    toast("Impossible de charger les données");
    sessions = sessions || []; goals = goals || []; customExercises = customExercises || [];
  }
  renderAll();
}
function renderAll() {
  renderDashboard();
  renderGoals();
  renderPlanningView();
  renderExerciseLibrary();
}

/* ============ NAVIGATION ============ */
function switchView(view) {
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === view));
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
}
$("#tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (btn) switchView(btn.dataset.view);
});
$$(".link-btn[data-goto]").forEach((btn) => btn.addEventListener("click", () => switchView(btn.dataset.goto)));

/* ============ DASHBOARD ============ */
function renderDashboard() {
  const today = isoToday();
  const upcoming = sessions.filter((s) => s.date >= today && s.status !== "annulee").sort((a, b) => a.date.localeCompare(b.date));
  const next = upcoming[0];
  const box = $("#next-session-box");
  if (next) {
    box.innerHTML = `
      <div class="next-session-card" data-id="${next.id}">
        <div class="ns-label">Prochaine séance</div>
        <div class="ns-title">${escapeHtml(next.title || catLabel(next.category))}</div>
        <div class="ns-date">${fmtDate(next.date)} · ${(next.exercises || []).length} exercice${(next.exercises || []).length > 1 ? "s" : ""}</div>
        <div class="ns-actions">
          <button class="btn-accent" data-action="done">✅ Effectuée</button>
          <button class="btn-ghost" data-action="postpone">📅 Reporter</button>
          <button class="btn-ghost" data-action="cancel">❌ Annuler</button>
        </div>
        <div class="ns-postpone-box" id="ns-postpone-box">
          <input type="date" id="ns-postpone-date" value="${next.date}" />
          <button class="btn-accent" id="ns-postpone-confirm">Valider</button>
        </div>
      </div>`;
    bindNextSessionActions(next.id);
  } else {
    box.innerHTML = `<div class="empty-state">Aucune séance planifiée pour l'instant.</div>`;
  }

  const monthPrefix = today.slice(0, 7);
  const doneThisMonth = sessions.filter((s) => s.date.slice(0, 7) === monthPrefix && s.status === "faite").length;
  const activeGoals = goals.filter((g) => !g.done).length;

  $("#dash-stats").innerHTML = `
    <div class="stat-card pink">
      <div class="st-label">Points totaux</div>
      <div class="st-value">${computeTotalPoints()} 🏆</div>
    </div>
    <div class="stat-card">
      <div class="st-label">Séances faites ce mois</div>
      <div class="st-value">${doneThisMonth}</div>
    </div>
    <div class="stat-card">
      <div class="st-label">Objectifs actifs</div>
      <div class="st-value">${activeGoals}</div>
    </div>
  `;

  const dashGoals = $("#dash-goals");
  const list = goals.filter((g) => !g.done).slice(0, 3);
  dashGoals.innerHTML = list.length ? list.map(goalCardHTML).join("") : emptyState("Aucun objectif pour l'instant.");
  bindGoalClicks(dashGoals);
}
function computeTotalPoints() {
  const sessionPoints = sessions.filter((s) => s.status === "faite").length * POINTS_SESSION;
  const goalPoints = goals.filter((g) => g.done && g.difficulty).reduce((sum, g) => sum + (POINTS_BY_DIFFICULTY[g.difficulty] || 0), 0);
  return sessionPoints + goalPoints;
}
function emptyState(msg) { return `<div class="empty-state">${msg}</div>`; }
function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

function bindNextSessionActions(sessionId) {
  const card = $(".next-session-card");
  if (!card) return;
  card.querySelector('[data-action="done"]').addEventListener("click", async () => {
    try { await sessionApi.update({ id: sessionId, status: "faite" }); toast("Séance marquée effectuée 🎉"); await loadAll(); }
    catch (err) { console.error(err); toast("Erreur"); }
  });
  card.querySelector('[data-action="cancel"]').addEventListener("click", async () => {
    if (!confirm("Annuler cette séance ?")) return;
    try { await sessionApi.update({ id: sessionId, status: "annulee" }); toast("Séance annulée"); await loadAll(); }
    catch (err) { console.error(err); toast("Erreur"); }
  });
  card.querySelector('[data-action="postpone"]').addEventListener("click", () => {
    card.querySelector("#ns-postpone-box").classList.toggle("show");
  });
  card.querySelector("#ns-postpone-confirm").addEventListener("click", async () => {
    const newDate = card.querySelector("#ns-postpone-date").value;
    if (!newDate) return;
    try {
      await sessionApi.update({ id: sessionId, date: newDate, notified_22h: false, notified_8h: false });
      toast("Séance reportée");
      await loadAll();
    } catch (err) { console.error(err); toast("Erreur"); }
  });
}

/* ============ OBJECTIFS ============ */
let goalDateMode = "aucune";

function fmtDateShort(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
function goalDateBadge(g) {
  if (g.date_mode === "periode" && g.start_date && g.end_date) {
    return `<div class="g-desc">📅 Du ${fmtDateShort(g.start_date)} au ${fmtDateShort(g.end_date)}</div>`;
  }
  if (g.date_mode === "date" && g.target_date) {
    return `<div class="g-desc">📅 ${fmtDateShort(g.target_date)}</div>`;
  }
  return "";
}
function goalCardHTML(g) {
  const hasTarget = g.target != null && g.target !== "";
  const pct = hasTarget ? Math.min(100, Math.round(((g.current || 0) / g.target) * 100)) : null;
  const diffBadge = g.difficulty ? `<span class="badge-pill diff-${g.difficulty}">${DIFFICULTY_LABELS[g.difficulty]}</span>` : "";
  const doneBadge = g.done ? `<span class="badge-pill badge-done">🏆 Atteint · +${POINTS_BY_DIFFICULTY[g.difficulty] || 0} pts</span>` : "";
  return `
    <div class="goal-card" data-id="${g.id}">
      <div class="g-title">${escapeHtml(g.title)} ${diffBadge} ${doneBadge}</div>
      ${g.description ? `<div class="g-desc">${escapeHtml(g.description)}</div>` : ""}
      ${goalDateBadge(g)}
      ${hasTarget ? `
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="g-progress-label">${g.current || 0} / ${g.target}</div>
      ` : ""}
    </div>`;
}
function bindGoalClicks(container) {
  container.querySelectorAll(".goal-card").forEach((el) => el.addEventListener("click", () => openGoalEdit(el.dataset.id)));
}
function renderGoals() {
  const el = $("#goals-list");
  el.innerHTML = goals.length ? goals.map(goalCardHTML).join("") : emptyState("Aucun objectif. Ajoutes-en un !");
  bindGoalClicks(el);
}

const goalBackdrop = $("#goal-modal-backdrop");
const goalForm = $("#goal-form");
let goalDifficulty = null;
let goalDone = false;

function setGoalDifficulty(diff) {
  goalDifficulty = diff;
  $$("#goal-difficulty-toggle button").forEach((b) => b.classList.toggle("active", b.dataset.diff === diff));
}
$("#goal-difficulty-toggle").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (btn) setGoalDifficulty(btn.dataset.diff);
});
function setGoalDone(done) {
  goalDone = done;
  $$("#goal-status-toggle button").forEach((b) => b.classList.toggle("active", (b.dataset.done === "true") === done));
}
$("#goal-status-toggle").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (btn) setGoalDone(btn.dataset.done === "true");
});

function setGoalDateMode(mode) {
  goalDateMode = mode;
  $$("#goal-date-mode button").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  $("#goal-date-periode").style.display = mode === "periode" ? "grid" : "none";
  $("#goal-date-precise").style.display = mode === "date" ? "flex" : "none";
}
$("#goal-date-mode").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (btn) setGoalDateMode(btn.dataset.mode);
});

function openGoalNew() {
  goalForm.reset();
  $("#go-id").value = "";
  setGoalDateMode("aucune");
  setGoalDifficulty(null);
  setGoalDone(false);
  $("#goal-modal-title").textContent = "Nouvel objectif";
  $("#goal-btn-delete").style.display = "none";
  goalBackdrop.classList.add("open");
}
function openGoalEdit(id) {
  const g = goals.find((x) => x.id === id);
  if (!g) return;
  $("#go-id").value = g.id;
  $("#go-title").value = g.title || "";
  $("#go-desc").value = g.description || "";
  $("#go-target").value = g.target != null ? g.target : "";
  $("#go-current").value = g.current != null ? g.current : "";
  $("#go-start-date").value = g.start_date || "";
  $("#go-end-date").value = g.end_date || "";
  $("#go-target-date").value = g.target_date || "";
  setGoalDateMode(g.date_mode || "aucune");
  setGoalDifficulty(g.difficulty || null);
  setGoalDone(!!g.done);
  $("#goal-modal-title").textContent = "Modifier l'objectif";
  $("#goal-btn-delete").style.display = "";
  goalBackdrop.classList.add("open");
}
$("#btn-new-goal").addEventListener("click", openGoalNew);
$("#goal-modal-close").addEventListener("click", () => goalBackdrop.classList.remove("open"));
$("#goal-modal-cancel").addEventListener("click", () => goalBackdrop.classList.remove("open"));
goalBackdrop.addEventListener("click", (e) => { if (e.target === goalBackdrop) goalBackdrop.classList.remove("open"); });
goalForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("#go-id").value;
  const data = {
    title: $("#go-title").value.trim(),
    description: $("#go-desc").value.trim(),
    target: $("#go-target").value ? parseFloat($("#go-target").value) : null,
    current: $("#go-current").value ? parseFloat($("#go-current").value) : 0,
    date_mode: goalDateMode,
    start_date: goalDateMode === "periode" ? $("#go-start-date").value : null,
    end_date: goalDateMode === "periode" ? $("#go-end-date").value : null,
    target_date: goalDateMode === "date" ? $("#go-target-date").value : null,
    difficulty: goalDifficulty,
    done: goalDone,
  };
  try {
    if (id) { data.id = id; await goalApi.update(data); toast("Objectif mis à jour"); }
    else { await goalApi.create(data); toast("Objectif créé"); }
    goalBackdrop.classList.remove("open");
    await loadAll();
  } catch (err) { console.error(err); toast("Erreur"); }
});
$("#goal-btn-delete").addEventListener("click", async () => {
  const id = $("#go-id").value;
  if (!id || !confirm("Supprimer cet objectif ?")) return;
  try { await goalApi.delete(id); toast("Objectif supprimé"); goalBackdrop.classList.remove("open"); await loadAll(); }
  catch (err) { console.error(err); toast("Erreur"); }
});

/* ============ CALENDRIER (semaine / mois) ============ */
function sessionsOnDate(iso) { return sessions.filter((s) => s.date === iso); }

function renderPlanningView() {
  if (planningMode === "week") {
    $("#planning-week").style.display = "";
    $("#planning-month").style.display = "none";
    renderPlanningWeek();
  } else {
    $("#planning-week").style.display = "none";
    $("#planning-month").style.display = "";
    renderPlanningMonth();
  }
}
function renderPlanningWeek() {
  const start = startOfWeek(planningAnchor);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  const todayIso = isoToday();
  const end = new Date(start); end.setDate(end.getDate() + 6);
  $("#nav-label").textContent = `${start.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} – ${end.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`;

  $("#planning-week").innerHTML = days.map((d) => {
    const iso = toISO(d);
    const items = sessionsOnDate(iso);
    const isToday = iso === todayIso;
    const dayLabel = d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" });
    const itemsHtml = items.map((s) => `
      <div class="mini-item ${s.status === "faite" ? "done" : ""}" data-id="${s.id}">
        <div class="mi-cat">${catLabel(s.category)} ${s.status === "faite" ? "✅" : ""}</div>
        <div>${escapeHtml(s.title || "")}</div>
      </div>`).join("");
    return `<div class="week-col ${isToday ? "is-today" : ""}" data-date="${iso}">
      <div class="week-col-head">${dayLabel}</div>${itemsHtml}
    </div>`;
  }).join("");

  $("#planning-week").querySelectorAll(".mini-item").forEach((it) => it.addEventListener("click", (e) => { e.stopPropagation(); openSessionEdit(it.dataset.id); }));
  $("#planning-week").querySelectorAll(".week-col").forEach((col) => col.addEventListener("click", () => {
    if (sessionsOnDate(col.dataset.date).length === 0) openSessionNew(col.dataset.date);
  }));
}
function renderPlanningMonth() {
  const year = planningAnchor.getFullYear(), month = planningAnchor.getMonth();
  $("#nav-label").textContent = planningAnchor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const gridStart = startOfWeek(new Date(year, month, 1));
  const todayIso = isoToday();
  const headers = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map((h) => `<div class="month-head-cell">${h}</div>`).join("");
  let cells = "";
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart); d.setDate(d.getDate() + i);
    const iso = toISO(d);
    const outside = d.getMonth() !== month;
    const isToday = iso === todayIso;
    const items = sessionsOnDate(iso);
    const dots = items.slice(0, 4).map((it) => `<span class="mc-dot ${it.status === "faite" ? "done" : ""}"></span>`).join("");
    cells += `<div class="month-cell ${outside ? "outside" : ""} ${isToday ? "is-today" : ""}" data-date="${iso}">
      <div class="mc-daynum">${d.getDate()}</div><div class="mc-dots">${dots}</div>
    </div>`;
  }
  $("#planning-month").innerHTML = headers + cells;
  $("#planning-month").querySelectorAll(".month-cell").forEach((cell) => cell.addEventListener("click", () => {
    const iso = cell.dataset.date;
    const items = sessionsOnDate(iso);
    if (items.length === 1) openSessionEdit(items[0].id);
    else if (items.length > 1) { planningAnchor = new Date(iso + "T00:00:00"); planningMode = "week"; $$("#planning-toggle button").forEach((b) => b.classList.toggle("active", b.dataset.mode === "week")); renderPlanningView(); }
    else openSessionNew(iso);
  }));
}
$("#planning-toggle").addEventListener("click", (e) => {
  const btn = e.target.closest("button"); if (!btn) return;
  planningMode = btn.dataset.mode;
  $$("#planning-toggle button").forEach((b) => b.classList.toggle("active", b === btn));
  renderPlanningView();
});
$("#nav-prev").addEventListener("click", () => { planningAnchor = shiftDate(planningAnchor, planningMode === "week" ? -7 : -1, planningMode === "month"); renderPlanningView(); });
$("#nav-next").addEventListener("click", () => { planningAnchor = shiftDate(planningAnchor, planningMode === "week" ? 7 : 1, planningMode === "month"); renderPlanningView(); });
$("#nav-today").addEventListener("click", () => { planningAnchor = new Date(); renderPlanningView(); });
function shiftDate(base, amount, isMonth) { const d = new Date(base); if (isMonth) d.setMonth(d.getMonth() + amount); else d.setDate(d.getDate() + amount); return d; }

/* ============ BIBLIOTHÈQUE D'EXERCICES ============ */
function renderCategoryChips() {
  const el = $("#exercise-category-chips");
  el.innerHTML = `<button class="chip ${selectedCategory === "all" ? "active" : ""}" data-cat="all">Tout</button>` +
    CATEGORIES.map((c) => `<button class="chip ${selectedCategory === c.id ? "active" : ""}" data-cat="${c.id}">${c.label}</button>`).join("");
  el.querySelectorAll(".chip").forEach((chip) => chip.addEventListener("click", () => {
    selectedCategory = chip.dataset.cat;
    renderExerciseLibrary();
  }));
}
function renderExerciseLibrary() {
  renderCategoryChips();
  const list = selectedCategory === "all" ? allExercises() : allExercises().filter((e) => e.category === selectedCategory);
  $("#exercise-grid").innerHTML = list.map((ex) => `
    <div class="exercise-card" data-id="${ex.id}">
      <div class="ex-name">${ex.name}${ex.videoUrl ? '<span class="play-badge">▶</span>' : ""}${ex.isCustom ? ' <span class="play-badge">✏️</span>' : ""}</div>
      <div class="ex-equip">${ex.equipement || "—"} · ${catLabel(ex.category)}</div>
      <div class="ex-tags">${Object.values(ex.zones || {}).map((z) => `<span class="zone-dot ${z}"></span>`).join("")}</div>
    </div>`).join("");
  $("#exercise-grid").querySelectorAll(".exercise-card").forEach((el) => el.addEventListener("click", () => openExerciseDetail(el.dataset.id)));
}

const exerciseBackdrop = $("#exercise-modal-backdrop");
function openExerciseDetail(id) {
  const ex = exerciseById(id);
  if (!ex) return;
  $("#exercise-modal-title").textContent = ex.name;
  $("#exercise-equip").textContent = `${ex.equipement} · ${catLabel(ex.category)}`;
  $("#exercise-description").textContent = ex.description;
  const videoLink = $("#exercise-video-link");
  if (ex.videoUrl) { videoLink.href = ex.videoUrl; videoLink.style.display = "block"; }
  else { videoLink.style.display = "none"; }
  $("#exercise-custom-actions").style.display = ex.isCustom ? "flex" : "none";
  currentSide = "front";
  $$("#exercise-modal-backdrop .silhouette-toggle button").forEach((b) => b.classList.toggle("active", b.dataset.side === "front"));
  renderSilhouette($("#exercise-silhouette"), SILHOUETTE_FRONT, ex.zones);
  exerciseBackdrop.dataset.exId = id;
  exerciseBackdrop.classList.add("open");
}
$("#exercise-modal-backdrop .silhouette-toggle").addEventListener("click", (e) => {
  const btn = e.target.closest("button"); if (!btn) return;
  currentSide = btn.dataset.side;
  $$("#exercise-modal-backdrop .silhouette-toggle button").forEach((b) => b.classList.toggle("active", b === btn));
  const ex = exerciseById(exerciseBackdrop.dataset.exId);
  renderSilhouette($("#exercise-silhouette"), currentSide === "front" ? SILHOUETTE_FRONT : SILHOUETTE_BACK, ex.zones);
});
$("#exercise-modal-close").addEventListener("click", () => exerciseBackdrop.classList.remove("open"));
exerciseBackdrop.addEventListener("click", (e) => { if (e.target === exerciseBackdrop) exerciseBackdrop.classList.remove("open"); });

/* ============ MODALE SÉANCE (avec avertissement redondance) ============ */
const sessionBackdrop = $("#session-modal-backdrop");
const sessionForm = $("#session-form");
let sessionStatus = "planifiee";

function setSessionStatus(status) {
  sessionStatus = status;
  $$("#session-status-toggle button").forEach((b) => b.classList.toggle("active", b.dataset.status === status));
}
$("#session-status-toggle").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (btn) setSessionStatus(btn.dataset.status);
});

function renderSessionCategoryChips() {
  const el = $("#session-category-chips");
  el.innerHTML = CATEGORIES.map((c) => `<button type="button" class="chip ${sessionModalCategory === c.id ? "active" : ""}" data-cat="${c.id}">${c.label}</button>`).join("");
  el.querySelectorAll(".chip").forEach((chip) => chip.addEventListener("click", () => {
    sessionModalCategory = chip.dataset.cat;
    renderSessionCategoryChips();
    renderSessionExerciseList();
  }));
}
function renderSessionExerciseList() {
  const el = $("#session-exercise-list");
  if (!sessionModalCategory) { el.innerHTML = emptyState("Choisis d'abord un type de séance ci-dessus."); return; }
  const list = allExercises().filter((e) => e.category === sessionModalCategory);
  el.innerHTML = list.map((ex) => {
    const checked = checkedExerciseIds.has(ex.id);
    const td = exerciseTrackingData[ex.id] || {};
    let trackingHtml = "";
    if (ex.tracking === "duration") {
      trackingHtml = `<div class="eci-tracking"><input type="number" min="0" step="1" placeholder="min" value="${td.minutes ?? ""}" data-track="minutes" data-ex="${ex.id}" /></div>`;
    } else if (ex.tracking === "duration_distance") {
      trackingHtml = `<div class="eci-tracking">
        <input type="number" min="0" step="1" placeholder="min" value="${td.minutes ?? ""}" data-track="minutes" data-ex="${ex.id}" />
        <input type="number" min="0" step="0.1" placeholder="km" value="${td.km ?? ""}" data-track="km" data-ex="${ex.id}" />
      </div>`;
    }
    return `
    <label class="exercise-checkbox-item ${checked ? "checked" : ""}" data-id="${ex.id}">
      <input type="checkbox" ${checked ? "checked" : ""} />
      <span class="eci-name">${ex.name}${ex.videoUrl ? ' <span class="play-badge">▶</span>' : ""}</span>
      ${trackingHtml}
    </label>`;
  }).join("");
  el.querySelectorAll(".exercise-checkbox-item").forEach((item) => {
    item.querySelector("input[type=checkbox]").addEventListener("change", (e) => {
      const id = item.dataset.id;
      if (e.target.checked) checkedExerciseIds.add(id); else checkedExerciseIds.delete(id);
      item.classList.toggle("checked", e.target.checked);
      updateRedundancyWarning();
    });
    item.querySelectorAll("input[data-track]").forEach((input) => {
      input.addEventListener("click", (e) => e.stopPropagation());
      input.addEventListener("change", (e) => {
        const exId = e.target.dataset.ex, field = e.target.dataset.track;
        exerciseTrackingData[exId] = exerciseTrackingData[exId] || {};
        exerciseTrackingData[exId][field] = e.target.value ? parseFloat(e.target.value) : null;
      });
    });
  });
  updateRedundancyWarning();
}
function updateRedundancyWarning() {
  const zoneCounts = {};
  checkedExerciseIds.forEach((id) => {
    const ex = exerciseById(id);
    if (!ex) return;
    Object.entries(ex.zones).forEach(([zone, intensity]) => {
      if (intensity === "rouge") zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
    });
  });
  const overloaded = Object.entries(zoneCounts).filter(([, count]) => count >= 3);
  const warningEl = $("#redundancy-warning");
  if (overloaded.length) {
    const names = { chest:"pectoraux", shoulders_front:"épaules (avant)", shoulders_back:"épaules (arrière)", biceps:"biceps", triceps:"triceps", forearms:"avant-bras", abs:"abdos", quads:"quadriceps", hamstrings:"ischios", glutes:"fessiers", calves_front:"mollets", calves_back:"mollets", upper_back:"haut du dos", lower_back:"bas du dos" };
    warningEl.textContent = `⚠️ Tu as déjà ${overloaded.map(([z,c]) => `${c} exercices pour ${names[z]||z}`).join(", ")} — pense à varier avec d'autres muscles pour équilibrer ta séance.`;
    warningEl.classList.add("show");
  } else {
    warningEl.classList.remove("show");
  }
}

function openSessionNew(presetDate) {
  sessionForm.reset();
  $("#se-id").value = "";
  $("#se-date").value = presetDate || isoToday();
  sessionModalCategory = null;
  checkedExerciseIds = new Set();
  exerciseTrackingData = {};
  setSessionStatus("planifiee");
  $("#session-modal-title").textContent = "Nouvelle séance";
  $("#session-btn-delete").style.display = "none";
  renderSessionCategoryChips();
  renderSessionExerciseList();
  sessionBackdrop.classList.add("open");
}
function openSessionEdit(id) {
  const s = sessions.find((x) => x.id === id);
  if (!s) return;
  $("#se-id").value = s.id;
  $("#se-date").value = s.date;
  $("#se-title").value = s.title || "";
  $("#se-notes").value = s.notes || "";
  sessionModalCategory = s.category || null;
  checkedExerciseIds = new Set(s.exercises || []);
  exerciseTrackingData = s.exerciseData ? JSON.parse(JSON.stringify(s.exerciseData)) : {};
  setSessionStatus(s.status || "planifiee");
  $("#session-modal-title").textContent = "Modifier la séance";
  $("#session-btn-delete").style.display = "";
  renderSessionCategoryChips();
  renderSessionExerciseList();
  sessionBackdrop.classList.add("open");
}
$("#btn-new-session").addEventListener("click", () => openSessionNew());
$("#session-modal-close").addEventListener("click", () => sessionBackdrop.classList.remove("open"));
$("#session-modal-cancel").addEventListener("click", () => sessionBackdrop.classList.remove("open"));
sessionBackdrop.addEventListener("click", (e) => { if (e.target === sessionBackdrop) sessionBackdrop.classList.remove("open"); });

sessionForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("#se-id").value;
  const data = {
    date: $("#se-date").value,
    title: $("#se-title").value.trim(),
    category: sessionModalCategory,
    exercises: Array.from(checkedExerciseIds),
    exerciseData: Object.fromEntries(Array.from(checkedExerciseIds).filter((id) => exerciseTrackingData[id]).map((id) => [id, exerciseTrackingData[id]])),
    notes: $("#se-notes").value.trim(),
    status: sessionStatus,
  };
  try {
    if (id) { data.id = id; await sessionApi.update(data); toast("Séance mise à jour"); }
    else { await sessionApi.create(data); toast("Séance planifiée"); }
    sessionBackdrop.classList.remove("open");
    await loadAll();
  } catch (err) { console.error(err); toast("Erreur"); }
});
$("#session-btn-delete").addEventListener("click", async () => {
  const id = $("#se-id").value;
  if (!id || !confirm("Supprimer cette séance ?")) return;
  try { await sessionApi.delete(id); toast("Séance supprimée"); sessionBackdrop.classList.remove("open"); await loadAll(); }
  catch (err) { console.error(err); toast("Erreur"); }
});

/* ============ NOTIFICATIONS PUSH ============ */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
async function updateNotifBtnState() {
  const btn = $("#notif-btn");
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    btn.textContent = "🔔 Non supporté sur ce navigateur";
    btn.disabled = true;
    return;
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    if (sub) { btn.textContent = "🔔 Rappels activés"; btn.classList.add("active"); }
    else { btn.textContent = "🔔 Activer les rappels"; btn.classList.remove("active"); }
  } catch (e) { /* silencieux */ }
}
$("#notif-btn").addEventListener("click", async () => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    toast("Notifications non supportées sur ce navigateur");
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { toast("Permission refusée"); return; }
    const reg = await navigator.serviceWorker.register("/service-worker.js");
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
    toast("Rappels activés 🎉");
    updateNotifBtnState();
  } catch (err) {
    console.error(err);
    toast("Impossible d'activer les rappels");
  }
});

/* ============ EXERCICE PERSONNALISÉ ============ */
const ZONE_LABELS = {
  chest: "Pectoraux", shoulders_front: "Épaules (avant)", shoulders_back: "Épaules (arrière)",
  biceps: "Biceps", triceps: "Triceps", forearms: "Avant-bras", abs: "Abdos",
  quads: "Quadriceps", hamstrings: "Ischios", glutes: "Fessiers",
  calves_front: "Mollets (avant)", calves_back: "Mollets (arrière)",
  upper_back: "Haut du dos", lower_back: "Bas du dos",
};
const ZONE_CYCLE = [null, "rouge", "orange", "vert"];
const ZONE_CYCLE_LABEL = { null: "Non sollicité", rouge: "Rouge (fort)", orange: "Orange (moyen)", vert: "Vert (léger)" };

let ceZones = {};
let ceCategory = null;
let ceTracking = "";

function renderCeCategoryChips() {
  const el = $("#ce-category-chips");
  el.innerHTML = CATEGORIES.map((c) => `<button type="button" class="chip ${ceCategory === c.id ? "active" : ""}" data-cat="${c.id}">${c.label}</button>`).join("");
  el.querySelectorAll(".chip").forEach((chip) => chip.addEventListener("click", () => { ceCategory = chip.dataset.cat; renderCeCategoryChips(); }));
}
function renderCeZonePicker() {
  const el = $("#ce-zone-picker");
  el.innerHTML = Object.entries(ZONE_LABELS).map(([zone, label]) => {
    const intensity = ceZones[zone] || null;
    return `<button type="button" class="zone-btn" data-zone="${zone}" data-intensity="${intensity || ""}">${label}<br>${ZONE_CYCLE_LABEL[intensity]}</button>`;
  }).join("");
  el.querySelectorAll(".zone-btn").forEach((btn) => btn.addEventListener("click", () => {
    const zone = btn.dataset.zone;
    const current = ceZones[zone] || null;
    const nextIdx = (ZONE_CYCLE.indexOf(current) + 1) % ZONE_CYCLE.length;
    const next = ZONE_CYCLE[nextIdx];
    if (next) ceZones[zone] = next; else delete ceZones[zone];
    renderCeZonePicker();
  }));
}
function setCeTracking(t) {
  ceTracking = t;
  $$("#ce-tracking-toggle button").forEach((b) => b.classList.toggle("active", b.dataset.tracking === t));
}
$("#ce-tracking-toggle").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (btn) setCeTracking(btn.dataset.tracking);
});

const ceBackdrop = $("#custom-exercise-modal-backdrop");
const ceForm = $("#custom-exercise-form");

function openCustomExerciseNew() {
  ceForm.reset();
  $("#ce-id").value = "";
  ceCategory = selectedCategory !== "all" ? selectedCategory : CATEGORIES[0].id;
  ceZones = {};
  setCeTracking("");
  renderCeCategoryChips();
  renderCeZonePicker();
  $("#ce-modal-title").textContent = "Nouvel exercice";
  $("#ce-btn-delete").style.display = "none";
  exerciseBackdrop.classList.remove("open");
  ceBackdrop.classList.add("open");
}
function openCustomExerciseEdit(id) {
  const ex = customExercises.find((e) => e.id === id);
  if (!ex) return;
  $("#ce-id").value = ex.id;
  $("#ce-name").value = ex.name || "";
  $("#ce-equip").value = ex.equipement || "";
  $("#ce-video").value = ex.videoUrl || "";
  $("#ce-desc").value = ex.description || "";
  ceCategory = ex.category;
  ceZones = { ...(ex.zones || {}) };
  setCeTracking(ex.tracking || "");
  renderCeCategoryChips();
  renderCeZonePicker();
  $("#ce-modal-title").textContent = "Modifier l'exercice";
  $("#ce-btn-delete").style.display = "";
  exerciseBackdrop.classList.remove("open");
  ceBackdrop.classList.add("open");
}
$("#btn-new-exercise").addEventListener("click", openCustomExerciseNew);
$("#exercise-edit-custom").addEventListener("click", () => openCustomExerciseEdit(exerciseBackdrop.dataset.exId));
$("#exercise-delete-custom").addEventListener("click", async () => {
  const id = exerciseBackdrop.dataset.exId;
  if (!confirm("Supprimer cet exercice ?")) return;
  try { await customExerciseApi.delete(id); toast("Exercice supprimé"); exerciseBackdrop.classList.remove("open"); await loadAll(); }
  catch (err) { console.error(err); toast("Erreur"); }
});
$("#ce-modal-close").addEventListener("click", () => ceBackdrop.classList.remove("open"));
$("#ce-modal-cancel").addEventListener("click", () => ceBackdrop.classList.remove("open"));
ceBackdrop.addEventListener("click", (e) => { if (e.target === ceBackdrop) ceBackdrop.classList.remove("open"); });

ceForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("#ce-id").value;
  const data = {
    name: $("#ce-name").value.trim(),
    category: ceCategory,
    equipement: $("#ce-equip").value.trim(),
    videoUrl: $("#ce-video").value.trim() || null,
    description: $("#ce-desc").value.trim(),
    tracking: ceTracking || null,
    zones: { ...ceZones },
  };
  try {
    if (id) { data.id = id; await customExerciseApi.update(data); toast("Exercice mis à jour"); }
    else { await customExerciseApi.create(data); toast("Exercice ajouté 🎉"); }
    ceBackdrop.classList.remove("open");
    await loadAll();
  } catch (err) { console.error(err); toast("Erreur"); }
});
$("#ce-btn-delete").addEventListener("click", async () => {
  const id = $("#ce-id").value;
  if (!id || !confirm("Supprimer cet exercice ?")) return;
  try { await customExerciseApi.delete(id); toast("Exercice supprimé"); ceBackdrop.classList.remove("open"); await loadAll(); }
  catch (err) { console.error(err); toast("Erreur"); }
});

/* ============ INIT ============ */
loadAll();
updateNotifBtnState();
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").catch(() => {});
}
