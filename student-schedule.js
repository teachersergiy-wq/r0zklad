const SUPABASE_URL = "https://vjjrwvraannccejyqcci.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_XYvCzMPGQjhT0AT2r2v3dw_zZIesIJB";

const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;

const DAY_NAMES_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const MONTH_NAMES_SHORT = ['січ.', 'лют.', 'берез.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'верес.', 'жовт.', 'лист.', 'груд.'];

const MIN_HOUR = 9;
const DEFAULT_OPEN_HOUR = 18;
const MAX_HOUR = 21;

let publicState = {
  key: null,
  students: [],
  lessons: [],
  blockedSlots: [],
  availableSlots: [],
  currentDate: new Date()
};

const els = {
  container: document.getElementById('schedule-container'),
  weekDisplay: document.getElementById('current-week-display'),
  prevBtn: document.getElementById('prev-week-btn'),
  nextBtn: document.getElementById('next-week-btn'),
  todayBtn: document.getElementById('today-btn')
};

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  publicState.key = urlParams.get('key') || 'default_schedule';

  await loadPublicSchedule();
  setupPublicListeners();
  renderPublicWeek();
});

async function loadPublicSchedule() {
  let loaded = false;

  if (db && publicState.key) {
    try {
      const { data, error } = await db.rpc('get_schedule', { p_access_token: publicState.key });
      if (!error && data && data.data) {
        publicState.students = data.data.students || [];
        publicState.lessons = data.data.lessons || [];
        publicState.blockedSlots = data.data.blockedSlots || [];
        publicState.availableSlots = data.data.availableSlots || [];
        loaded = true;
      }
    } catch (e) {
      console.warn('Supabase fallback to LocalStorage');
    }
  }

  if (!loaded) {
    const local = localStorage.getItem('schedule_' + publicState.key);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        publicState.students = parsed.students || [];
        publicState.lessons = parsed.lessons || [];
        publicState.blockedSlots = parsed.blockedSlots || [];
        publicState.availableSlots = parsed.availableSlots || [];
      } catch (e) { console.error(e); }
    }
  }
}

function setupPublicListeners() {
  els.prevBtn.onclick = () => {
    publicState.currentDate.setDate(publicState.currentDate.getDate() - 7);
    renderPublicWeek();
  };
  els.nextBtn.onclick = () => {
    publicState.currentDate.setDate(publicState.currentDate.getDate() + 7);
    renderPublicWeek();
  };
  els.todayBtn.onclick = () => {
    publicState.currentDate = new Date();
    renderPublicWeek();
  };
  window.addEventListener('resize', renderPublicWeek);
}

function formatDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStartOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function isToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

function hourToTimeStr(h) {
  return `${String(h).padStart(2, '0')}:00`;
}

function isPastSlot(dateISO, hour) {
  const [y, m, d] = String(dateISO).split('-').map(Number);
  if (!y) return false;
  const slotDate = new Date(y, m - 1, d, hour, 0, 0, 0);
  return slotDate.getTime() < Date.now();
}

function getSlotStatus(dateISO, hour) {
  const timeStr = hourToTimeStr(hour);
  const hasLesson = publicState.lessons.some(l => {
    if (l.date !== dateISO) return false;
    const lHour = parseInt((l.time || '00:00').split(':')[0], 10);
    return lHour === hour;
  });

  if (hasLesson) return { status: 'lesson' };
  if (isPastSlot(dateISO, hour)) return { status: 'unavailable' };

  if (hour < DEFAULT_OPEN_HOUR) {
    const opened = publicState.availableSlots.some(s => s.date === dateISO && s.time === timeStr);
    return { status: opened ? 'available' : 'unavailable' };
  } else {
    const closed = publicState.blockedSlots.some(s => s.date === dateISO && s.time === timeStr);
    return { status: closed ? 'unavailable' : 'available' };
  }
}

function getRelevantHours() {
  const hours = [];
  for (let h = MIN_HOUR; h <= MAX_HOUR; h++) hours.push(h);
  return hours;
}

// Будує список записів "вільно" для дня: діапазон до 18:00 об'єднується в один запис,
// після 18:00 — кожна година окремим записом. Заняття та недоступні години не показуються.
function buildPublicDayEntries(dateISO) {
  const hours = getRelevantHours();
  const entries = [];
  let run = [];

  function flushRun() {
    if (run.length === 0) return;
    if (run.length === 1) {
      entries.push({ start: run[0], end: run[0] + 1 });
    } else {
      entries.push({ start: run[0], end: run[run.length - 1] + 1 });
    }
    run = [];
  }

  hours.forEach(h => {
    const info = getSlotStatus(dateISO, h);
    if (info.status === 'available') {
      if (h < DEFAULT_OPEN_HOUR) {
        if (run.length && run[run.length - 1] !== h - 1) flushRun();
        run.push(h);
      } else {
        flushRun();
        entries.push({ start: h, end: h + 1 });
      }
    } else {
      flushRun();
    }
  });

  flushRun();
  return entries;
}

function createDayHeaderElement(date) {
  const dayIdx = (date.getDay() + 6) % 7;
  const header = document.createElement('div');
  header.className = `day-header ${isToday(date) ? 'today' : ''}`;

  const nameSpan = document.createElement('span');
  nameSpan.className = 'day-header-name';
  nameSpan.textContent = DAY_NAMES_SHORT[dayIdx];

  const dateSpan = document.createElement('span');
  dateSpan.className = 'day-header-date';
  dateSpan.textContent = `${date.getDate()} ${MONTH_NAMES_SHORT[date.getMonth()]}`;

  header.appendChild(nameSpan);
  header.appendChild(dateSpan);
  return header;
}

function renderPublicWeek() {
  const startOfWeek = getStartOfWeek(publicState.currentDate);
  const end = new Date(startOfWeek);
  end.setDate(startOfWeek.getDate() + 6);
  els.weekDisplay.textContent = `${startOfWeek.getDate()} ${startOfWeek.toLocaleDateString('uk-UA', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('uk-UA', { month: 'short' })}`;

  const daysDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    daysDates.push(d);
  }

  const isMobile = window.innerWidth <= 640;
  els.container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = `week-columns ${isMobile ? 'mobile-stack' : ''}`;

  daysDates.forEach(date => {
    const dateISO = formatDateISO(date);
    const column = document.createElement('div');
    column.className = 'day-column';
    column.appendChild(createDayHeaderElement(date));

    const entries = buildPublicDayEntries(dateISO);
    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'no-slots';
      empty.textContent = 'Немає вільних годин';
      column.appendChild(empty);
    } else {
      entries.forEach(e => {
        const el = document.createElement('div');
        el.className = 'slot-free';
        el.textContent = `${hourToTimeStr(e.start)}–${hourToTimeStr(e.end)} Вільно`;
        column.appendChild(el);
      });
    }

    wrap.appendChild(column);
  });

  els.container.appendChild(wrap);
}
