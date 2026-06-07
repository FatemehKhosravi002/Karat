if (!Auth.isLoggedIn()) {
  window.location.href = "/login/";
}

const PRIORITY = {
  1: { label: "کم‌اهمیت", emoji: "🌿", cls: "low" },
  2: { label: "معمولی", emoji: "☕", cls: "medium" },
  3: { label: "فوری", emoji: "🔥", cls: "high" },
};

const ROAD_LINES = [
  "هر قدم کوچیک، یه‌قدمه به جلو 🛤️",
  "جاده‌ی زندگی رو تو خودت می‌سازی 🌄",
  "آروم برو، ولی برو 🚗",
  "امروز هم از خودت ممنون باش 💛",
  "کارهات رو بزن، بعد استراحت کن ✨",
];

const TAB_ENDPOINTS = {
  active:    "/tasks/",
  completed: "/tasks/completed/",
  deleted:   "/tasks/deleted/",
};

let tasks = [];
let editingId = null;
let currentUser = null;
let currentTab = "active";
let selectedTag = "";

const taskList     = document.getElementById("taskList");
const taskModal    = document.getElementById("taskModal");
const taskForm     = document.getElementById("taskForm");
const roadBar      = document.getElementById("funBar");
const profileModal = document.getElementById("profileModal");
const profileForm  = document.getElementById("profileForm");
const tagFilter    = document.getElementById("tagFilter");

/* ── bootstrap ── */
document.getElementById("logoutBtn").addEventListener("click", () => Auth.logout());
document.getElementById("addBtn").addEventListener("click", () => openCreateModal());
document.getElementById("cancelBtn").addEventListener("click", closeModal);
document.getElementById("modalBackdrop").addEventListener("click", closeModal);
document.getElementById("profileBtn").addEventListener("click", openProfileModal);
document.getElementById("profileCancelBtn").addEventListener("click", closeProfileModal);
document.getElementById("profileBackdrop").addEventListener("click", closeProfileModal);

taskForm.addEventListener("submit", (e) => { e.preventDefault(); saveTask(); });
profileForm.addEventListener("submit", (e) => { e.preventDefault(); saveProfile(); });

document.querySelectorAll(".task-tab").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

/* ── helpers ── */
function toPersianNum(n) {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function showToast(msg, isError = false) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast" + (isError ? " toast-error" : "");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.className = "toast hidden", 2800);
}

function formatJalaliDate(str) {
  return Jalali.format(str);
}

function filteredTasks() {
  if (!selectedTag) return tasks;
  return tasks.filter((t) => t.tag === selectedTag);
}

function collectTags(list) {
  const tags = new Set();
  list.forEach((t) => { if (t.tag) tags.add(t.tag); });
  return [...tags].sort((a, b) => a.localeCompare(b, "fa"));
}

/* ── Jalali date picker ── */
const hasDue    = document.getElementById("hasDue");
const dueFields = document.getElementById("dueFields");
const dueYear   = document.getElementById("dueYear");
const dueMonth  = document.getElementById("dueMonth");
const dueDay    = document.getElementById("dueDay");
const dueHour   = document.getElementById("dueHour");
const dueMinute = document.getElementById("dueMinute");

