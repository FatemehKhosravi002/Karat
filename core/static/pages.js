// ─────────────────────────────────────────────
//  pages.js  –  ba Karat view render engine
// ─────────────────────────────────────────────

function setTitle(t) {
  document.title = t + ' — باکارات';
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = t;
}

function renderSkeleton() {
  const contentEl = document.getElementById('content');
  if (!contentEl) return;
  contentEl.innerHTML = `
    <div style="padding:28px; direction: rtl;">
      ${[1,2,3].map(()=>`
        <div style="background:#fff; border:1px solid var(--border); border-radius:10px; padding:18px; margin-bottom:12px; animation:pulse 1.2s ease infinite;">
          <div style="background:var(--border); border-radius:6px; height:16px; width:40%; margin-bottom:12px;"></div>
          <div style="background:var(--border); border-radius:6px; height:12px; width:75%;"></div>
        </div>`).join('')}
    </div>`;
  if (!document.getElementById('pulse-skeleton-style')) {
    const s = document.createElement('style');
    s.id = 'pulse-skeleton-style';
    s.textContent = '@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}';
    document.head.appendChild(s);
  }
}

// ── Router Setup ──────────────────────────────
function routePage() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const contentEl = document.getElementById('content');
  if (!contentEl) return;

  // Render context validation
  if (path === '/' || path === '') return renderDashboard();
  if (path === '/tasks/') return renderTaskList(params);
  if (path === '/tasks/completed/') return renderCompleted();
  
  const taskMatch = path.match(/^\/tasks\/(\d+)\/$/);
  if (taskMatch) return renderTaskDetail(taskMatch[1]);
  
  if (path === '/tags/') return renderTagList();
  
  const tagMatch = path.match(/^\/tags\/(\d+)\/$/);
  if (tagMatch) return renderTagDetail(tagMatch[1]);
  
  if (path === '/account/me/') return renderProfile();
  if (path === '/account/me/change-password/') return renderChangePassword();

  contentEl.innerHTML = `
    <div class="empty-state" style="direction:rtl;">
      <i class="bi bi-question-circle" style="font-size: 40px; color: var(--text-muted);"></i>
      <p style="margin-top:15px; font-weight:500;">صفحه مورد نظر یافت نشد.</p>
    </div>`;
}

function reloadPage() { routePage(); }

