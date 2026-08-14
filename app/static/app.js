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
      const cnt = document.createElement('span');
      cnt.className = 'day-count';
      cnt.textContent = count;
      cell.appendChild(num);
      cell.appendChild(cnt);
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
    li.appendChild(deptSpan);
    li.appendChild(titleSpan);
    li.appendChild(timeSpan);
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
  if (!file.name.toLowerCase().endsWith('.html')) {
    setUploadStatus('仅支持 .html 文件', 'err');
    return;
  }
  const dept = document.getElementById('up-dept').value;
  const date = document.getElementById('up-date').value;
  if (!dept || !date) { setUploadStatus('部门和日期必填', 'err'); return; }

  const fd = new FormData();
  fd.append('file', file);
  fd.append('department', dept);
  fd.append('date', date);

  setUploadStatus('上传中...', '');
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setUploadStatus(`失败: ${err.detail || res.status}`, 'err');
      return;
    }
    const data = await res.json();
    setUploadStatus(`成功: ${data.title || data.filename}`, 'ok');
    await loadCalendar(state.currentMonth);
    if (date === state.selectedDate) {
      await loadReports(date);
      onReportClick(data.id);
    } else {
      onDayClick(date);
    }
  } catch (e) {
    setUploadStatus(`失败: ${e.message}`, 'err');
  }
}

function setUploadStatus(msg, kind) {
  const el = document.getElementById('up-status');
  el.textContent = msg;
  el.className = 'up-status' + (kind ? ' ' + kind : '');
}

function setupUploadZone() {
  const zone = document.getElementById('up-zone');
  const fileInput = document.getElementById('up-file');

  zone.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    fileInput.click();
  });
  document.getElementById('up-pick').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) uploadFile(fileInput.files[0]);
    fileInput.value = '';
  });

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
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
