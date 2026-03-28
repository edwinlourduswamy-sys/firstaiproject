'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'habitflow_v1_tasks';

const CATEGORY_LABELS = {
  health:   'Health & Fitness',
  work:     'Work & Productivity',
  learning: 'Learning & Growth',
};

const PRIORITY_LABELS  = { high: 'High', med: 'Med', low: 'Low' };
const RECURRENCE_LABELS = { daily: 'Daily', weekdays: 'Weekdays', weekly: 'Weekly', 'one-time': 'One-time' };
const DAY_SHORT  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── State ─────────────────────────────────────────────────────────────────────
let tasks         = [];
let currentView   = 'today';
let currentFilter = 'all';

// ── Date Helpers ──────────────────────────────────────────────────────────────

/** Returns 'YYYY-MM-DD' in local time. */
function dateStr(date) {
  date = date || new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayStr() { return dateStr(); }

/** Parse 'YYYY-MM-DD' as a local Date (avoids UTC midnight offset issues). */
function parseLocal(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dayOfWeek(str) { return parseLocal(str).getDay(); } // 0 = Sun

function shiftDays(str, n) {
  const d = parseLocal(str);
  d.setDate(d.getDate() + n);
  return dateStr(d);
}

/** Monday-based week start for any YYYY-MM-DD string. */
function weekStart(str) {
  const d   = parseLocal(str);
  const dow = d.getDay(); // 0 = Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return dateStr(d);
}

// ── Task Logic ────────────────────────────────────────────────────────────────

function isTaskDueOn(task, date) {
  const created = task.createdAt.split('T')[0];
  if (date < created) return false;
  const dow = dayOfWeek(date);
  switch (task.recurrence) {
    case 'daily':    return true;
    case 'weekdays': return dow >= 1 && dow <= 5;
    case 'weekly':   return dayOfWeek(created) === dow;
    case 'one-time': return date === created;
    default:         return false;
  }
}

function isCompletedOn(task, date) {
  return Array.isArray(task.completedDates) && task.completedDates.includes(date);
}

function getTasksForDate(date) {
  return tasks.filter(t => isTaskDueOn(t, date));
}

function applyFilter(list) {
  return currentFilter === 'all' ? list : list.filter(t => t.category === currentFilter);
}

// ── Storage ───────────────────────────────────────────────────────────────────

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : buildSeedTasks();
  } catch (_) {
    tasks = buildSeedTasks();
  }
}

/** Seed tasks with realistic historical completions so the heatmap has data. */
function buildSeedTasks() {
  const now     = new Date();
  const isoNow  = now.toISOString();
  const past30  = new Date(now); past30.setDate(past30.getDate() - 30);
  const isoPast = past30.toISOString();

  // Generate completion arrays with some randomness
  function histComp(density) {
    const dates = [];
    for (let i = 0; i <= 30; i++) {
      if (Math.random() < density) dates.push(shiftDays(todayStr(), -i));
    }
    return dates;
  }

  return [
    {
      id: 'seed1', title: 'Morning workout', category: 'health',
      timeBlock: 'morning', dueTime: '07:00', priority: 'high',
      recurrence: 'daily', notes: '30 min — cardio or strength',
      completedDates: histComp(0.75), createdAt: isoPast,
    },
    {
      id: 'seed2', title: 'Deep work session', category: 'work',
      timeBlock: 'morning', dueTime: '09:00', priority: 'high',
      recurrence: 'weekdays', notes: 'Phone off, inbox closed',
      completedDates: histComp(0.80), createdAt: isoPast,
    },
    {
      id: 'seed3', title: 'Read for 20 minutes', category: 'learning',
      timeBlock: 'evening', dueTime: '21:00', priority: 'med',
      recurrence: 'daily', notes: 'Currently: Atomic Habits',
      completedDates: histComp(0.65), createdAt: isoPast,
    },
    {
      id: 'seed4', title: 'Drink 8 glasses of water', category: 'health',
      timeBlock: 'afternoon', dueTime: '', priority: 'low',
      recurrence: 'daily', notes: '',
      completedDates: histComp(0.55), createdAt: isoPast,
    },
    {
      id: 'seed5', title: 'Daily standup notes', category: 'work',
      timeBlock: 'morning', dueTime: '10:00', priority: 'med',
      recurrence: 'weekdays', notes: '',
      completedDates: histComp(0.70), createdAt: isoPast,
    },
    {
      id: 'seed6', title: 'Evening review & plan tomorrow', category: 'work',
      timeBlock: 'evening', dueTime: '20:00', priority: 'med',
      recurrence: 'daily', notes: 'Review wins, set priorities',
      completedDates: histComp(0.60), createdAt: isoPast,
    },
    {
      id: 'seed7', title: 'Practice new skill (30 min)', category: 'learning',
      timeBlock: 'afternoon', dueTime: '15:00', priority: 'med',
      recurrence: 'weekdays', notes: '',
      completedDates: histComp(0.50), createdAt: isoPast,
    },
    {
      id: 'seed8', title: 'Meditate', category: 'health',
      timeBlock: 'morning', dueTime: '06:30', priority: 'low',
      recurrence: 'daily', notes: '10 min guided',
      completedDates: histComp(0.55), createdAt: isoNow,
    },
  ];
}

