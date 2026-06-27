(() => {
  'use strict';

  const STORAGE_KEY = 'timeAuditPwa.v1';
  const LEGACY_KEY = 'timeAuditPwa';
  const APP_VERSION = '1.0.0';
  const REMINDER_SCAN_MS = 30 * 1000;

  const DEFAULT_CATEGORY_DATA = [
    ['cat_study', 'Study', '#2563eb', '📘', true],
    ['cat_work', 'Work', '#7c3aed', '💼', false],
    ['cat_class', 'Class', '#0891b2', '🎓', true],
    ['cat_business', 'Business', '#d97706', '🏪', false],
    ['cat_sleep', 'Sleep', '#4b5563', '🌙', false],
    ['cat_food', 'Food', '#16a34a', '🍽', false],
    ['cat_commute', 'Commute', '#0f766e', '🚌', false],
    ['cat_rest', 'Rest', '#65a30d', '☕', false],
    ['cat_exercise', 'Exercise', '#dc2626', '🏃', false],
    ['cat_chores', 'Chores', '#9333ea', '🧹', false],
    ['cat_entertainment', 'Entertainment', '#db2777', '🎬', false],
    ['cat_scrolling', 'Scrolling', '#ea580c', '📱', false],
    ['cat_social', 'Social', '#0284c7', '💬', false],
    ['cat_family', 'Family', '#be123c', '🏠', false],
    ['cat_prayer', 'Prayer', '#047857', '🤲', false],
    ['cat_planning', 'Planning', '#4338ca', '🗓', true],
    ['cat_other', 'Other', '#64748b', '•', false]
  ];

  const DEFAULT_ACTIVITY_DATA = [
    ['act_studying', 'Studying', 'cat_study'],
    ['act_class', 'Class', 'cat_class'],
    ['act_assignment', 'Assignment', 'cat_study'],
    ['act_reading', 'Reading', 'cat_study'],
    ['act_practice', 'Practice problem', 'cat_study'],
    ['act_business', 'Business work', 'cat_business'],
    ['act_meeting', 'Meeting', 'cat_work'],
    ['act_eating', 'Eating', 'cat_food'],
    ['act_sleeping', 'Sleeping', 'cat_sleep'],
    ['act_commute', 'Commute', 'cat_commute'],
    ['act_scrolling', 'Scrolling', 'cat_scrolling'],
    ['act_youtube', 'YouTube', 'cat_entertainment'],
    ['act_gaming', 'Gaming', 'cat_entertainment'],
    ['act_exercise', 'Exercise', 'cat_exercise'],
    ['act_prayer', 'Prayer', 'cat_prayer'],
    ['act_family', 'Family time', 'cat_family'],
    ['act_rest', 'Rest', 'cat_rest'],
    ['act_chores', 'Chores', 'cat_chores'],
    ['act_planning', 'Planning', 'cat_planning'],
    ['act_other', 'Other', 'cat_other']
  ];

  const DEFAULT_MESSAGES = {
    progress: [
      'Don’t forget to keep track of your progress.',
      'Take 30 seconds to log what you just did.',
      'Your day is easier to improve when you track it honestly.',
      'Log the block now before you forget.'
    ],
    export: [
      'Don’t forget to export and submit your daily data.',
      'Your accountability report is due. Export today’s summary.',
      'Finish the day properly. Export your report.',
      'Share your progress report before ending the day.'
    ],
    motivational: [
      'Small progress still counts. Keep going.',
      'Don’t quit the day just because one block went badly.',
      'You don’t need a perfect day. You need an honest record.',
      'Track it first. Improve it next.',
      'One focused block can still save the day.',
      'Your time tells the truth. Keep logging.',
      'Don’t disappear from your own day.',
      'Reset now. The day is not over yet.',
      'Discipline is built one block at a time.',
      'The goal is not perfection. The goal is awareness.'
    ]
  };

  const state = {
    data: null,
    screen: 'today',
    editLogId: null,
    addPreset: null,
    report: {
      filter: 'today',
      customStart: todayISO(),
      customEnd: todayISO(),
      comparisonType: 'dod',
      comparisonChart: 'clustered',
      radarPeriod: 'week',
      lineRange: '7d',
      selectedCategories: [],
      radarCategories: [],
      selectedActivities: []
    },
    timer: {
      mode: 'focus',
      focusMinutes: 25,
      breakMinutes: 5,
      customFocus: 25,
      customBreak: 5,
      totalSeconds: 25 * 60,
      remainingSeconds: 25 * 60,
      running: false,
      interval: null
    },
    lastNotificationMinute: '',
    deferredInstallPrompt: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    state.data = loadData();
    ensureFreshDefaults();
    state.report.selectedCategories = state.data.categories.slice(0, 3).map(c => c.id);
    state.report.radarCategories = state.data.categories.slice(0, 6).map(c => c.id);
    state.report.selectedActivities = state.data.activities.slice(0, 3).map(a => a.id);
    applyTheme();
    bindShellEvents();
    initPwa();
    startReminderScan();
    navigate('today');
  }

  function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
    if (!saved) return createDefaultData();
    try {
      const parsed = JSON.parse(saved);
      return migrateData(parsed);
    } catch (error) {
      console.error(error);
      return createDefaultData();
    }
  }

  function createDefaultData() {
    const now = new Date().toISOString();
    const categories = DEFAULT_CATEGORY_DATA.map(([id, name, color, icon, countsAsStudyTime]) => ({
      id,
      name,
      color,
      icon,
      countsAsStudyTime,
      targets: [],
      isDefault: true,
      createdAt: now,
      updatedAt: now
    }));

    const defaultTargets = [
      { categoryId: 'cat_study', period: 'daily', type: 'minimum', durationMinutes: 240 },
      { categoryId: 'cat_scrolling', period: 'daily', type: 'maximum', durationMinutes: 60 },
      { categoryId: 'cat_sleep', period: 'daily', type: 'minimum', durationMinutes: 420 }
    ];

    defaultTargets.forEach(target => {
      const category = categories.find(c => c.id === target.categoryId);
      if (category) {
        category.targets.push({
          id: uid(),
          ...target,
          active: true
        });
      }
    });

    return {
      version: APP_VERSION,
      categories,
      activities: DEFAULT_ACTIVITY_DATA.map(([id, name, defaultCategoryId]) => ({
        id,
        name,
        defaultCategoryId,
        isDefault: true,
        createdAt: now,
        updatedAt: now
      })),
      logs: [],
      reflections: [],
      settings: {
        theme: 'system',
        dayStartTime: '00:00',
        dayEndTime: '24:00',
        streakMinimumLoggedMinutes: 720,
        notificationsEnabled: false,
        progressReminderEnabled: true,
        exportReminderEnabled: true,
        motivationalReminderEnabled: true,
        progressReminderTimes: ['10:00', '15:00', '20:00'],
        exportReminderTimes: ['22:30'],
        motivationalReminderTimes: ['12:30', '18:30'],
        customNotificationMessages: structuredClone(DEFAULT_MESSAGES),
        defaultExportPrivacySettings: {
          includeNotes: false,
          includeReflection: true,
          includeTimeline: true,
          summaryOnly: false,
          includeProductivity: true
        }
      }
    };
  }

  function migrateData(raw) {
    const defaults = createDefaultData();
    const data = {
      version: raw.version || APP_VERSION,
      categories: Array.isArray(raw.categories) ? raw.categories : defaults.categories,
      activities: Array.isArray(raw.activities) ? raw.activities : defaults.activities,
      logs: Array.isArray(raw.logs) ? raw.logs : [],
      reflections: Array.isArray(raw.reflections) ? raw.reflections : [],
      settings: { ...defaults.settings, ...(raw.settings || {}) }
    };

    data.settings.defaultExportPrivacySettings = {
      ...defaults.settings.defaultExportPrivacySettings,
      ...(raw.settings?.defaultExportPrivacySettings || {})
    };
    data.settings.customNotificationMessages = {
      progress: raw.settings?.customNotificationMessages?.progress || defaults.settings.customNotificationMessages.progress,
      export: raw.settings?.customNotificationMessages?.export || defaults.settings.customNotificationMessages.export,
      motivational: raw.settings?.customNotificationMessages?.motivational || defaults.settings.customNotificationMessages.motivational
    };

    data.categories = data.categories.map(category => ({
      id: category.id || uid(),
      name: category.name || 'Untitled Category',
      color: category.color || '#64748b',
      icon: category.icon || '•',
      countsAsStudyTime: Boolean(category.countsAsStudyTime),
      targets: Array.isArray(category.targets) ? category.targets.map(t => ({
        id: t.id || uid(),
        categoryId: t.categoryId || category.id,
        period: ['daily', 'weekly', 'monthly'].includes(t.period) ? t.period : 'daily',
        type: ['minimum', 'maximum'].includes(t.type) ? t.type : 'minimum',
        durationMinutes: Math.max(0, Number(t.durationMinutes) || 0),
        active: t.active !== false
      })) : [],
      isDefault: Boolean(category.isDefault),
      createdAt: category.createdAt || new Date().toISOString(),
      updatedAt: category.updatedAt || new Date().toISOString()
    }));

    data.activities = data.activities.map(activity => ({
      id: activity.id || uid(),
      name: activity.name || 'Untitled Activity',
      defaultCategoryId: activity.defaultCategoryId || data.categories.at(-1)?.id || 'cat_other',
      isDefault: Boolean(activity.isDefault),
      createdAt: activity.createdAt || new Date().toISOString(),
      updatedAt: activity.updatedAt || new Date().toISOString()
    }));

    data.logs = data.logs.map(log => ({
      id: log.id || uid(),
      date: log.date || todayISO(),
      startTime: log.startTime || '09:00',
      endTime: log.endTime || '10:00',
      durationMinutes: Number(log.durationMinutes) || Math.max(0, timeToMinutes(log.endTime || '10:00') - timeToMinutes(log.startTime || '09:00')),
      activityId: log.activityId || '',
      activityNameSnapshot: log.activityNameSnapshot || log.activityName || 'Activity',
      categoryId: log.categoryId || '',
      categoryNameSnapshot: log.categoryNameSnapshot || log.categoryName || 'Category',
      productivityRating: clamp(Number(log.productivityRating) || 3, 1, 5),
      note: log.note || '',
      createdAt: log.createdAt || new Date().toISOString(),
      updatedAt: log.updatedAt || new Date().toISOString()
    }));

    data.reflections = data.reflections.map(reflection => ({
      id: reflection.id || uid(),
      date: reflection.date || todayISO(),
      dailyNote: reflection.dailyNote || '',
      wentWell: reflection.wentWell || '',
      wastedTime: reflection.wastedTime || '',
      improveTomorrow: reflection.improveTomorrow || '',
      tomorrowPriority: reflection.tomorrowPriority || '',
      overallProductivityRating: reflection.overallProductivityRating ? clamp(Number(reflection.overallProductivityRating), 1, 5) : '',
      createdAt: reflection.createdAt || new Date().toISOString(),
      updatedAt: reflection.updatedAt || new Date().toISOString()
    }));

    return data;
  }

  function ensureFreshDefaults() {
    const existingCategoryNames = new Set(state.data.categories.map(c => c.name.toLowerCase()));
    DEFAULT_CATEGORY_DATA.forEach(([id, name, color, icon, countsAsStudyTime]) => {
      if (!existingCategoryNames.has(name.toLowerCase())) {
        const now = new Date().toISOString();
        state.data.categories.push({ id, name, color, icon, countsAsStudyTime, targets: [], isDefault: true, createdAt: now, updatedAt: now });
      }
    });
    const existingActivityNames = new Set(state.data.activities.map(a => a.name.toLowerCase()));
    DEFAULT_ACTIVITY_DATA.forEach(([id, name, defaultCategoryId]) => {
      if (!existingActivityNames.has(name.toLowerCase())) {
        const now = new Date().toISOString();
        state.data.activities.push({ id, name, defaultCategoryId, isDefault: true, createdAt: now, updatedAt: now });
      }
    });
    saveData(false);
  }

  function saveData(showToast = false) {
    state.data.version = APP_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    if (showToast) toast('Saved locally on this device.');
  }

  function bindShellEvents() {
    $$('.nav-item').forEach(button => {
      button.addEventListener('click', () => navigate(button.dataset.screen));
    });

    $('#themeToggle').addEventListener('click', () => {
      const current = state.data.settings.theme;
      state.data.settings.theme = current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark';
      saveData();
      applyTheme();
      render();
      toast(`Theme: ${state.data.settings.theme}`);
    });

    window.addEventListener('hashchange', () => {
      const next = location.hash.replace('#', '') || 'today';
      if (['today', 'add', 'timer', 'reports', 'settings'].includes(next)) navigate(next, false);
    });
  }

  function initPwa() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js').catch(console.error);
    }

    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      state.deferredInstallPrompt = event;
      const installBtn = $('#installBtn');
      installBtn.hidden = false;
      installBtn.onclick = async () => {
        installBtn.hidden = true;
        if (!state.deferredInstallPrompt) return;
        state.deferredInstallPrompt.prompt();
        await state.deferredInstallPrompt.userChoice;
        state.deferredInstallPrompt = null;
      };
    });
  }

  function navigate(screen, pushHash = true) {
    state.screen = screen;
    if (screen !== 'add') state.editLogId = null;
    if (pushHash && location.hash.replace('#', '') !== screen) history.replaceState(null, '', `#${screen}`);
    $$('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.screen === screen));
    render();
    $('#app')?.focus({ preventScroll: true });
  }

  function render() {
    const app = $('#app');
    $('#currentDateLabel').textContent = formatLongDate(todayISO());
    const titles = { today: 'Today', add: state.editLogId ? 'Edit Activity' : 'Add Activity', timer: 'Pomodoro', reports: 'Reports', settings: 'Settings' };
    $('#screenTitle').textContent = titles[state.screen] || 'Time Audit';

    if (state.screen === 'today') app.innerHTML = renderTodayScreen();
    if (state.screen === 'add') app.innerHTML = renderAddScreen();
    if (state.screen === 'timer') app.innerHTML = renderTimerScreen();
    if (state.screen === 'reports') app.innerHTML = renderReportsScreen();
    if (state.screen === 'settings') app.innerHTML = renderSettingsScreen();

    bindScreenEvents();
    if (state.screen === 'add') validateActivityForm();
    if (state.screen === 'reports') drawReportCharts();
    if (state.screen === 'timer') updateTimerFace();
  }

  function bindScreenEvents() {
    const app = $('#app');
    app.onclick = event => {
      const segment = event.target.closest('.segment');
      if (segment && !event.target.closest('[data-action]')) {
        const radio = segment.querySelector('input[type="radio"]');
        if (radio && !radio.checked) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      }
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (!action) return;
      handleAction(action, event);
    };

    app.onchange = event => handleChange(event);
    app.oninput = event => handleInput(event);

    const addForm = $('#activityForm');
    if (addForm) addForm.addEventListener('submit', saveActivityLog);

    const reflectionForm = $('#reflectionForm');
    if (reflectionForm) reflectionForm.addEventListener('submit', saveReflection);

    const categoryForm = $('#categoryForm');
    if (categoryForm) categoryForm.addEventListener('submit', saveCategory);

    const activityPresetForm = $('#activityPresetForm');
    if (activityPresetForm) activityPresetForm.addEventListener('submit', saveActivityPreset);

    const settingsForm = $('#settingsForm');
    if (settingsForm) settingsForm.addEventListener('submit', saveSettings);

    const importInput = $('#jsonImportInput');
    if (importInput) importInput.addEventListener('change', importJsonBackup);
  }

  function handleAction(action, event) {
    const target = event.target.closest('[data-action]');
    const id = target?.dataset.id;
    switch (action) {
      case 'go-add':
        state.editLogId = null;
        state.addPreset = null;
        navigate('add');
        break;
      case 'start-now': setTimeInput('startTime', minutesToTime(nowMinutes())); validateActivityForm(); break;
      case 'end-now': setTimeInput('endTime', minutesToTime(nowMinutes())); validateActivityForm(); break;
      case 'duplicate-previous': duplicatePreviousIntoForm(); break;
      case 'fill-gap': fillGap(target?.dataset.date, Number(target?.dataset.start), Number(target?.dataset.end)); break;
      case 'fill-first-gap': fillFirstGap(); break;
      case 'edit-log': state.editLogId = id; navigate('add'); break;
      case 'delete-log': deleteLog(id); break;
      case 'export-today': showExportModal('today'); break;
      case 'export-range-image': showExportModal('range'); break;
      case 'download-csv': downloadCsvForCurrentRange(); break;
      case 'download-json': downloadJsonBackup(); break;
      case 'reset-demo': addDemoData(); break;
      case 'clear-all': clearAllData(); break;
      case 'request-notifications': requestNotificationPermission(); break;
      case 'test-notification': sendLocalNotification('Time Audit', 'Notification test worked.'); break;
      case 'update-category': updateCategory(id); break;
      case 'delete-category': deleteCategory(id); break;
      case 'add-target': addTarget(id); break;
      case 'delete-target': deleteTarget(target.dataset.categoryId, id); break;
      case 'update-activity': updateActivityPreset(id); break;
      case 'delete-activity': deleteActivityPreset(id); break;
      case 'timer-preset': setTimerPreset(target.dataset.preset); break;
      case 'timer-start': startTimer(); break;
      case 'timer-pause': pauseTimer(); break;
      case 'timer-reset': resetTimer(); break;
      case 'timer-switch': switchTimerMode(target.dataset.mode); break;
      case 'export-confirm': exportReportImage(new FormData($('#exportOptionsForm'))); closeModal(); break;
      case 'close-modal': closeModal(); break;
      default: break;
    }
  }

  function handleChange(event) {
    const target = event.target;
    if (target.id === 'activityId') {
      const activity = getActivity(target.value);
      if (activity) $('#categoryId').value = activity.defaultCategoryId;
      validateActivityForm();
    }
    if (['date', 'startTime', 'endTime', 'activityId', 'categoryId', 'productivityRating'].includes(target.id)) validateActivityForm();

    if (target.name === 'reportFilter') {
      state.report.filter = target.value;
      render();
    }
    if (target.id === 'customStart') state.report.customStart = target.value;
    if (target.id === 'customEnd') state.report.customEnd = target.value;
    if (['customStart', 'customEnd'].includes(target.id)) render();

    if (target.name === 'comparisonType') { state.report.comparisonType = target.value; render(); }
    if (target.name === 'comparisonChart') { state.report.comparisonChart = target.value; render(); }
    if (target.name === 'radarPeriod') { state.report.radarPeriod = target.value; render(); }
    if (target.name === 'lineRange') { state.report.lineRange = target.value; render(); }

    if (target.name === 'selectedCategories') updateSelectedList('selectedCategories', target, 3);
    if (target.name === 'radarCategories') updateSelectedList('radarCategories', target, 8, 3);
    if (target.name === 'selectedActivities') updateSelectedList('selectedActivities', target, 3);
  }

  function handleInput(event) {
    const target = event.target;
    if (['date', 'startTime', 'endTime'].includes(target.id)) validateActivityForm();
    if (target.id === 'customFocus' || target.id === 'customBreak') {
      state.timer.customFocus = Math.max(1, Number($('#customFocus')?.value || 25));
      state.timer.customBreak = Math.max(1, Number($('#customBreak')?.value || 5));
      state.timer.focusMinutes = state.timer.customFocus;
      state.timer.breakMinutes = state.timer.customBreak;
      resetTimer();
    }
  }

  function renderTodayScreen() {
    const date = todayISO();
    const summary = getDaySummary(date);
    const gaps = getGapsForDate(date);
    const reflection = getReflection(date);
    const categoryBreakdown = getCategoryTotals(getLogsByDate(date));
    const topCategories = categoryBreakdown.slice(0, 6);
    const targetRows = getTargetRowsForPeriod('daily', date, date).slice(0, 5);

    return `
      <section class="stack">
        <article class="card hero stack-sm">
          <div class="between">
            <div>
              <p class="eyebrow">${escapeHtml(formatLongDate(date))}</p>
              <h2>Today’s Summary</h2>
            </div>
            <span class="chip">🔥 ${summary.streak.current} day streak</span>
          </div>
          <div class="stat-grid">
            ${statHtml('Logged', formatDuration(summary.loggedMinutes))}
            ${statHtml('Unlogged', formatDuration(summary.unloggedMinutes))}
            ${statHtml('Study', formatDuration(summary.studyMinutes))}
            ${statHtml('Productivity', summary.avgProductivity ? `${summary.avgProductivity.toFixed(1)}/5` : '—')}
          </div>
          <div class="row-wrap">
            <span class="chip">Top: ${escapeHtml(summary.topCategory || 'None yet')}</span>
            <span class="chip">Best streak: ${summary.streak.best} days</span>
            <span class="chip">${summary.targetSummary}</span>
          </div>
        </article>

        <section class="card stack-sm">
          <div class="between">
            <h2>Quick Actions</h2>
            <span class="small muted">Manual logging only</span>
          </div>
          <div class="grid-2">
            <button class="btn" data-action="go-add">＋ Add Activity</button>
            <button class="btn secondary" data-action="fill-first-gap" ${gaps.length ? '' : 'disabled'}>Fill Missing Time</button>
            <button class="btn secondary" onclick="document.getElementById('reflectionForm')?.scrollIntoView({behavior:'smooth'});">Write Reflection</button>
            <button class="btn secondary" data-action="export-today">Export Today</button>
          </div>
        </section>

        <section class="card stack-sm">
          <div class="between">
            <h2>Daily Timeline</h2>
            <span class="chip ${gaps.length ? 'warn' : 'good'}">${gaps.length ? `${gaps.length} gaps` : 'No gaps'}</span>
          </div>
          ${renderTimeline(date, true)}
        </section>

        <section class="card stack-sm">
          <div class="between">
            <h2>Streak Visual</h2>
            <span class="small muted">Minimum: ${formatDuration(state.data.settings.streakMinimumLoggedMinutes)}</span>
          </div>
          ${renderStreakDots(30)}
        </section>

        <section class="card stack-sm">
          <h2>Top Categories</h2>
          ${topCategories.length ? `<div class="category-strip">${topCategories.map(item => renderCategoryPill(item)).join('')}</div>` : emptyState('No category time logged yet.')}
        </section>

        <section class="card stack-sm">
          <h2>Target Progress</h2>
          ${targetRows.length ? renderTargetRows(targetRows) : emptyState('No active daily targets yet. Add category targets in Settings.')}
        </section>

        <section class="card stack-sm">
          <div class="between">
            <h2>Daily Reflection</h2>
            <span class="small muted">Saved per date</span>
          </div>
          ${renderReflectionForm(reflection, date)}
        </section>
      </section>
    `;
  }

  function statHtml(label, value) {
    return `<div class="stat"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value">${escapeHtml(value)}</div></div>`;
  }

  function renderTimeline(date, includeGaps = true) {
    const logs = getLogsByDate(date).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    const items = [];
    if (includeGaps) {
      getGapsForDate(date).forEach(gap => items.push({ type: 'gap', ...gap }));
    }
    logs.forEach(log => items.push({ type: 'log', ...log, start: timeToMinutes(log.startTime), end: timeToMinutes(log.endTime) }));
    items.sort((a, b) => a.start - b.start || (a.type === 'gap' ? -1 : 1));

    if (!items.length) return emptyState('Nothing logged yet. Tap Add Activity to start your audit.');

    return `<div class="timeline">${items.map(item => {
      if (item.type === 'gap') {
        return `<div class="timeline-item">
          <div class="timeline-dot" style="--item-color: var(--soft)"></div>
          <button class="timeline-card missing" data-action="fill-gap" data-date="${date}" data-start="${item.start}" data-end="${item.end}">
            <div class="between"><strong>Missing time</strong><span class="small">${formatTimeRange(item.start, item.end)}</span></div>
            <p class="small muted">Tap to fill this gap · ${formatDuration(item.end - item.start)}</p>
          </button>
        </div>`;
      }
      const category = getCategory(item.categoryId);
      const color = category?.color || '#64748b';
      return `<div class="timeline-item">
        <div class="timeline-dot" style="--item-color:${escapeHtml(color)}"></div>
        <article class="timeline-card">
          <div class="between">
            <div>
              <strong>${escapeHtml(item.activityNameSnapshot)}</strong>
              <p class="small muted">${escapeHtml(item.categoryNameSnapshot)} · ${item.productivityRating}/5 · ${formatDuration(item.durationMinutes)}</p>
            </div>
            <span class="chip">${escapeHtml(formatTimeRange(timeToMinutes(item.startTime), timeToMinutes(item.endTime)))}</span>
          </div>
          ${item.note ? `<p class="small" style="margin-top:.55rem;">${escapeHtml(truncate(item.note, 100))}</p>` : ''}
          <div class="row-wrap" style="margin-top:.7rem;">
            <button class="btn secondary" data-action="edit-log" data-id="${item.id}">Edit</button>
            <button class="btn danger" data-action="delete-log" data-id="${item.id}">Delete</button>
          </div>
        </article>
      </div>`;
    }).join('')}</div>`;
  }

  function renderStreakDots(days = 30) {
    const dates = Array.from({ length: days }, (_, i) => addDays(todayISO(), -(days - 1 - i)));
    const hitMap = new Map(dates.map(date => [date, getLoggedMinutesByDate(date) >= state.data.settings.streakMinimumLoggedMinutes]));
    const visible = dates.slice(-7);
    const thirty = dates;
    return `
      <div class="streak-dots" aria-label="Last 7 days streak visual">
        ${visible.map(date => `<div class="streak-dot ${hitMap.get(date) ? 'hit' : ''}" title="${date}">${weekdayShort(date)}</div>`).join('')}
      </div>
      <div class="row-wrap" style="margin-top:.75rem;">
        ${thirty.map(date => `<span class="color-dot" title="${date}" style="--dot:${hitMap.get(date) ? 'var(--good)' : 'var(--surface-3)'}"></span>`).join('')}
      </div>
    `;
  }

  function renderCategoryPill(item) {
    return `<div class="category-pill">
      <span><span class="color-dot" style="--dot:${escapeHtml(item.color)}"></span> ${escapeHtml(item.icon || '')}</span>
      <strong>${escapeHtml(item.name)}</strong>
      <span class="small muted">${formatDuration(item.minutes)}</span>
    </div>`;
  }

  function renderTargetRows(rows) {
    return `<div class="table-lite">${rows.map(row => {
      const progressPercent = row.type === 'minimum'
        ? clamp((row.actual / Math.max(row.target, 1)) * 100, 0, 140)
        : clamp((Math.min(row.actual, row.target) / Math.max(row.target, 1)) * 100, 0, 100);
      const statusClass = row.type === 'minimum' ? (row.actual >= row.target ? 'good' : 'warn') : (row.actual <= row.target ? 'good' : 'bad');
      const statusText = row.type === 'minimum'
        ? row.actual >= row.target ? 'Reached' : `${formatDuration(row.target - row.actual)} left`
        : row.actual <= row.target ? 'Within limit' : `${formatDuration(row.actual - row.target)} over`;
      return `<div class="stack-sm">
        <div class="between">
          <div><strong>${escapeHtml(row.category.name)}</strong><p class="small muted">${row.type} · ${row.period} · target ${formatDuration(row.target)}</p></div>
          <span class="chip ${statusClass}">${statusText}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="--progress:${progressPercent}%;--fill:${row.type === 'maximum' && row.actual > row.target ? 'var(--bad)' : row.category.color}"></div></div>
        <p class="small muted">Actual: ${formatDuration(row.actual)}</p>
      </div>`;
    }).join('')}</div>`;
  }

  function renderReflectionForm(reflection, date) {
    return `<form id="reflectionForm" class="form-grid">
      <input type="hidden" name="date" value="${date}">
      <label>Daily note<textarea name="dailyNote" placeholder="Overall note for the day">${escapeHtml(reflection?.dailyNote || '')}</textarea></label>
      <label>What went well today?<textarea name="wentWell" placeholder="Good blocks, good decisions, completed tasks">${escapeHtml(reflection?.wentWell || '')}</textarea></label>
      <label>What wasted time today?<textarea name="wastedTime" placeholder="Where time leaked or got wasted">${escapeHtml(reflection?.wastedTime || '')}</textarea></label>
      <label>What should improve tomorrow?<textarea name="improveTomorrow" placeholder="One practical improvement">${escapeHtml(reflection?.improveTomorrow || '')}</textarea></label>
      <label>Tomorrow’s main priority<input name="tomorrowPriority" value="${escapeHtml(reflection?.tomorrowPriority || '')}" placeholder="Example: finish statistics practice"></label>
      <label>Overall productivity rating
        <select name="overallProductivityRating">
          <option value="">Select</option>
          ${[1,2,3,4,5].map(n => `<option value="${n}" ${Number(reflection?.overallProductivityRating) === n ? 'selected' : ''}>${n}/5</option>`).join('')}
        </select>
      </label>
      <button class="btn full" type="submit">Save Reflection</button>
    </form>`;
  }

  function renderAddScreen() {
    const editing = state.editLogId ? state.data.logs.find(log => log.id === state.editLogId) : null;
    const preset = state.addPreset;
    const latestLog = getLogsByDate(todayISO()).sort((a, b) => timeToMinutes(b.endTime) - timeToMinutes(a.endTime))[0];
    const defaultActivity = state.data.activities[0];
    // Sanitize a time string for use in <input type="time"> (valid range: 00:00–23:59).
    // "24:00" and any out-of-range value are clamped so Android Chrome shows the Set button.
    function safeTimeInput(t, fallback) {
      if (!t || typeof t !== 'string') return fallback;
      const mins = timeToMinutes(t);
      if (!isFinite(mins)) return fallback;
      return minutesToTime(Math.min(mins, 1439)); // clamp 24:00 → 23:59
    }

    const formValues = editing || {
      date: preset?.date || todayISO(),
      startTime: preset ? minutesToTime(preset.start) : safeTimeInput(latestLog?.endTime, '09:00'),
      endTime: preset ? minutesToTime(preset.end) : minutesToTime(Math.min(1439, timeToMinutes(safeTimeInput(latestLog?.endTime, '09:00')) + 60)),
      activityId: defaultActivity?.id || '',
      categoryId: defaultActivity?.defaultCategoryId || state.data.categories[0]?.id || '',
      productivityRating: 3,
      note: ''
    };

    return `
      <section class="stack">
        <article class="card stack-sm">
          <div class="between">
            <div>
              <h2>${editing ? 'Edit time block' : 'Create time block'}</h2>
              <p class="small muted">Custom start/end time, manual logging, no auto-tracking.</p>
            </div>
            ${editing ? '<span class="chip">Editing</span>' : '<span class="chip">New</span>'}
          </div>
          <div id="activityValidation"></div>
          <form id="activityForm" class="form-grid">
            <input type="hidden" name="logId" value="${editing?.id || ''}">
            <label>Date<input id="date" name="date" type="date" value="${escapeHtml(formValues.date)}" required></label>
            <div class="form-row">
              <label>Start time<input id="startTime" name="startTime" type="time" value="${escapeHtml(formValues.startTime)}" required></label>
              <label>End time<input id="endTime" name="endTime" type="time" value="${escapeHtml(formValues.endTime)}" required></label>
            </div>
            <div class="grid-2">
              <button type="button" class="btn secondary" data-action="start-now">Start Now</button>
              <button type="button" class="btn secondary" data-action="end-now">End Now</button>
            </div>
            <div class="grid-2">
              <button type="button" class="btn secondary" data-action="fill-first-gap">Fill Gap</button>
              <button type="button" class="btn secondary" data-action="duplicate-previous">Duplicate Previous</button>
            </div>
            <label>Activity
              <select id="activityId" name="activityId" required>
                ${state.data.activities.map(activity => `<option value="${activity.id}" ${formValues.activityId === activity.id ? 'selected' : ''}>${escapeHtml(activity.name)}</option>`).join('')}
              </select>
            </label>
            <label>Category
              <select id="categoryId" name="categoryId" required>
                ${state.data.categories.map(category => `<option value="${category.id}" ${formValues.categoryId === category.id ? 'selected' : ''}>${escapeHtml(category.icon)} ${escapeHtml(category.name)}${category.countsAsStudyTime ? ' · Study' : ''}</option>`).join('')}
              </select>
            </label>
            <label>Productivity rating
              <select id="productivityRating" name="productivityRating" required>
                <option value="1" ${Number(formValues.productivityRating) === 1 ? 'selected' : ''}>1 = Very unproductive</option>
                <option value="2" ${Number(formValues.productivityRating) === 2 ? 'selected' : ''}>2 = Low productivity</option>
                <option value="3" ${Number(formValues.productivityRating) === 3 ? 'selected' : ''}>3 = Neutral / necessary</option>
                <option value="4" ${Number(formValues.productivityRating) === 4 ? 'selected' : ''}>4 = Productive</option>
                <option value="5" ${Number(formValues.productivityRating) === 5 ? 'selected' : ''}>5 = Highly productive</option>
              </select>
            </label>
            <label>Activity note<textarea name="note" placeholder="Optional note for this time block">${escapeHtml(formValues.note || '')}</textarea></label>
            <button id="activitySaveBtn" class="btn full" type="submit">${editing ? 'Update Activity' : 'Save Activity'}</button>
          </form>
        </article>

        <article class="card stack-sm">
          <h2>Today’s Existing Blocks</h2>
          ${renderTimeline(todayISO(), false)}
        </article>
      </section>
    `;
  }

  function validateActivityForm() {
    const box = $('#activityValidation');
    const saveBtn = $('#activitySaveBtn');
    if (!box) return;
    const date = $('#date')?.value;
    const start = timeToMinutes($('#startTime')?.value || '00:00');
    const end = timeToMinutes($('#endTime')?.value || '00:00');
    const messages = [];
    let blocking = false;

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      messages.push(['bad', 'Please enter valid start and end times.']);
      blocking = true;
    } else if (end <= start) {
      messages.push(['bad', 'End time must be after start time.']);
      blocking = true;
    } else {
      const overlap = findOverlap(date, start, end, state.editLogId);
      if (overlap.length) {
        messages.push(['warn', `Overlaps with ${overlap.map(log => `${log.activityNameSnapshot} (${log.startTime}–${log.endTime})`).join(', ')}. You can still save, but reports may double-count overlapping minutes.`]);
      } else {
        messages.push(['good', `Duration: ${formatDuration(end - start)}. No overlap found.`]);
      }
    }
    box.innerHTML = messages.map(([kind, text]) => `<div class="alert ${kind}">${escapeHtml(text)}</div>`).join('');
    if (saveBtn) saveBtn.disabled = blocking;
  }

  function saveActivityLog(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = form.get('logId') || uid();
    const date = form.get('date');
    const startTime = form.get('startTime');
    const endTime = form.get('endTime');
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    if (end <= start) {
      toast('End time must be after start time.');
      validateActivityForm();
      return;
    }
    const activity = getActivity(form.get('activityId'));
    const category = getCategory(form.get('categoryId'));
    const existing = state.data.logs.find(log => log.id === id);
    const now = new Date().toISOString();
    const payload = {
      id,
      date,
      startTime,
      endTime,
      durationMinutes: end - start,
      activityId: activity?.id || '',
      activityNameSnapshot: activity?.name || 'Activity',
      categoryId: category?.id || '',
      categoryNameSnapshot: category?.name || 'Category',
      productivityRating: clamp(Number(form.get('productivityRating')), 1, 5),
      note: String(form.get('note') || '').trim(),
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    if (existing) Object.assign(existing, payload);
    else state.data.logs.push(payload);
    saveData(true);
    state.editLogId = null;
    state.addPreset = null;
    navigate('today');
  }

  function saveReflection(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = form.get('date');
    const existing = getReflection(date);
    const now = new Date().toISOString();
    const payload = {
      id: existing?.id || uid(),
      date,
      dailyNote: String(form.get('dailyNote') || '').trim(),
      wentWell: String(form.get('wentWell') || '').trim(),
      wastedTime: String(form.get('wastedTime') || '').trim(),
      improveTomorrow: String(form.get('improveTomorrow') || '').trim(),
      tomorrowPriority: String(form.get('tomorrowPriority') || '').trim(),
      overallProductivityRating: form.get('overallProductivityRating') ? Number(form.get('overallProductivityRating')) : '',
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    if (existing) Object.assign(existing, payload);
    else state.data.reflections.push(payload);
    saveData(true);
    render();
  }

  function deleteLog(id) {
    const log = state.data.logs.find(item => item.id === id);
    if (!log) return;
    if (!confirm(`Delete ${log.activityNameSnapshot} (${log.startTime}–${log.endTime})?`)) return;
    state.data.logs = state.data.logs.filter(item => item.id !== id);
    saveData(true);
    render();
  }

  function fillGap(date, start, end) {
    state.editLogId = null;
    state.addPreset = { date, start, end };
    navigate('add');
  }

  function fillFirstGap() {
    const date = state.screen === 'add' ? ($('#date')?.value || todayISO()) : todayISO();
    const gap = getGapsForDate(date)[0];
    if (!gap) {
      toast('No missing gaps found for that date.');
      return;
    }
    fillGap(date, gap.start, gap.end);
  }

  function duplicatePreviousIntoForm() {
    const date = $('#date')?.value || todayISO();
    const logs = getLogsByDate(date).sort((a, b) => timeToMinutes(b.endTime) - timeToMinutes(a.endTime));
    const previous = logs[0];
    if (!previous) {
      toast('No previous activity found for this date.');
      return;
    }
    $('#activityId').value = previous.activityId;
    $('#categoryId').value = previous.categoryId;
    $('#productivityRating').value = previous.productivityRating;
    $('[name="note"]').value = previous.note || '';
    const prevDuration = Math.max(15, previous.durationMinutes || 60);
    const start = timeToMinutes(previous.endTime);
    const end = Math.min(24 * 60, start + prevDuration);
    $('#startTime').value = minutesToTime(start);
    $('#endTime').value = minutesToTime(end);
    validateActivityForm();
    toast('Copied previous activity details.');
  }

  function setTimeInput(id, value) {
    const input = $(`#${id}`);
    if (input) input.value = value;
  }

  function renderTimerScreen() {
    const presets = [
      ['25/5', '25 focus / 5 break'],
      ['50/10', '50 focus / 10 break'],
      ['custom', 'Custom']
    ];
    return `
      <section class="stack">
        <article class="card hero stack-sm center">
          <p class="eyebrow">Focus support only</p>
          <h2>Pomodoro Timer</h2>
          <p class="muted">This timer never auto-saves time logs. After focus, create a manual activity block.</p>
        </article>

        <article class="card stack-sm">
          <div class="segmented">
            ${presets.map(([key, label]) => `<button class="segment ${getCurrentTimerPreset() === key ? 'active' : ''}" data-action="timer-preset" data-preset="${key}">${label}</button>`).join('')}
          </div>
          <div class="form-row">
            <label>Focus minutes<input id="customFocus" type="number" min="1" max="240" value="${state.timer.focusMinutes}"></label>
            <label>Break minutes<input id="customBreak" type="number" min="1" max="120" value="${state.timer.breakMinutes}"></label>
          </div>
          <div class="segmented">
            <button class="segment ${state.timer.mode === 'focus' ? 'active' : ''}" data-action="timer-switch" data-mode="focus">Focus</button>
            <button class="segment ${state.timer.mode === 'break' ? 'active' : ''}" data-action="timer-switch" data-mode="break">Break</button>
          </div>
        </article>

        <article class="card stack-sm center">
          <div id="timerFace" class="timer-face">
            <div class="timer-inner">
              <div>
                <div id="timerTime" class="timer-time">${formatSeconds(state.timer.remainingSeconds)}</div>
                <p id="timerMode" class="muted">${state.timer.mode === 'focus' ? 'Focus session' : 'Break time'}</p>
              </div>
            </div>
          </div>
          <div class="grid-3">
            <button class="btn" data-action="timer-start">Start</button>
            <button class="btn secondary" data-action="timer-pause">Pause</button>
            <button class="btn secondary" data-action="timer-reset">Reset</button>
          </div>
          <p class="small muted">Sound alert and vibration are attempted when the browser supports them.</p>
        </article>
      </section>
    `;
  }

  function getCurrentTimerPreset() {
    if (state.timer.focusMinutes === 25 && state.timer.breakMinutes === 5) return '25/5';
    if (state.timer.focusMinutes === 50 && state.timer.breakMinutes === 10) return '50/10';
    return 'custom';
  }

  function setTimerPreset(preset) {
    pauseTimer();
    if (preset === '25/5') {
      state.timer.focusMinutes = 25;
      state.timer.breakMinutes = 5;
    } else if (preset === '50/10') {
      state.timer.focusMinutes = 50;
      state.timer.breakMinutes = 10;
    } else {
      state.timer.focusMinutes = Math.max(1, Number($('#customFocus')?.value || state.timer.customFocus || 25));
      state.timer.breakMinutes = Math.max(1, Number($('#customBreak')?.value || state.timer.customBreak || 5));
    }
    resetTimer();
    render();
  }

  function switchTimerMode(mode) {
    pauseTimer();
    state.timer.mode = mode;
    resetTimer();
    render();
  }

  function startTimer() {
    if (state.timer.running) return;
    state.timer.running = true;
    state.timer.interval = setInterval(() => {
      state.timer.remainingSeconds -= 1;
      if (state.timer.remainingSeconds <= 0) {
        state.timer.remainingSeconds = 0;
        pauseTimer();
        finishPomodoroSession();
      }
      updateTimerFace();
    }, 1000);
    updateTimerFace();
  }

  function pauseTimer() {
    state.timer.running = false;
    if (state.timer.interval) clearInterval(state.timer.interval);
    state.timer.interval = null;
    updateTimerFace();
  }

  function resetTimer() {
    pauseTimer();
    const minutes = state.timer.mode === 'focus' ? state.timer.focusMinutes : state.timer.breakMinutes;
    state.timer.totalSeconds = Math.max(1, Number(minutes)) * 60;
    state.timer.remainingSeconds = state.timer.totalSeconds;
    updateTimerFace();
  }

  function updateTimerFace() {
    const face = $('#timerFace');
    const time = $('#timerTime');
    const mode = $('#timerMode');
    if (!face || !time) return;
    const done = state.timer.totalSeconds ? 1 - (state.timer.remainingSeconds / state.timer.totalSeconds) : 0;
    face.style.setProperty('--progress', `${Math.round(done * 360)}deg`);
    time.textContent = formatSeconds(state.timer.remainingSeconds);
    if (mode) mode.textContent = `${state.timer.mode === 'focus' ? 'Focus session' : 'Break time'} ${state.timer.running ? 'running' : 'paused'}`;
  }

  function finishPomodoroSession() {
    beep();
    if (navigator.vibrate) navigator.vibrate([180, 100, 180]);
    const message = state.timer.mode === 'focus'
      ? 'Focus session complete. Don’t forget to log your activity manually.'
      : 'Break complete. Ready for the next focus block?';
    toast(message);
    sendLocalNotification('Pomodoro complete', message);
    if (state.timer.mode === 'focus') state.timer.mode = 'break';
    else state.timer.mode = 'focus';
    resetTimer();
  }

  function beep() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.45);
    } catch (error) {
      console.warn('Audio alert unavailable', error);
    }
  }

  function renderReportsScreen() {
    const range = getSelectedRange();
    const logs = getLogsInRange(range.start, range.end);
    const summary = getRangeSummary(range.start, range.end);
    const targetRows = getTargetRowsForRange(range.start, range.end).slice(0, 7);
    const activities = getActivityTotals(logs).slice(0, 5);
    const categories = getCategoryTotals(logs).slice(0, 7);

    return `
      <section class="stack">
        <article class="card hero stack-sm">
          <div class="between">
            <div>
              <p class="eyebrow">${escapeHtml(formatDateRange(range.start, range.end))}</p>
              <h2>Report Summary</h2>
            </div>
            <span class="chip">${logs.length} logs</span>
          </div>
          <div class="stat-grid">
            ${statHtml('Logged', formatDuration(summary.loggedMinutes))}
            ${statHtml('Unlogged', formatDuration(summary.unloggedMinutes))}
            ${statHtml('Study', formatDuration(summary.studyMinutes))}
            ${statHtml('Avg Product.', summary.avgProductivity ? `${summary.avgProductivity.toFixed(1)}/5` : '—')}
          </div>
          <div class="row-wrap">
            <span class="chip">Top category: ${escapeHtml(summary.topCategory || 'None')}</span>
            <span class="chip">Top activity: ${escapeHtml(summary.topActivity || 'None')}</span>
            <span class="chip">${summary.targetSummary}</span>
          </div>
        </article>

        <article class="card stack-sm">
          <h2>Report Filter</h2>
          <div class="check-grid">
            ${[
              ['today', 'Today'], ['yesterday', 'Yesterday'], ['thisWeek', 'This week'], ['lastWeek', 'Last week'], ['thisMonth', 'This month'], ['lastMonth', 'Last month'], ['custom', 'Custom range']
            ].map(([value, label]) => `<label class="check-card"><input type="radio" name="reportFilter" value="${value}" ${state.report.filter === value ? 'checked' : ''}> ${label}</label>`).join('')}
          </div>
          ${state.report.filter === 'custom' ? `<div class="form-row"><label>Start<input id="customStart" type="date" value="${state.report.customStart}"></label><label>End<input id="customEnd" type="date" value="${state.report.customEnd}"></label></div>` : ''}
          <div class="grid-2">
            <button class="btn secondary" data-action="export-range-image">Export Image</button>
            <button class="btn secondary" data-action="download-csv">Export CSV</button>
          </div>
        </article>

        <article class="card stack-sm">
          <h2>Target Achievement</h2>
          ${targetRows.length ? renderTargetRows(targetRows) : emptyState('No active targets for this range.')}
        </article>

        <article class="card stack-sm">
          <div class="between">
            <h2>Category Comparison</h2>
            <span class="small muted">Max 3 categories</span>
          </div>
          <div class="segmented">
            ${[['dod','DoD'],['wow','WoW'],['mom','MoM']].map(([value,label]) => `<button class="segment ${state.report.comparisonType === value ? 'active' : ''}"><label><input type="radio" name="comparisonType" value="${value}" ${state.report.comparisonType === value ? 'checked' : ''} hidden>${label}</label></button>`).join('')}
          </div>
          <div class="segmented">
            ${[['clustered','Clustered'],['stacked','Stacked']].map(([value,label]) => `<button class="segment ${state.report.comparisonChart === value ? 'active' : ''}"><label><input type="radio" name="comparisonChart" value="${value}" ${state.report.comparisonChart === value ? 'checked' : ''} hidden>${label}</label></button>`).join('')}
          </div>
          ${renderCategoryChecks('selectedCategories', state.report.selectedCategories, 3)}
          <canvas id="categoryComparisonChart" class="chart" width="640" height="360" aria-label="Category comparison chart"></canvas>
          <p class="small muted">Target markers appear as dashed lines when a selected category has an active target for the selected period.</p>
        </article>

        <article class="card stack-sm">
          <div class="between">
            <h2>Radar Focus Chart</h2>
            <span class="small muted">Select 3–8 categories</span>
          </div>
          <div class="segmented">
            ${[['day','Day'],['week','Week'],['month','Month']].map(([value,label]) => `<button class="segment ${state.report.radarPeriod === value ? 'active' : ''}"><label><input type="radio" name="radarPeriod" value="${value}" ${state.report.radarPeriod === value ? 'checked' : ''} hidden>${label}</label></button>`).join('')}
          </div>
          ${renderCategoryChecks('radarCategories', state.report.radarCategories, 8)}
          <canvas id="radarChart" class="chart" width="640" height="360" aria-label="Radar focus chart"></canvas>
        </article>

        <article class="card stack-sm">
          <div class="between">
            <h2>Activity Line Chart</h2>
            <span class="small muted">Max 3 activities</span>
          </div>
          <div class="segmented">
            ${[['7d','7 days'],['30d','30 days'],['12w','12 weeks'],['12m','12 months']].map(([value,label]) => `<button class="segment ${state.report.lineRange === value ? 'active' : ''}"><label><input type="radio" name="lineRange" value="${value}" ${state.report.lineRange === value ? 'checked' : ''} hidden>${label}</label></button>`).join('')}
          </div>
          ${renderActivityChecks()}
          <canvas id="activityLineChart" class="chart" width="640" height="360" aria-label="Activity line chart"></canvas>
        </article>

        <article class="card stack-sm">
          <h2>Breakdowns</h2>
          <h3>Categories</h3>
          ${categories.length ? `<div class="table-lite">${categories.map(row => `<div class="table-row"><span><span class="color-dot" style="--dot:${row.color}"></span> ${escapeHtml(row.name)}</span><strong>${formatDuration(row.minutes)}</strong></div>`).join('')}</div>` : emptyState('No category data in this range.')}
          <h3>Activities</h3>
          ${activities.length ? `<div class="table-lite">${activities.map(row => `<div class="table-row"><span>${escapeHtml(row.name)}</span><strong>${formatDuration(row.minutes)}</strong></div>`).join('')}</div>` : emptyState('No activity data in this range.')}
        </article>
      </section>
    `;
  }

  function renderCategoryChecks(name, selected, max) {
    return `<div class="check-grid">${state.data.categories.map(category => `
      <label class="check-card" title="${escapeHtml(category.name)}">
        <input type="checkbox" name="${name}" value="${category.id}" ${selected.includes(category.id) ? 'checked' : ''}> 
        <span class="color-dot" style="--dot:${escapeHtml(category.color)}"></span>
        <span>${escapeHtml(category.icon)} ${escapeHtml(category.name)}</span>
      </label>`).join('')}</div>
      <p class="small muted">Selected: ${selected.length}/${max}</p>`;
  }

  function renderActivityChecks() {
    return `<div class="check-grid">${state.data.activities.map(activity => `
      <label class="check-card" title="${escapeHtml(activity.name)}">
        <input type="checkbox" name="selectedActivities" value="${activity.id}" ${state.report.selectedActivities.includes(activity.id) ? 'checked' : ''}> 
        <span>${escapeHtml(activity.name)}</span>
      </label>`).join('')}</div>
      <p class="small muted">Selected: ${state.report.selectedActivities.length}/3</p>`;
  }

  function updateSelectedList(key, target, max, min = 0) {
    const arr = new Set(state.report[key]);
    if (target.checked) {
      if (arr.size >= max) {
        target.checked = false;
        toast(`You can select at most ${max}.`);
        return;
      }
      arr.add(target.value);
    } else {
      if (arr.size <= min) {
        target.checked = true;
        toast(`Select at least ${min}.`);
        return;
      }
      arr.delete(target.value);
    }
    state.report[key] = Array.from(arr);
    render();
  }

  function drawReportCharts() {
    drawCategoryComparison();
    drawRadarChart();
    drawActivityLineChart();
  }

  function drawCategoryComparison() {
    const canvas = $('#categoryComparisonChart');
    if (!canvas) return;
    const ctx = prepCanvas(canvas);
    const selected = state.report.selectedCategories.map(getCategory).filter(Boolean).slice(0, 3);
    const buckets = getComparisonBuckets(state.report.comparisonType);
    const period = state.report.comparisonType === 'dod' ? 'daily' : state.report.comparisonType === 'wow' ? 'weekly' : 'monthly';
    const data = buckets.map(bucket => selected.map(category => getCategoryMinutesForRange(category.id, bucket.start, bucket.end)));
    const targets = selected.map(category => getActiveTarget(category.id, period));
    const values = data.flat().concat(targets.map(t => t?.durationMinutes || 0));
    const maxValue = Math.max(60, ...values) * 1.25;
    const colors = getThemeColors();
    drawChartBg(ctx, canvas, colors);

    if (!selected.length) {
      drawEmptyCanvas(ctx, canvas, 'Select up to 3 categories.');
      return;
    }

    const W = canvas.width;
    const H = canvas.height;
    const margin = { left: 48, right: 18, top: 30, bottom: 62 };
    const plotW = W - margin.left - margin.right;
    const plotH = H - margin.top - margin.bottom;
    drawYAxis(ctx, margin, plotW, plotH, maxValue, colors);

    const groupW = plotW / buckets.length;
    const barMode = state.report.comparisonChart;
    buckets.forEach((bucket, bucketIndex) => {
      const x0 = margin.left + bucketIndex * groupW;
      if (barMode === 'stacked') {
        let yAcc = margin.top + plotH;
        selected.forEach((category, catIndex) => {
          const value = data[bucketIndex][catIndex];
          const barH = value / maxValue * plotH;
          ctx.fillStyle = category.color;
          roundedRect(ctx, x0 + groupW * 0.20, yAcc - barH, groupW * 0.60, barH, 6);
          ctx.fill();
          yAcc -= barH;
        });
        targets.forEach((target, targetIndex) => {
          if (!target) return;
          const y = margin.top + plotH - target.durationMinutes / maxValue * plotH;
          dashedLine(ctx, x0 + groupW * 0.14, y, x0 + groupW * 0.86, y, selected[targetIndex].color);
        });
      } else {
        const innerW = groupW * 0.70;
        const barW = innerW / selected.length;
        const startX = x0 + (groupW - innerW) / 2;
        selected.forEach((category, catIndex) => {
          const value = data[bucketIndex][catIndex];
          const barH = value / maxValue * plotH;
          const x = startX + catIndex * barW;
          const y = margin.top + plotH - barH;
          ctx.fillStyle = category.color;
          roundedRect(ctx, x + 2, y, Math.max(4, barW - 4), barH, 6);
          ctx.fill();
          const target = targets[catIndex];
          if (target) {
            const ty = margin.top + plotH - target.durationMinutes / maxValue * plotH;
            dashedLine(ctx, x + 2, ty, x + Math.max(4, barW - 4), ty, colors.text);
          }
        });
      }
      ctx.save();
      ctx.translate(x0 + groupW / 2, H - 42);
      ctx.rotate(-Math.PI / 7);
      ctx.fillStyle = colors.muted;
      ctx.font = '700 18px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(bucket.label, 0, 0);
      ctx.restore();
    });

    drawLegend(ctx, selected.map(c => ({ label: c.name, color: c.color })), W, colors);
  }

  function drawRadarChart() {
    const canvas = $('#radarChart');
    if (!canvas) return;
    const ctx = prepCanvas(canvas);
    const selected = state.report.radarCategories.map(getCategory).filter(Boolean).slice(0, 8);
    const colors = getThemeColors();
    drawChartBg(ctx, canvas, colors);
    if (selected.length < 3) {
      drawEmptyCanvas(ctx, canvas, 'Select at least 3 categories for radar.');
      return;
    }
    const range = getRadarRange();
    const values = selected.map(category => getCategoryMinutesForRange(category.id, range.start, range.end));
    const maxValue = Math.max(60, ...values) * 1.15;
    const W = canvas.width;
    const H = canvas.height;
    const center = { x: W / 2, y: H / 2 + 12 };
    const radius = Math.min(W, H) * 0.31;
    const levels = 5;

    ctx.strokeStyle = colors.line;
    ctx.fillStyle = colors.muted;
    ctx.font = '700 16px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let level = 1; level <= levels; level++) {
      const r = radius * level / levels;
      drawPolygon(ctx, selected.length, center, r, colors.line, null);
    }

    selected.forEach((category, i) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i / selected.length);
      const x = center.x + Math.cos(angle) * (radius + 28);
      const y = center.y + Math.sin(angle) * (radius + 28);
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius);
      ctx.strokeStyle = colors.line;
      ctx.stroke();
      ctx.fillStyle = colors.text;
      ctx.fillText(truncate(category.name, 10), x, y);
    });

    ctx.beginPath();
    values.forEach((value, i) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i / selected.length);
      const r = radius * value / maxValue;
      const x = center.x + Math.cos(angle) * r;
      const y = center.y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(217, 119, 6, 0.22)';
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();

    values.forEach((value, i) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i / selected.length);
      const r = radius * value / maxValue;
      const x = center.x + Math.cos(angle) * r;
      const y = center.y + Math.sin(angle) * r;
      ctx.fillStyle = selected[i].color;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = colors.muted;
    ctx.font = '700 15px system-ui';
    ctx.fillText(`${formatDateRange(range.start, range.end)} · max scale ${formatDuration(Math.round(maxValue))}`, W / 2, 24);
  }

  function drawActivityLineChart() {
    const canvas = $('#activityLineChart');
    if (!canvas) return;
    const ctx = prepCanvas(canvas);
    const selected = state.report.selectedActivities.map(getActivity).filter(Boolean).slice(0, 3);
    const buckets = getLineBuckets(state.report.lineRange);
    const colors = getThemeColors();
    drawChartBg(ctx, canvas, colors);
    if (!selected.length) {
      drawEmptyCanvas(ctx, canvas, 'Select up to 3 activities.');
      return;
    }
    const data = selected.map(activity => buckets.map(bucket => getActivityMinutesForRange(activity.id, bucket.start, bucket.end)));
    const maxValue = Math.max(60, ...data.flat()) * 1.2;
    const W = canvas.width;
    const H = canvas.height;
    const margin = { left: 48, right: 20, top: 34, bottom: 64 };
    const plotW = W - margin.left - margin.right;
    const plotH = H - margin.top - margin.bottom;
    drawYAxis(ctx, margin, plotW, plotH, maxValue, colors);

    selected.forEach((activity, activityIndex) => {
      const category = getCategory(activity.defaultCategoryId);
      const color = category?.color || ['#2563eb', '#d97706', '#047857'][activityIndex % 3];
      ctx.beginPath();
      buckets.forEach((bucket, bucketIndex) => {
        const x = margin.left + (buckets.length === 1 ? plotW / 2 : bucketIndex * plotW / (buckets.length - 1));
        const y = margin.top + plotH - data[activityIndex][bucketIndex] / maxValue * plotH;
        if (bucketIndex === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.stroke();
      buckets.forEach((bucket, bucketIndex) => {
        const x = margin.left + (buckets.length === 1 ? plotW / 2 : bucketIndex * plotW / (buckets.length - 1));
        const y = margin.top + plotH - data[activityIndex][bucketIndex] / maxValue * plotH;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    const labelEvery = Math.ceil(buckets.length / 6);
    buckets.forEach((bucket, index) => {
      if (index % labelEvery !== 0 && index !== buckets.length - 1) return;
      const x = margin.left + (buckets.length === 1 ? plotW / 2 : index * plotW / (buckets.length - 1));
      ctx.save();
      ctx.translate(x, H - 42);
      ctx.rotate(-Math.PI / 7);
      ctx.fillStyle = colors.muted;
      ctx.font = '700 16px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(bucket.label, 0, 0);
      ctx.restore();
    });

    drawLegend(ctx, selected.map((activity, i) => ({ label: activity.name, color: getCategory(activity.defaultCategoryId)?.color || ['#2563eb', '#d97706', '#047857'][i % 3] })), W, colors);
  }

  function prepCanvas(canvas) {
    const ratio = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth || 640;
    const displayHeight = canvas.clientHeight || 360;
    if (canvas.width !== Math.round(displayWidth * ratio) || canvas.height !== Math.round(displayHeight * ratio)) {
      canvas.width = Math.round(displayWidth * ratio);
      canvas.height = Math.round(displayHeight * ratio);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    return canvas.getContext('2d');
  }

  function getThemeColors() {
    const style = getComputedStyle(document.documentElement);
    return {
      text: style.getPropertyValue('--text').trim() || '#111827',
      muted: style.getPropertyValue('--muted').trim() || '#6b7280',
      surface2: style.getPropertyValue('--surface-2').trim() || '#f1eee8',
      line: style.getPropertyValue('--line').trim() || 'rgba(17,24,39,.1)',
      accent: style.getPropertyValue('--accent').trim() || '#d97706'
    };
  }

  function drawChartBg(ctx, canvas, colors) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = colors.surface2;
    roundedRect(ctx, 0, 0, canvas.width, canvas.height, 18);
    ctx.fill();
  }

  function drawEmptyCanvas(ctx, canvas, text) {
    const colors = getThemeColors();
    ctx.fillStyle = colors.muted;
    ctx.font = '800 18px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  function drawYAxis(ctx, margin, plotW, plotH, maxValue, colors) {
    ctx.strokeStyle = colors.line;
    ctx.fillStyle = colors.muted;
    ctx.lineWidth = 1;
    ctx.font = '700 14px system-ui';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      cons