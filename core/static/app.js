// ─────────────────────────────────────────────
//  app.js  –  UI rendering & page logic (ba Karat)
// ─────────────────────────────────────────────

// ── Guard: redirect to login if not authenticated ──
function requireAuth() {
  if (!isLoggedIn()) { window.location.href = '/login/'; }
}
function requireGuest() {
  if (isLoggedIn()) { window.location.href = '/'; }
}

// ── Toast notifications ──────────────────────
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;direction:rtl;font-family:inherit;';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const colors = { success: '#22c55e', error: '#ef4444', info: '#5b6ee8', warning: '#f59e0b' };
  toast.style.cssText = `
    background:#fff; border-right:4px solid ${colors[type]||colors.info};
    border-radius:10px; padding:12px 18px; font-size:14px; font-weight:500;
    box-shadow:0 4px 20px rgba(0,0,0,.12); max-width:320px;
    animation: slideIn 0.3s ease forwards; text-align: right;
  `;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── Loader / Spinner state ───────────────────
function setLoading(buttonEl, isLoading) {
  if (!buttonEl) return;
  if (isLoading) {
    buttonEl.dataset.originalHtml = buttonEl.innerHTML;
    buttonEl.disabled = true;
    buttonEl.innerHTML = '<span class="spinner"></span>';
  } else {
    if (buttonEl.dataset.originalHtml) {
      buttonEl.innerHTML = buttonEl.dataset.originalHtml;
    }
    buttonEl.disabled = false;
  }
}

// ── Shared UI Helpers ────────────────────────
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function priorityBadge(level) {
  const cfg = {
    3: { txt: 'فوری', cls: 'badge-high' },
    2: { txt: 'متوسط', cls: 'badge-medium' },
    1: { txt: 'کم', cls: 'badge-low' }
  };
  const item = cfg[level] || cfg[2];
  return `<span class="badge-priority ${item.cls}">${item.txt}</span>`;
}

// Convert dates explicitly to Persian Jalali format
function fmtDate(isoStr) {
  if (!isoStr) return '—';
  if (typeof Jalali !== 'undefined' && Jalali.format) {
    const formatted = Jalali.format(isoStr);
    return formatted ? formatted : isoStr;
  }
  return new Date(isoStr).toLocaleDateString('fa-IR');
}

// Component markup rendering logic
function taskCardHTML(t) {
  const tagsHtml = (t.tags || []).map(tg => `
    <span class="task-tag" style="background:${tg.color}18; color:${tg.color}; border: 1px solid ${tg.color}33;">
      ${escHtml(tg.name)}
    </span>
  `).join('');

  return `
    <div class="task-card ${t.is_completed ? 'completed' : ''}" id="task-card-${t.id}">
      <button class="task-check ${t.is_completed ? 'checked' : ''}" onclick="toggleComplete(${t.id}, ${t.is_completed})" title="تغییر وضعیت انجام">
        ${t.is_completed ? '<i class="bi bi-check"></i>' : ''}
      </button>
      <div class="task-card-content" onclick="window.location.href='/tasks/${t.id}/'">
        <div class="d-flex align-items-center justify-content-between mb-1">
          <h4 class="task-title">${escHtml(t.title)}</h4>
          ${priorityBadge(t.priority)}
        </div>
        ${t.description ? `<p class="task-desc">${escHtml(t.description)}</p>` : ''}
        <div class="d-flex align-items-center justify-content-between mt-3 flex-wrap gap-2">
          <div class="d-flex align-items-center gap-2">${tagsHtml}</div>
          <div class="task-date"><i class="bi bi-calendar3 me-1"></i>${fmtDate(t.created_at)}</div>
        </div>
      </div>
      <div class="task-card-actions">
        <button class="task-action-btn" onclick='openEditModal(${JSON.stringify(t)})' title="ویرایش"><i class="bi bi-pencil"></i></button>
        <button class="task-action-btn del" onclick="confirmDelete(${t.id})" title="حذف"><i class="bi bi-trash3"></i></button>
      </div>
    </div>
  `;
}