// ═══════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════
async function renderDashboard() {
  setTitle('داشبورد مدیریت');
  renderSkeleton();

  const [allTasks, completedData, tags] = await Promise.all([
    getTasks(),
    getCompletedTasks(),
    getTags()
  ]);

  const total = allTasks.length;
  const completed = completedData.count || allTasks.filter(t => t.is_completed).length;
  const active = allTasks.filter(t => !t.is_completed && !t.is_deleted).length;
  const highPri = allTasks.filter(t => t.priority === 3 && !t.is_deleted).length;
  const medPri = allTasks.filter(t => t.priority === 2 && !t.is_deleted).length;
  const lowPri = allTasks.filter(t => t.priority === 1 && !t.is_deleted).length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  const recent = allTasks.filter(t => !t.is_deleted).slice(0, 6);
  const hour = new Date().getHours();
  let greeting = 'روز بخیر';
  if (hour < 11) greeting = 'صبح بخیر';
  else if (hour < 16) greeting = 'ظهر بخیر';
  else if (hour < 19) greeting = 'عصر بخیر';
  else greeting = 'شب بخیر';

  const user = await getProfile();
  const displayName = user ? (user.name || user.username) : 'کاربر عزیز';

  const contentEl = document.getElementById('content');
  if (!contentEl) return;

  // Generate Persian localized current weekday presentation
  let localizedDateText = '';
  if (typeof Jalali !== 'undefined') {
    const now = new Date();
    const jNow = Jalali.fromDate(now);
    const jWeekdays = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
    const currentDayName = jWeekdays[now.getDay()];
    const currentMonthName = Jalali.PERSIAN_MONTHS[jNow.jm - 1];
    localizedDateText = `${currentDayName}، ${Jalali.toPersianNum(jNow.jd)} ${currentMonthName} ${Jalali.toPersianNum(jNow.jy)}`;
  } else {
    localizedDateText = new Date().toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  contentEl.innerHTML = `
  <div class="dashboard-wrap" style="direction: rtl; text-align: right;">
    <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
      <div>
        <h2 style="font-size:22px; font-weight:700; margin:0;">${greeting}، ${escHtml(displayName)} 👋</h2>
        <p class="mb-0" style="font-size:13.5px; color:var(--text-muted); margin-top:4px;">${localizedDateText} — بیایید امروز را به روزی پربار تبدیل کنیم.</p>
      </div>
      <button class="btn btn-primary d-flex align-items-center gap-2 px-3 py-2" onclick="openCreateModal()">
        <i class="bi bi-plus-lg"></i> ایجاد وظیفه جدید
      </button>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3">
        <div class="stat-card">
          <div class="stat-icon" style="background:#eef0fd; color:var(--primary);"><i class="bi bi-list-task"></i></div>
          <div class="stat-value" style="color:var(--primary);">${typeof Jalali !== 'undefined' ? Jalali.toPersianNum(total) : total}</div>
          <div class="stat-label">کل وظایف</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="stat-card">
          <div class="stat-icon" style="background:#dcfce7; color:#16a34a;"><i class="bi bi-check2-circle"></i></div>
          <div class="stat-value" style="color:#16a34a;">${typeof Jalali !== 'undefined' ? Jalali.toPersianNum(completed) : completed}</div>
          <div class="stat-label">انجام شده</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="stat-card">
          <div class="stat-icon" style="background:#fef3c7; color:#d97706;"><i class="bi bi-clock"></i></div>
          <div class="stat-value" style="color:#d97706;">${typeof Jalali !== 'undefined' ? Jalali.toPersianNum(active) : active}</div>
          <div class="stat-label">در جریان</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="stat-card">
          <div class="stat-icon" style="background:#fee2e2; color:#dc2626;"><i class="bi bi-exclamation-triangle"></i></div>
          <div class="stat-value" style="color:#dc2626;">${typeof Jalali !== 'undefined' ? Jalali.toPersianNum(highPri) : highPri}</div>
          <div class="stat-label">فوریت بالا</div>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-12 col-lg-8">
        <div class="card p-3 mb-4">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span style="font-size:14px; font-weight:600;">میزان پیشرفت برنامه‌ها</span>
            <span style="font-size:13px; color:var(--text-muted);">${typeof Jalali !== 'undefined' ? Jalali.toPersianNum(completed) : completed} از ${typeof Jalali !== 'undefined' ? Jalali.toPersianNum(total) : total} وظیفه</span>
          </div>
          <div class="progress-wrap"><div class="progress-fill" style="width:${pct}%; left: auto; right: 0;"></div></div>
        </div>

        <div class="section-title mb-3"><i class="bi bi-clock-history text-primary me-1"></i> وظایف اخیر</div>
        <div id="recent-task-list" class="d-flex flex-column gap-3">
          ${recent.length ? recent.map(t => taskCardHTML(t)).join('') : `
            <div class="empty-state bg-white border" style="padding: 40px 20px;">
              <i class="bi bi-clipboard-check" style="font-size: 32px; color: var(--text-muted);"></i>
              <p class="mt-2 text-muted">هنوز وظیفه‌ای ثبت نکرده‌اید. با دکمه بالا اولین مورد را بسازید!</p>
            </div>`}
        </div>
        ${total > 6 ? `<a href="/tasks/" class="btn btn-soft w-100 mt-3 py-2" style="font-size:13.5px;">مشاهده تمامی وظایف <i class="bi bi-arrow-left ms-1"></i></a>` : ''}
      </div>

      <div class="col-12 col-lg-4">
        <div class="card p-4 mb-3 text-white" style="background:linear-gradient(135deg, #5b6ee8, #7c3aed); border:none;">
          <div class="d-flex align-items-center gap-3 mb-2">
            <div style="font-size:32px;">🎯</div>
            <div>
              <div style="font-size:22px; font-weight:700;">${typeof Jalali !== 'undefined' ? Jalali.toPersianNum(completed) : completed} وظیفه</div>
              <div style="font-size:13px; opacity:0.85;">مجموع وظایف به پایان رسیده</div>
            </div>
          </div>
          <p class="mb-0 mt-2" style="font-size:13px; opacity:0.9; line-height:1.6;">تکمیل هر برنامه کوچک، قدمی بزرگ به سوی اهداف بزرگتر است. پرقدرت ادامه دهید.</p>
        </div>

        <div class="card p-3 mb-3">
          <div class="section-title mb-3">تفکیک اولویت‌ها</div>
          <div class="d-flex flex-column gap-2.5">
            <div class="d-flex justify-content-between align-items-center" style="font-size:13.5px;">
              <span style="color:var(--text-muted);"><i class="bi bi-circle-fill text-danger me-1" style="font-size:8px;"></i> فوریت بالا</span>
              <span class="badge-priority badge-high">${typeof Jalali !== 'undefined' ? Jalali.toPersianNum(highPri) : highPri} مورد</span>
            </div>
            <div class="d-flex justify-content-between align-items-center" style="font-size:13.5px;">
              <span style="color:var(--text-muted);"><i class="bi bi-circle-fill text-warning me-1" style="font-size:8px;"></i> فوریت متوسط</span>
              <span class="badge-priority badge-medium">${typeof Jalali !== 'undefined' ? Jalali.toPersianNum(medPri) : medPri} مورد</span>
            </div>
            <div class="d-flex justify-content-between align-items-center" style="font-size:13.5px;">
              <span style="color:var(--text-muted);"><i class="bi bi-circle-fill text-info me-1" style="font-size:8px;"></i> فوریت کم</span>
              <span class="badge-priority badge-low">${typeof Jalali !== 'undefined' ? Jalali.toPersianNum(lowPri) : lowPri} مورد</span>
            </div>
            <hr style="margin:8px 0; border-color:var(--border);"/>
            <div class="d-flex justify-content-between align-items-center" style="font-size:13.5px;">
              <span style="color:var(--text-muted); font-weight:500;">نرخ بهره‌وری کل</span>
              <span style="font-weight:700; color:var(--primary);">${typeof Jalali !== 'undefined' ? Jalali.toPersianNum(pct) : pct}٪</span>
            </div>
          </div>
        </div>

        <div class="card p-3">
          <div class="section-title mb-3"><i class="bi bi-tags text-primary me-1"></i> دسته‌بندی و برچسب‌ها</div>
          ${tags.length
            ? `<div class="d-flex flex-wrap gap-2">${tags.map(t=>`<a href="/tags/${t.id}/" class="task-tag py-1 px-2.5" style="background:${t.color}15; color:${t.color}; border: 1px solid ${t.color}25; text-decoration:none;">${escHtml(t.name)}</a>`).join('')}</div>
               <a href="/tags/" style="font-size:13px; color:var(--primary); text-decoration:none; display:block; margin-top:12px; font-weight:500;">مدیریت کامل برچسب‌ها ←</a>`
            : `<p style="font-size:13px; color:var(--text-muted); margin:0;">هنوز برچسبی تعریف نکرده‌اید. <a href="/tags/" style="color:var(--primary); font-weight:500;">ایجاد برچسب</a></p>`
          }
        </div>
      </div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════
//  TASK LIST
// ═══════════════════════════════════════════════
async function renderTaskList(params) {
  setTitle('لیست وظایف');
  renderSkeleton();

  const searchVal = params.get('search') || '';
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = searchVal;

  const apiParams = {};
  if (params.get('search'))       apiParams.search       = params.get('search');
  if (params.get('is_completed')) apiParams.is_completed = params.get('is_completed');
  if (params.get('is_deleted'))   apiParams.is_deleted   = params.get('is_deleted');
  if (params.get('created_at'))   apiParams.created_at   = params.get('created_at');

  const tasks = await getTasks(apiParams);
  const filterQS = params.toString();
  const contentEl = document.getElementById('content');
  if (!contentEl) return;

  const countDisplay = typeof Jalali !== 'undefined' ? Jalali.toPersianNum(tasks.length) : tasks.length;

  contentEl.innerHTML = `
  <div style="direction: rtl; text-align: right;">
    <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
      <div>
        <h2 style="font-size:22px; font-weight:700; margin:0;">لیست وظایف کاری</h2>
        <p class="mb-0" style="font-size:13.5px; color:var(--text-muted); margin-top:4px;">${countDisplay} وظیفه پیدا شد</p>
      </div>
      <button class="btn btn-primary d-flex align-items-center gap-2 px-3 py-2" onclick="openCreateModal()">
        <i class="bi bi-plus-lg"></i> وظیفه جدید
      </button>
    </div>

    <div class="card p-3 mb-4">
      <form id="filter-form" class="row g-2 align-items-end">
        <div class="col-12 col-sm-6 col-md-3">
          <label class="form-label mb-1" style="font-size:12.5px; color:var(--text-muted);">جستجوی متن عنوان</label>
          <input type="text" class="form-control form-control-sm py-1.5" name="search"
                 value="${escHtml(params.get('search')||'')}" placeholder="عنوان وظیفه..."/>
        </div>
        <div class="col-6 col-sm-3 col-md-2">
          <label class="form-label mb-1" style="font-size:12.5px; color:var(--text-muted);">وضعیت انجام</label>
          <select class="form-select form-select-sm py-1.5" name="is_completed">
            <option value="">همه</option>
            <option value="false" ${params.get('is_completed')==='false'?'selected':''}>در جریان</option>
            <option value="true"  ${params.get('is_completed')==='true' ?'selected':''}>کامل شده</option>
          </select>
        </div>
        <div class="col-6 col-sm-3 col-md-2">
          <label class="form-label mb-1" style="font-size:12.5px; color:var(--text-muted);">زباله‌دان</label>
          <select class="form-select form-select-sm py-1.5" name="is_deleted">
            <option value="false" ${params.get('is_deleted')==='false'||!params.get('is_deleted')?'selected':''}>اصلی</option>
            <option value="true" ${params.get('is_deleted')==='true'?'selected':''}>حذف شده‌ها</option>
          </select>
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <label class="form-label mb-1" style="font-size:12.5px; color:var(--text-muted);">تاریخ ایجاد</label>
          <input type="date" class="form-control form-control-sm py-1.5" name="created_at"
                 value="${params.get('created_at')||''}"/>
        </div>
        <div class="col-12 col-md-2 d-flex gap-2">
          <button type="submit" class="btn btn-soft btn-sm py-1.5 w-100"><i class="bi bi-funnel me-1"></i>اعمال</button>
          ${filterQS ? `<a href="/tasks/" class="btn btn-sm btn-outline-secondary py-1.5 w-100 text-center text-nowrap">پاک کردن</a>` : ''}
        </div>
      </form>
    </div>

    <div id="task-list-container" class="d-flex flex-column gap-3">
      ${tasks.length
        ? tasks.map(t => taskCardHTML(t)).join('')
        : `<div class="empty-state bg-white border py-5"><i class="bi bi-clipboard-x" style="font-size:36px;"></i><p class="text-muted mt-2">هیچ برنامه‌ای منطبق با فیلتر شما یافت نشد.</p></div>`
      }
    </div>
  </div>`;

  document.getElementById('filter-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const fd = new FormData(this);
    const p = new URLSearchParams();
    for (const [k, v] of fd.entries()) { if (v !== "") p.set(k, v); }
    window.location.href = '/tasks/' + (p.toString() ? '?' + p.toString() : '');
  });
}

// ═══════════════════════════════════════════════
//  TASK DETAIL
// ═══════════════════════════════════════════════
async function renderTaskDetail(pk) {
  setTitle('جزییات وظیفه');
  renderSkeleton();
  const task = await getTask(pk);
  const contentEl = document.getElementById('content');
  if (!contentEl) return;

  if (!task) { 
    contentEl.innerHTML = `
      <div class="empty-state border bg-white py-5" style="direction:rtl;">
        <i class="bi bi-exclamation-circle text-danger" style="font-size:36px;"></i>
        <p class="mt-2 text-muted">برنامه مورد نظر وجود ندارد یا دسترسی شما محدود شده است.</p>
      </div>`; 
    return; 
  }
  setTitle(task.title);

  const tags = (task.tags || []).map(t => `<span class="task-tag py-1 px-3" style="background:${t.color}15; color:${t.color}; border:1px solid ${t.color}33; font-size:13px;">${escHtml(t.name)}</span>`).join('');

  contentEl.innerHTML = `
  <div style="direction: rtl; text-align: right;">
    <div class="mb-3">
      <a href="/tasks/" class="text-muted text-decoration-none small"><i class="bi bi-arrow-right me-1"></i> بازگشت به لیست وظایف</a>
    </div>
    <div class="row g-4">
      <div class="col-12 col-lg-8">
        <div class="card p-4">
          <div class="d-flex align-items-start gap-3 mb-4">
            <button class="task-check ${task.is_completed?'checked':''}"
                    onclick="toggleComplete(${task.id}, ${task.is_completed})"
                    style="width:24px; height:24px; margin-top:3px; flex-shrink:0;">
              ${task.is_completed?'<i class="bi bi-check" style="font-size:14px;"></i>':''}
            </button>
            <div style="flex:1;">
              <h1 style="font-size:20px; font-weight:700; margin-bottom:12px; ${task.is_completed?'text-decoration:line-through; color:var(--text-muted);':''}">
                ${escHtml(task.title)}
              </h1>
              <div class="d-flex flex-wrap gap-2">
                ${priorityBadge(task.priority)}
                ${task.is_completed?'<span class="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1" style="font-size:11.5px; border-radius:20px;"><i class="bi bi-check-circle me-1"></i>انجام شده</span>':''}
                ${task.is_deleted?'<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2.5 py-1" style="font-size:11.5px; border-radius:20px;"><i class="bi bi-trash3 me-1"></i>در زباله‌دان</span>':''}
              </div>
            </div>
          </div>

          ${task.description ? `
            <div class="mb-4">
              <div class="section-title mb-2">یادداشت‌ها و توضیحات</div>
              <div style="font-size:14.5px; line-height:1.8; white-space:pre-wrap; background: #f8fafc; padding:15px; border-radius:8px; border:1px solid var(--border);">${escHtml(task.description)}</div>
            </div>` : ''}

          ${tags ? `<div class="mb-4"><div class="section-title mb-2">برچسب‌های تخصیص یافته</div><div class="d-flex flex-wrap gap-2">${tags}</div></div>` : ''}

          <div class="d-flex gap-2 flex-wrap pt-3 mt-4" style="border-top:1px solid var(--border);">
            <button class="btn btn-soft btn-sm px-3" onclick='openEditModal(${JSON.stringify(task)})'>
              <i class="bi bi-pencil me-1"></i> ویرایش محتوا
            </button>
            <button class="btn btn-sm px-3 ${task.is_completed?'btn-outline-secondary':'btn-outline-success'}"
                    onclick="toggleComplete(${task.id}, ${task.is_completed})">
              ${task.is_completed ? '<i class="bi bi-arrow-counterclockwise me-1"></i> تغییر به در جریان' : '<i class="bi bi-check2 me-1"></i> علامت‌گذاری به عنوان انجام شده'}
            </button>
            ${!task.is_deleted
              ? `<button class="btn btn-sm btn-outline-danger px-3" onclick="softDeleteAndRedirect(${task.id})">
                   <i class="bi bi-trash3 me-1"></i> انتقال به زباله‌دان
                 </button>`
              : `<button class="btn btn-sm btn-outline-secondary px-3" onclick="restoreTask(${task.id})">
                   <i class="bi bi-arrow-counterclockwise me-1"></i> بازیابی وظیفه
                 </button>`
            }
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-4">
        <div class="card p-3">
          <div class="section-title mb-3">اطلاعات زمان‌بندی</div>
          <dl style="margin:0; font-size:13.5px;">
            <div class="d-flex justify-content-between py-2.5" style="border-bottom:1px solid var(--border);">
              <dt style="font-weight:500; color:var(--text-muted);">تاریخ ایجاد</dt>
              <dd style="margin:0; font-weight:600;">${fmtDate(task.created_at)}</dd>
            </div>
            ${task.due_date?`<div class="d-flex justify-content-between py-2.5" style="border-bottom:1px solid var(--border);">
              <dt style="font-weight:500; color:var(--text-muted);">مهلت انجام (Due)</dt>
              <dd style="margin:0; font-weight:600; color:var(--danger);">${fmtDate(task.due_date)}</dd></div>`:''}
            ${task.completed_at?`<div class="d-flex justify-content-between py-2.5" style="border-bottom:1px solid var(--border);">
              <dt style="font-weight:500; color:var(--text-muted);">زمان تکمیل</dt>
              <dd style="margin:0; font-weight:600; color:#16a34a;">${fmtDate(task.completed_at)}</dd></div>`:''}
            <div class="d-flex justify-content-between py-2.5" style="border-bottom:1px solid var(--border);">
              <dt style="font-weight:500; color:var(--text-muted);">نوع بازه زمانی</dt>
              <dd style="margin:0; font-weight:500;">${task.duration_type === 'long' ? 'بلند مدت' : 'کوتاه مدت'}</dd>
            </div>
            <div class="d-flex justify-content-between py-2.5">
              <dt style="font-weight:500; color:var(--text-muted);">وضعیت کنونی</dt>
              <dd style="margin:0; font-weight:700; color:${task.is_completed?'#16a34a':'#d97706'};">
                ${task.is_completed?'پایان یافته':'در حال پیگیری'}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </div>`;
}

async function softDeleteAndRedirect(pk) {
  if (!confirm('آیا مایلید این وظیفه به زباله‌دان منتقل شود؟')) return;
  const res = await updateTask(pk, { is_deleted: true });
  if (res.ok) { showToast('وظیفه به زباله‌دان منتقل شد', 'info'); window.location.href = '/tasks/'; }
  else showToast('خطا در انتقال به زباله‌دان', 'error');
}

async function restoreTask(pk) {
  const res = await updateTask(pk, { is_deleted: false });
  if (res.ok) { showToast('وظیفه با موفقیت بازیابی شد', 'success'); renderTaskDetail(pk); }
  else showToast('خطا در بازیابی وظیفه', 'error');
}

// ═══════════════════════════════════════════════
//  COMPLETED TASKS
// ═══════════════════════════════════════════════
async function renderCompleted() {
  setTitle('وظایف انجام شده');
  renderSkeleton();
  const data = await getCompletedTasks();
  
  // Guard parsing structure variations array
  const tasks = Array.isArray(data) ? data : (data.tasks || []);
  const count = typeof data.count !== 'undefined' ? data.count : tasks.length;
  
  const contentEl = document.getElementById('content');
  if (!contentEl) return;

  const countDisplay = typeof Jalali !== 'undefined' ? Jalali.toPersianNum(count) : count;

  contentEl.innerHTML = `
  <div style="direction: rtl; text-align: right;">
    <div class="d-flex align-items-center justify-content-between mb-4">
      <div>
        <h2 style="font-size:22px; font-weight:700; margin:0;">آرشیو وظایف انجام شده</h2>
        <p class="mb-0" style="font-size:13px; color:var(--text-muted); margin-top:4px;">${countDisplay} وظیفه با موفقیت به پایان رسیده است.</p>
      </div>
    </div>

    ${count ? `
    <div class="card p-3 mb-4" style="background:linear-gradient(135deg, #eafaf1, #d1f7e2); border-color:#a3eed0;">
      <div class="d-flex align-items-center gap-3">
        <div style="font-size:32px;">🎉</div>
        <div>
          <div style="font-size:16px; font-weight:700; color:#14532d;">ثبت رکورد جدید در تکمیل اهداف</div>
          <div style="font-size:13px; color:#166534; margin-top:2px;">عالیست! تمام کارهای این بخش با موفقیت تیک خورده‌اند.</div>
        </div>
      </div>
    </div>` : ''}

    <div class="d-flex flex-column gap-3">
      ${tasks.length
        ? tasks.map(t => taskCardHTML(t)).join('')
        : `<div class="empty-state border bg-white py-5"><i class="bi bi-check2-circle" style="font-size:36px; color:var(--success);"></i><p class="text-muted mt-2">هنوز وظیفه‌ای کامل نشده است. اولین کار را تمام کرده و تیک بزنید!</p></div>`
      }
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════
//  TAGS MANAGEMENT (Fixed Async submission handler context context)
// ═══════════════════════════════════════════════
async function renderTagList() {
  setTitle('مدیریت برچسب‌ها');
  renderSkeleton();
  const tags = await getTags();
  const contentEl = document.getElementById('content');
  if (!contentEl) return;

  contentEl.innerHTML = `
  <div style="direction: rtl; text-align: right;">
    <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
      <div>
        <h2 style="font-size:22px; font-weight:700; margin:0;">برچسب‌ها و دسته‌بندی</h2>
        <p class="mb-0" style="font-size:13.5px; color:var(--text-muted); margin-top:4px;">کارهای خود را با اختصاص دادن برچسب‌های رنگی سازماندهی کنید</p>
      </div>
      <button class="btn btn-primary d-flex align-items-center gap-2 px-3 py-2"
              data-bs-toggle="modal" data-bs-target="#createTagModal">
        <i class="bi bi-plus-lg"></i> برچسب جدید
      </button>
    </div>

    ${tags.length ? `
    <div class="row g-3" id="tag-grid">
      ${tags.map(tag => `
        <div class="col-12 col-sm-6 col-md-4" id="tag-card-${tag.id}">
          <div class="card p-3 d-flex flex-row align-items-center gap-3">
            <div style="width:38px; height:38px; border-radius:9px; background:${tag.color}15;
                        display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i class="bi bi-tag-fill" style="color:${tag.color}; font-size:16px;"></i>
            </div>
            <div style="flex:1; min-width:0; text-align:right;">
              <a href="/tags/${tag.id}/" style="font-weight:600; font-size:14.5px; color:inherit; text-decoration:none;" class="hover-primary d-block text-truncate">${escHtml(tag.name)}</a>
              <div style="font-size:11.5px; color:var(--text-muted); font-family:monospace; margin-top:2px;">${tag.color}</div>
            </div>
            <div class="d-flex gap-1">
              <button class="task-action-btn" onclick="openEditTagModal(${tag.id}, '${escHtml(tag.name)}', '${tag.color}')" title="ویرایش">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="task-action-btn del" onclick="confirmDeleteTag(${tag.id})" title="حذف برچسب">
                <i class="bi bi-trash3"></i>
              </button>
            </div>
          </div>
        </div>`).join('')}
    </div>` : `
    <div class="empty-state border bg-white py-5">
      <i class="bi bi-tags" style="font-size:36px;"></i>
      <p class="text-muted mt-2">هیچ برچسبی یافت نشد. برچسب جدید بسازید.</p>
    </div>`}
  </div>`;

  injectTagModals();
}

function injectTagModals() {
  ['createTagModal','editTagModal'].forEach(id => document.getElementById(id)?.remove());

  document.body.insertAdjacentHTML('beforeend', `
  <div class="modal fade" id="createTagModal" tabindex="-1" aria-hidden="true" style="direction:rtl;">
    <div class="modal-dialog modal-dialog-centered" style="max-width:360px;">
      <div class="modal-content">
        <div class="modal-header d-flex align-items-center justify-content-between">
          <h5 class="modal-title fw-semibold" style="font-size:15px; margin:0;"><i class="bi bi-tag me-1 text-primary"></i> ساخت برچسب جدید</h5>
          <button type="button" class="btn-close m-0" data-bs-dismiss="modal"></button>
        </div>
        <form id="createTagForm" novalidate text-align="right">
          <div class="modal-body" style="text-align: right;">
            <div class="mb-3">
              <label class="form-label small text-muted">نام برچسب <span class="text-danger">*</span></label>
              <input type="text" class="form-control form-control-sm" id="new-tag-name" placeholder="مثلا: کاری، شخصی، دانشگاه" required/>
            </div>
            <div>
              <label class="form-label small text-muted">انتخاب رنگ برچسب</label>
              <div class="d-flex align-items-center gap-3">
                <input type="color" class="form-control form-control-color" id="new-tag-color"
                       value="#5b6ee8" style="width:48px; height:38px; padding:3px; border-radius:6px;"/>
                <span class="small text-muted">یک رنگ برای تمایز برچسب انتخاب کنید</span>
              </div>
            </div>
          </div>
          <div class="modal-footer justify-content-start gap-2">
            <button type="submit" class="btn btn-primary btn-sm px-4">ایجاد برچسب</button>
            <button type="button" class="btn btn-sm text-muted" data-bs-dismiss="modal">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <div class="modal fade" id="editTagModal" tabindex="-1" aria-hidden="true" style="direction:rtl;">
    <div class="modal-dialog modal-dialog-centered" style="max-width:360px;">
      <div class="modal-content">
        <div class="modal-header d-flex align-items-center justify-content-between">
          <h5 class="modal-title fw-semibold" style="font-size:15px; margin:0;"><i class="bi bi-pencil me-1 text-primary"></i> ویرایش اطلاعات برچسب</h5>
          <button type="button" class="btn-close m-0" data-bs-dismiss="modal"></button>
        </div>
        <form id="editTagForm" novalidate>
          <div class="modal-body" style="text-align: right;">
            <div class="mb-3">
              <label class="form-label small text-muted">نام برچسب</label>
              <input type="text" class="form-control form-control-sm" id="edit-tag-name" required/>
            </div>
            <div>
              <label class="form-label small text-muted">تغییر رنگ</label>
              <input type="color" class="form-control form-control-color" id="edit-tag-color"
                     style="width:48px; height:38px; padding:3px; border-radius:6px;"/>
            </div>
          </div>
          <div class="modal-footer justify-content-start gap-2">
            <button type="submit" class="btn btn-primary btn-sm px-4">ذخیره تغییرات</button>
            <button type="button" class="btn btn-sm text-muted" data-bs-dismiss="modal">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  </div>`);

  document.getElementById('createTagForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('new-tag-name').value.trim();
    const color = document.getElementById('new-tag-color').value;
    if (!name) return;
    const btn = this.querySelector('[type=submit]');
    setLoading(btn, true);
    const res = await createTag({ name, color });
    setLoading(btn, false);
    if (res.ok) {
      const modalEl = document.getElementById('createTagModal');
      const instance = window.bootstrap?.Modal?.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      instance.hide();
      showToast('برچسب با موفقیت ساخته شد ✨', 'success');
      renderTagList();
    } else {
      const msg = Object.values(res.data||{}).flat().join(' ') || 'خطا در ثبت برچسب';
      showToast(msg, 'error');
    }
  });

  document.getElementById('editTagForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const pk = this.dataset.pk;
    const name = document.getElementById('edit-tag-name').value.trim();
    const color = document.getElementById('edit-tag-color').value;
    const btn = this.querySelector('[type=submit]');
    setLoading(btn, true);
    const res = await updateTag(pk, { name, color });
    setLoading(btn, false);
    if (res.ok) {
      const modalEl = document.getElementById('editTagModal');
      const instance = window.bootstrap?.Modal?.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      instance.hide();
      showToast('تغییرات برچسب ذخیره شد', 'success');
      renderTagList();
    } else {
      showToast('خطا در ذخیره تغییرات برچسب', 'error');
    }
  });
}

