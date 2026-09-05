// НАЛАШТУВАННЯ SUPABASE
const SUPABASE_URL = "https://vjjrwvraannccejyqcci.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_XYvCzMPGQjhT0AT2r2v3dw_zZIesIJB";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// СТАН ДОДАТКА
let state = {
  key: null,
  students: [],
  lessons: {},
  currentDate: new Date(),
  view: 'week'
};

// ЕЛЕМЕНТИ DOM
const elements = {
  currentDateDisplay: document.getElementById('current-date-display'),
  calendarGrid: document.getElementById('calendar-grid'),
  todayBtn: document.getElementById('today-btn'),
  prevBtn: document.getElementById('prev-date-btn'),
  nextBtn: document.getElementById('next-date-btn'),
  editBtn: document.getElementById('edit-schedule-btn'),
  viewDayBtn: document.getElementById('view-day-btn'),
  viewWeekBtn: document.getElementById('view-week-btn'),
  viewMonthBtn: document.getElementById('view-month-btn'),
  modal: document.getElementById('modal-overlay'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  saveModalBtn: document.getElementById('save-modal-btn'),
  newStudentName: document.getElementById('new-student-name'),
  newStudentColor: document.getElementById('new-student-color'),
  addStudentBtn: document.getElementById('add-student-btn'),
  studentsList: document.getElementById('students-list'),
  lessonStudentSelect: document.getElementById('lesson-student-select'),
  lessonDaySelect: document.getElementById('lesson-day-select'),
  lessonTimeInput: document.getElementById('lesson-time-input'),
  lessonDurationInput: document.getElementById('lesson-duration-input'),
  saveLessonBtn: document.getElementById('save-lesson-btn')
};

// ІНІЦІАЛІЗАЦІЯ
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  
  const urlParams = new URLSearchParams(window.location.search);
  state.key = urlParams.get('key');

  if (!state.key) {
    await createNewSchedule();
  } else {
    await loadSchedule();
  }

  render();
});

// БАЗА ДАНИХ
async function createNewSchedule() {
  try {
    const { data, error } = await db.rpc('create_schedule');
    if (error) throw error;

    state.key = data.access_token;
    const newUrl = `${window.location.origin}${window.location.pathname}?key=${state.key}`;
    window.history.replaceState({}, '', newUrl);
  } catch (err) {
    console.error('Помилка створення розкладу:', err);
  }
}

async function loadSchedule() {
  try {
    const { data, error } = await db.rpc('get_schedule', { p_access_token: state.key });
    if (error) throw error;

    if (data && data.data) {
      state.students = data.data.students || [];
      state.lessons = data.data.lessons || {};
    }
  } catch (err) {
    console.error('Помилка завантаження розкладу:', err);
  }
}

async function saveSchedule() {
  try {
    const payload = {
      students: state.students,
      lessons: state.lessons
    };
    const { error } = await db.rpc('save_schedule', {
      p_access_token: state.key,
      p_data: payload
    });
    if (error) throw error;
  } catch (err) {
    console.error('Помилка збереження:', err);
  }
}

// ВІДОБРАЖЕННЯ
function render() {
  updateDateDisplay();
  updateViewButtons();
  renderGrid();
  renderStudentsList();
  updateStudentSelectOptions();
}

function updateViewButtons() {
  [elements.viewDayBtn, elements.viewWeekBtn, elements.viewMonthBtn].forEach(btn => {
    if (btn) btn.classList.remove('active');
  });

  if (state.view === 'day' && elements.viewDayBtn) elements.viewDayBtn.classList.add('active');
  if (state.view === 'week' && elements.viewWeekBtn) elements.viewWeekBtn.classList.add('active');
  if (state.view === 'month' && elements.viewMonthBtn) elements.viewMonthBtn.classList.add('active');
}

