/* ══════════════════════════════════════════════════
   KARAT — app.js  (requires api.js + jalali.js)
   All backend features wired up.
   ══════════════════════════════════════════════════ */

if (!Auth.isLoggedIn()) {
  window.location.href = "/login/";
}

/* ── Constants ── */
const PRIORITY = {
  1: { label: "کم‌اهمیت", emoji: "🌿", cls: "low" },
  2: { label: "معمولی",   emoji: "☕", cls: "medium" },
  3: { label: "فوری",     emoji: "🔥", cls: "high" }
};

const ROAD_LINES = [
  "هر قدم کوچیک یه قدمه به جلو 🛤️",
  "جاده‌ی زندگی رو تو خودت می‌سازی 🌄",
  "آروم برو، ولی برو 🚗",
  "امروز هم از خودت ممنون باش 💛",
  "کارهات رو بزن، بعد استراحت کن ✨",
  "مسیر مهم‌تر از مقصده 🗺️",
  "یه کار کمتر، یه آرامش بیشتر 🍃"
];

/* ── State ── */
let tasks = [];
let editingId = null;
let detailTask = null;
let currentUser = null;
let currentTab = "active";
let selectedTag = "";
let searchQuery = "";
let sortBy = "priority";   // priority | due | created
let totalStats = { active: 0, completed: 0, deleted: 0, urgent: 0 };

/* ── DOM refs ── */
const $ = (id) => document.getElementById(id);
const taskList    = $("taskList");
const taskModal   = $("taskModal");
const taskForm    = $("taskForm");
const detailModal = $("taskDetailModal");
const profileModal= $("profileModal");
const profileForm = $("profileForm");
const tagFilter   = $("tagFilter");
const funBar      = $("funBar");
const searchInput = $("searchInput");
const sortSelect  = $("sortSelect");

/* ══════════════════════════════
   INIT
══════════════════════════════ */
$("logoutBtn").addEventListener("click", () => Auth.logout());
$("addBtn").addEventListener("click", openCreateModal);
$("cancelBtn").addEventListener("click", closeModal);
$("modalBackdrop").addEventListener("click", closeModal);
$("profileBtn").addEventListener("click", openProfileModal);
$("profileCancelBtn").addEventListener("click", closeProfileModal);
$("profileBackdrop").addEventListener("click", closeProfileModal);
$("detailBackdrop").addEventListener("click", closeTaskDetail);
$("detailCloseBtn").addEventListener("click", closeTaskDetail);

$("detailEditBtn").addEventListener("click", () => {
  if (!detailTask) return;
  const id = getTaskId(detailTask);
  closeTaskDetail();
  openEditModal(id);
});
$("detailCompleteBtn").addEventListener("click", async () => {
  if (!detailTask) return;
  await toggleComplete(detailTask);
  closeTaskDetail();
});
$("detailDeleteBtn").addEventListener("click", async () => {
  if (!detailTask) return;
  await removeTask(detailTask);
  closeTaskDetail();
});
$("detailRestoreBtn").addEventListener("click", async () => {
  if (!detailTask) return;
  await restoreTask(detailTask);
  closeTaskDetail();
});

taskForm.addEventListener("submit", (e) => { e.preventDefault(); saveTask(); });
profileForm.addEventListener("submit", (e) => { e.preventDefault(); saveProfile(); });

/* Change password form */
$("changePwForm").addEventListener("submit", (e) => { e.preventDefault(); changePassword(); });

/* Tabs */
document.querySelectorAll(".task-tab").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

/* Search */
searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.trim();
  renderTasks();
  updateRoadBar();
});

/* Sort */
sortSelect.addEventListener("change", () => {
  sortBy = sortSelect.value;
  renderTasks();
});

/* Task list event delegation */
taskList.addEventListener("click", handleTaskListClick);

/* Title char counter */
const taskTitleInput = $("taskTitle");
const titleCounter   = $("titleCounter");
taskTitleInput.addEventListener("input", () => {
  titleCounter.textContent = taskTitleInput.value.length + " / 200";
});

