import { TRANSLATIONS } from './translations.js';

const DEFAULT_FAMILY_MEMBERS = [
  { id: 'grandma', name: 'Grandma', initials: 'G', role: 'Care recipient', x: 50, y: 16 },
  { id: 'mom', name: 'Mom', initials: 'M', role: 'Caregiver', x: 80, y: 32 },
  { id: 'dad', name: 'Dad', initials: 'D', role: 'Caregiver', x: 80, y: 68 },
  { id: 'brother', name: 'Brother', initials: 'B', role: 'Caregiver', x: 50, y: 84 },
  { id: 'you', name: 'YOU', initials: 'Y', role: 'Circle admin', x: 20, y: 50 }
];
let FAMILY_MEMBERS = structuredClone(DEFAULT_FAMILY_MEMBERS);
const HEALTH_CATEGORIES = [
  { id: 'at-risk', label: 'At risk' },
  { id: 'unhealthy', label: 'Unhealthy' },
  { id: 'healthy', label: 'Healthy' },
  { id: 'good-health', label: 'Good health' }
];
const DEFAULT_WELLBEING = {
  grandma: { hydration: 5, activity: 16, vitalsLogged: false, mood: 'Good' },
  mom: { hydration: 6, activity: 28, vitalsLogged: true, mood: 'Steady' },
  dad: { hydration: 4, activity: 32, vitalsLogged: false, mood: 'Tired' },
  brother: { hydration: 7, activity: 42, vitalsLogged: false, mood: 'Great' },
  you: { hydration: 5, activity: 12, vitalsLogged: false, mood: 'Steady' }
};
const DEFAULT_WELLBEING_FEED = [
  { member: 'mom', actor: 'Mom', event: 'Movement check-in logged', time: '9:20 AM', icon: 'spark' },
  { member: 'grandma', actor: 'Mom', event: 'Hydration check-in logged', time: '9:05 AM', icon: 'check' },
  { member: 'dad', actor: 'Dad', event: 'Mood check-in shared', time: '8:50 AM', icon: 'heart' },
  { member: 'brother', actor: 'Brother', event: 'Activity goal updated', time: '8:35 AM', icon: 'clock' },
  { member: 'you', actor: 'You', event: 'Daily check-in shared', time: '8:15 AM', icon: 'users' }
];
const STORAGE_KEY = 'carecircle-mvp-v1';
const SETTINGS_KEY = 'carecircle-settings-v1';
const AUTH_STORAGE_KEY = 'carecircle-auth-v1';
const AUTH_SESSION_KEY = 'carecircle-auth-session-v1';

let accountCredential = null;
try { accountCredential = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)); } catch { accountCredential = null; }
const needsAccountSetup = !accountCredential?.id || !accountCredential?.displayName || !accountCredential?.salt || !accountCredential?.passwordHash;
const defaultPreferences = { theme: 'light', reminders: { tasks: true, overdue: true, medications: true, appointments: true } };
let preferences;
try {
  const savedPreferences = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  preferences = { ...defaultPreferences, ...savedPreferences, reminders: { ...defaultPreferences.reminders, ...savedPreferences.reminders } };
  if (preferences.theme !== 'light' && preferences.theme !== 'dark') {
    preferences.theme = 'light';
  }
} catch { preferences = structuredClone(defaultPreferences); }

function applyTheme(theme) {
  const effectiveTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = effectiveTheme;
  document.documentElement.setAttribute('data-effective-theme', effectiveTheme);
}
applyTheme(preferences.theme);

const today = new Date();
const dateOffset = (days) => { const date = new Date(today); date.setDate(date.getDate() + days); return date; };
const isoDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const initialState = {
  accountName: '',
  profile: { name: 'Grandma', age: 82, contact: 'Family Caregiver', phone: '(555) 013-8420', allergies: 'Penicillin', notes: 'Prefers tea with breakfast. Keep her reading glasses by the armchair.' },
  tasks: [
    { id: 1, title: 'Morning medicine', time: '08:00', assignee: 'Mom', done: true },
    { id: 2, title: 'Prepare breakfast', time: '08:30', assignee: 'Dad', done: true },
    { id: 3, title: 'Check blood pressure', time: '10:00', assignee: 'Brother', done: true },
    { id: 4, title: 'Pick up groceries', time: '12:30', assignee: 'Dad', done: false },
    { id: 5, title: 'Evening medicine', time: '20:00', assignee: 'Mom', done: false }
  ],
  medications: [
    { id: 1, name: 'Medicine A', dose: 'As prescribed', time: '08:00', taken: true, by: 'Mom' },
    { id: 2, name: 'Medicine B', dose: 'As prescribed', time: '13:00', taken: false, by: '' },
    { id: 3, name: 'Medicine C', dose: 'As prescribed', time: '20:00', taken: false, by: '' }
  ],
  appointments: [],
  history: [
    { time: '8:00 AM', event: 'Morning medicine', person: 'Mom' },
    { time: '8:30 AM', event: 'Breakfast', person: 'Dad' },
    { time: '10:00 AM', event: 'Blood pressure checked', person: 'Brother' }
  ],
  wellbeing: structuredClone(DEFAULT_WELLBEING),
  wellbeingFeed: structuredClone(DEFAULT_WELLBEING_FEED),
  familyMembers: structuredClone(DEFAULT_FAMILY_MEMBERS),
  chatMessages: [],
  wellbeingLogDates: Object.fromEntries(DEFAULT_FAMILY_MEMBERS.map((member) => [member.id, []])),
  medicalRecords: []
};

let state;
try { state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(initialState); } catch { state = structuredClone(initialState); }
FAMILY_MEMBERS = Array.isArray(state.familyMembers) ? state.familyMembers : structuredClone(DEFAULT_FAMILY_MEMBERS);
state.familyMembers = FAMILY_MEMBERS;
if (state.profile?.contact === 'Margaret Lee' || state.profile?.contact === 'Margaret') {
  state.profile.contact = 'Family Caregiver';
}
if (state.wellbeing?.margaret) {
  state.wellbeing.you = state.wellbeing.margaret;
  delete state.wellbeing.margaret;
}
if (state.wellbeingLogDates?.margaret) {
  state.wellbeingLogDates.you = state.wellbeingLogDates.margaret;
  delete state.wellbeingLogDates.margaret;
}
if (Array.isArray(state.familyMembers)) {
  state.familyMembers.forEach((member) => {
    if (member.id === 'margaret') member.id = 'you';
    if (member.name === 'Margaret Lee' || member.name === 'Margaret') member.name = 'YOU';
  });
}
if (Array.isArray(state.wellbeingFeed)) {
  state.wellbeingFeed.forEach((entry) => {
    if (entry.member === 'margaret') entry.member = 'you';
    if (entry.actor === 'Margaret Lee' || entry.actor === 'Margaret') entry.actor = 'You';
  });
}
state.accountName = String(accountCredential?.displayName || state.accountName || '').trim() || 'YOU';
state.appointments ||= [];
state.appointments = state.appointments.filter((appointment) => !(
  (Number(appointment.id) === 1 && appointment.title === 'Doctor appointment · Dr. Chen' && appointment.time === '10:30') ||
  (Number(appointment.id) === 2 && appointment.title === 'Lab visit' && appointment.time === '09:00')
));
state.wellbeing = { ...structuredClone(DEFAULT_WELLBEING), ...(state.wellbeing || {}) };
FAMILY_MEMBERS.forEach((member) => {
  state.wellbeing[member.id] ||= { hydration: 0, activity: 0, vitalsLogged: false, mood: 'Steady' };
});
state.wellbeingFeed ||= structuredClone(DEFAULT_WELLBEING_FEED);
state.chatMessages ||= [];
state.wellbeingLogDates ||= Object.fromEntries(FAMILY_MEMBERS.map((member) => [member.id, []]));
FAMILY_MEMBERS.forEach((member) => {
  if (!Array.isArray(state.wellbeingLogDates[member.id])) state.wellbeingLogDates[member.id] = [];
});
state.medicalRecords ||= [];