function updateDateDisplay() {
  if (!elements.currentDateDisplay) return;
  
  if (state.view === 'day') {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    elements.currentDateDisplay.textContent = state.currentDate.toLocaleDateString('uk-UA', options);
  } else if (state.view === 'week') {
    const startOfWeek = getStartOfWeek(state.currentDate);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const startStr = startOfWeek.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
    const endStr = endOfWeek.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
    elements.currentDateDisplay.textContent = `${startStr} - ${endStr}`;
  } else if (state.view === 'month') {
    const options = { month: 'long', year: 'numeric' };
    elements.currentDateDisplay.textContent = state.currentDate.toLocaleDateString('uk-UA', options);
  }
}

function getStartOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function renderGrid() {
  if (!elements.calendarGrid) return;
  elements.calendarGrid.innerHTML = '';

  if (state.view === 'day') {
    renderDayView();
  } else if (state.view === 'week') {
    renderWeekView();
  } else if (state.view === 'month') {
    renderMonthView();
  }
}

function renderDayView() {
  elements.calendarGrid.style.display = 'grid';
  elements.calendarGrid.style.gridTemplateColumns = '1fr';

  const dayOfWeek = (state.currentDate.getDay() + 6) % 7;
  const daysNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота', 'Неділя'];

  const col = createDayColumn(daysNames[dayOfWeek], dayOfWeek, state.currentDate);
  elements.calendarGrid.appendChild(col);
}

function renderWeekView() {
  elements.calendarGrid.style.display = 'grid';
  elements.calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
  elements.calendarGrid.style.gap = '8px';

  const daysNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  const startOfWeek = getStartOfWeek(state.currentDate);

  daysNames.forEach((dayName, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);

    const col = createDayColumn(`${dayName} (${date.getDate()})`, index, date);
    elements.calendarGrid.appendChild(col);
  });
}