function openEditTagModal(pk, name, color) {
  const form = document.getElementById('editTagForm');
  if (!form) return;
  form.dataset.pk = pk;
  document.getElementById('edit-tag-name').value = name;
  document.getElementById('edit-tag-color').value = color;
  const modalEl = document.getElementById('editTagModal');
  const instance = window.bootstrap?.Modal?.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  instance.show();
}

async function confirmDeleteTag(pk) {
  if (!confirm('با حذف این برچسب، تگ مربوطه از تمامی وظایف برداشته خواهد شد. ادامه میدهید؟')) return;
  const ok = await deleteTag(pk);
  if (ok) { showToast('برچسب حذف گردید', 'info'); renderTagList(); }
  else showToast('خطا در حذف برچسب', 'error');
}

// ═══════════════════════════════════════════════
//  TAG DETAIL (Resolved template context crash bug)
// ═══════════════════════════════════════════════
async function renderTagDetail(pk) {
  setTitle('جزییات برچسب');
  renderSkeleton();
  const tags = await getTags();
  const tag = tags.find(t => String(t.id) === String(pk));
  const contentEl = document.getElementById('content');
  if (!contentEl) return;

  if (!tag) { 
    contentEl.innerHTML = `
      <div class="empty-state border bg-white py-5" style="direction:rtl;">
        <i class="bi bi-exclamation-circle text-danger" style="font-size:36px;"></i>
        <p class="mt-2 text-muted">برچسب مورد نظر یافت نشد.</p>
      </div>`; 
    return; 
  }
  setTitle(tag.name);

  const allTasks = await getTasks();
  const tagTasks = allTasks.filter(t => (t.tags||[]).some(tg => String(tg.name).trim() === String(tag.name).trim()));
  const countDisplay = typeof Jalali !== 'undefined' ? Jalali.toPersianNum(tagTasks.length) : tagTasks.length;

  contentEl.innerHTML = `
  <div style="direction: rtl; text-align: right;">
    <div class="mb-3">
      <a href="/tags/" class="text-muted text-decoration-none small"><i class="bi bi-arrow-right me-1"></i> بازگشت به لیست برچسب‌ها</a>
    </div>
    <div class="d-flex align-items-center gap-3 mb-4 flex-wrap">
      <div style="width:46px; height:46px; border-radius:12px; background:${tag.color}15;
                  display:flex; align-items:center; justify-content:center; flex-shrink:0;">
        <i class="bi bi-tag-fill" style="color:${tag.color}; font-size:20px;"></i>
      </div>
      <div>
        <h2 style="font-size:20px; font-weight:700; margin:0;">نمایش برچسب: ${escHtml(tag.name)}</h2>
        <span style="font-size:12px; color:var(--text-muted); font-family:monospace;">Code: ${tag.color}</span>
      </div>
      <div class="ms-auto d-flex gap-2" style="margin-right: auto; margin-left: 0;">
        <button class="btn btn-soft btn-sm px-3" onclick="openEditTagModalDetail(${tag.id}, '${escHtml(tag.name)}', '${tag.color}')">
          <i class="bi bi-pencil me-1"></i> ویرایش برچسب
        </button>
        <button class="btn btn-outline-danger btn-sm px-3" onclick="confirmDeleteTagAndRedirect(${tag.id})">
          <i class="bi bi-trash3 me-1"></i> حذف کامل
        </button>
      </div>
    </div>

    <div class="section-title mb-3">وظایف متصل به این برچسب (${countDisplay})</div>
    <div class="d-flex flex-column gap-3">
      ${tagTasks.length
        ? tagTasks.map(t => taskCardHTML(t)).join('')
        : `<div class="empty-state border bg-white py-5"><i class="bi bi-tag" style="font-size:32px;"></i><p class="text-muted mt-2">هیچ وظیفه‌ای دارای این برچسب نمی‌باشد.</p></div>`
      }
    </div>
  </div>`;
}