/* ══════════════════════════════
   JALALI DATE PICKER
══════════════════════════════ */
const hasDue    = $("hasDue");
const dueFields = $("dueFields");
const dueYear   = $("dueYear");
const dueMonth  = $("dueMonth");
const dueDay    = $("dueDay");
const dueHour   = $("dueHour");
const dueMinute = $("dueMinute");

function initJalaliSelects() {
  const now = Jalali.nowJalali();
  dueYear.innerHTML = "";
  for (let y = now.jy - 1; y <= now.jy + 3; y++) {
    dueYear.innerHTML += `<option value="${y}">${Jalali.toPersianNum(y)}</option>`;
  }
  dueMonth.innerHTML = "";
  Jalali.PERSIAN_MONTHS.forEach((name, i) => {
    dueMonth.innerHTML += `<option value="${i + 1}">${name}</option>`;
  });
  dueHour.innerHTML = "";
  for (let h = 0; h < 24; h++) {
    dueHour.innerHTML += `<option value="${h}">${Jalali.toPersianNum(String(h).padStart(2, "0"))}</option>`;
  }
  dueMinute.innerHTML = "";
  for (let m = 0; m < 60; m += 5) {
    dueMinute.innerHTML += `<option value="${m}">${Jalali.toPersianNum(String(m).padStart(2, "0"))}</option>`;
  }
  dueYear.addEventListener("change", updateDayOptions);
  dueMonth.addEventListener("change", updateDayOptions);
}

function updateDayOptions() {
  const jy = parseInt(dueYear.value, 10);
  const jm = parseInt(dueMonth.value, 10);
  const len = Jalali.monthLength(jy, jm);
  const prev = parseInt(dueDay.value, 10) || 1;
  dueDay.innerHTML = "";
  for (let d = 1; d <= len; d++) {
    dueDay.innerHTML += `<option value="${d}">${Jalali.toPersianNum(d)}</option>`;
  }
  dueDay.value = String(Math.min(prev, len));
}

function setJalaliFromISO(str) {
  const d = Jalali.parseISO(str);
  if (!d) return;
  const j = Jalali.fromDate(d);
  dueYear.value = String(j.jy);
  dueMonth.value = String(j.jm);
  updateDayOptions();
  dueDay.value = String(j.jd);
  dueHour.value = String(d.getHours());
  dueMinute.value = String(Math.floor(d.getMinutes() / 5) * 5);
}

function clearDueFields() {
  hasDue.checked = false;
  dueFields.classList.add("hidden");
  const now = Jalali.nowJalali();
  dueYear.value = String(now.jy);
  dueMonth.value = String(now.jm);
  updateDayOptions();
  dueDay.value = String(now.jd);
  dueHour.value = "9";
  dueMinute.value = "0";
}

function setDueFromTask(task) {
  if (task.due_date) {
    hasDue.checked = true;
    dueFields.classList.remove("hidden");
    setJalaliFromISO(task.due_date);
  } else {
    clearDueFields();
  }
}

hasDue.addEventListener("change", () => {
  dueFields.classList.toggle("hidden", !hasDue.checked);
  if (hasDue.checked) updateDayOptions();
});

initJalaliSelects();
clearDueFields();

/* ══════════════════════════════
   HELPERS
══════════════════════════════ */
function toPersianNum(n) {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function showToast(msg, type) {
  // type: undefined = success, "error", "warn"
  const el = $("toast");
  if (!el) return;
  el.textContent = msg;
  el.className = "toast" + (type ? ` toast-${type}` : "");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => (el.className = "toast hidden"), 3000);
}

function formatDate(str) {
  return Jalali.format(str) || "";
}

function isOverdue(task) {
  if (!task.due_date || task.is_completed) return false;
  const d = Jalali.parseISO(task.due_date);
  if (!d) return false;
  return d < new Date();
}

function getTaskId(task) {
  const id = task?.id ?? task?.pk;
  if (id === 0 || id === "0") return 0;
  if (id == null) return null;
  return Number(id);
}