function renderMonthView() {
  elements.calendarGrid.style.display = 'grid';
  elements.calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
  elements.calendarGrid.style.gap = '4px';

  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const daysNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  daysNames.forEach(name => {
    const header = document.createElement('div');
    header.style.cssText = 'font-weight: bold; text-align: center; padding: 4px; background: #f8fafc; border-radius: 4px;';
    header.textContent = name;
    elements.calendarGrid.appendChild(header);
  });

  let startDay = (firstDay.getDay() + 6) % 7;
  for (let i = 0; i < startDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.style.cssText = 'background: #f1f5f9; min-height: 80px; border-radius: 4px; opacity: 0.5;';
    elements.calendarGrid.appendChild(emptyCell);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const currentDate = new Date(year, month, day);
    const dayOfWeek = (currentDate.getDay() + 6) % 7;

    const cell = document.createElement('div');
    cell.style.cssText = 'border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px; min-height: 80px; background: #fff; font-size: 0.8rem;';
    
    const num = document.createElement('div');
    num.style.cssText = 'font-weight: bold; margin-bottom: 4px; text-align: right; color: #64748b;';
    num.textContent = day;
    cell.appendChild(num);

    const dayLessons = Object.values(state.lessons).filter(l => String(l.day) === String(dayOfWeek));
    dayLessons.forEach(lesson => {
      const student = state.students.find(s => s.id === lesson.studentId);
      const item = document.createElement('div');
      item.style.cssText = `background-color: ${student ? student.color : '#3b82f6'}; color: white; padding: 2px 4px; border-radius: 2px; margin-bottom: 2px; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
      item.textContent = `${lesson.time} ${student ? student.name : ''}`;
      cell.appendChild(item);
    });

    elements.calendarGrid.appendChild(cell);
  }
}

function createDayColumn(title, dayIndex, date) {
  const dayCol = document.createElement('div');
  dayCol.className = 'day-column';
  dayCol.style.cssText = 'border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; min-height: 350px; background: #fff;';
  
  const dayHeader = document.createElement('div');
  dayHeader.style.cssText = 'font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 8px; text-align: center;';
  dayHeader.textContent = title;
  dayCol.appendChild(dayHeader);

  const dayLessons = Object.values(state.lessons).filter(l => String(l.day) === String(dayIndex));
  dayLessons.forEach(lesson => {
    const student = state.students.find(s => s.id === lesson.studentId);
    const lessonEl = document.createElement('div');
    lessonEl.style.cssText = `background-color: ${student ? student.color : '#3b82f6'}; color: white; padding: 6px 8px; border-radius: 4px; margin-bottom: 6px; font-size: 0.85rem;`;
    lessonEl.textContent = `${lesson.time} - ${student ? student.name : 'Учень'}`;
    dayCol.appendChild(lessonEl);
  });

  return dayCol;
}

function renderStudentsList() {
  if (!elements.studentsList) return;
  elements.studentsList.innerHTML = '';
  
  state.students.forEach(student => {
    const li = document.createElement('li');
    li.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; margin-right: 4px; margin-bottom: 4px;';
    li.innerHTML = `
      <span style="width:12px;height:12px;border-radius:50%;background:${student.color};display:inline-block;"></span>
      <span>${student.name}</span>
    `;
    elements.studentsList.appendChild(li);
  });
}

function updateStudentSelectOptions() {
  if (!elements.lessonStudentSelect) return;
  elements.lessonStudentSelect.innerHTML = '';
  
  state.students.forEach(student => {
    const opt = document.createElement('option');
    opt.value = student.id;
    opt.textContent = student.name;
    elements.lessonStudentSelect.appendChild(opt);
  });
}

// ПОДІЇ ТА ОБРОБНИКИ
function setupEventListeners() {
  if (elements.editBtn) elements.editBtn.onclick = () => elements.modal.classList.remove('hidden');
  if (elements.closeModalBtn) elements.closeModalBtn.onclick = () => elements.modal.classList.add('hidden');
  if (elements.saveModalBtn) elements.saveModalBtn.onclick = async () => {
    await saveSchedule();
    elements.modal.classList.add('hidden');
    render();
  };

  if (elements.viewDayBtn) {
    elements.viewDayBtn.onclick = () => {
      state.view = 'day';
      render();
    };
  }
  if (elements.viewWeekBtn) {
    elements.viewWeekBtn.onclick = () => {
      state.view = 'week';
      render();
    };
  }
  if (elements.viewMonthBtn) {
    elements.viewMonthBtn.onclick = () => {
      state.view = 'month';
      render();
    };
  }

  if (elements.addStudentBtn) {
    elements.addStudentBtn.onclick = () => {
      const name = elements.newStudentName.value.trim();
      const color = elements.newStudentColor.value;
      if (!name) return;

      const newStudent = { id: Date.now().toString(), name, color };
      state.students.push(newStudent);
      elements.newStudentName.value = '';
      render();
    };
  }

  if (elements.saveLessonBtn) {
    elements.saveLessonBtn.onclick = () => {
      const studentId = elements.lessonStudentSelect.value;
      const day = elements.lessonDaySelect.value;
      const time = elements.lessonTimeInput.value;
      const duration = elements.lessonDurationInput.value;

      if (!studentId || !time) return;

      const lessonId = Date.now().toString();
      state.lessons[lessonId] = { id: lessonId, studentId, day, time, duration };
      render();
    };
  }

  if (elements.todayBtn) {
    elements.todayBtn.onclick = () => {
      state.currentDate = new Date();
      render();
    };
  }

  if (elements.prevBtn) {
    elements.prevBtn.onclick = () => {
      if (state.view === 'day') state.currentDate.setDate(state.currentDate.getDate() - 1);
      else if (state.view === 'week') state.currentDate.setDate(state.currentDate.getDate() - 7);
      else if (state.view === 'month') state.currentDate.setMonth(state.currentDate.getMonth() - 1);
      render();
    };
  }

  if (elements.nextBtn) {
    elements.nextBtn.onclick = () => {
      if (state.view === 'day') state.currentDate.setDate(state.currentDate.getDate() + 1);
      else if (state.view === 'week') state.currentDate.setDate(state.currentDate.getDate() + 7);
      else if (state.view === 'month') state.currentDate.setMonth(state.currentDate.getMonth() + 1);
      render();
    };
  }
}