function openEditTagModalDetail(pk, name, color) {
  const html = `
  <div class="modal fade" id="editTagDetailModal" tabindex="-1" aria-hidden="true" style="direction:rtl;">
    <div class="modal-dialog modal-dialog-centered" style="max-width:360px;">
      <div class="modal-content">
        <div class="modal-header d-flex align-items-center justify-content-between">
          <h5 class="modal-title fw-semibold" style="font-size:15px; margin:0;">ویرایش برچسب اطلاعات</h5>
          <button type="button" class="btn-close m-0" data-bs-dismiss="modal"></button>
        </div>
        <form id="editTagDetailForm">
          <div class="modal-body" style="text-align: right;">
            <div class="mb-3"><label class="form-label small text-muted">نام برچسب</label>
              <input type="text" class="form-control form-control-sm" id="etd-name" value="${escHtml(name)}" required/></div>
            <div><label class="form-label small text-muted">رنگ تم</label>
              <input type="color" class="form-control form-control-color" id="etd-color"
                     value="${color}" style="width:48px; height:38px; padding:3px; border-radius:6px;"/></div>
          </div>
          <div class="modal-footer justify-content-start gap-2">
            <button type="submit" class="btn btn-primary btn-sm px-4">ذخیره</button>
            <button type="button" class="btn btn-sm text-muted" data-bs-dismiss="modal">انصراف</button>
          </div>
        </form>
      </div>
    </div>
  </div>`;
  document.getElementById('editTagDetailModal')?.remove();
  document.body.insertAdjacentHTML('beforeend', html);
  
  const modalEl = document.getElementById('editTagDetailModal');
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
  
  document.getElementById('editTagDetailForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = this.querySelector('[type=submit]');
    const updatedName = document.getElementById('etd-name').value.trim();
    const updatedColor = document.getElementById('etd-color').value;
    
    setLoading(btn, true);
    const res = await updateTag(pk, { name: updatedName, color: updatedColor });
    setLoading(btn, false);
    modal.hide();
    if (res.ok) { 
      showToast('برچسب با موفقیت بروزرسانی شد', 'success'); 
      renderTagDetail(pk); 
    } else { 
      showToast('خطا در بروزرسانی برچسب', 'error'); 
    }
  });
}