// ── Actions ──────────────────────────────────
async function toggleComplete(pk, currentStatus) {
  const targetStatus = !currentStatus;
  const res = await updateTask(pk, { is_completed: targetStatus });
  if (res.ok) {
    showToast(targetStatus ? 'وظیفه با موفقیت انجام شد 🎉' : 'وضعیت وظیفه به فعال تغییر یافت', 'success');
    if (typeof reloadPage === 'function') reloadPage();
  } else {
    showToast('خطا در به روزرسانی وضعیت وظیفه', 'error');
  }
}

async function confirmDelete(pk) {
  if (!confirm('آیا از انتقال این وظیفه به زباله‌دان اطمینان دارید؟')) return;
  const res = await updateTask(pk, { is_deleted: true });
  if (res.ok) {
    showToast('وظیفه به زباله‌دان منتقل شد', 'info');
    if (typeof reloadPage === 'function') reloadPage();
  } else {
    showToast('خطا در حذف وظیفه', 'error');
  }
}

// ── Modals Handling ──────────────────────────
function openCreateModal() {
  const form = document.getElementById('taskForm');
  if (!form) return;
  form.reset();
  form.dataset.action = 'create';
  delete form.dataset.pk;
  document.getElementById('taskModalTitle').textContent = 'ایجاد وظیفه جدید';
  
  // Clean tag options selections
  document.querySelectorAll('#modal-tags-container input[type=checkbox]').forEach(cb => cb.checked = false);

  const modalEl = document.getElementById('taskModal');
  const modal = window.bootstrap?.Modal?.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  modal.show();
}

function openEditModal(task) {
  const form = document.getElementById('taskForm');
  if (!form) return;
  form.reset();
  form.dataset.action = 'edit';
  form.dataset.pk = task.id;

  document.getElementById('taskModalTitle').textContent = 'ویرایش وظیفه';
  document.getElementById('task-title-input').value = task.title;
  document.getElementById('task-desc-input').value = task.description || '';
  document.getElementById('task-priority-input').value = task.priority || 2;
  document.getElementById('task-duration-input').value = task.duration_type || 'short';

  if (task.due_date) {
    document.getElementById('task-due-input').value = task.due_date.substring(0, 10);
  }

  // Set checkbox selections safely based on current tag configuration profiles
  document.querySelectorAll('#modal-tags-container input[type=checkbox]').forEach(cb => {
    const matched = (task.tags || []).some(t => String(t.name).trim() === String(cb.value).trim());
    cb.checked = matched;
  });

  const modalEl = document.getElementById('taskModal');
  const modal = window.bootstrap?.Modal?.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  modal.show();
}