function findTaskById(id) {
  return tasks.find((t) => getTaskId(t) === Number(id));
}

function normalizeTaskList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.tasks)) return data.tasks;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

function sortedTasks(list) {
  const copy = [...list];
  if (sortBy === "priority") {
    copy.sort((a, b) => (b.priority || 2) - (a.priority || 2) || compareDate(a, b));
  } else if (sortBy === "due") {
    copy.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
  } else if (sortBy === "created") {
    copy.sort((a, b) => compareDate(b, a, "created_at"));
  }
  return copy;
}

function compareDate(a, b, field) {
  const da = new Date(a[field || "created_at"] || 0);
  const db = new Date(b[field || "created_at"] || 0);
  return db - da;
}

function filteredTasks() {
  let list = tasks;
  if (selectedTag) list = list.filter((t) => t.tag === selectedTag);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(
      (t) =>
        (t.title || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.tag || "").toLowerCase().includes(q)
    );
  }
  return sortedTasks(list);
}

function collectTags(list) {
  const tags = new Set();
  list.forEach((t) => { if (t.tag) tags.add(t.tag); });
  return [...tags].sort((a, b) => a.localeCompare(b, "fa"));
}

/* ══════════════════════════════
   API CALLS
══════════════════════════════ */
async function fetchTasksForTab(tab) {
  let url;
  if (tab === "active")    url = "/tasks/";
  else if (tab === "completed") url = "/tasks/completed/";
  else if (tab === "deleted")   url = "/tasks/?is_deleted=true";

  const res = await Auth.api(url);
  if (!res.ok) throw new Error("load");
  const data = await res.json();
  return normalizeTaskList(data);
}

async function fetchAllStats() {
  try {
    const [rActive, rDone, rDel] = await Promise.all([
      Auth.api("/tasks/"),
      Auth.api("/tasks/completed/"),
      Auth.api("/tasks/?is_deleted=true"),
    ]);
    const active    = normalizeTaskList(rActive.ok    ? await rActive.json()  : []);
    const completed = normalizeTaskList(rDone.ok      ? await rDone.json()    : []);
    const deleted   = normalizeTaskList(rDel.ok       ? await rDel.json()     : []);
    const urgent    = active.filter((t) => t.priority === 3).length;
    totalStats = {
      active:    active.length,
      completed: completed.length,
      deleted:   deleted.length,
      urgent,
    };
    renderStats();
    renderProgress(active, completed);
  } catch { /* non-critical */ }
}

async function fetchTask(id) {
  const res = await Auth.api(`/tasks/${id}/`);
  if (!res.ok) throw new Error("load one");
  return res.json();
}