async function confirmDeleteTagAndRedirect(pk) {
  if (!confirm('آیا از حذف این برچسب مطمئن هستید؟')) return;
  const ok = await deleteTag(pk);
  if (ok) { showToast('برچسب حذف گردید', 'info'); window.location.href = '/tags/'; }
  else showToast('خطا در حذف برچسب', 'error');
}

// ═══════════════════════════════════════════════
//  USER PROFILE
// ═══════════════════════════════════════════════
async function renderProfile() {
  setTitle('حساب کاربری');
  const user = await getProfile();
  const contentEl = document.getElementById('content');
  if (!contentEl || !user) return;

  const initials = (user.name || user.username || '?')[0].toUpperCase();

  contentEl.innerHTML = `
  <div class="row g-4 justify-content-center" style="direction: rtl; text-align: right;">
    <div class="col-12 col-md-8 col-lg-5">
      <div class="card p-4 text-center mb-3">
        <div style="width:72px; height:72px; border-radius:50%; background:var(--primary-light);
                    color:var(--primary); display:flex; align-items:center; justify-content:center;
                    font-size:28px; font-weight:700; margin:0 auto 14px;">${initials}</div>
        <h2 style="font-size:18px; font-weight:700; margin-bottom:4px;">${escHtml(user.name||user.username)}</h2>
        <p style="font-size:13px; color:var(--text-muted); margin:0; font-family:monospace;">@${escHtml(user.username)}</p>
      </div>

      <div class="card p-4 mb-3">
        <div class="section-title mb-3">ویرایش پروفایل کاربری</div>
        <div id="profile-msg"></div>
        <form id="profile-form" novalidate>
          <div class="mb-3">
            <label class="form-label small text-muted">نام و نام خانوادگی</label>
            <input type="text" class="form-control form-control-sm py-2" id="prof-name" value="${escHtml(user.name||'')}" placeholder="نام خود را وارد کنید"/>
          </div>
          <div class="mb-4">
            <label class="form-label small text-muted">نام کاربری (Username)</label>
            <input type="text" class="form-control form-control-sm py-2" id="prof-username" value="${escHtml(user.username)}" required/>
          </div>
          <button type="submit" class="btn btn-primary w-100 py-2" id="prof-btn">ذخیره تغییرات مشخصات</button>
        </form>
      </div>

      <div class="card p-3">
        <div class="d-flex align-items-center justify-content-between">
          <div>
            <div style="font-size:14px; font-weight:600;">رمز عبور حساب</div>
            <div style="font-size:12.5px; color:var(--text-muted); margin-top:2px;">کلمه عبور خود را تغییر دهید</div>
          </div>
          <a href="/account/me/change-password/" class="btn btn-soft btn-sm px-3">تغییر رمز عبور</a>
        </div>
      </div>
    </div>
  </div>`;

  document.getElementById('profile-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('prof-btn');
    const msg = document.getElementById('profile-msg');
    setLoading(btn, true);
    const res = await updateProfile({
      name:     document.getElementById('prof-name').value.trim(),
      username: document.getElementById('prof-username').value.trim()
    });
    setLoading(btn, false);
    if (res.ok) {
      msg.innerHTML = '<div class="alert alert-success py-2 small mb-3">مشخصات پروفایل با موفقیت بروزرسانی شد.</div>';
      populateUserUI();
    } else {
      const err = Object.values(res.data||{}).flat().join(' ') || 'خطا در ثبت مشخصات';
      msg.innerHTML = `<div class="alert alert-danger py-2 small mb-3">${escHtml(err)}</div>`;
    }
  });
}

