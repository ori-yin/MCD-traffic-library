// 日报归档平台前端逻辑
const state = {
  currentMonth: '',          // YYYY-MM
  calendarData: {},          // {date: count}
  selectedDate: null,        // YYYY-MM-DD
  reports: [],               // 当前选中日期的日报
  selectedReportId: null,    // 右栏预览用
  filterDept: '',            // 部门筛选, '' = 全部
  departments: [],           // 部门列表
};

// 日期工具 (本地时区)
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function monthOf(dateISO) { return dateISO.slice(0, 7); }
function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function fmtTime(iso) { return iso.slice(11, 16); }

function deptClass(d) {
  return state.departments.includes(d) ? `dept dept-${d}` : 'dept dept-default';
}

// === 日历 ===
function renderCalendar() {
  const [y, m] = state.currentMonth.split('-').map(Number);
  document.getElementById('cal-label').textContent = `${y} 年 ${m} 月`;

  const firstDay = new Date(y, m - 1, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const today = todayISO();

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  for (let i = 0; i < firstWeekday; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day empty';
    grid.appendChild(cell);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateISO = `${state.currentMonth}-${String(d).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'cal-day';
    cell.dataset.date = dateISO;
    if (dateISO === today) cell.classList.add('today');
    const count = state.calendarData[dateISO];
    if (count) {
      cell.classList.add('has-report');
      const num = document.createElement('span');
      num.className = 'day-num';
      num.textContent = d;
      cell.appendChild(num);
    } else {
      cell.textContent = d;
    }
    if (dateISO === state.selectedDate) cell.classList.add('selected');
    cell.addEventListener('click', () => onDayClick(dateISO));
    grid.appendChild(cell);
  }
}

async function loadCalendar(month) {
  state.currentMonth = month;
  const res = await fetch(`/api/calendar?month=${month}`);
  state.calendarData = await res.json();
  renderCalendar();
}

// === 中栏: 日报清单 ===
async function loadReports(date) {
  const res = await fetch(`/api/reports?date=${date}`);
  state.reports = await res.json();
  state.selectedReportId = null;
  document.getElementById('report-frame').src = 'about:blank';
  document.getElementById('report-meta').innerHTML = '<span class="meta-empty">选择左侧日报开始预览</span>';
  renderReports();
  if (state.reports.length > 0) onReportClick(state.reports[0].id);
}

function visibleReports() {
  return state.filterDept
    ? state.reports.filter(r => r.department === state.filterDept)
    : state.reports;
}

function renderReports() {
  const title = document.getElementById('list-title');
  const list = document.getElementById('report-list');
  list.innerHTML = '';

  if (!state.selectedDate) {
    title.textContent = '请选择日期';
    return;
  }
  const items = visibleReports();
  const filterLabel = state.filterDept ? ` · ${state.filterDept}` : '';
  title.textContent = `${state.selectedDate}${filterLabel} (${items.length} 份)`;

  if (items.length === 0) {
    const li = document.createElement('li');
    li.className = 'report-item-empty';
    li.textContent = state.filterDept
      ? `${state.filterDept} 这天没有日报`
      : '这天没有日报';
    list.appendChild(li);
    return;
  }

  for (const r of items) {
    const li = document.createElement('li');
    li.className = 'report-item';
    li.dataset.id = r.id;
    if (r.id === state.selectedReportId) li.classList.add('selected');
    const deptSpan = document.createElement('span');
    deptSpan.className = deptClass(r.department);
    deptSpan.textContent = r.department;
    const titleSpan = document.createElement('span');
    titleSpan.className = 'title';
    titleSpan.textContent = r.title || r.filename;
    const timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = fmtTime(r.created_at);
    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn';
    delBtn.type = 'button';
    delBtn.title = '删除';
    delBtn.textContent = '×';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteReport(r.id, r);
    });
    li.appendChild(deptSpan);
    li.appendChild(titleSpan);
    li.appendChild(timeSpan);
    li.appendChild(delBtn);
    li.addEventListener('click', () => onReportClick(r.id));
    list.appendChild(li);
  }
}

function onDayClick(dateISO) {
  state.selectedDate = dateISO;
  renderCalendar();
  loadReports(dateISO);
}

function onReportClick(id) {
  state.selectedReportId = id;
  renderReports();
  const r = state.reports.find(x => x.id === id);
  if (r) {
    document.getElementById('report-frame').src = `/report/${id}`;
    const meta = document.getElementById('report-meta');
    meta.innerHTML = '';
    const d = document.createElement('span');
    d.className = 'meta-date';
    d.textContent = r.report_date;
    const dept = document.createElement('span');
    dept.className = `meta-dept ${deptClass(r.department)}`;
    dept.textContent = r.department;
    const t = document.createElement('span');
    t.className = 'meta-title';
    t.textContent = r.title || r.filename;
    meta.appendChild(d);
    meta.appendChild(dept);
    meta.appendChild(t);
  }
}

async function deleteReport(id, row) {
  const by = prompt('谁删? (必填)');
  if (!by || !by.trim()) return;
  const reason = prompt('原因 (可选, 留空跳过)') || '';
  if (!confirm(`确认删除?\n操作人: ${by}\n原因: ${reason || '(无)'}\n标题: ${row.title || row.filename}`)) return;
  const fd = new FormData();
  fd.append('deleted_by', by.trim());
  fd.append('deleted_reason', reason.trim());
  const res = await fetch(`/api/reports/${id}`, { method: 'DELETE', body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert(`删除失败: ${err.detail || res.status}`);
    return;
  }
  state.reports = state.reports.filter(r => r.id !== id);
  const visible = visibleReports();
  if (visible.length === 0) {
    state.selectedReportId = null;
    document.getElementById('report-frame').src = 'about:blank';
    document.getElementById('report-meta').innerHTML = '<span class="meta-empty">选择左侧日报开始预览</span>';
  } else if (state.selectedReportId === id) {
    onReportClick(visible[0].id);
  }
  renderReports();
  await loadCalendar(state.currentMonth);
  alert(`已删除 (操作人: ${by.trim()})`);
}

// === 部门筛选 (Task 11) ===
function setupFilter() {
  const sel = document.getElementById('filter-dept');
  sel.innerHTML = '<option value="">全部部门</option>';
  for (const d of state.departments) {
    const opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    sel.appendChild(opt);
  }
  const last = localStorage.getItem('mra_filter_dept');
  if (last && state.departments.includes(last)) sel.value = last;
  sel.addEventListener('change', () => {
    state.filterDept = sel.value;
    localStorage.setItem('mra_filter_dept', sel.value);
    renderReports();
    // 切筛选后: 若当前选中的报告被过滤掉, 自动选中第一条可见的, 否则清空预览
    const visible = visibleReports();
    if (visible.length === 0) {
      state.selectedReportId = null;
      document.getElementById('report-frame').src = 'about:blank';
      document.getElementById('report-meta').innerHTML = '<span class="meta-empty">选择左侧日报开始预览</span>';
    } else if (!visible.some(r => r.id === state.selectedReportId)) {
      onReportClick(visible[0].id);
    }
  });
}

// === 默认: 选最新有日报那天 ===
async function initDefaultDate() {
  const res = await fetch('/api/latest');
  const { latest } = await res.json();
  if (latest) onDayClick(latest);
}

// === 上传 ===
async function initUploadUI() {
  const res = await fetch('/api/departments');
  const { departments } = await res.json();
  state.departments = departments;
  const sel = document.getElementById('up-dept');
  for (const d of departments) {
    const opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    sel.appendChild(opt);
  }
  const lastDept = localStorage.getItem('mra_last_dept');
  if (lastDept && departments.includes(lastDept)) sel.value = lastDept;
  else if (departments.length) sel.value = departments[0];

  document.getElementById('up-date').value = todayISO();
  sel.addEventListener('change', () => localStorage.setItem('mra_last_dept', sel.value));
}

async function uploadFile(file) {
  await tryAutoFillDate(file);
  await tryAutoFillDept(file);
  if (!file.name.toLowerCase().endsWith('.html')) {
    flashStatus(`[${file.name}] 仅支持 .html`, 'err');
    return false;
  }
  const dept = document.getElementById('up-dept').value;
  const date = document.getElementById('up-date').value;
  if (!dept || !date) { flashStatus(`[${file.name}] 部门和日期必填`, 'err'); return false; }

  const fd = new FormData();
  fd.append('file', file);
  fd.append('department', dept);
  fd.append('date', date);

  setUploadStatus('上传中...', '');
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      flashStatus(`[${file.name}] 失败: ${err.detail || res.status}`, 'err');
      return false;
    }
    const data = await res.json();
    flashStatus(`成功: ${data.title || data.filename}`, 'ok');
    await loadCalendar(state.currentMonth);
    if (date === state.selectedDate) {
      await loadReports(date);
      onReportClick(data.id);
    } else {
      onDayClick(date);
    }
    return true;
  } catch (e) {
    flashStatus(`[${file.name}] 失败: ${e.message}`, 'err');
    return false;
  }
}

function setUploadStatus(msg, kind) {
  const el = document.getElementById('up-status');
  el.textContent = msg;
  el.className = 'up-status' + (kind ? ' ' + kind : '');
}

function flashStatus(msg, kind) {
  const el = document.getElementById('up-status');
  el.textContent = msg;
  el.className = 'up-status' + (kind ? ' ' + kind : '');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.textContent = '';
    el.className = 'up-status';
  }, 3000);
}

function flashHint(el, msg) {
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.hidden = true; }, 3000);
}

async function uploadFiles(files) {
  const total = files.length;
  if (total === 1) { await uploadFile(files[0]); return; }
  let success = 0, failed = 0;
  for (let i = 0; i < total; i++) {
    setUploadStatus(`上传中 ${i + 1}/${total}...`, '');
    const ok = await uploadFile(files[i]);
    if (ok) success++; else failed++;
  }
  flashStatus(failed === 0 ? `全部成功 (${success}/${total})` : `完成: ${success} 成功, ${failed} 失败`, failed === 0 ? 'ok' : 'err');
}

// === 日期智能识别 ===
function pad2(n) { return String(n).padStart(2, '0'); }

function inferYear(mm, dd) {
  const today = new Date();
  const thisYear = today.getFullYear();
  const candThis = new Date(thisYear, parseInt(mm) - 1, parseInt(dd));
  const candLast = new Date(thisYear - 1, parseInt(mm) - 1, parseInt(dd));
  const t = today.getTime();
  return Math.abs(t - candThis.getTime()) <= Math.abs(t - candLast.getTime())
    ? candThis : candLast;
}

function parseDateFromText(text) {
  // YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD
  let m = text.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;
  // YYYYMMDD (8 位连续数字)
  m = text.match(/(?:^|[^\d])(\d{4})(\d{2})(\d{2})(?:[^\d]|$)/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // X月Y日 / X月Y
  m = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日?/);
  if (m) { const d2 = inferYear(m[1], m[2]); return `${d2.getFullYear()}-${pad2(m[1])}-${pad2(m[2])}`; }
  // MMDD (4 位数字, 边界非数字避免匹配身份证等)
  m = text.match(/(?:^|[^\d])(\d{2})(\d{2})(?:[^\d]|$)/);
  if (m) { const d2 = inferYear(m[1], m[2]); return `${d2.getFullYear()}-${m[1]}-${m[2]}`; }
  // MM-DD / MM/DD
  m = text.match(/(?:^|[^\d])(\d{1,2})[-/](\d{1,2})(?:[^\d]|$)/);
  if (m) { const d2 = inferYear(m[1], m[2]); return `${d2.getFullYear()}-${pad2(m[1])}-${pad2(m[2])}`; }
  return null;
}

function parseDateFromHtml(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? parseDateFromText(m[1]) : null;
}

async function tryAutoFillDate(file) {
  // 1. 文件名优先
  let d = parseDateFromText(file.name);
  let src = '文件名';
  // 2. fallback 到 <title>
  if (!d) {
    try {
      const text = await file.text();
      d = parseDateFromHtml(text);
      if (d) src = '标题';
    } catch (_) { /* ignore */ }
  }
  const dateInput = document.getElementById('up-date');
  const hint = document.getElementById('up-date-hint');
  if (d) {
    dateInput.value = d;
    flashHint(hint, `✓ ${src}识别`);
  } else {
    hint.hidden = true;
  }
}

// === 部门自动识别 ===
async function tryAutoFillDept(file) {
  const haystacks = [file.name];
  try {
    const text = await file.text();
    const m = text.match(/<title>([\s\S]*?)<\/title>/i);
    if (m) haystacks.push(m[1]);
  } catch (_) { /* ignore */ }

  const sel = document.getElementById('up-dept');
  const hint = document.getElementById('up-dept-hint');
  let matched = null;
  for (const dept of state.departments) {
    if (dept === '其他') continue; // 兜底用, 不参与匹配
    if (haystacks.some(h => h.toLowerCase().includes(dept.toLowerCase()))) {
      matched = dept; break;
    }
  }
  sel.value = matched || '其他';
  if (matched) {
    flashHint(hint, '✓ 自动识别');
  } else {
    hint.hidden = true;
  }
}

function setupUploadZone() {
  const zone = document.getElementById('up-zone');
  const fileInput = document.getElementById('up-file');
  const dateInput = document.getElementById('up-date');
  const dateHint = document.getElementById('up-date-hint');

  zone.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    fileInput.click();
  });
  document.getElementById('up-pick').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) uploadFiles([...fileInput.files]);
    fileInput.value = '';
  });
  dateInput.addEventListener('input', () => { dateHint.hidden = true; });
  const deptSel = document.getElementById('up-dept');
  const deptHint = document.getElementById('up-dept-hint');
  deptSel.addEventListener('change', () => { deptHint.hidden = true; });

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const files = [...e.dataTransfer.files];
    if (files.length) uploadFiles(files);
  });
}

// === 启动 ===
(async function init() {
  await initUploadUI();
  setupFilter();
  setupUploadZone();
  initDefaultDate();
  loadCalendar(monthOf(todayISO()));
  document.getElementById('cal-prev').addEventListener('click', () => {
    loadCalendar(shiftMonth(state.currentMonth, -1));
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    loadCalendar(shiftMonth(state.currentMonth, 1));
  });
})();
