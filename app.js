const SUPABASE_URL = "https://vjjrwvraannccejyqcci.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_XYvCzMPGQjhT0AT2r2v3dw_zZIesIJB";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let state = {
  key: null,
  students: [],
  lessons: [], // Масив уроків: { id, studentId, date: 'YYYY-MM-DD', time: 'HH:MM', paid: false, completed: 'planned' }
  currentDate: new Date(),
  view: 'week',
  isEditMode: false,
  editingLessonId: null
};

const elements = {
  currentDateDisplay: document.getElementById('current-date-display'),
  calendarGrid: document.getElementById('calendar-grid'),
  todayBtn: document.getElementById('today-btn'),
  prevBtn: document.getElementById('prev-date-btn'),
  nextBtn: document.getElementById('next-date-btn'),
  viewDayBtn: document.getElementById('view-day-btn'),
  viewWeekBtn: document.getElementById('view-week-btn'),
  viewMonthBtn: document.getElementById('view-month-btn'),
  editModeCheckbox: document.getElementById('edit-mode-checkbox'),
  
  // Учні
  manageStudentsBtn: document.getElementById('manage-students-btn'),
  studentsModal: document.getElementById('students-modal'),
  closeStudentsModalBtn: document.getElementById('close-students-modal-btn'),
  newStudentName: document.getElementById('new-student-name'),
  newStudentColor: document.getElementById('new-student-color'),
  addStudentBtn: document.getElementById('add-student-btn'),
  studentsList: document.getElementById('students-list'),

  // Уроки
  addLessonBtn: document.getElementById('add-lesson-btn'),
  lessonModal: document.getElementById('lesson-modal'),
  lessonModalTitle: document.getElementById('lesson-modal-title'),
  closeLessonModalBtn: document.getElementById('close-lesson-modal-btn'),
  saveLessonBtn: document.getElementById('save-lesson-btn'),
  lessonStudentSelect: document.getElementById('lesson-student-select'),
  lessonDateInput: document.getElementById('lesson-date-input'),
  lessonHourSelect: document.getElementById('lesson-hour-select'),
  lessonMinuteSelect: document.getElementById('lesson-minute-select'),
  lessonPaidSelect: document.getElementById('lesson-paid-select'),
  lessonStatusSelect: document.getElementById('lesson-status-select'),
  lessonRepeatSelect: document.getElementById('lesson-repeat-select'),
  repeatGroup: document.getElementById('repeat-group')
};