let taskFilter = 'all';
let selectedMemberId = 'you';
let accountDialogMode = 'create';

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const formatTime = (time) => { const [hours, minutes] = time.split(':').map(Number); const suffix = hours >= 12 ? 'PM' : 'AM'; return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`; };
const formatLongDate = (date) => {
  const localeMap = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', ru: 'ru-RU', hi: 'hi-IN', ne: 'ne-NP' };
  const locale = localeMap[currentLanguage] || 'en-US';
  return new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
};
const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

const LANG_STORAGE_KEY = 'carecircle_selected_lang';

const LANGUAGES = [
  {
    code: 'en',
    name: 'English',
    flagSvg: `<svg viewBox="0 0 60 40" class="flag-svg" aria-hidden="true"><rect width="60" height="40" fill="#012169"/><path d="M0,0 L60,40 M60,0 L0,40" stroke="#ffffff" stroke-width="8"/><path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" stroke-width="4"/><path d="M30,0 V40 M0,20 H60" stroke="#ffffff" stroke-width="12"/><path d="M30,0 V40 M0,20 H60" stroke="#C8102E" stroke-width="7"/></svg>`
  },
  {
    code: 'fr',
    name: 'Français',
    flagSvg: `<svg viewBox="0 0 60 40" class="flag-svg" aria-hidden="true"><rect width="20" height="40" fill="#002395"/><rect x="20" width="20" height="40" fill="#ffffff"/><rect x="40" width="20" height="40" fill="#ED2939"/></svg>`
  },
  {
    code: 'es',
    name: 'Español',
    flagSvg: `<svg viewBox="0 0 60 40" class="flag-svg" aria-hidden="true"><rect width="60" height="10" fill="#AA151B"/><rect y="10" width="60" height="20" fill="#F1BF00"/><rect y="30" width="60" height="10" fill="#AA151B"/><rect x="13" y="16" width="8" height="9" rx="2" fill="#AA151B"/><circle cx="17" cy="14" r="2.5" fill="#AA151B"/><rect x="15" y="18" width="4" height="4" fill="#F1BF00"/></svg>`
  },
  {
    code: 'de',
    name: 'Deutsch',
    flagSvg: `<svg viewBox="0 0 60 40" class="flag-svg" aria-hidden="true"><rect width="60" height="13.33" fill="#000000"/><rect y="13.33" width="60" height="13.34" fill="#DD0000"/><rect y="26.67" width="60" height="13.33" fill="#FFCC00"/></svg>`
  },
  {
    code: 'ru',
    name: 'Русский',
    flagSvg: `<svg viewBox="0 0 60 40" class="flag-svg" aria-hidden="true"><rect width="60" height="13.33" fill="#FFFFFF"/><rect y="13.33" width="60" height="13.34" fill="#0039A6"/><rect y="26.67" width="60" height="13.33" fill="#D52B1E"/></svg>`
  },
  {
    code: 'hi',
    name: 'हिन्दी',
    flagSvg: `<svg viewBox="0 0 60 40" class="flag-svg" aria-hidden="true"><rect width="60" height="13.33" fill="#FF9933"/><rect y="13.33" width="60" height="13.34" fill="#FFFFFF"/><rect y="26.67" width="60" height="13.33" fill="#138808"/><circle cx="30" cy="20" r="5" fill="none" stroke="#000088" stroke-width="1.8"/><circle cx="30" cy="20" r="1.5" fill="#000088"/></svg>`
  },
  {
    code: 'ne',
    name: 'नेपाली',
    flagSvg: `<svg viewBox="0 0 60 40" class="flag-svg" aria-hidden="true"><rect width="60" height="40" fill="#003893"/><polygon points="12,4 42,18 24,18 45,36 12,36" fill="#DC143C"/><circle cx="21" cy="12" r="3.5" fill="#FFFFFF"/><circle cx="21" cy="10.5" r="3" fill="#DC143C"/><circle cx="21" cy="27" r="3.5" fill="#FFFFFF"/></svg>`
  }
];

const LOCAL_TRANSLATIONS_FALLBACK = {
  en: {
    today: 'Today',
    tasks: 'Tasks',
    schedule: 'Schedule',
    circle: 'Circle',
    settings: 'Settings',
    newTask: 'New task',
    addAppointment: 'Add appointment',
    addTask: '+ Add task',
    tasksCompleted: 'Tasks completed',
    stillToDo: 'Still to do',
    overdue: 'Overdue',
    nextAppointment: 'Next appointment',
    dailyCareStreak: 'DAILY CARE STREAK',
    streakBadge: '3-Day Streak!',
    reviewAlerts: 'Review alerts',
    openReminders: 'Open reminders',
    todaysCare: "Today's care"
  },
  fr: {
    today: "Aujourd'hui",
    tasks: 'Tâches',
    schedule: 'Planning',
    circle: 'Cercle',
    settings: 'Paramètres',
    newTask: 'Nouvelle tâche',
    addAppointment: 'Ajouter RDV',
    addTask: '+ Ajouter tâche',
    tasksCompleted: 'Tâches terminées',
    stillToDo: 'Reste à faire',
    overdue: 'En retard',
    nextAppointment: 'Prochain RDV',
    dailyCareStreak: 'SÉRIE DE SOINS',
    streakBadge: 'Série de 3 jours !',
    reviewAlerts: 'Vérifier alertes',
    openReminders: 'Ouvrir rappels',
    todaysCare: "Soins d'aujourd'hui"
  },
  es: {
    today: 'Hoy',
    tasks: 'Tareas',
    schedule: 'Horario',
    circle: 'Círculo',
    settings: 'Ajustes',
    newTask: 'Nueva tarea',
    addAppointment: 'Añadir cita',
    addTask: '+ Añadir tarea',
    tasksCompleted: 'Tareas completadas',
    stillToDo: 'Por hacer',
    overdue: 'Atrasado',
    nextAppointment: 'Próxima cita',
    dailyCareStreak: 'RACHA DIARIA DE CUIDADOS',
    streakBadge: '¡Racha de 3 días!',
    reviewAlerts: 'Revisar alertas',
    openReminders: 'Abrir recordatorios',
    todaysCare: 'Cuidados de hoy'
  },
  de: {
    today: 'Heute',
    tasks: 'Aufgaben',
    schedule: 'Zeitplan',
    circle: 'Kreis',
    settings: 'Einstellungen',
    newTask: 'Neue Aufgabe',
    addAppointment: 'Termin addieren',
    addTask: '+ Aufgabe addieren',
    tasksCompleted: 'Erledigte Aufgaben',
    stillToDo: 'Noch zu tun',
    overdue: 'Überfällig',
    nextAppointment: 'Nächster Termin',
    dailyCareStreak: 'TÄGLICHE PFLEGE-SERIE',
    streakBadge: '3-Tage-Serie!',
    reviewAlerts: 'Warnungen prüfen',
    openReminders: 'Erinnerungen öffnen',
    todaysCare: 'Heutige Pflege'
  },
  ru: {
    today: 'Сегодня',
    tasks: 'Задачи',
    schedule: 'График',
    circle: 'Круг',
    settings: 'Настройки',
    newTask: 'Новая задача',
    addAppointment: 'Запись к врачу',
    addTask: '+ Добавить задачу',
    tasksCompleted: 'Выполнено задач',
    stillToDo: 'Осталось сделать',
    overdue: 'Просрочено',
    nextAppointment: 'Следующий визит',
    dailyCareStreak: 'УДАРНЫЙ РЕЖИМ ЗАБОТЫ',
    streakBadge: 'Серия 3 дня!',
    reviewAlerts: 'Смотреть alertas',
    openReminders: 'Открыть напоминания',
    todaysCare: 'Забота на сегодня'
  },
  hi: {
    today: 'आज',
    tasks: 'कार्य',
    schedule: 'समय सारणी',
    circle: 'परिवार',
    settings: 'सेटिंग्स',
    newTask: 'नया कार्य',
    addAppointment: 'मुलाकात जोड़ें',
    addTask: '+ कार्य जोड़ें',
    tasksCompleted: 'पूर्ण कार्य',
    stillToDo: 'शेष कार्य',
    overdue: 'विलंबित',
    nextAppointment: 'अगली मुलाकात',
    dailyCareStreak: 'दैनिक देखभाल स्ट्रीक',
    streakBadge: '3-दिन की स्ट्रीक!',
    reviewAlerts: 'अलर्ट देखें',
    openReminders: 'रिमाइंडर खोलें',
    todaysCare: 'आज की देखभाल'
  },
  ne: {
    today: 'आज',
    tasks: 'कार्यहरू',
    schedule: 'तालिका',
    circle: 'परिवार',
    settings: 'सेटिङहरू',
    newTask: 'नयाँ कार्य',
    addAppointment: 'भेटघाट थप्नुहोस्',
    addTask: '+ कार्य थप्नुहोस्',
    tasksCompleted: 'सम्पन्न कार्यहरू',
    stillToDo: 'गर्न बाँकी',
    overdue: 'म्याद नाघेको',
    nextAppointment: 'अर्को भेटघाट',
    dailyCareStreak: 'दैनिक हेरचाह स्ट्रीक',
    streakBadge: '३-दिने स्ट्रीक!',
    reviewAlerts: 'अलर्ट हेर्नुहोस्',
    openReminders: 'रिमाइन्डर खोल्नुहोस्',
    todaysCare: 'आजको हेरचाह'
  }
};

