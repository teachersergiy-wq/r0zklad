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

// РОБОТА З З БАЗОЮ ДАНИХ
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
  renderGrid();
  renderStudentsList();
  updateStudentSelectOptions();
}

function updateDateDisplay() {
  if (!elements.currentDateDisplay) return;
  
  const options = { month: 'long', year: 'numeric' };
  if (state.view === 'day') {
    options.day = 'numeric';
  }
  elements.currentDateDisplay.textContent = state.currentDate.toLocaleDateString('uk-UA', options);
}

function renderGrid() {
  if (!elements.calendarGrid) return;
  elements.calendarGrid.innerHTML = '';

  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  
  days.forEach((day, index) => {
    const dayCol = document.createElement('div');
    dayCol.className = 'day-column';
    dayCol.style.cssText = 'border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; min-height: 300px; background: #fff;';
    
    const dayHeader = document.createElement('div');
    dayHeader.style.cssText = 'font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 8px; text-align: center;';
    dayHeader.textContent = day;
    dayCol.appendChild(dayHeader);

    // Відображення занять для конкретного дня
    const dayLessons = Object.values(state.lessons).filter(l => String(l.day) === String((index + 1) % 7));
    dayLessons.forEach(lesson => {
      const student = state.students.find(s => s.id === lesson.studentId);
      const lessonEl = document.createElement('div');
      lessonEl.style.cssText = `background-color: ${student ? student.color : '#3b82f6'}; color: white; padding: 4px 8px; border-radius: 4px; margin-bottom: 4px; font-size: 0.85rem;`;
      lessonEl.textContent = `${lesson.time} - ${student ? student.name : 'Учень'}`;
      dayCol.appendChild(lessonEl);
    });

    elements.calendarGrid.appendChild(dayCol);
  });
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
      state.currentDate.setDate(state.currentDate.getDate() - 7);
      render();
    };
  }

  if (elements.nextBtn) {
    elements.nextBtn.onclick = () => {
      state.currentDate.setDate(state.currentDate.getDate() + 7);
      render();
    };
  }
}