document.addEventListener('DOMContentLoaded', async () => {
  initTimeOptions();
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

function initTimeOptions() {
  elements.lessonHourSelect.innerHTML = '';
  for (let h = 9; h <= 21; h++) {
    const hourStr = String(h).padStart(2, '0');
    const opt = document.createElement('option');
    opt.value = hourStr;
    opt.textContent = hourStr;
    if (h === 18) opt.selected = true;
    elements.lessonHourSelect.appendChild(opt);
  }

  elements.lessonMinuteSelect.innerHTML = '';
  for (let m = 0; m < 60; m += 5) {
    const minStr = String(m).padStart(2, '0');
    const opt = document.createElement('option');
    opt.value = minStr;
    opt.textContent = minStr;
    if (m === 0) opt.selected = true;
    elements.lessonMinuteSelect.appendChild(opt);
  }
}

async function createNewSchedule() {
  try {
    const { data, error } = await db.rpc('create_schedule');
    if (error) throw error;
    state.key = data.access_token;
    window.history.replaceState({}, '', `${window.location.origin}${window.location.pathname}?key=${state.key}`);
  } catch (err) { console.error(err); }
}

async function loadSchedule() {
  try {
    const { data, error } = await db.rpc('get_schedule', { p_access_token: state.key });
    if (error) throw error;
    if (data && data.data) {
      state.students = data.data.students || [];
      state.lessons = data.data.lessons || [];
    }
  } catch (err) { console.error(err); }
}

async function saveSchedule() {
  try {
    await db.rpc('save_schedule', {
      p_access_token: state.key,
      p_data: { students: state.students, lessons: state.lessons }
    });
  } catch (err) { console.error(err); }
}

function render() {
  updateDateDisplay();
  updateViewButtons();
  renderStudentsList();
  updateStudentSelectOptions();
  renderGrid();
}

function updateViewButtons() {
  [elements.viewDayBtn, elements.viewWeekBtn, elements.viewMonthBtn].forEach(btn => btn.classList.remove('active'));
  if (state.view === 'day') elements.viewDayBtn.classList.add('active');
  if (state.view === 'week') elements.viewWeekBtn.classList.add('active');
  if (state.view === 'month') elements.viewMonthBtn.classList.add('active');
}

function updateDateDisplay() {
  if (state.view === 'day') {
    elements.currentDateDisplay.textContent = state.currentDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  } else if (state.view === 'week') {
    const start = getStartOfWeek(state.currentDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    elements.currentDateDisplay.textContent = `${start.getDate()} ${start.toLocaleDateString('uk-UA', {month:'short'})} - ${end.getDate()} ${end.toLocaleDateString('uk-UA', {month:'short', year:'numeric'})}`;
  } else if (state.view === 'month') {
    elements.currentDateDisplay.textContent = state.currentDate.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
  }
}

function renderStudentsList() {
  elements.studentsList.innerHTML = '';
  if (state.students.length === 0) {
    elements.studentsList.innerHTML = '<div style="color:#64748b; font-size:0.9rem;">Спискок порожній</div>';
    return;
  }
  state.students.forEach(student => {
    const item = document.createElement('div');
    item.className = 'student-item';
    item.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <input type="color" value="${student.color}" onchange="updateStudent('${student.id}', 'color', this.value)" style="width:24px; height:24px; border:none; padding:0; cursor:pointer;">
        <input type="text" value="${student.name}" onchange="updateStudent('${student.id}', 'name', this.value)" style="border:none; background:transparent; font-weight:bold; width: 180px;">
      </div>
      <button class="danger" onclick="deleteStudent('${student.id}')">Видалити</button>
    `;
    elements.studentsList.appendChild(item);
  });
}

function updateStudentSelectOptions() {
  elements.lessonStudentSelect.innerHTML = '';
  state.students.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    elements.lessonStudentSelect.appendChild(opt);
  });
}

window.updateStudent = async (id, field, value) => {
  const student = state.students.find(s => s.id === id);
  if (student) {
    student[field] = value;
    await saveSchedule();
    render();
  }
};

window.deleteStudent = async (id) => {
  state.students = state.students.filter(s => s.id !== id);
  state.lessons = state.lessons.filter(l => l.studentId !== id);
  await saveSchedule();
  render();
};

function getStartOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function formatDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

function renderGrid() {
  elements.calendarGrid.innerHTML = '';

  if (state.view === 'month') {
    renderMonthView();
    return;
  }

  const isWeek = state.view === 'week';
  elements.calendarGrid.className = `calendar-grid ${isWeek ? 'grid-week' : 'grid-day'}`;

  const daysCount = isWeek ? 7 : 1;
  const startOfWeek = getStartOfWeek(state.currentDate);
  const daysDates = [];

  elements.calendarGrid.appendChild(document.createElement('div'));

  const daysNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  for (let i = 0; i < daysCount; i++) {
    const date = isWeek ? new Date(startOfWeek) : new Date(state.currentDate);
    if (isWeek) date.setDate(startOfWeek.getDate() + i);
    daysDates.push(date);

    const dayIdx = (date.getDay() + 6) % 7;
    const header = document.createElement('div');
    header.className = `day-header ${isToday(date) ? 'today' : ''}`;
    header.textContent = `${daysNames[dayIdx]} (${date.getDate()})`;
    elements.calendarGrid.appendChild(header);
  }

  const startHour = state.isEditMode ? 9 : 17;
  const endHour = 21;

  for (let h = startHour; h <= endHour; h++) {
    const timeStr = `${String(h).padStart(2, '0')}:00`;
    
    const timeLabel = document.createElement('div');
    timeLabel.className = 'time-slot time-label';
    timeLabel.textContent = timeStr;
    elements.calendarGrid.appendChild(timeLabel);

    daysDates.forEach(date => {
      const dateISO = formatDateISO(date);
      const slot = document.createElement('div');
      slot.className = 'time-slot';
      
      const lesson = state.lessons.find(l => l.date === dateISO && l.time.startsWith(String(h).padStart(2, '0')));

      if (lesson) {
        const student = state.students.find(s => s.id === lesson.studentId);
        const card = document.createElement('div');
        card.className = 'lesson-card';
        card.style.backgroundColor = student ? student.color : '#3b82f6';
        card.draggable = true;

        const isPaid = lesson.paid === true || lesson.paid === 'true';
        const isCompleted = lesson.status === 'completed';

        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${lesson.time} ${student ? student.name : ''}</strong>
            <span style="cursor:pointer; font-size:1.1rem; line-height:1;" onclick="event.stopPropagation(); deleteLesson('${lesson.id}')">&times;</span>
          </div>
          <div class="lesson-badges">
            <span class="badge" style="background:${isPaid ? '#22c55e' : '#ef4444'}">${isPaid ? 'Оплачено' : 'Ні'}</span>
            <span class="badge">${isCompleted ? 'Відбувся' : 'План'}</span>
          </div>
        `;
        
        card.onclick = () => openEditLessonModal(lesson.id);
        card.ondragstart = (e) => e.dataTransfer.setData('text/plain', lesson.id);
        slot.appendChild(card);
      } else {
        const freeSlot = document.createElement('div');
        freeSlot.className = 'slot-free';
        freeSlot.textContent = 'Вільно';

        freeSlot.ondragover = (e) => { e.preventDefault(); freeSlot.classList.add('drag-over'); };
        freeSlot.ondragleave = () => freeSlot.classList.remove('drag-over');
        freeSlot.ondrop = async (e) => {
          e.preventDefault();
          freeSlot.classList.remove('drag-over');
          const lessonId = e.dataTransfer.getData('text/plain');
          await moveLesson(lessonId, dateISO, timeStr);
        };

        slot.appendChild(freeSlot);
      }

      elements.calendarGrid.appendChild(slot);
    });
  }
}

function renderMonthView() {
  elements.calendarGrid.className = 'calendar-grid';
  elements.calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';

  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const daysNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  daysNames.forEach(name => {
    const h = document.createElement('div');
    h.className = 'day-header';
    h.textContent = name;
    elements.calendarGrid.appendChild(h);
  });

  let startDay = (firstDay.getDay() + 6) % 7;
  for (let i = 0; i < startDay; i++) {
    const empty = document.createElement('div');
    empty.style.cssText = 'background:#f1f5f9; min-height:90px; border-radius:6px; opacity:0.5;';
    elements.calendarGrid.appendChild(empty);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const d = new Date(year, month, day);
    const dateISO = formatDateISO(d);
    
    const cell = document.createElement('div');
    cell.className = `month-cell ${isToday(d) ? 'today' : ''}`;
    cell.innerHTML = `<div style="font-weight:bold; color:#64748b; text-align:right;">${day}</div>`;

    const dayLessons = state.lessons.filter(l => l.date === dateISO);
    dayLessons.forEach(l => {
      const s = state.students.find(st => st.id === l.studentId);
      const tag = document.createElement('div');
      tag.style.cssText = `background:${s ? s.color : '#3b82f6'}; color:white; padding:2px 4px; border-radius:3px; margin-top:2px; font-size:0.75rem; cursor:pointer;`;
      tag.textContent = `${l.time} ${s ? s.name : ''}`;
      tag.onclick = () => openEditLessonModal(l.id);
      cell.appendChild(tag);
    });

    elements.calendarGrid.appendChild(cell);
  }
}

async function moveLesson(lessonId, newDate, newTime) {
  const lesson = state.lessons.find(l => l.id === lessonId);
  if (lesson) {
    lesson.date = newDate;
    lesson.time = newTime;
    await saveSchedule();
    render();
  }
}

window.deleteLesson = async (lessonId) => {
  state.lessons = state.lessons.filter(l => l.id !== lessonId);
  await saveSchedule();
  render();
};

function openEditLessonModal(lessonId) {
  const lesson = state.lessons.find(l => l.id === lessonId);
  if (!lesson) return;

  state.editingLessonId = lessonId;
  elements.lessonModalTitle.textContent = 'Редагувати урок';
  elements.lessonStudentSelect.value = lesson.studentId;
  elements.lessonDateInput.value = lesson.date;

  const [h, m] = lesson.time.split(':');
  elements.lessonHourSelect.value = h;
  elements.lessonMinuteSelect.value = m;
  
  elements.lessonPaidSelect.value = String(lesson.paid);
  elements.lessonStatusSelect.value = lesson.status || 'planned';

  elements.repeatGroup.style.display = 'none';
  elements.lessonModal.classList.remove('hidden');
}

function setupEventListeners() {
  elements.editModeCheckbox.onchange = (e) => {
    state.isEditMode = e.target.checked;
    render();
  };

  elements.manageStudentsBtn.onclick = () => elements.studentsModal.classList.remove('hidden');
  elements.closeStudentsModalBtn.onclick = () => elements.studentsModal.classList.add('hidden');
  
  elements.addStudentBtn.onclick = async () => {
    const name = elements.newStudentName.value.trim();
    const color = elements.newStudentColor.value;
    if (!name) return;

    state.students.push({ id: Date.now().toString(), name, color });
    elements.newStudentName.value = '';
    await saveSchedule();
    render();
  };

  elements.addLessonBtn.onclick = () => {
    if (state.students.length === 0) {
      alert('Спочатку додайте хоча б одного учня!');
      return;
    }
    state.editingLessonId = null;
    elements.lessonModalTitle.textContent = 'Додати урок';
    elements.lessonDateInput.value = formatDateISO(state.currentDate);
    elements.repeatGroup.style.display = 'block';
    elements.lessonModal.classList.remove('hidden');
  };
  
  elements.closeLessonModalBtn.onclick = () => elements.lessonModal.classList.add('hidden');

  elements.saveLessonBtn.onclick = async () => {
    const studentId = elements.lessonStudentSelect.value;
    const baseDateStr = elements.lessonDateInput.value;
    const time = `${elements.lessonHourSelect.value}:${elements.lessonMinuteSelect.value}`;
    const paid = elements.lessonPaidSelect.value === 'true';
    const status = elements.lessonStatusSelect.value;

    if (!studentId || !baseDateStr) return;

    if (state.editingLessonId) {
      const lesson = state.lessons.find(l => l.id === state.editingLessonId);
      if (lesson) {
        lesson.studentId = studentId;
        lesson.date = baseDateStr;
        lesson.time = time;
        lesson.paid = paid;
        lesson.status = status;
      }
    } else {
      const repeatCount = parseInt(elements.lessonRepeatSelect.value, 10);
      const baseDate = new Date(baseDateStr);

      for (let i = 0; i < repeatCount; i++) {
        const targetDate = new Date(baseDate);
        targetDate.setDate(baseDate.getDate() + (i * 7));

        state.lessons.push({
          id: Date.now().toString() + i,
          studentId,
          date: formatDateISO(targetDate),
          time,
          paid,
          status
        });
      }
    }

    await saveSchedule();
    elements.lessonModal.classList.add('hidden');
    render();
  };

  elements.viewDayBtn.onclick = () => { state.view = 'day'; render(); };
  elements.viewWeekBtn.onclick = () => { state.view = 'week'; render(); };
  elements.viewMonthBtn.onclick = () => { state.view = 'month'; render(); };

  elements.todayBtn.onclick = () => { state.currentDate = new Date(); render(); };
  elements.prevBtn.onclick = () => {
    if (state.view === 'day') state.currentDate.setDate(state.currentDate.getDate() - 1);
    else if (state.view === 'week') state.currentDate.setDate(state.currentDate.getDate() - 7);
    else if (state.view === 'month') state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    render();
  };
  elements.nextBtn.onclick = () => {
    if (state.view === 'day') state.currentDate.setDate(state.currentDate.getDate() + 1);
    else if (state.view === 'week') state.currentDate.setDate(state.currentDate.getDate() + 7);
    else if (state.view === 'month') state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    render();
  };
}