let currentLanguage = localStorage.getItem(LANG_STORAGE_KEY) || 'en';
if (!LANGUAGES.some((lang) => lang.code === currentLanguage)) currentLanguage = 'en';

function applyLanguageTranslations(code) {
  const t = TRANSLATIONS[code] || TRANSLATIONS.en;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (t[key]) el.textContent = t[key];
  });
  const streakTitle = $('.streak-badge-label');
  if (streakTitle && t.dailyCareStreak) streakTitle.textContent = t.dailyCareStreak;
  const streakPill = $('.streak-right-pill span');
  if (streakPill && t.streakBadge) streakPill.textContent = t.streakBadge;
  const addApptBtn = $('#appointmentButton');
  if (addApptBtn && t.addAppointment) {
    addApptBtn.innerHTML = `<svg fill="none" stroke="currentColor"><use href="#i-calendar"/></svg>${escapeHtml(t.addAppointment)}`;
  }
  const addTaskBtn = $('#addTaskButton');
  if (addTaskBtn && t.newTask) {
    addTaskBtn.innerHTML = `<svg fill="none" stroke="currentColor"><use href="#i-plus"/></svg>${escapeHtml(t.newTask)}`;
  }
  const taskLink = $('#taskLink');
  if (taskLink && t.addTask) taskLink.textContent = t.addTask;
  const summaryCards = document.querySelectorAll('.summary-card .summary-top');
  if (summaryCards[0] && t.tasksCompleted) summaryCards[0].childNodes[0].textContent = `${t.tasksCompleted} `;
  if (summaryCards[1] && t.stillToDo) summaryCards[1].childNodes[0].textContent = `${t.stillToDo} `;
  if (summaryCards[2] && t.overdue) summaryCards[2].childNodes[0].textContent = `${t.overdue} `;
  if (summaryCards[3] && t.nextAppointment) summaryCards[3].childNodes[0].textContent = `${t.nextAppointment} `;
  const alertAction = $('#alertAction');
  if (alertAction) {
    const isCritical = $('#alertHub')?.classList.contains('critical');
    alertAction.textContent = isCritical ? (t.reviewAlerts || 'Review alerts') : (t.openReminders || 'Open reminders');
  }
  const localeMap = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', ru: 'ru-RU', hi: 'hi-IN', ne: 'ne-NP' };
  const locale = localeMap[code] || 'en-US';
  $('#todayDate').textContent = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(today);
}

function initLanguageSwitcher() {
  const trigger = $('#langTriggerBtn');
  const dropdown = $('#langDropdown');
  const list = $('#langOptionsList');
  const activeBadge = $('#activeFlagBadge');
  if (!trigger || !dropdown || !list || !activeBadge) return;

  function renderDropdown() {
    const activeLang = LANGUAGES.find((l) => l.code === currentLanguage) || LANGUAGES[0];
    activeBadge.innerHTML = activeLang.flagSvg;
    list.innerHTML = LANGUAGES.map((lang) => `
      <button class="lang-option-btn ${lang.code === currentLanguage ? 'active' : ''}" type="button" role="option" aria-selected="${lang.code === currentLanguage}" data-lang="${lang.code}">
        <span class="lang-option-flag">${lang.flagSvg}</span>
        <span class="lang-name">${escapeHtml(lang.name)}</span>
        <svg class="lang-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
    `).join('');
  }

  function setLanguage(code) {
    if (!LANGUAGES.some((l) => l.code === code)) return;
    currentLanguage = code;
    localStorage.setItem(LANG_STORAGE_KEY, code);
    renderDropdown();
    applyLanguageTranslations(code);
    dropdown.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
    dropdown.hidden = isExpanded;
    trigger.setAttribute('aria-expanded', String(!isExpanded));
  });

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lang]');
    if (!btn) return;
    setLanguage(btn.dataset.lang);
  });

  document.addEventListener('click', (e) => {
    if (!$('#langSwitcher')?.contains(e.target)) {
      dropdown.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dropdown.hidden) {
      dropdown.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus();
    }
  });

  renderDropdown();
  applyLanguageTranslations(currentLanguage);
}

async function derivePasswordHash(password, salt, iterations = 210000) {
  const saltBytes = new Uint8Array(salt.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)));
  const passwordKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const result = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' }, passwordKey, 256);
  return Array.from(new Uint8Array(result), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function secureCompare(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

const toast = (message) => {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), 2400);
};

const statusFor = (task) => !task.done && task.time < `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}` ? 'late' : task.done ? 'done' : 'pending';
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><use href="#i-${name}"/></svg>`;

function renderTasks() {
  const container = $('#taskList');
  $('#navTaskCount').textContent = state.tasks.filter((task) => !task.done).length;
  const orderedTasks = state.tasks.toSorted((a, b) => a.time.localeCompare(b.time));
  const visibleTasks = orderedTasks.filter((task) => taskFilter === 'all' || (taskFilter === 'open' && !task.done) || (taskFilter === 'done' && task.done) || (taskFilter === 'overdue' && statusFor(task) === 'late'));
  if (!visibleTasks.length) {
    container.innerHTML = state.tasks.length ? '<div class="empty-state">No tasks match this filter.</div>' : '<div class="empty-state">Nothing on today\'s list yet. Add a task to get started.</div>';
  } else {
    container.innerHTML = visibleTasks.map((task) => {
      const status = statusFor(task);
      const isDone = task.done;
      return `<div class="task-row ${isDone ? 'is-completed' : ''}" data-task-id="${task.id}"><button class="task-check ${isDone ? 'checked' : ''}" aria-label="Mark ${escapeHtml(task.title)} ${isDone ? 'pending' : 'complete'}" aria-pressed="${isDone}">${isDone ? icon('check') : ''}</button><div class="task-name ${isDone ? 'is-done' : ''}"><strong>${escapeHtml(task.title)}</strong><small>${formatTime(task.time)}</small></div><select class="assignee-select" aria-label="Reassign ${escapeHtml(task.title)}">${caregiverNames().map((person) => `<option ${task.assignee === person ? 'selected' : ''}>${escapeHtml(person)}</option>`).join('')}</select><button class="task-action-btn ${isDone ? 'btn-done' : status === 'late' ? 'btn-late' : 'btn-pending'}" type="button" aria-label="Toggle ${escapeHtml(task.title)}">${isDone ? '✓ DONE' : status === 'late' ? 'OVERDUE' : 'DONE'}</button></div>`;
    }).join('');
  }
  const completed = state.tasks.filter((task) => task.done).length;
  const total = state.tasks.length;
  $('#completedCount').textContent = completed;
  $('#totalCount').textContent = total;
  const progressBar = $('#taskProgressBar');
  if (progressBar) {
    const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
    progressBar.style.width = `${pct}%`;
  }
  $('#pendingCount').textContent = state.tasks.filter((task) => !task.done && statusFor(task) === 'pending').length;
  $('#overdueCount').textContent = state.tasks.filter((task) => statusFor(task) === 'late').length;
  $('#taskSubhead').textContent = formatLongDate(today);
  renderLoad();
}

function renderLoad() {
  const counts = caregiverNames().map((person) => ({ person, count: state.tasks.filter((task) => task.assignee === person).length }));
  const highest = Math.max(1, ...counts.map(({ count }) => count));
  $('#loadList').innerHTML = counts.map(({ person, count }) => `<div class="load-row"><span class="load-person">${person}</span><div class="load-track"><div class="load-bar" style="width:${Math.round(count / highest * 100)}%"></div></div><span class="load-number">${count}</span></div>`).join('');
  const spread = Math.max(...counts.map(({ count }) => count)) - Math.min(...counts.map(({ count }) => count));
  $('#loadMessage').textContent = spread > 2 ? 'A few tasks could be shared more evenly.' : 'A thoughtful team makes lighter work.';
}

function renderMedications() {
  $('#medicationList').innerHTML = state.medications.map((medication) => `<div class="med-row"><span class="med-time">${formatTime(medication.time)}</span><span class="med-pill">${icon('pill')}</span><div class="med-copy"><strong>${escapeHtml(medication.name)}</strong><span>${escapeHtml(medication.dose)}${medication.taken ? ` · Logged by ${escapeHtml(displayAccountName(medication.by))}` : ''}</span></div><button class="med-action ${medication.taken ? 'taken' : ''}" data-med-id="${medication.id}" ${medication.taken ? 'disabled' : ''}>${medication.taken ? '✓ Taken' : 'Log dose'}</button></div>`).join('');
}

function renderAppointments() {
  const appointments = state.appointments.toSorted((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  $('#appointmentList').innerHTML = appointments.length ? appointments.slice(0, 4).map((appointment) => {
    const date = new Date(`${appointment.date}T12:00:00`);
    return `<div class="appointment"><div class="date-tile"><strong>${date.getDate()}</strong><span>${date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span></div><div class="appointment-copy"><strong>${escapeHtml(appointment.title)}</strong><span>${formatTime(appointment.time)}</span></div><span class="appointment-who">${escapeHtml(appointment.assignee)}</span></div>`;
  }).join('') : `<div class="empty-state"><p>No family appointments added yet.</p><button class="button" type="button" id="emptyAppointmentButton">${icon('plus')}Add an appointment</button></div>`;
  const next = appointments.find((appointment) => appointment.date >= isoDate(today));
  const nextAppt = $('#nextAppointment');
  const nextMeta = nextAppt.nextElementSibling;
  if (next) {
    nextAppt.textContent = new Date(`${next.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    nextAppt.className = 'count-pill blue';
    nextMeta.textContent = `${next.title.split(' · ')[1] || next.assignee} · ${formatTime(next.time)}`;
  } else {
    nextAppt.textContent = 'None planned';
    nextAppt.className = 'count-pill muted';
    nextMeta.textContent = 'Add one when ready';
  }
}