async function createTask(data) {
  const res = await Auth.api("/tasks/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

async function updateTask(id, data, method) {
  if (id == null) throw new Error("no id");
  const res = await Auth.api(`/tasks/${id}/`, {
    method: method || "PATCH",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  if (res.status === 204) return null;
  return res.json();
}

async function deleteTask(id) {
  const res = await Auth.api(`/tasks/${id}/`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("delete");
}

/* ══════════════════════════════
   TAB SWITCHING
══════════════════════════════ */
function switchTab(tab) {
  if (tab === currentTab) return;
  currentTab = tab;
  selectedTag = "";
  searchQuery = "";
  if (searchInput) searchInput.value = "";
  document.querySelectorAll(".task-tab").forEach((btn) => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  loadTasks();
}

/* ══════════════════════════════
   RENDER STATS
══════════════════════════════ */
function renderStats() {
  const ids = ["statActive", "statDone", "statDeleted", "statUrgent"];
  const vals = [totalStats.active, totalStats.completed, totalStats.deleted, totalStats.urgent];
  ids.forEach((id, i) => {
    const el = $(id);
    if (el) el.textContent = toPersianNum(vals[i]);
  });
}

function renderProgress(active, completed) {
  const fill = $("progressFill");
  const label = $("progressLabel");
  if (!fill || !label) return;
  const total = active.length + completed.length;
  const pct = total === 0 ? 0 : Math.round((completed.length / total) * 100);
  fill.style.width = pct + "%";
  label.textContent = `پیشرفت: ${toPersianNum(pct)}% — ${toPersianNum(completed.length)} از ${toPersianNum(total)} کار تکمیل شده`;
}

/* ══════════════════════════════
   ROAD BAR
══════════════════════════════ */
function updateRoadBar() {
  const visible = filteredTasks();
  const count = visible.length;
  if (tasks.length === 0) {
    funBar.textContent = "▶ جاده خالیه — اولین کارت رو بذار روی نقشه 🚗 ◀";
  } else if (searchQuery && count === 0) {
    funBar.textContent = "▶ هیچ کاری با این جستجو پیدا نشد 🔍 ◀";
  } else {
    funBar.textContent = "▶ " + ROAD_LINES[Math.floor(Math.random() * ROAD_LINES.length)] + " ◀";
  }
  const badge = $("taskCount");
  if (badge) badge.textContent = toPersianNum(count);
}

/* ══════════════════════════════
   TAG FILTER
══════════════════════════════ */
function renderTagFilter() {
  const tags = collectTags(tasks);
  tagFilter.innerHTML = "";

  function addChip(label, value) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "tag-chip" + (selectedTag === value ? " active" : "");
    chip.dataset.tag = value;
    chip.textContent = label;
    chip.addEventListener("click", () => {
      selectedTag = value;
      renderTagFilter();
      renderTasks();
      updateRoadBar();
    });
    tagFilter.appendChild(chip);
  }
  addChip("همه 🗺️", "");
  tags.forEach((tag) => addChip("🏷 " + tag, tag));
  tagFilter.classList.toggle("hidden", tags.length === 0);
}

/* ══════════════════════════════
   MODAL: CREATE / EDIT
══════════════════════════════ */
function openCreateModal() {
  editingId = null;
  $("modalTitle").textContent = "▸ کار جدید ✨";
  $("taskTitle").value = "";
  $("taskDesc").value = "";
  clearDueFields();
  $("taskPriority").value = "2";
  $("taskDuration").value = "short";
  $("taskTag").value = "";
  titleCounter.textContent = "0 / 200";
  taskModal.classList.remove("hidden");
  setTimeout(() => $("taskTitle").focus(), 60);
}

async function openEditModal(id) {
  if (id == null) { showToast("شناسه کار پیدا نشد 😕", "error"); return; }
  editingId = id;
  $("modalTitle").textContent = "▸ ویرایش کار ✏️";
  taskModal.classList.remove("hidden");
  try {
    const task = await fetchTask(id);
    $("taskTitle").value = task.title || "";
    $("taskDesc").value  = task.description || "";
    titleCounter.textContent = ($("taskTitle").value.length) + " / 200";
    setDueFromTask(task);
    $("taskPriority").value = String(task.priority || 2);
    $("taskDuration").value = (task.duration_type || "short").trim();
    $("taskTag").value      = task.tag || "";
    setTimeout(() => $("taskTitle").focus(), 60);
  } catch {
    closeModal();
    showToast("خطا در بارگذاری کار 😕", "error");
  }
}

function closeModal() {
  taskModal.classList.add("hidden");
  editingId = null;
}

function buildPayload() {
  const title       = $("taskTitle").value.trim();
  const description = $("taskDesc").value.trim();
  const priority    = parseInt($("taskPriority").value, 10);
  const duration_type = $("taskDuration").value;
  const tagRaw      = $("taskTag").value.trim();

  const payload = { title, priority, duration_type };
  if (description) payload.description = description;
  if (tagRaw)      payload.tag = tagRaw;

  if (hasDue.checked) {
    payload.due_date = Jalali.toISO(
      parseInt(dueYear.value, 10),
      parseInt(dueMonth.value, 10),
      parseInt(dueDay.value, 10),
      parseInt(dueHour.value, 10),
      parseInt(dueMinute.value, 10)
    );
  } else {
    payload.due_date = null;
  }
  return payload;
}

async function saveTask() {
  const payload = buildPayload();
  if (!payload.title) { showToast("عنوان رو بنویس لطفاً 🙏", "warn"); return; }
  const btn = $("saveBtn");
  btn.disabled = true;
  btn.textContent = "[ در حال ذخیره… ]";
  try {
    if (editingId) {
      await updateTask(editingId, payload, "PATCH");
      showToast("ویرایش شد! ✏️");
    } else {
      await createTask(payload);
      showToast("کار جدید اضافه شد! 🎉");
    }
    closeModal();
    await loadTasks();
    fetchAllStats();
  } catch (e) {
    console.error("saveTask:", e.message);
    showToast("ذخیره نشد — دوباره امتحان کن 😕", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "[ ذخیره ]";
  }
}

/* ══════════════════════════════
   TASK ACTIONS
══════════════════════════════ */
async function removeTask(task) {
  const id = getTaskId(task);
  if (id == null) { showToast("شناسه کار پیدا نشد 😕", "error"); return; }
  if (!confirm(`«${task.title || "این کار"}» حذف بشه؟`)) return;
  try {
    await deleteTask(id);
    showToast("حذف شد 🗑️");
    await loadTasks();
    fetchAllStats();
  } catch {
    showToast("خطا در حذف 😕", "error");
  }
}

async function toggleComplete(task) {
  const id = getTaskId(task);
  if (id == null) { showToast("شناسه کار پیدا نشد 😕", "error"); return; }
  try {
    await updateTask(id, { title: task.title, is_completed: !task.is_completed });
    showToast(!task.is_completed ? "آفرین! کار تکمیل شد ✅" : "به لیست فعال برگشت 🔄");
    await loadTasks();
    fetchAllStats();
  } catch {
    showToast("خطا در به‌روزرسانی 😕", "error");
  }
}

async function restoreTask(task) {
  const id = getTaskId(task);
  if (id == null) { showToast("شناسه کار پیدا نشد 😕", "error"); return; }
  try {
    await updateTask(id, { title: task.title, is_deleted: false });
    showToast("بازگردانی شد ↩️");
    await loadTasks();
    fetchAllStats();
  } catch {
    showToast("خطا در بازگردانی 😕", "error");
  }
}

function handleTaskListClick(e) {
  const card = e.target.closest(".task[data-task-id]");
  if (!card) return;
  const id   = Number(card.dataset.taskId);
  const task = findTaskById(id);
  if (!task) return;

  if (e.target.closest(".complete-circle")) {
    e.preventDefault(); e.stopPropagation();
    toggleComplete(task); return;
  }
  if (e.target.closest(".edit-btn")) {
    e.preventDefault(); e.stopPropagation();
    openEditModal(id); return;
  }
  if (e.target.closest(".del-btn")) {
    e.preventDefault(); e.stopPropagation();
    removeTask(task); return;
  }
  if (e.target.closest(".restore-btn")) {
    e.preventDefault(); e.stopPropagation();
    restoreTask(task); return;
  }
  if (e.target.closest(".task-title-link")) {
    e.preventDefault();
    openTaskDetail(id);
  }
}

/* ══════════════════════════════
   TASK DETAIL MODAL
══════════════════════════════ */
async function openTaskDetail(id) {
  if (id == null) { showToast("شناسه کار پیدا نشد 😕", "error"); return; }
  detailModal.classList.remove("hidden");
  $("detailTitle").textContent = "…";
  $("detailDesc").textContent  = "";
  $("detailMeta").innerHTML    = "";
  try {
    const fetched = await fetchTask(id);
    detailTask = fetched;
    detailTask.id = getTaskId(fetched) ?? id;
    renderTaskDetail(detailTask);
  } catch {
    closeTaskDetail();
    showToast("خطا در بارگذاری کار 😕", "error");
  }
}

function renderTaskDetail(task) {
  const p  = PRIORITY[task.priority] || PRIORITY[2];
  const due = formatDate(task.due_date);
  const created = formatDate(task.created_at);
  const completedAt = task.completed_at
    ? Jalali.toPersianNum(String(task.completed_at))
    : null;
  const isDeleted = task.is_deleted || currentTab === "deleted";
  const overdue   = isOverdue(task);

  $("detailTitle").textContent = task.title || "بدون عنوان";

  const descEl = $("detailDesc");
  descEl.textContent = task.description || "";
  descEl.classList.toggle("hidden", !task.description);

  let meta = `<span class="badge ${p.cls}">${p.emoji} ${escapeHtml(p.label)}</span>`;

  const durType = (task.duration_type || "").trim();
  if (durType) {
    const durLabel = durType === "long" ? "بلندمدت 📅" : "کوتاه‌مدت ⚡";
    meta += `<span class="badge date">${durLabel}</span>`;
  }
  if (overdue) meta += `<span class="badge overdue-b">⚠️ گذشته از موعد!</span>`;
  if (due)     meta += `<span class="badge date">📅 ${escapeHtml(due)}</span>`;
  if (created) meta += `<span class="badge date">🕒 ${escapeHtml(created)}</span>`;
  if (completedAt) meta += `<span class="badge done">✅ تکمیل: ${escapeHtml(completedAt)}</span>`;
  if (task.tag) meta += `<span class="badge tag">🏷 ${escapeHtml(task.tag)}</span>`;
  if (task.is_completed) meta += `<span class="badge done">✓ تکمیل‌شده</span>`;
  if (isDeleted) meta += `<span class="badge high">🗑 حذف‌شده</span>`;

  $("detailMeta").innerHTML = meta;

  $("detailRestoreBtn").classList.toggle("hidden", !isDeleted);
  $("detailCompleteBtn").classList.toggle("hidden", isDeleted);
  $("detailDeleteBtn").classList.toggle("hidden", isDeleted);
  $("detailEditBtn").classList.toggle("hidden", isDeleted);

  $("detailCompleteBtn").textContent = task.is_completed
    ? "[ بازگردانی به فعال ]"
    : "[ تکمیل کردن ✓ ]";
}

function closeTaskDetail() {
  detailModal.classList.add("hidden");
  detailTask = null;
}

/* ══════════════════════════════
   RENDER TASKS
══════════════════════════════ */
function buildTaskCard(task) {
  let id = getTaskId(task);
  if (id == null) id = "tmp-" + Math.random().toString(36).slice(2, 7);

  const p         = PRIORITY[task.priority] || PRIORITY[2];
  const due       = formatDate(task.due_date);
  const isDone    = task.is_completed;
  const isDeleted = currentTab === "deleted";
  const overdue   = isOverdue(task);
  const title     = task.title || "بدون عنوان";

  const el = document.createElement("div");
  el.className = [
    "task",
    "priority-" + p.cls,
    isDone    ? "completed" : "",
    overdue   ? "overdue"   : "",
  ].filter(Boolean).join(" ");
  el.dataset.taskId = String(id);

  const circleHtml = isDeleted
    ? ""
    : `<button type="button" class="complete-circle${isDone ? " done" : ""}"
         title="${isDone ? "فعال کن" : "تکمیل کن"}" aria-label="وضعیت تکمیل"></button>`;

  const actionsHtml = isDeleted
    ? `<button class="btn-icon restore restore-btn" type="button" title="بازگردانی">↩</button>`
    : `<button class="btn-icon edit edit-btn" type="button" title="ویرایش">✎</button>
       <button class="btn-icon del del-btn" type="button" title="حذف">✕</button>`;

  const descHtml = task.description
    ? `<span class="task-desc">${escapeHtml(task.description)}</span>`
    : "";

  const badges = [`<span class="badge ${p.cls}">${p.emoji} ${escapeHtml(p.label)}</span>`];
  if (overdue) badges.push(`<span class="badge overdue-b">⚠ گذشته</span>`);
  else if (due) badges.push(`<span class="badge date">📅 ${escapeHtml(due)}</span>`);
  if (task.tag)  badges.push(`<span class="badge tag">🏷 ${escapeHtml(task.tag)}</span>`);

  el.innerHTML = `
    ${circleHtml}
    <div class="task-body">
      <button type="button" class="task-title task-title-link">${escapeHtml(title)}</button>
      ${descHtml}
      <div class="task-meta">${badges.join("")}</div>
    </div>
    <div class="task-actions">${actionsHtml}</div>
  `;
  return el;
}

function renderSection(icon, title, sectionTasks) {
  if (!sectionTasks || sectionTasks.length === 0) return null;

  const section = document.createElement("div");
  section.className = "task-section";
  section.innerHTML = `<h3 class="section-title">${icon} ${escapeHtml(title)} <span class="section-count">${toPersianNum(sectionTasks.length)}</span></h3>`;

  const grid = document.createElement("div");
  grid.className = "section-grid";
  sectionTasks.forEach((task) => grid.appendChild(buildTaskCard(task)));

  section.appendChild(grid);
  return section;
}

function renderTasks() {
  taskList.innerHTML = "";
  const visible = filteredTasks();

  if (visible.length === 0) {
    if (tasks.length === 0) {
      const emptyMsgs = {
        active:    { icon: "🛤️", title: "جاده‌ات هنوز خالیه!",    sub: "اولین کارت رو بذار روی نقشه تا سفر شروع بشه 🚗" },
        completed: { icon: "🏆", title: "هنوز کاری تکمیل نشده!",  sub: "برو یه کار از لیست فعال تیک بزن 💪" },
        deleted:   { icon: "🗑️", title: "سطل آشغال خالیه!",       sub: "هیچ کاری حذف نشده — جاده تمیزه 🌿" },
      };
      const m = emptyMsgs[currentTab] || emptyMsgs.active;
      taskList.innerHTML = `
        <div class="empty">
          <span class="empty-icon">${m.icon}</span>
          <p class="empty-title">${m.title}</p>
          <p class="empty-sub">${m.sub}</p>
        </div>`;
    } else {
      taskList.innerHTML = `
        <div class="empty">
          <span class="empty-icon">🔍</span>
          <p class="empty-title">نتیجه‌ای پیدا نشد</p>
          <p class="empty-sub">فیلتر یا جستجوت رو عوض کن</p>
        </div>`;
    }
    return;
  }

  /* Split into short/long/general */
  const short   = visible.filter((t) => (t.duration_type || "").trim() === "short");
  const long    = visible.filter((t) => (t.duration_type || "").trim() === "long");
  const general = visible.filter((t) => !["short", "long"].includes((t.duration_type || "").trim()));

  const sections = [
    renderSection("⚡", "کوتاه‌مدت", short),
    renderSection("🗺️", "بلندمدت",   long),
    renderSection("📌", "عمومی",     general),
  ].filter(Boolean);

  sections.forEach((s) => taskList.appendChild(s));
}

/* ══════════════════════════════
   LOADING STATE
══════════════════════════════ */
function showLoading() {
  taskList.innerHTML = `
    <div class="loading">
      <div class="loading-car">🚗</div>
      <div class="loading-text">در حال بارگذاری…</div>
    </div>`;
}

/* ══════════════════════════════
   PROFILE MODAL
══════════════════════════════ */
function openProfileModal() {
  if (!currentUser) return;
  $("profileName").value     = currentUser.name     || "";
  $("profileUsername").value = currentUser.username || "";
  $("profilePassword").value = "";
  $("profileError").textContent = "";
  $("profileError").classList.add("hidden");
  /* Reset change password fields */
  $("cpOldPassword").value = "";
  $("cpNewPassword1").value = "";
  $("cpNewPassword2").value = "";
  $("cpError").classList.add("hidden");
  $("cpSuccess").classList.add("hidden");
  profileModal.classList.remove("hidden");
  setTimeout(() => $("profileName").focus(), 60);
}

function closeProfileModal() {
  profileModal.classList.add("hidden");
}

async function saveProfile() {
  const name     = $("profileName").value.trim();
  const username = $("profileUsername").value.trim();
  if (!name || !username) { showProfileError("نام و نام کاربری اجباریه"); return; }

  const payload = { name, username };
  const btn = $("profileSaveBtn");
  btn.disabled = true;
  try {
    const res = await Auth.api("/account/me/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showProfileError(Object.values(err).flat().join(" ") || "خطا در ذخیره");
      return;
    }
    currentUser = await res.json();
    $("userGreeting").textContent = `سلام ${currentUser.name} 👋`;
    closeProfileModal();
    showToast("پروفایل به‌روز شد! ✅");
  } catch {
    showProfileError("خطا در اتصال به سرور");
  } finally {
    btn.disabled = false;
  }
}

function showProfileError(msg) {
  const el = $("profileError");
  el.textContent = msg;
  el.classList.remove("hidden");
}

/* ── Change password (uses /account/me/change-password/) ── */
async function changePassword() {
  const old_password  = $("cpOldPassword").value;
  const new_password1 = $("cpNewPassword1").value;
  const new_password2 = $("cpNewPassword2").value;

  if (!old_password || !new_password1 || !new_password2) {
    showCpError("همه فیلدها رو پر کن");
    return;
  }
  if (new_password1 !== new_password2) {
    showCpError("رمزهای جدید با هم یکی نیستن");
    return;
  }
  if (new_password1.length < 8) {
    showCpError("رمز باید حداقل ۸ کاراکتر باشه");
    return;
  }
  const btn = $("cpSaveBtn");
  btn.disabled = true;
  try {
    const res = await Auth.api("/account/me/change-password/", {
      method: "POST",
      body: JSON.stringify({ old_password, new_password1, new_password2 }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showCpError(Object.values(err).flat().join(" ") || "خطا در تغییر رمز");
      return;
    }
    $("cpError").classList.add("hidden");
    const suc = $("cpSuccess");
    suc.textContent = "رمز عبور تغییر کرد! ✅";
    suc.classList.remove("hidden");
    $("cpOldPassword").value = "";
    $("cpNewPassword1").value = "";
    $("cpNewPassword2").value = "";
    showToast("رمز تغییر کرد! 🔑");
  } catch {
    showCpError("خطا در اتصال به سرور");
  } finally {
    btn.disabled = false;
  }
}

function showCpError(msg) {
  const el = $("cpError");
  el.textContent = msg;
  el.classList.remove("hidden");
  $("cpSuccess").classList.add("hidden");
}

/* ══════════════════════════════
   LOAD USER & TASKS
══════════════════════════════ */
async function loadUser() {
  try {
    const res = await Auth.api("/account/me/");
    if (!res.ok) return;
    currentUser = await res.json();
    $("userGreeting").textContent = `سلام ${currentUser.name} 👋`;
  } catch { /* api.js handles redirect */ }
}

async function loadTasks() {
  showLoading();
  try {
    tasks = await fetchTasksForTab(currentTab);
    renderTagFilter();
    renderTasks();
    updateRoadBar();
    /* Update tab counts */
    updateTabCount(currentTab, tasks.length);
  } catch {
    taskList.innerHTML = `
      <div class="empty">
        <span class="empty-icon">😅</span>
        <p class="empty-title">نتونستم کارها رو بیارم</p>
        <p class="empty-sub">یه بار دیگه صفحه رو رفرش کن</p>
      </div>`;
  }
}

function updateTabCount(tab, count) {
  const btn = document.querySelector(`.task-tab[data-tab="${tab}"]`);
  if (!btn) return;
  let span = btn.querySelector(".tab-count");
  if (!span) { span = document.createElement("span"); span.className = "tab-count"; btn.appendChild(span); }
  span.textContent = toPersianNum(count);
}

/* ══════════════════════════════
   KEYBOARD
══════════════════════════════ */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!detailModal.classList.contains("hidden"))  closeTaskDetail();
    else if (!taskModal.classList.contains("hidden")) closeModal();
    else if (!profileModal.classList.contains("hidden")) closeProfileModal();
  }
  /* Ctrl/Cmd + K → focus search */
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    searchInput?.focus();
  }
});

/* ══════════════════════════════
   BOOT
══════════════════════════════ */
loadUser();
loadTasks();
fetchAllStats();