// Initialize Dynamic Configuration Hooks
document.addEventListener('DOMContentLoaded', () => {
  // Setup Dynamic Modal tags loading when modal opens
  const taskModalEl = document.getElementById('taskModal');
  if (taskModalEl) {
    taskModalEl.addEventListener('show.bs.modal', async () => {
      const container = document.getElementById('modal-tags-container');
      if (!container) return;
      const tags = await getTags();
      if (!tags.length) {
        container.innerHTML = '<p class="text-muted small mb-0">هیچ برچسبی یافت نشد. ابتدا برچسب بسازید.</p>';
        return;
      }
      
      // Cache current values
      const checkedNames = Array.from(container.querySelectorAll('input[type=checkbox]:checked')).map(cb => cb.value);
      const activeForm = document.getElementById('taskForm');
      
      container.innerHTML = tags.map(t => `
        <label class="tag-check-label" style="background:${t.color}12; color:${t.color}; border:1px solid ${t.color}33;">
          <input type="checkbox" value="${escHtml(t.name)}" data-color="${t.color}" ${checkedNames.includes(t.name) ? 'checked' : ''}>
          <span>${escHtml(t.name)}</span>
        </label>
      `).join('');

      // Re-apply values if editing 
      if (activeForm && activeForm.dataset.action === 'edit' && window.location.pathname.includes('/tasks/')) {
        const pk = activeForm.dataset.pk;
        const currentTask = await getTask(pk);
        if (currentTask && currentTask.tags) {
          container.querySelectorAll('input[type=checkbox]').forEach(cb => {
            cb.checked = currentTask.tags.some(tg => tg.name === cb.value);
          });
        }
      }
    });
  }

  // Handle centralized form processing setup
  const taskForm = document.getElementById('taskForm');
  if (taskForm) {
    taskForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const action = this.dataset.action;
      const pk = this.dataset.pk;
      const submitBtn = this.querySelector('[type=submit]');

      const title = document.getElementById('task-title-input').value.trim();
      const description = document.getElementById('task-desc-input').value.trim();
      const priority = parseInt(document.getElementById('task-priority-input').value) || 2;
      const duration_type = document.getElementById('task-duration-input').value;
      const due_input = document.getElementById('task-due-input').value;
      const due_date = due_input ? new Date(due_input).toISOString() : null;

      if (!title) {
        showToast('لطفاً عنوان وظیفه را وارد کنید', 'warning');
        return;
      }

      // Read selected tags from dynamic interface wrappers and properly map objects format
      const tags = [];
      document.querySelectorAll('#modal-tags-container input[type=checkbox]:checked').forEach(cb => {
        tags.push({ name: cb.value, color: cb.dataset.color || '#808080' });
      });

      const payload = { title, description, priority, duration_type, due_date, tags };

      setLoading(submitBtn, true);
      let res;
      if (action === 'create') {
        res = await createTask(payload);
      } else {
        res = await updateTask(pk, payload);
      }
      setLoading(submitBtn, false);

      if (res.ok) {
        const modalInstance = window.bootstrap?.Modal?.getInstance(document.getElementById('taskModal'));
        if (modalInstance) modalInstance.hide();
        showToast(action === 'create' ? 'وظیفه با موفقیت ایجاد شد ✨' : 'تغییرات با موفقیت ذخیره شد', 'success');
        
        // Dynamic reload strategy 
        if (typeof reloadPage === 'function') {
          reloadPage();
        } else {
          window.location.reload();
        }
      } else {
        const errMsg = Object.values(res.data || {}).flat().join(' ') || 'عملیات با خطا مواجه شد';
        showToast(errMsg, 'error');
      }
    });
  }
});

// ── Active Navigation State Maintenance ───────
function setActiveSidebarLink() {
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  
  document.querySelectorAll('.sidebar-link').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    
    // Evaluate precise matching routes including structural filter parameters
    if (href === currentPath + currentSearch || href === currentPath) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });
}

// ── Populate Profile UI elements ──────────────
async function populateUserUI() {
  const user = await getProfile();
  if (!user) return null;
  const initials = (user.name || user.username || '?')[0].toUpperCase();
  document.querySelectorAll('.user-avatar').forEach(el => el.textContent = initials);
  document.querySelectorAll('.user-name').forEach(el => el.textContent = user.name || user.username);
  document.querySelectorAll('.user-username').forEach(el => el.textContent = '@' + user.username);
  return user;
}

function logout() {
  clearTokens();
  window.location.href = '/login/';
}

// Inject Dynamic Animations Styles
(function injectAnimations() {
  if (document.getElementById('ba-karat-animations')) return;
  const s = document.createElement('style');
  s.id = 'ba-karat-animations';
  s.textContent = `
    .spinner { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; border-radius:50%; animation:spin .6s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    @keyframes slideIn { from { transform: translateY(20px); opacity:0; } to { transform: translateY(0); opacity:1; } }
    @keyframes slideOut { from { transform: translateY(0); opacity:1; } to { transform: translateY(20px); opacity:0; } }
    .tag-check-label { display:inline-flex; align-items:center; gap:6px; cursor:pointer; padding:4px 10px; border-radius:6px; font-size:13px; transition: all 0.2s; user-select:none; }
    .tag-check-label input { margin: 0; cursor: pointer; }
    .tag-check-label:hover { opacity: 0.85; }
  `;
  document.head.appendChild(s);
})();

window.refreshTasks = async function () {
  if (typeof loadTasks === 'function') {
    await loadTasks();
  } else {
    window.location.reload();
  }
};