function renderHistory() {
  $('#historyList').innerHTML = state.history.slice(0, 5).map((entry) => `<div class="history-item"><span class="history-time">${escapeHtml(entry.time)}</span><span class="history-event">${escapeHtml(entry.event)}</span><span class="history-person">${escapeHtml(displayAccountName(entry.person))}</span></div>`).join('') || '<div class="empty-state">Completed care will show up here.</div>';
}

function familyMemberName(member) {
  if (member.id === 'grandma') return state.profile.name;
  if (member.id === 'you') return state.accountName;
  return member.name;
}
function caregiverNames() { return FAMILY_MEMBERS.filter((member) => member.role !== 'Care recipient').map(familyMemberName); }
function displayAccountName(name) { return ['You', 'YOU'].includes(name) ? state.accountName : name; }
function accountInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length || name.toUpperCase() === 'YOU') return 'YOU';
  return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
}

function renderAccount() {
  const initials = accountInitials(state.accountName);
  $('#accountButton').textContent = initials;
  $('#accountButton').title = `Profile: ${state.accountName}`;
  $('#accountButton').setAttribute('aria-label', `Edit profile for ${state.accountName}`);
  if ($('#sidebarUserAvatar')) $('#sidebarUserAvatar').textContent = initials;
  if ($('#sidebarUserName')) $('#sidebarUserName').textContent = state.accountName;
}