// ═══════════════════════════════════════════════
//  CHANGE PASSWORD
// ═══════════════════════════════════════════════
function renderChangePassword() {
  setTitle('تغییر رمز عبور');
  const contentEl = document.getElementById('content');
  if (!contentEl) return;

  contentEl.innerHTML = `
  <div class="row justify-content-center" style="direction: rtl; text-align: right;">
    <div class="col-12 col-md-6 col-lg-5">
      <div class="mb-3">
        <a href="/account/me/" class="text-muted text-decoration-none small">
          <i class="bi bi-arrow-right me-1"></i> بازگشت به پروفایل حساب
        </a>
      </div>
      <div class="card p-4">
        <div class="section-title mb-3"><i class="bi bi-shield-lock text-primary me-1"></i> تغییر کلمه عبور امنیتی</div>
        <div id="cpwd-msg"></div>
        <form id="cpwd-form" novalidate>
          <div class="mb-3">
            <label class="form-label small text-muted">رمز عبور فعلی</label>
            <div class="input-group">
              <input type="password" class="form-control form-control-sm py-2" id="old-pwd" required placeholder="رمز عبور فعلی خود را وارد کنید"/>
              <button class="btn border btn-eye" type="button" onclick="togglePwdField('old-pwd', this)" style="border-radius: 8px 0 0 8px !important; border-left: 1px solid var(--border) !important; border-right:none;"><i class="bi bi-eye"></i></button>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label small text-muted">رمز عبور جدید</label>
            <div class="input-group">
              <input type="password" class="form-control form-control-sm py-2" id="new-pwd1" required placeholder="حداقل ۸ کاراکتر"/>
              <button class="btn border btn-eye" type="button" onclick="togglePwdField('new-pwd1', this)" style="border-radius: 8px 0 0 8px !important; border-left: 1px solid var(--border) !important; border-right:none;"><i class="bi bi-eye"></i></button>
            </div>
          </div>
          <div class="mb-4">
            <label class="form-label small text-muted">تکرار رمز عبور جدید</label>
            <div class="input-group">
              <input type="password" class="form-control form-control-sm py-2" id="new-pwd2" required placeholder="رمز عبور جدید را تکرار کنید"/>
              <button class="btn border btn-eye" type="button" onclick="togglePwdField('new-pwd2', this)" style="border-radius: 8px 0 0 8px !important; border-left: 1px solid var(--border) !important; border-right:none;"><i class="bi bi-eye"></i></button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary w-100 py-2" id="cpwd-btn">به‌روزرسانی رمز عبور</button>
        </form>
      </div>
    </div>
  </div>`;

  document.getElementById('cpwd-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('cpwd-btn');
    const msg = document.getElementById('cpwd-msg');
    if (!msg) return;
    msg.innerHTML = '';
    const old_password = document.getElementById('old-pwd').value;
    const new_password1 = document.getElementById('new-pwd1').value;
    const new_password2 = document.getElementById('new-pwd2').value;

    if (new_password1 !== new_password2) {
      msg.innerHTML = '<div class="alert alert-danger py-2 small mb-3">کلمات عبور جدید وارد شده با یکدیگر مطابقت ندارند.</div>';
      return;
    }
    setLoading(btn, true);
    const res = await changePassword(old_password, new_password1, new_password2);
    setLoading(btn, false);
    if (res.ok) {
      msg.innerHTML = '<div class="alert alert-success py-2 small mb-3">رمز عبور حساب کاربری شما با موفقیت تغییر یافت.</div>';
      this.reset();
    } else {
      const err = Object.values(res.data||{}).flat().join(' ') || 'تغییر رمز عبور انجام نشد.';
      msg.innerHTML = `<div class="alert alert-danger py-2 small mb-3">${escHtml(err)}</div>`;
    }
  });
}

function togglePwdField(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  btn.innerHTML = isText ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
}