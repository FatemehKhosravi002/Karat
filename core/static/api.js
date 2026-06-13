// ─────────────────────────────────────────────
//  api.js  –  all HTTP calls in one place
// ─────────────────────────────────────────────

const API_BASE = '';   // same origin

function getToken() { return localStorage.getItem('access_token'); }
function getRefresh() { return localStorage.getItem('refresh_token'); }
function saveTokens(access, refresh) {
  localStorage.setItem('access_token', access);
  if (refresh) localStorage.setItem('refresh_token', refresh);
}
function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}
function isLoggedIn() { return !!getToken(); }

async function request(method, path, body = null, retry = true) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  let res = await fetch(API_BASE + path, opts);

  // Try token refresh once on 401
  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request(method, path, body, false);
    clearTokens();
    window.location.href = '/login/';
    return null;
  }
  return res;
}

async function tryRefresh() {
  const refresh = getRefresh();
  if (!refresh) return false;
  const res = await fetch(API_BASE + '/account/token/refresh/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh })
  });
  if (res.ok) {
    const data = await res.json();
    saveTokens(data.access, null);
    return true;
  }
  return false;
}

// Convenience helpers
async function apiGet(path)         { return request('GET',    path); }
async function apiPost(path, body)  { return request('POST',   path, body); }
async function apiPatch(path, body) { return request('PATCH',  path, body); }
async function apiDelete(path)      { return request('DELETE', path); }

// ── Auth ─────────────────────────────────────
async function login(username, password) {
  const res = await fetch('/account/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (res.ok) { saveTokens(data.access, data.refresh); return { ok: true }; }
  return { ok: false, error: data.detail || 'Invalid credentials' };
}

async function register(name, username, password) {
  const res = await fetch('/account/register/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, username, password })
  });
  const data = await res.json();
  return { ok: res.ok, data, status: res.status };
}

async function getProfile() {
  const res = await apiGet('/account/me/');
  return res && res.ok ? res.json() : null;
}

async function updateProfile(body) {
  const res = await apiPatch('/account/me/', body);
  return { ok: res && res.ok, data: res ? await res.json() : {} };
}

async function changePassword(old_password, new_password1, new_password2) {
  const res = await apiPost('/account/me/change-password/', { old_password, new_password1, new_password2 });
  const data = res ? await res.json() : {};
  return { ok: res && res.ok, data };
}

// ── Tasks ────────────────────────────────────
async function getTasks(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await apiGet('/tasks/' + (qs ? '?' + qs : ''));
  return res && res.ok ? res.json() : [];
}

async function getTask(pk) {
  const res = await apiGet('/tasks/' + pk + '/');
  return res && res.ok ? res.json() : null;
}

async function createTask(body) {
  const res = await apiPost('/tasks/', body);
  const data = res ? await res.json() : {};
  return { ok: res && res.ok, data };
}

async function updateTask(pk, body) {
  const res = await apiPatch('/tasks/' + pk + '/', body);
  const data = res ? await res.json() : {};
  return { ok: res && res.ok, data };
}

async function deleteTask(pk) {
  const res = await apiDelete('/tasks/' + pk + '/');
  return res && res.ok;
}

async function getCompletedTasks() {
  const res = await apiGet('/tasks/completed/');
  return res && res.ok ? res.json() : { count: 0, tasks: [] };
}

// ── Tags ─────────────────────────────────────
async function getTags() {
  const res = await apiGet('/tags/');
  return res && res.ok ? res.json() : [];
}

async function createTag(body) {
  const res = await apiPost('/tags/', body);
  const data = res ? await res.json() : {};
  return { ok: res && res.ok, data };
}

async function updateTag(pk, body) {
  const res = await apiPatch('/tags/' + pk + '/', body);
  const data = res ? await res.json() : {};
  return { ok: res && res.ok, data };
}

async function deleteTag(pk) {
  const res = await apiDelete('/tags/' + pk + '/');
  return res && (res.ok || res.status === 204);
}