function initJalaliSelects() {
  const now = Jalali.nowJalali();
  dueYear.innerHTML = "";
  for (let y = now.jy; y <= now.jy + 2; y++) {
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
  const jy  = parseInt(dueYear.value, 10);
  const jm  = parseInt(dueMonth.value, 10);
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
  dueYear.value  = String(j.jy);
  dueMonth.value = String(j.jm);
  updateDayOptions();
  dueDay.value    = String(j.jd);
  dueHour.value   = String(d.getHours());
  dueMinute.value = String(Math.floor(d.getMinutes() / 5) * 5);
}

function clearDueFields() {
  hasDue.checked = false;
  dueFields.classList.add("hidden");
  const now = Jalali.nowJalali();
  dueYear.value  = String(now.jy);
  dueMonth.value = String(now.jm);
  updateDayOptions();
  dueDay.value    = String(now.jd);
  dueHour.value   = "12";
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

/* ── API calls ── */
async function fetchTasksForTab(tab) {
  const res = await Auth.api(TAB_ENDPOINTS[tab]);
  if (!res.ok) throw new Error("load");
  const data = await res.json();
  if (tab === "completed") return data.tasks || [];
  return data;
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

async function updateTask(id, data, method = "PATCH") {
  const res = await Auth.api(`/tasks/${id}/`, {
    method,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

async function deleteTask(id) {
  const res = await Auth.api(`/tasks/${id}/`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("delete");
}

/* ── Tab switching ── */
function switchTab(tab) {
  if (tab === currentTab) return;
  currentTab = tab;
  selectedTag = "";
  document.querySelectorAll(".task-tab").forEach((btn) => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  loadTasks();
}

/* ── UI helpers ── */
function showLoading() {
  taskList.innerHTML = `
    <div class="empty">
      <div class="empty-icon road-anim">🚗</div>
      <p>داره جاده رو نقشه می‌کشه…</p>
    </div>`;
}

function updateRoadBar() {
  if (tasks.length === 0) {
    roadBar.textContent = "▶ جاده خالیه — اولین کارت رو بذار روی نقشه ◀";
  } else {
    roadBar.textContent = "▶ " + ROAD_LINES[Math.floor(Math.random() * ROAD_LINES.length)] + " ◀";
  }
  document.getElementById("taskCount").textContent = toPersianNum(filteredTasks().length);
}

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

  addChip("همه", "");
  tags.forEach((tag) => addChip(tag, tag));
  tagFilter.classList.toggle("hidden", tags.length === 0);
}

/* ── Modal: create / edit task ── */
function openCreateModal() {
  editingId = null;
  document.getElementById("modalTitle").textContent = "▸ کار جدید ✨";
  document.getElementById("taskTitle").value = "";
  document.getElementById("taskDesc").value  = "";
  clearDueFields();
  document.getElementById("taskPriority").value = "2";
  document.getElementById("taskDuration").value = "short";
  document.getElementById("taskTag").value = "";
  taskModal.classList.remove("hidden");
  setTimeout(() => document.getElementById("taskTitle").focus(), 50);
}

async function openEditModal(id) {
  editingId = id;
  document.getElementById("modalTitle").textContent = "▸ ویرایش کار ✏️";
  taskModal.classList.remove("hidden");
  try {
    const task = await fetchTask(id);
    document.getElementById("taskTitle").value    = task.title || "";
    document.getElementById("taskDesc").value     = task.description || "";
    setDueFromTask(task);
    document.getElementById("taskPriority").value = String(task.priority || 2);
    document.getElementById("taskDuration").value = task.duration_type || "short";
    document.getElementById("taskTag").value      = task.tag || "";
    setTimeout(() => document.getElementById("taskTitle").focus(), 50);
  } catch {
    closeModal();
    showToast("خطا در بارگذاری کار 😕", true);
  }
}

function closeModal() {
  taskModal.classList.add("hidden");
  editingId = null;
}

function buildPayload() {
  const title       = document.getElementById("taskTitle").value.trim();
  const description = document.getElementById("taskDesc").value.trim();
  const priority    = parseInt(document.getElementById("taskPriority").value, 10);
  const duration_type = document.getElementById("taskDuration").value;
  const tagRaw      = document.getElementById("taskTag").value.trim();
  const payload     = { title, priority, duration_type };

  /* Only send description if it has content — avoids null validation errors */
  if (description) payload.description = description;
  if (tagRaw) payload.tag = tagRaw;

  if (hasDue.checked) {
    payload.due_date = Jalali.toISO(
      parseInt(dueYear.value, 10),
      parseInt(dueMonth.value, 10),
      parseInt(dueDay.value, 10),
      parseInt(dueHour.value, 10),
      parseInt(dueMinute.value, 10),
    );
  }
  /* don't send due_date: null — just omit it to avoid serializer issues */

  return payload;
}

async function saveTask() {
  const payload = buildPayload();
  if (!payload.title) {
    showToast("عنوان رو بنویس لطفاً 🙏", true);
    return;
  }
  const btn = document.getElementById("saveBtn");
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
  } catch (e) {
    console.error("saveTask error:", e.message);
    showToast("ذخیره نشد — دوباره تلاش کن 😕", true);
  } finally {
    btn.disabled  = false;
    btn.textContent = "[ ذخیره ]";
  }
}

/* ── Profile modal ── */
function openProfileModal() {
  if (!currentUser) return;
  document.getElementById("profileName").value     = currentUser.name || "";
  document.getElementById("profileUsername").value = currentUser.username || "";
  document.getElementById("profilePassword").value = "";
  document.getElementById("profileError").textContent = "";
  document.getElementById("profileError").classList.add("hidden");
  profileModal.classList.remove("hidden");
  setTimeout(() => document.getElementById("profileName").focus(), 50);
}

function closeProfileModal() {
  profileModal.classList.add("hidden");
}

async function saveProfile() {
  const name     = document.getElementById("profileName").value.trim();
  const username = document.getElementById("profileUsername").value.trim();
  const password = document.getElementById("profilePassword").value;

  if (!name || !username) {
    showProfileError("نام و نام کاربری اجباریه");
    return;
  }

  const payload = { name, username };
  if (password) payload.password = password;

  const btn = document.getElementById("profileSaveBtn");
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
    document.getElementById("userGreeting").textContent = `سلام ${currentUser.name} 👋`;
    closeProfileModal();
    showToast("پروفایل به‌روز شد! ✅");
  } catch {
    showProfileError("خطا در اتصال به سرور");
  } finally {
    btn.disabled = false;
  }
}

function showProfileError(msg) {
  const el = document.getElementById("profileError");
  el.textContent = msg;
  el.classList.remove("hidden");
}

/* ── Delete confirm ── */
async function removeTask(task) {
  if (!confirm(`«${task.title}» حذف بشه؟`)) return;
  try {
    await deleteTask(task.id);
    showToast("حذف شد 🗑️");
    await loadTasks();
  } catch {
    showToast("خطا در حذف 😕", true);
  }
}

async function toggleComplete(task) {
  try {
    await updateTask(task.id, { is_completed: !task.is_completed });
    await loadTasks();
  } catch {
    showToast("خطا در به‌روزرسانی 😕", true);
  }
}

async function restoreTask(task) {
  try {
    await updateTask(task.id, { is_deleted: false });
    await loadTasks();
  } catch {
    showToast("خطا در به‌روزرسانی 😕", true);
  }
}

/* ── Render ── */
function buildTaskCard(task) {
  const p   = PRIORITY[task.priority] || PRIORITY[2];
  const due = formatJalaliDate(task.due_date);
  const isDone = task.is_completed;
  const isDeleted = currentTab === "deleted";

  const el = document.createElement("div");
  el.className = `task priority-${p.cls}${isDone ? " completed" : ""}`;
  el.innerHTML = `
    ${isDeleted ? "" : `<button type="button" class="complete-circle${isDone ? " done" : ""}" title="is_completed" aria-label="is_completed"></button>`}
    <div class="task-body">
      <span class="task-title">${escapeHtml(task.title)}</span>
      ${task.description ? `<span class="task-desc">${escapeHtml(task.description)}</span>` : ""}
      <div class="task-meta">
        <span class="badge ${p.cls}">${p.emoji} ${p.label}</span>
        ${due ? `<span class="badge date">📅 ${due}</span>` : ""}
        ${task.tag ? `<span class="badge tag">🏷️ ${escapeHtml(task.tag)}</span>` : ""}
      </div>
    </div>
    <div class="task-actions">
      ${isDeleted
        ? `<button class="btn-icon restore restore-btn" type="button" title="is_deleted">↩</button>`
        : `<button class="btn-icon edit edit-btn" type="button" title="ویرایش">✎</button>
           <button class="btn-icon del del-btn" type="button" title="حذف">✕</button>`}
    </div>
  `;

  if (isDeleted) {
    el.querySelector(".restore-btn").addEventListener("click", () => restoreTask(task));
  } else {
    el.querySelector(".complete-circle").addEventListener("click", () => toggleComplete(task));
    el.querySelector(".edit-btn").addEventListener("click", () => openEditModal(task.id));
    el.querySelector(".del-btn").addEventListener("click", () => removeTask(task));
  }


  return el;
}

function renderSection(title, sectionTasks, container) {
  if (sectionTasks.length === 0) return;

  const section = document.createElement("div");
  section.className = "task-section";
  section.innerHTML = `
    <h3 class="section-title">${title}
      <span class="section-count">${toPersianNum(sectionTasks.length)}</span>
    </h3>
  `;
  const list = document.createElement("div");
  list.className = "section-tasks";
  sectionTasks.forEach((task) => list.appendChild(buildTaskCard(task)));
  section.appendChild(list);
  container.appendChild(section);
}

function renderTasks() {
  taskList.innerHTML = "";
  const visible = filteredTasks();

  if (visible.length === 0) {
    taskList.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🛤️</div>
        <p class="empty-title">جاده‌ات هنوز خالیه!</p>
        <p class="empty-sub">اولین کارت رو بذار روی نقشه تا سفر شروع بشه 🚗</p>
      </div>`;
    return;
  }

  const shortTasks = visible.filter((t) => (t.duration_type || "short") === "short");
  const longTasks  = visible.filter((t) => t.duration_type === "long");

  renderSection("Short", shortTasks, taskList);
  renderSection("Long", longTasks, taskList);
}

/* ── Load ── */
async function loadUser() {
  try {
    const res = await Auth.api("/account/me/");
    if (!res.ok) return;
    currentUser = await res.json();
    document.getElementById("userGreeting").textContent = `سلام ${currentUser.name} 👋`;
  } catch { /* api.js handles redirect */ }
}

async function loadTasks() {
  showLoading();
  try {
    tasks = await fetchTasksForTab(currentTab);
    renderTagFilter();
    renderTasks();
    updateRoadBar();
  } catch {
    taskList.innerHTML = `
      <div class="empty">
        <div class="empty-icon">😅</div>
        <p class="empty-title">نتونستم کارها رو بیارم</p>
        <p class="empty-sub">یه بار دیگه صفحه رو رفرش کن</p>
      </div>`;
  }
}

/* ── Keyboard ── */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!taskModal.classList.contains("hidden"))    closeModal();
    if (!profileModal.classList.contains("hidden")) closeProfileModal();
  }
});

loadUser();
loadTasks();