function wellbeingStreak(memberId) {
  const loggedDays = new Set(state.wellbeingLogDates[memberId] || []);
  const currentDate = new Date();
  const loggedToday = loggedDays.has(isoDate(currentDate));
  let cursor = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  if (!loggedToday) cursor.setDate(cursor.getDate() - 1);
  let days = 0;
  while (loggedDays.has(isoDate(cursor))) {
    days += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { days, loggedToday };
}

function renderCareTeam() {
  $('#teamList').innerHTML = FAMILY_MEMBERS.map((member) => `<div class="team-member"><span class="team-avatar">${escapeHtml(member.initials)}</span><span class="team-copy"><strong>${escapeHtml(familyMemberName(member))}</strong><small>${escapeHtml(member.role)}</small></span><span class="team-role">${member.id === 'you' ? 'Admin' : member.role === 'Care recipient' ? 'Recipient' : escapeHtml(member.role)}</span>${member.id === 'you' ? '' : `<button class="member-remove" type="button" data-remove-member="${member.id}" aria-label="Remove ${escapeHtml(familyMemberName(member))}">Remove</button>`}</div>`).join('');
  $('#familyMemberCount').textContent = FAMILY_MEMBERS.length;
  $('#circleMemberCount').textContent = FAMILY_MEMBERS.length;
  $('#teamMemberCount').textContent = `${FAMILY_MEMBERS.length} members`;
  $('#chatMemberCount').textContent = `${FAMILY_MEMBERS.length} in circle`;
}

function renderFamilyChat() {
  $('#chatMessages').innerHTML = state.chatMessages.length ? state.chatMessages.slice(-100).map((message) => {
    const member = FAMILY_MEMBERS.find((item) => item.id === message.memberId);
    const sender = member ? familyMemberName(member) : 'Former member';
    const time = new Date(message.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    return `<article class="chat-message ${message.memberId === 'you' ? 'own' : ''}"><div class="chat-message-head"><strong>${escapeHtml(sender)}</strong><time>${escapeHtml(time)}</time></div><p>${escapeHtml(message.text)}</p></article>`;
  }).join('') : '<div class="chat-empty">No messages yet. Share a care update with the family.</div>';
}

function circleNodePosition(member, index, total) {
  if (total === 5) {
    const fixed = {
      grandma: { x: 50, y: 16 },
      mom: { x: 80, y: 32 },
      dad: { x: 80, y: 68 },
      brother: { x: 50, y: 84 },
      you: { x: 20, y: 50 }
    };
    if (fixed[member.id]) return fixed[member.id];
    if (Number.isFinite(member.x) && Number.isFinite(member.y)) return { x: member.x, y: member.y };
  }
  const angle = (Math.PI * 2 * index / total) - Math.PI / 2;
  return { x: 50 + 32 * Math.cos(angle), y: 50 + 34 * Math.sin(angle) };
}

function renderFamilyHealth() {
  const latest = latestFamilyRecords();
  $('#healthStatusGroups').innerHTML = HEALTH_CATEGORIES.map((category) => {
    const members = FAMILY_MEMBERS.filter((member) => latest.get(member.id)?.category === category.id);
    const rows = members.map((member) => {
      const record = latest.get(member.id);
      const date = new Date(`${record.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `<div class="health-record-row"><strong>${escapeHtml(familyMemberName(member))}</strong><small>${escapeHtml(date)} · ${escapeHtml(formatRecordMeasurements(record))}</small></div>`;
    }).join('') || '<div class="health-empty">No members in this category.</div>';
    return `<section class="health-group ${category.id}"><div class="health-group-heading"><i class="health-status-dot"></i><strong>${category.label}</strong><span class="health-count">${members.length}</span></div>${rows}</section>`;
  }).join('');
  const unrecorded = FAMILY_MEMBERS.filter((member) => !latest.has(member.id));
  $('#healthUnrecorded').hidden = unrecorded.length === 0;
  $('#healthUnrecordedList').innerHTML = unrecorded.map((member) => `<span>${escapeHtml(familyMemberName(member))}</span>`).join('');
}

function latestFamilyRecords() {
  const latest = new Map();
  state.medicalRecords.toSorted((left, right) => right.date.localeCompare(left.date) || Number(right.id) - Number(left.id)).forEach((record) => {
    if (!latest.has(record.memberId)) latest.set(record.memberId, record);
  });
  return latest;
}

function formatRecordMeasurements(record) {
  const measurements = [];
  if (record.systolic !== null && record.diastolic !== null) measurements.push(`BP ${record.systolic}/${record.diastolic} mmHg`);
  if (record.glucose !== null) measurements.push(`Glucose ${record.glucose} ${record.glucoseUnit}`);
  if (record.hemoglobin !== null) measurements.push(`Hemoglobin ${record.hemoglobin} ${record.hemoglobinUnit}`);
  return measurements.join(' · ') || 'No numerical values';
}

function renderWellbeing() {
  const moods = { Great: 96, Good: 82, Steady: 68, Tired: 48, Low: 32 };
  const positions = FAMILY_MEMBERS.map((member, index) => circleNodePosition(member, index, FAMILY_MEMBERS.length));
  $('#orbitLines').innerHTML = `<path d="${positions.map((position) => `M50 50L${position.x.toFixed(1)} ${position.y.toFixed(1)}`).join('')}"/>`;
  $('#wellnessNodes').innerHTML = FAMILY_MEMBERS.map((member, index) => {
    const checkin = state.wellbeing[member.id] || DEFAULT_WELLBEING[member.id];
    const position = positions[index];
    const hydration = Math.round(Math.min(100, Math.max(0, checkin.hydration / 8 * 100)));
    const activity = Math.round(Math.min(100, Math.max(0, checkin.activity / 30 * 100)));
    const vitals = checkin.vitalsLogged ? 100 : 8;
    const mood = moods[checkin.mood] || moods.Steady;
    return `<button class="member-node" type="button" data-member-id="${member.id}" aria-pressed="${member.id === selectedMemberId}" aria-label="${escapeHtml(familyMemberName(member))}: ${escapeHtml(checkin.mood)} mood, ${checkin.hydration} glasses of water, ${checkin.activity} minutes activity, vitals ${checkin.vitalsLogged ? 'logged' : 'not logged'}" style="--node-x:${position.x}%;--node-y:${position.y}%;--water:${hydration};--activity:${activity};--vitals:${vitals};--mood:${mood}"><span class="member-ring"><i class="ring-track water"></i><i class="ring-track activity"></i><i class="ring-track vitals"></i><i class="ring-track mood"></i><span class="member-avatar">${escapeHtml(member.initials)}</span></span><span class="member-label">${escapeHtml(familyMemberName(member))}</span><span class="member-mood">${escapeHtml(checkin.mood)}</span></button>`;
  }).join('');
  const selectedMember = FAMILY_MEMBERS.find((member) => member.id === selectedMemberId) || FAMILY_MEMBERS[0];
  const selectedCheckin = state.wellbeing[selectedMember.id] || DEFAULT_WELLBEING[selectedMember.id];
  const streak = wellbeingStreak(selectedMember.id);
  const streakMessage = streak.loggedToday ? 'Check-in logged today.' : streak.days ? 'Log today to keep it going.' : 'Log a check-in to start your streak.';
  $('#memberDetail').innerHTML = `<div class="member-detail-head"><div><strong>${escapeHtml(familyMemberName(selectedMember))}</strong><small>${escapeHtml(selectedMember.role)} · sample check-in</small></div><button class="button member-card-action" type="button" data-log-member="${selectedMember.id}">Log check-in</button></div><div class="member-streak"><span class="streak-symbol">${icon('spark')}</span><span class="streak-copy"><strong>${streak.days} day${streak.days === 1 ? '' : 's'} logging streak</strong><small>${streakMessage}</small></span></div><div class="member-metrics"><div class="member-metric"><small>Hydration</small><strong>${selectedCheckin.hydration} / 8 glasses</strong></div><div class="member-metric"><small>Activity</small><strong>${selectedCheckin.activity} min</strong></div><div class="member-metric"><small>Vitals log</small><strong>${selectedCheckin.vitalsLogged ? 'Logged by family' : 'Not logged'}</strong></div><div class="member-metric"><small>Mood</small><strong>${escapeHtml(selectedCheckin.mood)}</strong></div></div>`;
  const iconColors = {
    spark: 'amber',
    check: 'green',
    heart: 'red',
    clock: 'blue',
    users: 'purple',
    pill: 'amber',
    calendar: 'blue'
  };
  $('#wellbeingFeed').innerHTML = state.wellbeingFeed.slice(0, 6).map((entry) => {
    const member = FAMILY_MEMBERS.find((item) => item.id === entry.member);
    const iconName = ['spark', 'check', 'heart', 'clock', 'users', 'pill', 'calendar'].includes(entry.icon) ? entry.icon : 'heart';
    const iconColor = iconColors[iconName] || 'green';
    return `<div class="feed-event"><span class="feed-icon ${iconColor}">${icon(iconName)}</span><span class="feed-copy"><strong>${escapeHtml(entry.event)}</strong><small>${escapeHtml(familyMemberName(member || FAMILY_MEMBERS[0]))} · shared by ${escapeHtml(displayAccountName(entry.actor))}</small></span><time class="feed-time">${escapeHtml(entry.time)}</time></div>`;
  }).join('') || '<div class="empty-state">Family check-ins will appear here.</div>';
}

function renderAlertHub() {
  const overdueTasks = preferences.reminders.overdue ? state.tasks.filter((task) => !task.done && statusFor(task) === 'late') : [];
  const now = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
  const missedMedication = preferences.reminders.medications ? state.medications.filter((medication) => !medication.taken && medication.time < now) : [];
  const urgent = [
    ...overdueTasks.map((task) => ({ title: `Overdue: ${task.title}`, detail: `Due at ${formatTime(task.time)}` })),
    ...missedMedication.map((medication) => ({ title: `Medication not logged: ${medication.name}`, detail: `Scheduled for ${formatTime(medication.time)} · check the family's medication record` }))
  ];
  const hub = $('#alertHub');
  hub.classList.toggle('critical', urgent.length > 0);
  hub.classList.toggle('quiet', urgent.length === 0);
  $('#alertLabel').textContent = urgent.length ? `${urgent.length} care warning${urgent.length === 1 ? '' : 's'}` : 'Care alerts';
  $('#alertHeadline').textContent = urgent.length ? 'Items needing attention' : 'No urgent care alerts';
  $('#alertDetail').textContent = urgent.length ? 'Review each warning below.' : 'Open reminders for upcoming care and family check-ins.';
  $('#alertStack').innerHTML = urgent.map((item) => `<div class="alert-item"><span class="alert-item-dot" aria-hidden="true"></span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></span></div>`).join('');
  $('#alertEmblem').innerHTML = icon(urgent.length ? 'alert' : 'check');
  $('#alertAction').textContent = urgent.length ? 'Review alerts' : 'Open reminders';
}

function renderProfile() {
  const profile = state.profile;
  $('#emergencyContent').innerHTML = `<div class="contact-block"><span class="contact-icon">${icon('phone')}</span><div><strong>${escapeHtml(profile.contact)}</strong><span>Emergency contact${profile.phone ? ` · ${escapeHtml(profile.phone)}` : ''}</span></div>${profile.phone ? `<a class="call-link" href="tel:${escapeHtml(profile.phone.replace(/[^+\d]/g, ''))}">Call</a>` : ''}</div><div class="info-line"><small>Allergies</small><p>${escapeHtml(profile.allergies || 'None entered')}</p></div><div class="info-line"><small>Care notes & preferences</small><p>${escapeHtml(profile.notes || 'No notes entered')}</p></div>${profile.age ? `<div class="info-line"><small>Profile</small><p>Age ${escapeHtml(profile.age)}</p></div>` : ''}`;
}

function renderPageHeader(page) {
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;
  const copy = {
    today: [t.eyebrowToday || 'Whole-family health & wellbeing', t.todaysCare || "Today's care", t.subtitleToday || 'Care tasks, medical records, and daily wellbeing for everyone in your circle.'],
    tasks: [t.eyebrowTasks || 'Daily coordination', t.titleTasks || 'Care tasks', t.subtitleTasks || "Create, assign, and track your circle's care responsibilities."],
    schedule: [t.eyebrowSchedule || 'Plan the care day', t.titleSchedule || 'Schedule', t.subtitleSchedule || 'Medication logs and upcoming appointments for the family.'],
    circle: [t.eyebrowCircle || 'Shared support', t.titleCircle || 'Family health circle', t.subtitleCircle || 'Review every member’s records, wellbeing, and shared care responsibilities.'],
    settings: [t.eyebrowSettings || 'Your preferences', t.titleSettings || 'Settings', t.subtitleSettings || "Adjust this device's appearance, reminders, and care-data export."]
  }[page] || [t.eyebrowToday, t.todaysCare || "Today's care", t.subtitleToday];
  $('#pageEyebrow').textContent = copy[0];
  $('#pageTitle').classList.remove('logo-heading');
  $('#pageTitle').textContent = copy[1];
  $('#pageSubtitle').textContent = copy[2];
  $('#taskPanelHeading').textContent = page === 'tasks' ? (t.careTasks || 'Care tasks') : (t.todaysCare || "Today's care");
  $('#appointmentButton').hidden = !['today', 'schedule'].includes(page);
  $('#addTaskButton').hidden = !['today', 'tasks'].includes(page);
}

function showPage(page, addHistory = false) {
  const validPages = ['today', 'tasks', 'schedule', 'circle', 'settings'];
  if (!validPages.includes(page)) page = 'today';
  document.body.dataset.page = page;
  $('#summaryGrid').hidden = page !== 'today';
  $('#alertHub').hidden = page !== 'today';
  if ($('#dailyStreakBar')) $('#dailyStreakBar').hidden = page !== 'today';
  $('#contentGrid').hidden = page === 'settings';
  $('#contentGrid').dataset.view = page;
  $('#settings').hidden = page !== 'settings';
  document.querySelectorAll('[data-view-link]').forEach((link) => {
    const active = link.dataset.viewLink === page;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  renderPageHeader(page);
  if (addHistory) history.pushState({ page }, '', `#view-${page}`);
  window.scrollTo(0, 0);
}

function render() {
  $('#todayDate').textContent = formatLongDate(today);
  renderAccount(); renderProfile(); renderTasks(); renderMedications(); renderAppointments(); renderHistory(); renderCareTeam(); renderFamilyHealth(); renderWellbeing(); renderFamilyChat(); renderAlertHub();
  renderPageHeader(document.body.dataset.page || 'today');
}

function persistPreferences() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(preferences)); }

function renderSettings() {
  document.querySelectorAll('[data-theme-option]').forEach((button) => {
    const active = button.dataset.themeOption === preferences.theme;
    button.classList.toggle('active', active);
    button.setAttribute('aria-checked', active ? 'true' : 'false');
  });
  document.querySelectorAll('[data-reminder]').forEach((input) => {
    input.checked = preferences.reminders[input.dataset.reminder];
  });
}

function openWellbeingDialog(memberId) {
  const member = FAMILY_MEMBERS.find((item) => item.id === memberId);
  if (!member) return;
  selectedMemberId = memberId;
  const checkin = state.wellbeing[memberId] || DEFAULT_WELLBEING[memberId];
  $('#wellnessDialogTitle').textContent = `Log "${familyMemberName(member)}"'s check-in`;
  $('#wellnessHydration').value = checkin.hydration;
  $('#wellnessActivity').value = checkin.activity;
  $('#wellnessVitals').value = String(checkin.vitalsLogged);
  $('#wellnessMood').value = checkin.mood;
  $('#wellnessDialog').showModal();
}

function openMedicalRecordDialog() {
  $('#recordMember').innerHTML = FAMILY_MEMBERS.map((member) => `<option value="${member.id}">${escapeHtml(familyMemberName(member))}</option>`).join('');
  $('#recordDate').value = isoDate(new Date());
  $('#medicalRecordDialog').showModal();
}

function fillPeople(select) { select.innerHTML = caregiverNames().map((person) => `<option>${escapeHtml(person)}</option>`).join(''); }
function openProfile() {
  const form = $('#profileForm');
  Object.entries(state.profile).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value; });
  $('#profileDialog').showModal();
}

function openAccountDialog(setup = false) {
  accountDialogMode = setup ? 'create' : 'edit';
  $('#accountDialogTitle').textContent = setup ? 'Create your local account' : 'Your family profile';
  $('#accountDialogCopy').textContent = setup ? 'Choose how your family will see you and protect this browser profile with a password.' : 'Update the name your family sees in this browser.';
  $('#accountNameInput').value = setup && state.accountName === 'YOU' ? '' : state.accountName;
  $('#signupPasswordField').hidden = !setup;
  $('#signupConfirmField').hidden = !setup;
  $('#signupTerms').hidden = !setup;
  $('#accountPasswordInput').required = setup;
  $('#accountPasswordConfirm').required = setup;
  $('#accountTerms').required = setup;
  $('#accountTerms').checked = false;
  $('#accountPasswordInput').value = '';
  $('#accountPasswordConfirm').value = '';
  $('#accountCloseButton').hidden = setup;
  $('#accountDismissButton').hidden = setup;
  $('#lockAccountButton').hidden = setup;
  $('#accountSaveButton').textContent = setup ? 'Create account' : 'Save name';
  $('#accountError').textContent = '';
  $('#accountDialog').showModal();
}

function openLoginDialog() {
  if (!accountCredential?.salt || !accountCredential?.passwordHash) return openAccountDialog(true);
  $('#loginDisplayName').textContent = accountCredential.displayName;
  $('#loginPasswordInput').value = '';
  $('#loginTerms').checked = false;
  $('#loginError').textContent = '';
  $('#loginDialog').showModal();
}

function showNotifications() {
  const pending = state.tasks.filter((task) => !task.done);
  const now = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
  const overdueTasks = pending.filter((task) => statusFor(task) === 'late');
  const missedMedication = state.medications.filter((medication) => !medication.taken && medication.time < now);
  const next = state.appointments.toSorted((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).find((appointment) => appointment.date >= isoDate(today));
  const reminders = [
    ...(preferences.reminders.overdue ? overdueTasks.map((task) => `<div class="info-line urgent-notification"><small>Overdue care task · ${formatTime(task.time)}</small><p>${escapeHtml(task.title)} · due at ${formatTime(task.time)}</p></div>`) : []),
    ...(preferences.reminders.medications ? missedMedication.map((medication) => `<div class="info-line urgent-notification"><small>Medication not logged · ${formatTime(medication.time)}</small><p>${escapeHtml(medication.name)} · check the family log</p></div>`) : []),
    ...(preferences.reminders.tasks ? pending.filter((task) => statusFor(task) === 'pending').slice(0, 3).map((task) => `<div class="info-line"><small>Upcoming care task · ${formatTime(task.time)}</small><p>${escapeHtml(task.title)} · due at ${formatTime(task.time)}</p></div>`) : []),
    ...(preferences.reminders.medications ? state.medications.filter((medication) => !medication.taken && medication.time >= now).slice(0, 2).map((medication) => `<div class="info-line"><small>Medication schedule · ${formatTime(medication.time)}</small><p>${escapeHtml(medication.name)} is waiting to be logged.</p></div>`) : []),
    ...(preferences.reminders.appointments && next ? [`<div class="info-line"><small>Next appointment · ${new Date(`${next.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small><p>${escapeHtml(next.title)} · ${escapeHtml(next.assignee)}</p></div>`] : [])
  ];
  $('#notificationContent').innerHTML = reminders.join('') || '<p class="subtitle">You are all caught up. No reminders right now.</p>';
  $('#notificationDialog').showModal();
  $('.notification-dot').hidden = true;
}

$('#taskList').addEventListener('click', (event) => {
  const button = event.target.closest('.task-check, .task-action-btn');
  if (!button) return;
  const row = button.closest('.task-row');
  if (!row) return;
  const task = state.tasks.find((item) => item.id === Number(row.dataset.taskId));
  if (!task) return;
  task.done = !task.done;
  if (task.done) state.history.unshift({ time: formatTime(new Date().toTimeString().slice(0, 5)), event: task.title, person: task.assignee });
  persist(); render(); toast(task.done ? `${task.title} marked complete.` : `${task.title} moved back to pending.`);
});

$('#taskList').addEventListener('change', (event) => {
  if (!event.target.matches('.assignee-select')) return;
  const task = state.tasks.find((item) => item.id === Number(event.target.closest('.task-row').dataset.taskId));
  task.assignee = event.target.value; persist(); render(); toast(`${task.title} reassigned to ${task.assignee}.`);
});

$('#taskFilters').addEventListener('click', (event) => {
  const button = event.target.closest('[data-task-filter]');
  if (!button) return;
  taskFilter = button.dataset.taskFilter;
  document.querySelectorAll('[data-task-filter]').forEach((filterButton) => filterButton.setAttribute('aria-pressed', String(filterButton === button)));
  renderTasks();
});

$('#wellnessCircle').addEventListener('click', (event) => {
  const node = event.target.closest('[data-member-id]');
  if (!node) return;
  selectedMemberId = node.dataset.memberId;
  renderWellbeing();
});

$('#memberDetail').addEventListener('click', (event) => {
  const button = event.target.closest('[data-log-member]');
  if (button) openWellbeingDialog(button.dataset.logMember);
});

$('#alertAction').addEventListener('click', showNotifications);
$('#addMedicalRecordButton').addEventListener('click', openMedicalRecordDialog);

$('#medicalRecordForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const systolic = data.get('systolic') === '' ? null : Number(data.get('systolic'));
  const diastolic = data.get('diastolic') === '' ? null : Number(data.get('diastolic'));
  const glucose = data.get('glucose') === '' ? null : Number(data.get('glucose'));
  const hemoglobin = data.get('hemoglobin') === '' ? null : Number(data.get('hemoglobin'));
  const notes = String(data.get('notes') || '').trim();
  if ((systolic === null) !== (diastolic === null)) { toast('Enter both systolic and diastolic values for blood pressure.'); return; }
  if (systolic === null && glucose === null && hemoglobin === null && !notes) { toast('Enter at least one measurement or report note.'); return; }
  const memberId = data.get('memberId');
  const member = FAMILY_MEMBERS.find((item) => item.id === memberId);
  if (!member) return;
  const record = {
    id: Date.now(), memberId, date: data.get('date'), systolic, diastolic, glucose,
    glucoseUnit: data.get('glucoseUnit'), hemoglobin, hemoglobinUnit: data.get('hemoglobinUnit'),
    category: data.get('category'), notes
  };
  state.medicalRecords.push(record);
  const reportDate = new Date(`${record.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const category = HEALTH_CATEGORIES.find((item) => item.id === record.category);
  state.wellbeingFeed.unshift({ member: memberId, actor: 'YOU', event: `Medical report recorded · ${category.label}`, time: reportDate, icon: 'heart' });
  state.history.unshift({ time: reportDate, event: `${familyMemberName(member)} medical record added`, person: 'YOU' });
  persist(); render(); $('#medicalRecordDialog').close(); event.currentTarget.reset(); toast(`${familyMemberName(member)}'s medical record saved.`);
});

$('#wellnessForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const member = FAMILY_MEMBERS.find((item) => item.id === selectedMemberId);
  const data = new FormData(event.currentTarget);
  state.wellbeing[selectedMemberId] = {
    hydration: Number(data.get('hydration')),
    activity: Number(data.get('activity')),
    vitalsLogged: data.get('vitals') === 'true',
    mood: data.get('mood')
  };
  const logDate = isoDate(new Date());
  const memberLogDates = state.wellbeingLogDates[selectedMemberId] || (state.wellbeingLogDates[selectedMemberId] = []);
  if (!memberLogDates.includes(logDate)) memberLogDates.push(logDate);
  const time = formatTime(new Date().toTimeString().slice(0, 5));
  state.wellbeingFeed.unshift({ member: member.id, actor: 'You', event: 'Family wellbeing check-in shared', time, icon: 'heart' });
  state.history.unshift({ time, event: `${familyMemberName(member)} wellbeing check-in`, person: 'You' });
  persist(); render(); $('#wellnessDialog').close(); toast(`${familyMemberName(member)}'s check-in saved.`);
});

$('#medicationList').addEventListener('click', (event) => {
  const button = event.target.closest('[data-med-id]');
  if (!button) return;
  const medication = state.medications.find((item) => item.id === Number(button.dataset.medId));
  medication.taken = true; medication.by = 'You';
  const loggedAt = formatTime(new Date().toTimeString().slice(0, 5));
  state.history.unshift({ time: loggedAt, event: `${medication.name} logged`, person: 'You' });
  state.wellbeingFeed.unshift({ member: 'grandma', actor: 'You', event: `Medication logged: ${medication.name}`, time: loggedAt, icon: 'pill' });
  persist(); render(); toast(`${medication.name} logged as taken.`);
});

$('#addTaskButton').addEventListener('click', () => $('#taskDialog').showModal());
$('#taskLink').addEventListener('click', () => $('#taskDialog').showModal());
$('#appointmentButton').addEventListener('click', () => { $('#appointmentDate').value = isoDate(dateOffset(1)); $('#appointmentDialog').showModal(); });
$('#appointmentLink').addEventListener('click', () => { $('#appointmentDate').value = isoDate(dateOffset(1)); $('#appointmentDialog').showModal(); });
$('#appointmentList').addEventListener('click', (event) => {
  if (!event.target.closest('#emptyAppointmentButton')) return;
  $('#appointmentDate').value = isoDate(dateOffset(1));
  $('#appointmentDialog').showModal();
});
$('#profileButton').addEventListener('click', openProfile);
$('#editProfileLink').addEventListener('click', openProfile);
$('#accountButton').addEventListener('click', () => openAccountDialog());

$('#accountForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const displayName = String(form.get('displayName') || '').trim().replace(/\s+/g, ' ');
  if (!displayName) return;
  if (accountDialogMode === 'create') {
    const password = String(form.get('password') || '');
    if (password !== String(form.get('confirmPassword') || '')) {
      $('#accountError').textContent = 'Those passwords do not match.';
      return;
    }
    try {
      const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
      const iterations = 210000;
      const passwordHash = await derivePasswordHash(password, salt, iterations);
      accountCredential = { id: crypto.randomUUID(), displayName, salt, iterations, passwordHash, termsAcceptedAt: new Date().toISOString() };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(accountCredential));
    } catch {
      $('#accountError').textContent = 'Could not set up a local password in this browser.';
      return;
    }
  } else if (accountCredential) {
    accountCredential.displayName = displayName;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(accountCredential));
  }
  state.accountName = displayName;
  selectedMemberId = 'you';
  if (accountCredential?.id) sessionStorage.setItem(AUTH_SESSION_KEY, accountCredential.id);
  persist(); render(); $('#accountDialog').close(); document.body.classList.remove('auth-pending');
  toast(`Profile set to ${displayName}.`);
});

$('#loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!accountCredential?.salt || !accountCredential?.passwordHash) return openAccountDialog(true);
  const password = String(new FormData(event.currentTarget).get('password') || '');
  try {
    const candidate = await derivePasswordHash(password, accountCredential.salt, accountCredential.iterations || 210000);
    if (!secureCompare(candidate, accountCredential.passwordHash)) {
      $('#loginError').textContent = 'Password did not match this local profile.';
      $('#loginPasswordInput').value = '';
      return;
    }
    accountCredential.termsAcceptedAt = new Date().toISOString();
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(accountCredential));
    state.accountName = accountCredential.displayName;
    persist(); sessionStorage.setItem(AUTH_SESSION_KEY, accountCredential.id);
    $('#loginDialog').close(); document.body.classList.remove('auth-pending'); render();
  } catch {
    $('#loginError').textContent = 'Could not verify the local password in this browser.';
  }
});

$('#lockAccountButton').addEventListener('click', () => {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  $('#accountDialog').close(); document.body.classList.add('auth-pending'); openLoginDialog();
});

document.querySelectorAll('[data-open-terms]').forEach((button) => button.addEventListener('click', () => $('#termsDialog').showModal()));
$('#loginDialog').addEventListener('cancel', (event) => event.preventDefault());
$('#accountDialog').addEventListener('cancel', (event) => { if (accountDialogMode === 'create') event.preventDefault(); });

function openStreak() {
  const streak = wellbeingStreak('you');
  $('#streakDayCount').firstChild.textContent = String(streak.days);
  $('#streakDayLabel').textContent = streak.days === 1 ? 'day in a row' : 'days in a row';
  $('#streakNote').textContent = streak.loggedToday ? 'Today’s check-in is in. The fire stays lit.' : streak.days ? 'Log today’s check-in to keep the fire going.' : 'Log a wellbeing check-in to start your streak.';
  $('#streakDialog').showModal();
}

$('#streakButton').addEventListener('click', openStreak);
$('#streakLogButton').addEventListener('click', () => { $('#streakDialog').close(); openWellbeingDialog('you'); });
$('#notificationButton').addEventListener('click', showNotifications);

$('#settings').addEventListener('click', (event) => {
  const button = event.target.closest('[data-theme-option]');
  if (!button) return;
  const chosen = button.dataset.themeOption;
  if (chosen === 'light' || chosen === 'dark') {
    preferences.theme = chosen;
    persistPreferences();
    applyTheme(preferences.theme);
    renderSettings();
  }
});

$('#settings').addEventListener('change', (event) => {
  if (!event.target.matches('[data-reminder]')) return;
  preferences.reminders[event.target.dataset.reminder] = event.target.checked;
  persistPreferences();
  renderAlertHub();
  toast('Reminder preferences saved.');
});

$('#exportDataButton').addEventListener('click', () => {
  const backup = { exportedAt: new Date().toISOString(), ...state, preferences };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = `carecircle-backup-${isoDate(new Date())}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  toast('Care data export started.');
});

$('#medicationInfo').addEventListener('click', () => toast('Medication entries are family logs, not medical instructions.'));

/* ==========================================================================
   CareCircle Plus: Paywall & Interactive Feature Dashboard Logic
   ========================================================================== */
const PLUS_ACTIVE_KEY = 'carecircle_plus_active';
const PLUS_TIER_KEY = 'carecircle_plus_tier';
let selectedPlusTier = localStorage.getItem(PLUS_TIER_KEY) || '12';

function isPlusActive() {
  return localStorage.getItem(PLUS_ACTIVE_KEY) === 'true';
}

function updatePlusUI() {
  const active = isPlusActive();
  const statusBar = $('#plusActiveStatusBar');
  const ctaBtn = $('#startTrialBtn');
  const tier = localStorage.getItem(PLUS_TIER_KEY) || '12';

  if (statusBar) statusBar.hidden = !active;
  if (ctaBtn) {
    if (active) {
      ctaBtn.querySelector('.cta-label').textContent = 'PLUS MEMBERSHIP ACTIVE (14-DAY TRIAL)';
      ctaBtn.style.background = '#233244';
      ctaBtn.style.borderColor = '#384b60';
      ctaBtn.style.borderBottomColor = '#1c2837';
      ctaBtn.style.boxShadow = '0 5px 0 #121c27';
    } else {
      ctaBtn.querySelector('.cta-label').textContent = 'START 14-DAY FREE TRIAL · 1 RE VERIFICATION';
      ctaBtn.style.background = '';
      ctaBtn.style.borderColor = '';
      ctaBtn.style.borderBottomColor = '';
      ctaBtn.style.boxShadow = '';
    }
  }

  // Update streak bar pill with shield icon if Plus is active
  const streakPill = $('.streak-right-pill');
  if (streakPill && active) {
    streakPill.innerHTML = '<span class="shield-tag" style="display:inline-flex;align-items:center;gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><use href="#i-shield-star"/></svg> Shield Active · 3-Day Streak!</span>';
  }
}

function initCareCirclePlus() {
  const paywallDialog = $('#plusPaywallDialog');
  const fonepayDialog = $('#fonepayDialog');
  if (!paywallDialog) return;

  const openPlus = () => {
    updatePlusUI();
    paywallDialog.showModal();
  };

  const handleSuperchargeClick = (btnEl) => {
    // Show "Supercharge in progress..." feedback immediately on clicking
    if (btnEl) {
      const originalText = btnEl.textContent;
      btnEl.textContent = '⚡ Supercharge in progress...';
      btnEl.disabled = true;
      btnEl.classList.add('loading-pulse');
      setTimeout(() => {
        btnEl.textContent = originalText;
        btnEl.disabled = false;
        btnEl.classList.remove('loading-pulse');
      }, 1200);
    }
    toast('⚡ Supercharge in progress... opening CareCircle Plus!');
    openPlus();
  };

  $('#topbarPlusButton')?.addEventListener('click', () => {
    toast('⚡ Supercharge in progress...');
    openPlus();
  });
  $('#sidebarPlusBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    handleSuperchargeClick(e.currentTarget);
  });
  $('#sidebarPlusBanner')?.addEventListener('click', () => {
    const btn = $('#sidebarPlusBtn');
    handleSuperchargeClick(btn);
  });

  // Chart Tab Switcher (Adherence, Vitals, BP Trend)
  document.querySelectorAll('[data-chart-tab]').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('[data-chart-tab]').forEach((btn) => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      });
      tabBtn.classList.add('active');
      tabBtn.setAttribute('aria-selected', 'true');

      const target = tabBtn.dataset.chartTab;
      $('#chartAdherence').hidden = target !== 'adherence';
      $('#chartVitals').hidden = target !== 'vitals';
      $('#chartTrends').hidden = target !== 'trends';
    });
  });

  // Tier Card Switcher
  document.querySelectorAll('.tier-card').forEach((card) => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.tier-card').forEach((c) => {
        c.classList.remove('selected');
        c.setAttribute('aria-checked', 'false');
      });
      card.classList.add('selected');
      card.setAttribute('aria-checked', 'true');
      selectedPlusTier = card.dataset.tier;
    });
  });

  // Start 14-Day Free Trial CTA -> Launches 1 Re Verification Modal
  $('#startTrialBtn')?.addEventListener('click', () => {
    if (isPlusActive()) {
      toast('CareCircle Plus is already active! 14-day trial currently in progress.');
      return;
    }
    // Pre-fill user details if logged in
    const phoneInput = $('#fpPhone');
    const nameInput = $('#fpFullName');
    if (nameInput && accountCredential?.displayName && !nameInput.value) {
      nameInput.value = accountCredential.displayName;
    }
    paywallDialog.close();
    fonepayDialog?.showModal();
  });

  // Trial Verification Form Submission -> Activates Plus Trial
  $('#fonepayForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fullName = String(formData.get('fullName') || '').trim();

    // Activate CareCircle Plus 14-day trial immediately
    localStorage.setItem(PLUS_ACTIVE_KEY, 'true');
    localStorage.setItem(PLUS_TIER_KEY, selectedPlusTier === '12' ? '12' : '1');
    updatePlusUI();

    e.currentTarget.reset();
    fonepayDialog?.close();

    toast(`🎉 14-day CareCircle Plus trial activated for ${fullName || 'you'}! All features unlocked.`);
  });

  // Manage Subscription Button
  $('#plusManageBtn')?.addEventListener('click', () => {
    const cancel = confirm('CareCircle Plus is active. Would you like to pause or cancel your subscription trial?');
    if (cancel) {
      localStorage.setItem(PLUS_ACTIVE_KEY, 'false');
      updatePlusUI();
      toast('CareCircle Plus subscription paused. You can resubscribe anytime.');
    }
  });

  // 1-Click Printable Doctor Report Generator
  $('#previewDoctorExportBtn')?.addEventListener('click', () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast('Doctor report summary prepared.');
      return;
    }
    const membersHtml = FAMILY_MEMBERS.map((m) => `<li><strong>${escapeHtml(familyMemberName(m))}</strong> (${m.role})</li>`).join('');
    const medsHtml = state.medications.map((m) => `<li>${escapeHtml(m.name)} - ${escapeHtml(m.dose)} at ${formatTime(m.time)} (${m.taken ? 'Taken' : 'Pending'})</li>`).join('');
    const reportHtml = `
      <!doctype html>
      <html>
        <head>
          <title>CareCircle Plus · Doctor-Ready Health Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; }
            h1 { color: #10162f; margin-bottom: 4px; }
            .badge { display: inline-block; background: #58cc02; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; margin-bottom: 20px; }
            section { margin-bottom: 24px; border-bottom: 1px solid #e5e5e5; padding-bottom: 16px; }
            h2 { color: #223; font-size: 16px; border-bottom: 2px solid #58cc02; padding-bottom: 4px; }
            ul { line-height: 1.6; }
            .footer { font-size: 12px; color: #777; margin-top: 40px; }
          </style>
        </head>
        <body>
          <h1>CareCircle Plus · Clinical Care Report</h1>
          <div class="badge">DOCTOR-READY EXPORT</div>
          <p>Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} for care team consultation.</p>
          <section>
            <h2>Care Recipient Profile</h2>
            <p><strong>Name:</strong> ${escapeHtml(state.profile.name || 'Not provided')} | <strong>Age:</strong> ${escapeHtml(state.profile.age || 'N/A')}</p>
            <p><strong>Emergency Contact:</strong> ${escapeHtml(state.profile.contact || 'N/A')} (${escapeHtml(state.profile.phone || 'N/A')})</p>
            <p><strong>Allergies:</strong> ${escapeHtml(state.profile.allergies || 'None reported')}</p>
            <p><strong>Care Notes:</strong> ${escapeHtml(state.profile.notes || 'None')}</p>
          </section>
          <section>
            <h2>Active Care Circle Members</h2>
            <ul>${membersHtml}</ul>
          </section>
          <section>
            <h2>Medication Schedule & Adherence</h2>
            <ul>${medsHtml}</ul>
          </section>
          <div class="footer">Confidential medical summary generated via CareCircle Plus. Consult clinician for medical advice.</div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    toast('Doctor report generated and ready for print!');
  });

  updatePlusUI();
}

$('#balanceButton').addEventListener('click', () => {
  const counts = caregiverNames().map((person) => ({ person, count: state.tasks.filter((task) => task.assignee === person && !task.done).length })).sort((a, b) => a.count - b.count);
  if (!counts[0].count || counts[0].person === counts.at(-1).person) { toast('The remaining tasks are already shared evenly.'); return; }
  const task = state.tasks.find((item) => item.assignee === counts.at(-1).person && !item.done);
  task.assignee = counts[0].person; persist(); render(); toast(`${task.title} reassigned to ${counts[0].person}.`);
});

$('#taskForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.tasks.push({ id: Date.now(), title: data.get('title').trim(), time: data.get('time'), assignee: data.get('assignee'), done: false });
  persist(); render(); event.currentTarget.reset(); $('#taskTime').value = '12:00'; $('#taskDialog').close(); toast('Task added to today\'s care list.');
});

$('#appointmentForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const appointment = { id: Date.now(), title: data.get('title').trim(), date: data.get('date'), time: data.get('time'), assignee: data.get('assignee') };
  state.appointments.push(appointment);
  const appointmentDate = new Date(`${appointment.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  state.wellbeingFeed.unshift({ member: 'grandma', actor: appointment.assignee, event: `Appointment scheduled: ${appointment.title}`, time: appointmentDate, icon: 'calendar' });
  persist(); render(); event.currentTarget.reset(); $('#appointmentDialog').close(); toast('Appointment added to the family calendar.');
});

$('#profileForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.profile = Object.fromEntries(['name', 'age', 'contact', 'phone', 'allergies', 'notes'].map((key) => [key, String(data.get(key) || '').trim()]));
  persist(); render(); $('#profileDialog').close(); toast('Care profile updated.');
});

document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); }));
document.querySelectorAll('[data-view-link]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  showPage(link.dataset.viewLink, true);
}));

const initialPage = location.hash.startsWith('#view-') ? location.hash.slice(6) : 'today';
showPage(initialPage);
if (!location.hash.startsWith('#view-')) history.replaceState({ page: 'today' }, '', '#view-today');
window.addEventListener('popstate', () => showPage(location.hash.startsWith('#view-') ? location.hash.slice(6) : 'today'));
fillPeople($('#taskAssignee')); fillPeople($('#appointmentAssignee')); applyTheme(preferences.theme); renderSettings(); render(); initLanguageSwitcher(); initCareCirclePlus();

if (needsAccountSetup) {
  document.body.classList.add('auth-pending');
  openAccountDialog(true);
} else if (sessionStorage.getItem(AUTH_SESSION_KEY) === accountCredential.id) {
  document.body.classList.remove('auth-pending');
} else {
  document.body.classList.add('auth-pending');
  openLoginDialog();
}