// ── Mutations ─────────────────────────────────────────────────────────────────

function addTask(data) {
  tasks.push({
    id:             `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title:          data.title.trim(),
    category:       data.category,
    timeBlock:      data.timeBlock,
    dueTime:        data.dueTime   || '',
    priority:       data.priority  || 'med',
    recurrence:     data.recurrence || 'daily',
    notes:          (data.notes || '').trim(),
    completedDates: [],
    createdAt:      new Date().toISOString(),
  });
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
}

function toggleComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  if (!Array.isArray(task.completedDates)) task.completedDates = [];
  const td  = todayStr();
  const idx = task.completedDates.indexOf(td);
  if (idx === -1) task.completedDates.push(td);
  else            task.completedDates.splice(idx, 1);
  saveTasks();
  render();
}

// ── Streak ────────────────────────────────────────────────────────────────────

function calcStreak() {
  let streak = 0;
  const td = todayStr();
  for (let i = 0; i < 365; i++) {
    const ds  = shiftDays(td, -i);
    const any = tasks.some(t => isCompletedOn(t, ds));
    if (!any) {
      if (i === 0) continue; // today may not have completions yet — keep going
      break;
    }
    streak++;
  }
  return streak;
}

// ── DOM Helpers ───────────────────────────────────────────────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls)       e.className   = cls;
  if (text != null) e.textContent = text;
  return e;
}

// ── Task Card ─────────────────────────────────────────────────────────────────

function buildTaskCard(task, dateCtx) {
  dateCtx = dateCtx || todayStr();
  const done  = isCompletedOn(task, dateCtx);
  const card  = el('div', `task-card priority-${task.priority}${done ? ' completed' : ''}`);
  card.dataset.id = task.id;

  // Checkbox
  const cb   = document.createElement('input');
  cb.type    = 'checkbox';
  cb.className = 'task-check';
  cb.checked   = done;
  if (dateCtx === todayStr()) {
    cb.addEventListener('change', () => toggleComplete(task.id));
  } else {
    cb.disabled = true;
  }

  // Content
  const content = el('div', 'task-content');

  const titleEl = el('span', 'task-title', task.title);
  content.appendChild(titleEl);

  const badges = el('div', 'task-badges');
  badges.appendChild(el('span', `badge cat-badge cat-${task.category}`,  CATEGORY_LABELS[task.category]));
  badges.appendChild(el('span', `badge prio-badge prio-${task.priority}`, PRIORITY_LABELS[task.priority]));
  content.appendChild(badges);

  const meta = el('div', 'task-meta');
  if (task.dueTime) meta.appendChild(el('span', 'task-time', `⏰ ${task.dueTime}`));
  meta.appendChild(el('span', 'task-recur', `↻ ${RECURRENCE_LABELS[task.recurrence]}`));
  content.appendChild(meta);

  if (task.notes) content.appendChild(el('div', 'task-notes', task.notes));

  // Delete button (today view only)
  const actions = el('div', 'task-actions');
  if (dateCtx === todayStr()) {
    const del = el('button', 'delete-btn', '✕');
    del.title = 'Delete task';
    del.addEventListener('click', () => {
      if (confirm(`Delete "${task.title}"?`)) deleteTask(task.id);
    });
    actions.appendChild(del);
  }

  card.appendChild(cb);
  card.appendChild(content);
  card.appendChild(actions);
  return card;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function renderDashboard() {
  const td       = todayStr();
  const due      = applyFilter(getTasksForDate(td));
  const done     = due.filter(t => isCompletedOn(t, td));
  const pct      = due.length ? Math.round((done.length / due.length) * 100) : 0;

  document.getElementById('stat-total').textContent     = due.length;
  document.getElementById('stat-completed').textContent = done.length;
  document.getElementById('stat-streak').textContent    = calcStreak();
  document.getElementById('stat-percent').textContent   = pct + '%';
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

function renderHeatmap() {
  const container = document.getElementById('heatmap');
  container.innerHTML = '';
  const td = todayStr();

  for (let i = 29; i >= 0; i--) {
    const ds   = shiftDays(td, -i);
    const due  = getTasksForDate(ds);
    const done = due.filter(t => isCompletedOn(t, ds));

    let level = 0;
    if (due.length > 0) {
      const ratio = done.length / due.length;
      if      (ratio > 0.66) level = 3;
      else if (ratio > 0.33) level = 2;
      else if (ratio > 0)    level = 1;
    }

    const cell = el('div', `heatmap-cell level-${level}`);
    cell.title = `${ds}: ${done.length}/${due.length} completed`;
    if (ds === td) cell.classList.add('today');
    container.appendChild(cell);
  }
}

// ── Today View ────────────────────────────────────────────────────────────────

function renderTodayView() {
  const td   = todayStr();
  const list = applyFilter(getTasksForDate(td));

  ['morning', 'afternoon', 'evening'].forEach(block => {
    const blockList  = document.getElementById(`tasks-${block}`);
    const blockCount = document.getElementById(`count-${block}`);
    const blockTasks = list.filter(t => t.timeBlock === block);

    blockList.innerHTML  = '';
    blockCount.textContent = blockTasks.length;

    if (blockTasks.length === 0) {
      blockList.appendChild(el('div', 'empty-block', 'No tasks here — free time!'));
    } else {
      blockTasks.forEach(t => blockList.appendChild(buildTaskCard(t, td)));
    }
  });
}

// ── Week View ─────────────────────────────────────────────────────────────────

function renderWeekView() {
  const grid = document.getElementById('week-grid');
  grid.innerHTML = '';
  const td    = todayStr();
  const start = weekStart(td);

  for (let i = 0; i < 7; i++) {
    const ds      = shiftDays(start, i);
    const dow     = dayOfWeek(ds);
    const isToday = ds === td;

    const col = el('div', `week-day${isToday ? ' is-today' : ''}`);

    // Header
    const header  = el('div', 'week-day-header');
    header.appendChild(el('span', 'week-day-name', DAY_SHORT[dow]));
    const numEl   = el('span', 'week-day-num', String(parseLocal(ds).getDate()));
    header.appendChild(numEl);
    col.appendChild(header);

    // Tasks
    const dayTasks = applyFilter(getTasksForDate(ds));
    if (dayTasks.length === 0) {
      col.appendChild(el('div', 'week-empty', '—'));
    } else {
      dayTasks.forEach(t => {
        const item = el('div', `week-task-item cat-border-${t.category}${isCompletedOn(t, ds) ? ' week-done' : ''}`);
        item.appendChild(el('span', 'week-task-title', t.title));
        item.appendChild(el('span', 'week-task-recur', RECURRENCE_LABELS[t.recurrence]));
        col.appendChild(item);
      });
    }

    grid.appendChild(col);
  }
}

// ── Orchestrated Render ───────────────────────────────────────────────────────

function render() {
  renderDashboard();
  renderHeatmap();

  const todayView = document.getElementById('today-view');
  const weekView  = document.getElementById('week-view');

  if (currentView === 'today') {
    todayView.classList.remove('hidden');
    weekView.classList.add('hidden');
    renderTodayView();
  } else {
    todayView.classList.add('hidden');
    weekView.classList.remove('hidden');
    renderWeekView();
  }
}

// ── Event Wiring ──────────────────────────────────────────────────────────────

function wireEvents() {
  // View toggle
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      render();
    });
  });

  // Category filter
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.cat;
      render();
    });
  });

  // Quick-add
  const quickInput = document.getElementById('quick-title');
  document.getElementById('quick-add-btn').addEventListener('click', () => {
    const title = quickInput.value.trim();
    if (!title) { quickInput.focus(); return; }
    addTask({
      title,
      category:  document.getElementById('quick-category').value,
      timeBlock: document.getElementById('quick-timeblock').value,
      priority:  'med',
      recurrence: 'daily',
    });
    quickInput.value = '';
  });

  quickInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('quick-add-btn').click();
  });

  // Modal open / close
  const overlay = document.getElementById('modal-overlay');

  document.getElementById('open-modal-btn').addEventListener('click', () => {
    overlay.classList.remove('hidden');
    document.getElementById('form-title').focus();
  });

  function closeModal() {
    overlay.classList.add('hidden');
    document.getElementById('task-form').reset();
  }

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closeModal();
  });

  // Full-add form submit
  document.getElementById('task-form').addEventListener('submit', e => {
    e.preventDefault();
    const title = document.getElementById('form-title').value.trim();
    if (!title) return;
    addTask({
      title,
      category:   document.getElementById('form-category').value,
      timeBlock:  document.getElementById('form-timeblock').value,
      dueTime:    document.getElementById('form-duetime').value,
      priority:   document.getElementById('form-priority').value,
      recurrence: document.querySelector('input[name="recurrence"]:checked').value,
      notes:      document.getElementById('form-notes').value,
    });
    closeModal();
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  loadTasks();
  wireEvents();
  render();
}

document.addEventListener('DOMContentLoaded', init);
