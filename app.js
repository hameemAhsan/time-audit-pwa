(() => {
  'use strict';

  const STORAGE_KEY = 'timeAuditPwa.v1';
  const LEGACY_KEY = 'timeAuditPwa';
  const APP_VERSION = '1.0.1';
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
      navigator.serviceWorker.register('./service-worker.js').then(registration => {
        // If a newer service worker is already waiting, activate it now.
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // If a newer service worker is found while the app is open, activate it now.
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      }).catch(console.error);

      // Reload once when the new service worker takes control, so users get the fresh app.js.
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      state.deferredInstallPrompt = event;
      const installBtn = $('#installBtn');
      installBtn.hidden = false;
      installBtn.onclick = async () => {
        if (!state.deferredInstallPrompt) return;
        installBtn.hidden = true;
        state.deferredInstallPrompt.prompt();
        const choice = await state.deferredInstallPrompt.userChoice.catch(() => null);
        if (choice && choice.outcome !== 'accepted') installBtn.hidden = false;
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

    // Keep <input type="time"> values inside Android Chrome's valid range: 00:00–23:59.
    // This prevents 24:00/invalid values from breaking the native time picker.
    function safeTimeInput(timeValue, fallback) {
      const minutes = timeToMinutes(String(timeValue || ''));
      if (!Number.isFinite(minutes)) return fallback;
      return minutesToTime(Math.min(minutes, 1439));
    }

    const startFallback = safeTimeInput(latestLog?.endTime, '09:00');
    const formValues = editing || {
      date: preset?.date || todayISO(),
      startTime: preset ? minutesToTime(Math.min(Number(preset.start) || 0, 1439)) : startFallback,
      endTime: preset ? minutesToTime(Math.min(Number(preset.end) || 0, 1439)) : minutesToTime(Math.min(1439, timeToMinutes(startFallback) + 60)),
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
    const end = Math.min(1439, start + prevDuration);
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
      const y = margin.top + plotH - plotH * i / 4;
      const value = maxValue * i / 4;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + plotW, y);
      ctx.stroke();
      ctx.fillText(formatDurationCompact(value), margin.left - 8, y + 5);
    }
  }

  function drawLegend(ctx, items, width, colors) {
    let x = 18;
    const y = 18;
    ctx.font = '800 14px system-ui';
    items.forEach(item => {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(x + 6, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.text;
      ctx.fillText(truncate(item.label, 16), x + 18, y + 5);
      x += Math.min(180, 44 + item.label.length * 8);
      if (x > width - 140) x = width - 140;
    });
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function dashedLine(ctx, x1, y1, x2, y2, color) {
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function drawPolygon(ctx, sides, center, radius, stroke, fill) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i / sides);
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }

  function renderSettingsScreen() {
    return `
      <section class="stack">
        <article class="card hero stack-sm">
          <p class="eyebrow">Local-first controls</p>
          <h2>Settings, Categories, Activities & Backup</h2>
          <p class="muted">Everything is stored in this browser only. Export JSON backup before clearing browser data or changing phone.</p>
        </article>

        <article class="card stack-sm">
          <h2>App Settings</h2>
          <form id="settingsForm" class="form-grid">
            <label>Theme
              <select name="theme">
                ${['system','light','dark'].map(value => `<option value="${value}" ${state.data.settings.theme === value ? 'selected' : ''}>${capitalize(value)}</option>`).join('')}
              </select>
            </label>
            <div class="form-row">
              <label>Day start time<input name="dayStartTime" value="${escapeHtml(state.data.settings.dayStartTime)}" placeholder="00:00"></label>
              <label>Day end time<input name="dayEndTime" value="${escapeHtml(state.data.settings.dayEndTime)}" placeholder="24:00"></label>
            </div>
            <label>Streak minimum logged minutes
              <select name="streakMinimumLoggedMinutes">
                ${[[480,'8 hours'],[720,'12 hours'],[960,'16 hours'],[1200,'20 hours']].map(([value,label]) => `<option value="${value}" ${Number(state.data.settings.streakMinimumLoggedMinutes) === value ? 'selected' : ''}>${label}</option>`).join('')}
              </select>
            </label>
            <label>Custom streak minimum minutes<input name="customStreakMinimumLoggedMinutes" type="number" min="1" max="1440" value="${state.data.settings.streakMinimumLoggedMinutes}"></label>

            <h3>Notifications</h3>
            <label class="check-card"><input type="checkbox" name="notificationsEnabled" ${state.data.settings.notificationsEnabled ? 'checked' : ''}> Enable notification-ready reminders</label>
            <label class="check-card"><input type="checkbox" name="progressReminderEnabled" ${state.data.settings.progressReminderEnabled ? 'checked' : ''}> Progress reminders</label>
            <label class="check-card"><input type="checkbox" name="exportReminderEnabled" ${state.data.settings.exportReminderEnabled ? 'checked' : ''}> Export reminders</label>
            <label class="check-card"><input type="checkbox" name="motivationalReminderEnabled" ${state.data.settings.motivationalReminderEnabled ? 'checked' : ''}> Motivational reminders</label>
            <label>Progress reminder times<input name="progressReminderTimes" value="${state.data.settings.progressReminderTimes.join(', ')}" placeholder="10:00, 15:00, 20:00"></label>
            <label>Export reminder times<input name="exportReminderTimes" value="${state.data.settings.exportReminderTimes.join(', ')}" placeholder="22:30"></label>
            <label>Motivational reminder times<input name="motivationalReminderTimes" value="${state.data.settings.motivationalReminderTimes.join(', ')}" placeholder="12:30, 18:30"></label>

            <h3>Custom Notification Messages</h3>
            <label>Progress messages<textarea name="progressMessages">${escapeHtml(state.data.settings.customNotificationMessages.progress.join('\n'))}</textarea></label>
            <label>Export messages<textarea name="exportMessages">${escapeHtml(state.data.settings.customNotificationMessages.export.join('\n'))}</textarea></label>
            <label>Motivational messages<textarea name="motivationalMessages">${escapeHtml(state.data.settings.customNotificationMessages.motivational.join('\n'))}</textarea></label>

            <h3>Default Image Export Privacy</h3>
            ${renderExportPrivacyChecks(state.data.settings.defaultExportPrivacySettings)}

            <button class="btn full" type="submit">Save Settings</button>
            <button class="btn secondary full" type="button" data-action="request-notifications">Allow Notifications</button>
            <button class="btn secondary full" type="button" data-action="test-notification">Test Notification</button>
          </form>
        </article>

        <article class="card stack-sm">
          <h2>Categories</h2>
          <form id="categoryForm" class="form-grid">
            <div class="form-row three">
              <label>Name<input name="name" placeholder="Category name" required></label>
              <label>Color<input name="color" type="color" value="#2563eb"></label>
              <label>Icon<input name="icon" placeholder="📘" maxlength="3"></label>
            </div>
            <label class="check-card"><input type="checkbox" name="countsAsStudyTime"> Counts as study time</label>
            <button class="btn secondary full" type="submit">Add Category</button>
          </form>
          <div class="stack-sm">
            ${state.data.categories.map(category => renderCategoryEditor(category)).join('')}
          </div>
        </article>

        <article class="card stack-sm">
          <h2>Activity Presets</h2>
          <form id="activityPresetForm" class="form-grid">
            <label>Activity name<input name="name" placeholder="Example: MBA Study" required></label>
            <label>Default category
              <select name="defaultCategoryId" required>${state.data.categories.map(category => `<option value="${category.id}">${escapeHtml(category.icon)} ${escapeHtml(category.name)}</option>`).join('')}</select>
            </label>
            <button class="btn secondary full" type="submit">Add Activity Preset</button>
          </form>
          <div class="stack-sm">
            ${state.data.activities.map(activity => renderActivityEditor(activity)).join('')}
          </div>
        </article>

        <article class="card stack-sm">
          <h2>Backup & Restore</h2>
          <p class="small muted">JSON backup is for app restore. CSV/image exports are for accountability sharing.</p>
          <div class="grid-2">
            <button class="btn secondary" data-action="download-json">Export JSON Backup</button>
            <label class="btn secondary" for="jsonImportInput">Import JSON</label>
          </div>
          <input id="jsonImportInput" type="file" accept="application/json,.json" hidden>
          <button class="btn secondary full" data-action="reset-demo">Add Demo Data</button>
          <button class="btn danger full" data-action="clear-all">Clear All Local Data</button>
        </article>
      </section>
    `;
  }

  function renderExportPrivacyChecks(settings) {
    const entries = [
      ['includeNotes', 'Include notes'],
      ['includeReflection', 'Include daily reflection'],
      ['includeTimeline', 'Include full timeline'],
      ['summaryOnly', 'Summary only'],
      ['includeProductivity', 'Include productivity rating']
    ];
    return `<div class="check-grid">${entries.map(([name, label]) => `<label class="check-card"><input type="checkbox" name="${name}" ${settings[name] ? 'checked' : ''}> ${label}</label>`).join('')}</div>`;
  }

  function renderCategoryEditor(category) {
    const targets = category.targets || [];
    return `<div class="card stack-sm" style="box-shadow:none;background:var(--surface-2);">
      <div class="between">
        <div>
          <strong><span class="color-dot" style="--dot:${escapeHtml(category.color)}"></span> ${escapeHtml(category.icon)} ${escapeHtml(category.name)}</strong>
          <p class="small muted">${category.countsAsStudyTime ? 'Counts as study time' : 'Not study time'} · ${targets.filter(t => t.active).length} active target(s)</p>
        </div>
        <button class="btn danger" data-action="delete-category" data-id="${category.id}">Delete</button>
      </div>
      <div class="form-grid">
        <div class="form-row three">
          <label>Name<input id="catName-${category.id}" value="${escapeHtml(category.name)}"></label>
          <label>Color<input id="catColor-${category.id}" type="color" value="${escapeHtml(category.color)}"></label>
          <label>Icon<input id="catIcon-${category.id}" value="${escapeHtml(category.icon || '')}" maxlength="3"></label>
        </div>
        <label class="check-card"><input id="catStudy-${category.id}" type="checkbox" ${category.countsAsStudyTime ? 'checked' : ''}> Counts as study time</label>
        <button class="btn secondary full" data-action="update-category" data-id="${category.id}">Save Category Changes</button>
      </div>
      <div class="table-lite">
        ${targets.length ? targets.map(target => `<div class="table-row"><span>${target.type} · ${target.period} · ${formatDuration(target.durationMinutes)} ${target.active ? '' : '(off)'}</span><button class="btn danger" data-action="delete-target" data-category-id="${category.id}" data-id="${target.id}">Remove</button></div>`).join('') : '<p class="small muted">No target set.</p>'}
      </div>
      <button class="btn secondary full" data-action="add-target" data-id="${category.id}">Add Target</button>
    </div>`;
  }

  function renderActivityEditor(activity) {
    return `<div class="card stack-sm" style="box-shadow:none;background:var(--surface-2);">
      <div class="form-grid">
        <label>Activity name<input id="actName-${activity.id}" value="${escapeHtml(activity.name)}"></label>
        <label>Default category
          <select id="actCategory-${activity.id}">
            ${state.data.categories.map(category => `<option value="${category.id}" ${activity.defaultCategoryId === category.id ? 'selected' : ''}>${escapeHtml(category.icon)} ${escapeHtml(category.name)}</option>`).join('')}
          </select>
        </label>
        <div class="grid-2">
          <button class="btn secondary" data-action="update-activity" data-id="${activity.id}">Save Changes</button>
          <button class="btn danger" data-action="delete-activity" data-id="${activity.id}">Delete</button>
        </div>
      </div>
    </div>`;
  }

  function saveCategory(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    if (!name) return;
    if (state.data.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      toast('Category already exists.');
      return;
    }
    const now = new Date().toISOString();
    state.data.categories.push({
      id: uid(),
      name,
      color: form.get('color') || '#64748b',
      icon: String(form.get('icon') || '•').trim() || '•',
      countsAsStudyTime: form.get('countsAsStudyTime') === 'on',
      targets: [],
      isDefault: false,
      createdAt: now,
      updatedAt: now
    });
    saveData(true);
    render();
  }

  function updateCategory(id) {
    const category = getCategory(id);
    if (!category) return;
    const name = document.getElementById(`catName-${id}`)?.value.trim();
    const color = document.getElementById(`catColor-${id}`)?.value || category.color;
    const icon = document.getElementById(`catIcon-${id}`)?.value.trim() || '•';
    const countsAsStudyTime = document.getElementById(`catStudy-${id}`)?.checked || false;
    if (!name) return toast('Category name cannot be empty.');
    const duplicate = state.data.categories.some(c => c.id !== id && c.name.toLowerCase() === name.toLowerCase());
    if (duplicate) return toast('Another category already has this name.');
    category.name = name;
    category.color = color;
    category.icon = icon;
    category.countsAsStudyTime = countsAsStudyTime;
    category.updatedAt = new Date().toISOString();
    saveData(true);
    render();
  }

  function deleteCategory(id) {
    const category = getCategory(id);
    if (!category) return;
    const used = state.data.logs.some(log => log.categoryId === id) || state.data.activities.some(activity => activity.defaultCategoryId === id);
    if (used) {
      toast('Category is used by logs or activities, so it cannot be deleted safely.');
      return;
    }
    if (!confirm(`Delete category ${category.name}?`)) return;
    state.data.categories = state.data.categories.filter(c => c.id !== id);
    saveData(true);
    render();
  }

  function addTarget(categoryId) {
    const category = getCategory(categoryId);
    if (!category) return;
    const period = prompt('Target period: daily, weekly, or monthly', 'daily');
    if (!['daily','weekly','monthly'].includes(period)) return toast('Invalid target period.');
    const type = prompt('Target type: minimum or maximum', 'minimum');
    if (!['minimum','maximum'].includes(type)) return toast('Invalid target type.');
    const minutes = Number(prompt('Target duration in minutes. Example: 240 for 4 hours', '240'));
    if (!Number.isFinite(minutes) || minutes <= 0) return toast('Invalid target duration.');
    category.targets = category.targets || [];
    category.targets.push({ id: uid(), categoryId, period, type, durationMinutes: Math.round(minutes), active: true });
    category.updatedAt = new Date().toISOString();
    saveData(true);
    render();
  }

  function deleteTarget(categoryId, targetId) {
    const category = getCategory(categoryId);
    if (!category) return;
    category.targets = (category.targets || []).filter(t => t.id !== targetId);
    saveData(true);
    render();
  }

  function saveActivityPreset(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    if (!name) return;
    if (state.data.activities.some(a => a.name.toLowerCase() === name.toLowerCase())) {
      toast('Activity already exists.');
      return;
    }
    const now = new Date().toISOString();
    state.data.activities.push({
      id: uid(),
      name,
      defaultCategoryId: form.get('defaultCategoryId'),
      isDefault: false,
      createdAt: now,
      updatedAt: now
    });
    saveData(true);
    render();
  }

  function updateActivityPreset(id) {
    const activity = getActivity(id);
    if (!activity) return;
    const name = document.getElementById(`actName-${id}`)?.value.trim();
    const defaultCategoryId = document.getElementById(`actCategory-${id}`)?.value;
    if (!name) return toast('Activity name cannot be empty.');
    const duplicate = state.data.activities.some(a => a.id !== id && a.name.toLowerCase() === name.toLowerCase());
    if (duplicate) return toast('Another activity already has this name.');
    activity.name = name;
    activity.defaultCategoryId = defaultCategoryId;
    activity.updatedAt = new Date().toISOString();
    saveData(true);
    render();
  }

  function deleteActivityPreset(id) {
    const activity = getActivity(id);
    if (!activity) return;
    if (state.data.logs.some(log => log.activityId === id)) {
      toast('Activity is used by logs, so it cannot be deleted safely.');
      return;
    }
    if (!confirm(`Delete activity preset ${activity.name}?`)) return;
    state.data.activities = state.data.activities.filter(a => a.id !== id);
    saveData(true);
    render();
  }

  function saveSettings(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customMinutes = Number(form.get('customStreakMinimumLoggedMinutes'));
    const selectedPreset = Number(form.get('streakMinimumLoggedMinutes'));
    state.data.settings.theme = form.get('theme');
    state.data.settings.dayStartTime = normalizeDayWindowTime(form.get('dayStartTime')) || '00:00';
    state.data.settings.dayEndTime = normalizeDayWindowTime(form.get('dayEndTime')) || '24:00';
    state.data.settings.streakMinimumLoggedMinutes = Number.isFinite(customMinutes) && customMinutes > 0 ? Math.round(customMinutes) : selectedPreset;
    state.data.settings.notificationsEnabled = form.get('notificationsEnabled') === 'on';
    state.data.settings.progressReminderEnabled = form.get('progressReminderEnabled') === 'on';
    state.data.settings.exportReminderEnabled = form.get('exportReminderEnabled') === 'on';
    state.data.settings.motivationalReminderEnabled = form.get('motivationalReminderEnabled') === 'on';
    state.data.settings.progressReminderTimes = parseTimeList(form.get('progressReminderTimes'));
    state.data.settings.exportReminderTimes = parseTimeList(form.get('exportReminderTimes'));
    state.data.settings.motivationalReminderTimes = parseTimeList(form.get('motivationalReminderTimes'));
    state.data.settings.customNotificationMessages = {
      progress: splitLines(form.get('progressMessages')),
      export: splitLines(form.get('exportMessages')),
      motivational: splitLines(form.get('motivationalMessages'))
    };
    state.data.settings.defaultExportPrivacySettings = {
      includeNotes: form.get('includeNotes') === 'on',
      includeReflection: form.get('includeReflection') === 'on',
      includeTimeline: form.get('includeTimeline') === 'on',
      summaryOnly: form.get('summaryOnly') === 'on',
      includeProductivity: form.get('includeProductivity') === 'on'
    };
    saveData(true);
    applyTheme();
    render();
  }

  function applyTheme() {
    const theme = state.data.settings.theme;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = document.documentElement.dataset.theme === 'dark' ? '#0c0f14' : '#111827';
  }

  function showExportModal(scope) {
    const settings = state.data.settings.defaultExportPrivacySettings;
    const title = scope === 'today' ? 'Export Today as Image' : 'Export Report as Image';
    openModal(title, `
      <form id="exportOptionsForm" class="form-grid">
        <input type="hidden" name="scope" value="${scope}">
        ${renderExportPrivacyChecks(settings)}
        <button class="btn full" type="button" data-action="export-confirm">Download Image Report</button>
      </form>
    `);
  }

  function exportReportImage(formData) {
    const scope = formData.get('scope');
    const options = {
      includeNotes: formData.get('includeNotes') === 'on',
      includeReflection: formData.get('includeReflection') === 'on',
      includeTimeline: formData.get('includeTimeline') === 'on',
      summaryOnly: formData.get('summaryOnly') === 'on',
      includeProductivity: formData.get('includeProductivity') === 'on'
    };
    const range = scope === 'today' ? { start: todayISO(), end: todayISO() } : getSelectedRange();
    const canvas = buildReportCanvas(range.start, range.end, options);
    canvas.toBlob(blob => {
      if (!blob) return toast('Could not create image.');
      downloadBlob(blob, `time-audit-${range.start}-to-${range.end}.png`);
      toast('Image report downloaded.');
    }, 'image/png', 0.95);
  }

  function buildReportCanvas(start, end, options) {
    const days = daysBetween(start, end) + 1;
    const logs = getLogsInRange(start, end).sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
    const summary = getRangeSummary(start, end);
    const categoryTotals = getCategoryTotals(logs).slice(0, 5);
    const reflection = days === 1 ? getReflection(start) : null;
    const width = 1080;
    let height = 920;
    if (options.includeReflection && reflection && !options.summaryOnly) height += 240;
    if (options.includeTimeline && !options.summaryOnly) height += Math.min(760, logs.length * 92 + 120);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f7f4ef';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    roundedRect(ctx, 52, 52, width - 104, height - 104, 38);
    ctx.fill();

    let y = 112;
    ctx.fillStyle = '#d97706';
    ctx.font = '900 28px system-ui, sans-serif';
    ctx.fillText('TIME AUDIT REPORT', 96, y);
    y += 54;
    ctx.fillStyle = '#111827';
    ctx.font = '1000 48px system-ui, sans-serif';
    ctx.fillText(formatDateRange(start, end), 96, y);
    y += 42;
    ctx.fillStyle = '#6b7280';
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillText('Local PWA accountability report', 96, y);
    y += 54;

    const stats = [
      ['Logged', formatDuration(summary.loggedMinutes)],
      ['Unlogged', formatDuration(summary.unloggedMinutes)],
      ['Study', formatDuration(summary.studyMinutes)],
      ['Avg Productivity', options.includeProductivity ? (summary.avgProductivity ? `${summary.avgProductivity.toFixed(1)}/5` : '—') : 'Hidden'],
      ['Top Category', summary.topCategory || 'None'],
      ['Current Streak', `${getStreak().current} days`]
    ];
    drawExportStats(ctx, stats, 96, y);
    y += 264;

    ctx.fillStyle = '#111827';
    ctx.font = '950 32px system-ui, sans-serif';
    ctx.fillText('Top Categories', 96, y);
    y += 34;
    if (categoryTotals.length) {
      categoryTotals.forEach(row => {
        ctx.fillStyle = row.color;
        ctx.beginPath();
        ctx.arc(108, y + 10, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111827';
        ctx.font = '850 25px system-ui, sans-serif';
        ctx.fillText(`${row.name}: ${formatDuration(row.minutes)}`, 132, y + 18);
        y += 42;
      });
    } else {
      ctx.fillStyle = '#6b7280';
      ctx.font = '700 24px system-ui, sans-serif';
      ctx.fillText('No category data yet.', 96, y + 18);
      y += 42;
    }

    const targets = getTargetRowsForRange(start, end).slice(0, 4);
    y += 30;
    ctx.fillStyle = '#111827';
    ctx.font = '950 32px system-ui, sans-serif';
    ctx.fillText('Target Progress', 96, y);
    y += 42;
    if (targets.length) {
      targets.forEach(row => {
        const status = row.type === 'minimum'
          ? (row.actual >= row.target ? 'Reached' : `${formatDuration(row.target - row.actual)} left`)
          : (row.actual <= row.target ? 'Within limit' : `${formatDuration(row.actual - row.target)} over`);
        ctx.fillStyle = '#111827';
        ctx.font = '800 24px system-ui, sans-serif';
        ctx.fillText(`${row.category.name}: ${formatDuration(row.actual)} / ${formatDuration(row.target)} · ${status}`, 96, y);
        y += 36;
      });
    } else {
      ctx.fillStyle = '#6b7280';
      ctx.font = '700 24px system-ui, sans-serif';
      ctx.fillText('No active targets in this range.', 96, y);
      y += 36;
    }

    if (options.includeReflection && reflection && !options.summaryOnly) {
      y += 46;
      ctx.fillStyle = '#111827';
      ctx.font = '950 32px system-ui, sans-serif';
      ctx.fillText('Reflection', 96, y);
      y += 40;
      const reflectionText = [
        reflection.dailyNote && `Note: ${reflection.dailyNote}`,
        reflection.wentWell && `Went well: ${reflection.wentWell}`,
        reflection.wastedTime && `Wasted time: ${reflection.wastedTime}`,
        reflection.improveTomorrow && `Improve: ${reflection.improveTomorrow}`,
        reflection.tomorrowPriority && `Priority: ${reflection.tomorrowPriority}`
      ].filter(Boolean).join('  ');
      y = drawWrappedText(ctx, reflectionText || 'No reflection written.', 96, y, 880, 30, '#374151', '700 24px system-ui, sans-serif');
    }

    if (options.includeTimeline && !options.summaryOnly) {
      y += 48;
      ctx.fillStyle = '#111827';
      ctx.font = '950 32px system-ui, sans-serif';
      ctx.fillText('Timeline Summary', 96, y);
      y += 42;
      logs.slice(0, 10).forEach(log => {
        const text = `${log.date} · ${log.startTime}–${log.endTime} · ${log.activityNameSnapshot} · ${log.categoryNameSnapshot}${options.includeProductivity ? ` · ${log.productivityRating}/5` : ''}${options.includeNotes && log.note ? ` · ${truncate(log.note, 50)}` : ''}`;
        y = drawWrappedText(ctx, text, 96, y, 880, 30, '#374151', '700 23px system-ui, sans-serif');
        y += 10;
      });
      if (logs.length > 10) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '750 22px system-ui, sans-serif';
        ctx.fillText(`+ ${logs.length - 10} more logs in CSV backup/export.`, 96, y);
      }
    }

    ctx.fillStyle = '#9ca3af';
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText(`Generated ${new Date().toLocaleString()} · Data stays local`, 96, height - 90);
    return canvas;
  }

  function drawExportStats(ctx, stats, x, y) {
    const cardW = 280;
    const cardH = 96;
    const gap = 18;
    stats.forEach(([label, value], index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const cx = x + col * (cardW + gap);
      const cy = y + row * (cardH + gap);
      ctx.fillStyle = '#f1eee8';
      roundedRect(ctx, cx, cy, cardW, cardH, 22);
      ctx.fill();
      ctx.fillStyle = '#6b7280';
      ctx.font = '850 18px system-ui, sans-serif';
      ctx.fillText(label.toUpperCase(), cx + 22, cy + 34);
      ctx.fillStyle = '#111827';
      ctx.font = '1000 28px system-ui, sans-serif';
      ctx.fillText(truncate(String(value), 17), cx + 22, cy + 72);
    });
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, color, font) {
    ctx.fillStyle = color;
    ctx.font = font;
    const words = String(text || '').split(/\s+/);
    let line = '';
    words.forEach(word => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        line = word;
        y += lineHeight;
      } else {
        line = test;
      }
    });
    if (line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
    return y;
  }

  function downloadCsvForCurrentRange() {
    const range = getSelectedRange();
    const logs = getLogsInRange(range.start, range.end).sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
    const columns = ['Date', 'Start Time', 'End Time', 'Duration Minutes', 'Activity', 'Category', 'Productivity Rating', 'Note'];
    const rows = logs.map(log => [
      log.date,
      log.startTime,
      log.endTime,
      log.durationMinutes,
      log.activityNameSnapshot,
      log.categoryNameSnapshot,
      log.productivityRating,
      log.note || ''
    ]);
    const csv = [columns, ...rows].map(row => row.map(csvEscape).join(',')).join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `time-audit-${range.start}-to-${range.end}.csv`);
    toast('CSV export downloaded.');
  }

  function downloadJsonBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'Time Audit PWA',
      version: APP_VERSION,
      data: state.data
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `time-audit-backup-${todayISO()}.json`);
    toast('JSON backup downloaded.');
  }

  function importJsonBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const imported = parsed.data || parsed;
        if (!Array.isArray(imported.categories) || !Array.isArray(imported.activities) || !Array.isArray(imported.logs)) {
          throw new Error('Invalid backup shape');
        }
        if (!confirm('Importing this backup will replace current local app data. Continue?')) return;
        state.data = migrateData(imported);
        saveData(true);
        applyTheme();
        render();
      } catch (error) {
        console.error(error);
        toast('Invalid JSON backup file.');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvEscape(value) {
    const str = String(value ?? '');
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  }

  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      toast('Notifications are not supported in this browser.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      state.data.settings.notificationsEnabled = true;
      saveData(true);
      toast('Notifications allowed.');
      render();
    } else {
      toast('Notification permission was not granted.');
    }
  }

  function sendLocalNotification(title, body) {
    if (!state.data.settings.notificationsEnabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (navigator.serviceWorker?.ready) {
      navigator.serviceWorker.ready.then(reg => reg.showNotification(title, {
        body,
        icon: 'assets/icon-192.png',
        badge: 'assets/icon-192.png',
        tag: `time-audit-${title}`,
        renotify: false
      })).catch(() => new Notification(title, { body }));
    } else {
      new Notification(title, { body });
    }
  }

  function startReminderScan() {
    setInterval(() => {
      const settings = state.data.settings;
      if (!settings.notificationsEnabled) return;
      const now = new Date();
      const minuteKey = `${todayISO()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (state.lastNotificationMinute === minuteKey) return;
      const time = minuteKey.slice(-5);
      const jobs = [];
      if (settings.progressReminderEnabled && settings.progressReminderTimes.includes(time)) jobs.push(['Progress reminder', randomItem(settings.customNotificationMessages.progress)]);
      if (settings.exportReminderEnabled && settings.exportReminderTimes.includes(time)) jobs.push(['Export reminder', randomItem(settings.customNotificationMessages.export)]);
      if (settings.motivationalReminderEnabled && settings.motivationalReminderTimes.includes(time)) jobs.push(['Keep going', randomItem(settings.customNotificationMessages.motivational)]);
      if (jobs.length) {
        state.lastNotificationMinute = minuteKey;
        jobs.forEach(([title, body]) => sendLocalNotification(title, body));
      }
    }, REMINDER_SCAN_MS);
  }

  function openModal(title, bodyHtml) {
    const tpl = $('#modalTemplate');
    const node = tpl.content.cloneNode(true);
    node.querySelector('#modalTitle').textContent = title;
    node.querySelector('#modalBody').innerHTML = bodyHtml;
    document.body.appendChild(node);
    document.body.addEventListener('click', modalClickHandler);
  }

  function modalClickHandler(event) {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action) {
      handleAction(action, event);
      return;
    }
    if (event.target.closest('[data-close-modal]') && !event.target.closest('.modal-card')) closeModal();
    if (event.target.matches('[data-close-modal]')) closeModal();
  }

  function closeModal() {
    $$('.modal-backdrop').forEach(node => node.remove());
    document.body.removeEventListener('click', modalClickHandler);
  }

  function clearAllData() {
    if (!confirm('This deletes all local logs, settings, categories, activities, reflections, and targets from this browser. Export JSON backup first if needed. Continue?')) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
    state.data = createDefaultData();
    saveData(true);
    applyTheme();
    navigate('today');
  }

  function addDemoData() {
    const date = todayISO();
    const examples = [
      ['07:30', '08:15', 'act_eating', 3, 'Breakfast and getting ready.'],
      ['09:00', '11:00', 'act_studying', 5, 'Focused statistics practice.'],
      ['11:30', '12:30', 'act_class', 4, 'Class notes and discussion.'],
      ['14:00', '16:00', 'act_business', 4, 'Srijani product work.'],
      ['18:00', '19:00', 'act_scrolling', 2, 'Unplanned scrolling.'],
      ['22:30', '23:15', 'act_planning', 4, 'Planning tomorrow.']
    ];
    examples.forEach(([startTime, endTime, activityId, productivityRating, note]) => {
      const activity = getActivity(activityId);
      const category = getCategory(activity?.defaultCategoryId);
      state.data.logs.push({
        id: uid(),
        date,
        startTime,
        endTime,
        durationMinutes: timeToMinutes(endTime) - timeToMinutes(startTime),
        activityId,
        activityNameSnapshot: activity?.name || 'Activity',
        categoryId: category?.id || '',
        categoryNameSnapshot: category?.name || 'Category',
        productivityRating,
        note,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
    saveData(true);
    navigate('today');
  }

  function getDaySummary(date) {
    const logs = getLogsByDate(date);
    const loggedMinutes = logs.reduce((sum, log) => sum + Number(log.durationMinutes || 0), 0);
    const windowMinutes = getDayWindowMinutes();
    const unloggedMinutes = Math.max(0, windowMinutes - loggedMinutes);
    const studyMinutes = logs.reduce((sum, log) => sum + (getCategory(log.categoryId)?.countsAsStudyTime ? Number(log.durationMinutes || 0) : 0), 0);
    const avgProductivity = average(logs.map(log => Number(log.productivityRating)).filter(Boolean));
    const topCategory = getCategoryTotals(logs)[0]?.name || '';
    const streak = getStreak();
    return {
      loggedMinutes,
      unloggedMinutes,
      studyMinutes,
      avgProductivity,
      topCategory,
      streak,
      targetSummary: summarizeTargets(getTargetRowsForPeriod('daily', date, date))
    };
  }

  function getRangeSummary(start, end) {
    const logs = getLogsInRange(start, end);
    const days = daysBetween(start, end) + 1;
    const loggedMinutes = logs.reduce((sum, log) => sum + Number(log.durationMinutes || 0), 0);
    const unloggedMinutes = Math.max(0, getDayWindowMinutes() * days - loggedMinutes);
    const studyMinutes = logs.reduce((sum, log) => sum + (getCategory(log.categoryId)?.countsAsStudyTime ? Number(log.durationMinutes || 0) : 0), 0);
    const avgProductivity = average(logs.map(log => Number(log.productivityRating)).filter(Boolean));
    const topCategory = getCategoryTotals(logs)[0]?.name || '';
    const topActivity = getActivityTotals(logs)[0]?.name || '';
    return {
      loggedMinutes,
      unloggedMinutes,
      studyMinutes,
      avgProductivity,
      topCategory,
      topActivity,
      targetSummary: summarizeTargets(getTargetRowsForRange(start, end))
    };
  }

  function getLogsByDate(date) {
    return state.data.logs.filter(log => log.date === date);
  }

  function getLogsInRange(start, end) {
    return state.data.logs.filter(log => log.date >= start && log.date <= end);
  }

  function getLoggedMinutesByDate(date) {
    return getLogsByDate(date).reduce((sum, log) => sum + Number(log.durationMinutes || 0), 0);
  }

  function getCategoryTotals(logs) {
    const map = new Map();
    logs.forEach(log => {
      const category = getCategory(log.categoryId);
      const key = log.categoryId || log.categoryNameSnapshot;
      if (!map.has(key)) {
        map.set(key, {
          id: log.categoryId,
          name: category?.name || log.categoryNameSnapshot || 'Unknown',
          color: category?.color || '#64748b',
          icon: category?.icon || '•',
          minutes: 0
        });
      }
      map.get(key).minutes += Number(log.durationMinutes || 0);
    });
    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes);
  }

  function getActivityTotals(logs) {
    const map = new Map();
    logs.forEach(log => {
      const key = log.activityId || log.activityNameSnapshot;
      if (!map.has(key)) map.set(key, { id: log.activityId, name: log.activityNameSnapshot || getActivity(log.activityId)?.name || 'Unknown', minutes: 0 });
      map.get(key).minutes += Number(log.durationMinutes || 0);
    });
    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes);
  }

  function getCategoryMinutesForRange(categoryId, start, end) {
    return getLogsInRange(start, end)
      .filter(log => log.categoryId === categoryId)
      .reduce((sum, log) => sum + Number(log.durationMinutes || 0), 0);
  }

  function getActivityMinutesForRange(activityId, start, end) {
    return getLogsInRange(start, end)
      .filter(log => log.activityId === activityId)
      .reduce((sum, log) => sum + Number(log.durationMinutes || 0), 0);
  }

  function getGapsForDate(date) {
    const dayStart = timeToMinutes(state.data.settings.dayStartTime || '00:00');
    const dayEnd = timeToMinutes(state.data.settings.dayEndTime || '24:00');
    const startWindow = Number.isFinite(dayStart) ? dayStart : 0;
    const endWindow = Number.isFinite(dayEnd) ? dayEnd : 24 * 60;
    const intervals = getLogsByDate(date)
      .map(log => ({ start: Math.max(startWindow, timeToMinutes(log.startTime)), end: Math.min(endWindow, timeToMinutes(log.endTime)) }))
      .filter(item => item.end > item.start)
      .sort((a, b) => a.start - b.start);

    const merged = [];
    intervals.forEach(interval => {
      const last = merged.at(-1);
      if (!last || interval.start > last.end) merged.push({ ...interval });
      else last.end = Math.max(last.end, interval.end);
    });

    const gaps = [];
    let cursor = startWindow;
    merged.forEach(interval => {
      if (interval.start > cursor) gaps.push({ date, start: cursor, end: interval.start });
      cursor = Math.max(cursor, interval.end);
    });
    if (cursor < endWindow) gaps.push({ date, start: cursor, end: endWindow });
    return gaps.filter(gap => gap.end - gap.start >= 1);
  }

  function findOverlap(date, start, end, excludeId = null) {
    if (!date || !Number.isFinite(start) || !Number.isFinite(end)) return [];
    return getLogsByDate(date).filter(log => {
      if (excludeId && log.id === excludeId) return false;
      const s = timeToMinutes(log.startTime);
      const e = timeToMinutes(log.endTime);
      return start < e && end > s;
    });
  }

  function getReflection(date) {
    return state.data.reflections.find(reflection => reflection.date === date);
  }

  function getCategory(id) {
    return state.data.categories.find(category => category.id === id);
  }

  function getActivity(id) {
    return state.data.activities.find(activity => activity.id === id);
  }

  function getActiveTarget(categoryId, period) {
    const category = getCategory(categoryId);
    return (category?.targets || []).find(target => target.active && target.period === period);
  }

  function getTargetRowsForPeriod(period, start, end) {
    const days = daysBetween(start, end) + 1;
    return state.data.categories.flatMap(category => (category.targets || [])
      .filter(target => target.active && target.period === period)
      .map(target => ({
        category,
        period: target.period,
        type: target.type,
        target: scaledTargetMinutes(target, days, start, end),
        actual: getCategoryMinutesForRange(category.id, start, end)
      })));
  }

  function getTargetRowsForRange(start, end) {
    const days = daysBetween(start, end) + 1;
    return state.data.categories.flatMap(category => (category.targets || [])
      .filter(target => target.active)
      .map(target => ({
        category,
        period: target.period,
        type: target.type,
        target: scaledTargetMinutes(target, days, start, end),
        actual: getCategoryMinutesForRange(category.id, start, end)
      })));
  }

  function scaledTargetMinutes(target, days, start, end) {
    if (target.period === 'daily') return target.durationMinutes * days;
    if (target.period === 'weekly') return target.durationMinutes * Math.max(1, Math.ceil(days / 7));
    if (target.period === 'monthly') return target.durationMinutes * Math.max(1, countMonthsTouched(start, end));
    return target.durationMinutes;
  }

  function summarizeTargets(rows) {
    if (!rows.length) return 'No active targets';
    const met = rows.filter(row => row.type === 'minimum' ? row.actual >= row.target : row.actual <= row.target).length;
    return `${met}/${rows.length} targets okay`;
  }

  function getStreak() {
    const threshold = Number(state.data.settings.streakMinimumLoggedMinutes || 720);
    let current = 0;
    for (let date = todayISO(); ; date = addDays(date, -1)) {
      if (getLoggedMinutesByDate(date) >= threshold) current += 1;
      else break;
      if (current > 10000) break;
    }

    const dates = uniqueDates(state.data.logs.map(log => log.date)).sort();
    let best = 0;
    let run = 0;
    let cursor = null;
    dates.forEach(date => {
      const hit = getLoggedMinutesByDate(date) >= threshold;
      if (!hit) {
        run = 0;
        cursor = date;
        return;
      }
      if (cursor && addDays(cursor, 1) === date) run += 1;
      else run = 1;
      best = Math.max(best, run);
      cursor = date;
    });
    return { current, best };
  }

  function getSelectedRange() {
    const today = todayISO();
    const filter = state.report.filter;
    if (filter === 'today') return { start: today, end: today };
    if (filter === 'yesterday') return { start: addDays(today, -1), end: addDays(today, -1) };
    if (filter === 'thisWeek') return weekRange(today);
    if (filter === 'lastWeek') {
      const current = weekRange(today);
      return { start: addDays(current.start, -7), end: addDays(current.end, -7) };
    }
    if (filter === 'thisMonth') return monthRange(today);
    if (filter === 'lastMonth') return monthRange(addMonths(today, -1));
    let start = state.report.customStart || today;
    let end = state.report.customEnd || start;
    if (end < start) [start, end] = [end, start];
    return { start, end };
  }

  function getComparisonBuckets(type) {
    const today = todayISO();
    if (type === 'wow') {
      const current = weekRange(today);
      return Array.from({ length: 6 }, (_, i) => {
        const start = addDays(current.start, -7 * (5 - i));
        const end = addDays(start, 6);
        return { start, end, label: `W ${formatShortDate(start)}` };
      });
    }
    if (type === 'mom') {
      return Array.from({ length: 6 }, (_, i) => {
        const base = addMonths(today, -(5 - i));
        const range = monthRange(base);
        return { ...range, label: monthShort(base) };
      });
    }
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, -(6 - i));
      return { start: date, end: date, label: weekdayShort(date) };
    });
  }

  function getRadarRange() {
    const today = todayISO();
    if (state.report.radarPeriod === 'month') return monthRange(today);
    if (state.report.radarPeriod === 'week') return weekRange(today);
    return { start: today, end: today };
  }

  function getLineBuckets(range) {
    const today = todayISO();
    if (range === '30d') {
      return Array.from({ length: 30 }, (_, i) => {
        const date = addDays(today, -(29 - i));
        return { start: date, end: date, label: formatShortDate(date) };
      });
    }
    if (range === '12w') {
      const current = weekRange(today);
      return Array.from({ length: 12 }, (_, i) => {
        const start = addDays(current.start, -7 * (11 - i));
        const end = addDays(start, 6);
        return { start, end, label: `W${formatShortDate(start)}` };
      });
    }
    if (range === '12m') {
      return Array.from({ length: 12 }, (_, i) => {
        const base = addMonths(today, -(11 - i));
        const range = monthRange(base);
        return { ...range, label: monthShort(base) };
      });
    }
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, -(6 - i));
      return { start: date, end: date, label: weekdayShort(date) };
    });
  }

  function getDayWindowMinutes() {
    const start = timeToMinutes(state.data.settings.dayStartTime || '00:00');
    const end = timeToMinutes(state.data.settings.dayEndTime || '24:00');
    if (!Number.isFinite(start) || !Number.isFinite(end)) return 1440;
    return Math.max(1, end - start);
  }

  function timeToMinutes(time) {
    if (typeof time !== 'string') return NaN;
    const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return NaN;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h === 24 && m === 0) return 1440;
    if (h < 0 || h > 23 || m < 0 || m > 59) return NaN;
    return h * 60 + m;
  }

  function minutesToTime(minutes) {
    const safe = clamp(Math.round(minutes), 0, 1439);
    return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
  }

  function formatTimeRange(start, end) {
    return `${formatClock(start)} – ${formatClock(end)}`;
  }

  function formatClock(minutes) {
    if (minutes === 1440) return '12:00 AM';
    const h24 = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    const suffix = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
  }

  function formatDuration(minutes) {
    const safe = Math.max(0, Math.round(Number(minutes) || 0));
    const h = Math.floor(safe / 60);
    const m = safe % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m}m`;
  }

  function formatDurationCompact(minutes) {
    const safe = Math.max(0, Math.round(Number(minutes) || 0));
    if (safe >= 60) return `${(safe / 60).toFixed(safe % 60 ? 1 : 0)}h`;
    return `${safe}m`;
  }

  function formatSeconds(seconds) {
    const safe = Math.max(0, Math.round(seconds));
    return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
  }

  function todayISO() {
    const d = new Date();
    return dateToISO(d);
  }

  function dateToISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseISO(date) {
    return new Date(`${date}T12:00:00`);
  }

  function addDays(date, days) {
    const d = parseISO(date);
    d.setDate(d.getDate() + days);
    return dateToISO(d);
  }

  function addMonths(date, months) {
    const d = parseISO(date);
    d.setMonth(d.getMonth() + months);
    return dateToISO(d);
  }

  function daysBetween(start, end) {
    const ms = parseISO(end) - parseISO(start);
    return Math.round(ms / 86400000);
  }

  function weekRange(date) {
    const d = parseISO(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    const start = dateToISO(d);
    d.setDate(d.getDate() + 6);
    return { start, end: dateToISO(d) };
  }

  function monthRange(date) {
    const d = parseISO(date);
    const start = new Date(d.getFullYear(), d.getMonth(), 1, 12);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12);
    return { start: dateToISO(start), end: dateToISO(end) };
  }

  function countMonthsTouched(start, end) {
    const s = parseISO(start);
    const e = parseISO(end);
    return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  }

  function formatLongDate(date) {
    return parseISO(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function formatShortDate(date) {
    return parseISO(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function formatDateRange(start, end) {
    return start === end ? formatLongDate(start) : `${formatShortDate(start)} – ${formatShortDate(end)}`;
  }

  function weekdayShort(date) {
    return parseISO(date).toLocaleDateString(undefined, { weekday: 'short' });
  }

  function monthShort(date) {
    return parseISO(date).toLocaleDateString(undefined, { month: 'short' });
  }

  function normalizeDayWindowTime(value) {
    const text = String(value || '').trim();
    return Number.isFinite(timeToMinutes(text)) ? text.padStart(5, '0') : '';
  }

  function parseTimeList(value) {
    return String(value || '')
      .split(',')
      .map(item => item.trim())
      .filter(item => Number.isFinite(timeToMinutes(item)))
      .map(item => item.padStart(5, '0'));
  }

  function splitLines(value) {
    return String(value || '').split('\n').map(line => line.trim()).filter(Boolean);
  }

  function nowMinutes() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  function average(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function uid() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function uniqueDates(dates) {
    return Array.from(new Set(dates));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function truncate(value, length) {
    const str = String(value || '');
    return str.length > length ? `${str.slice(0, length - 1)}…` : str;
  }

  function capitalize(value) {
    return String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1);
  }

  function randomItem(items) {
    const arr = Array.isArray(items) && items.length ? items : ['Keep going.'];
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function emptyState(text) {
    return `<div class="alert"><p>${escapeHtml(text)}</p></div>`;
  }

  function toast(message) {
    const node = $('#toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => node.classList.remove('show'), 2600);
  }
})();
