const SUPABASE_URL = "https://vjjrwvraannccejyqcci.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_XYvCzMPGQjhT0AT2r2v3dw_zZIesIJB";

const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;

let state = {
  key: null,
  students: [],
  lessons: [],
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
  
  manageStudentsBtn: document.getElementById('manage-students-btn'),
  studentsModal: document.getElementById('students-modal'),
  closeStudentsModalBtn: document.getElementById('close-students-modal-btn'),
  newStudentName: document.getElementById('new-student-name'),
  newStudentColor: document.getElementById('new-student-color'),
  addStudentBtn: document.getElementById('add-student-btn'),
  studentsList: document.getElementById('students-list'),

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
  state.key = urlParams.get('key') || 'default_schedule';

  await loadSchedule();
  sanitizeState();
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

function sanitizeState() {
  if (!Array.isArray(state.students)) state.students = [];
  if (!Array.isArray(state.lessons)) state.lessons = [];

  state.students.forEach((s, idx) => {
    s.id = s.id ? String(s.id) : String(Date.now() + idx);
    s.name = s.name || `Учень ${idx + 1}`;
    s.color = s.color || '#3b82f6';
  });

  state.lessons.forEach((l, idx) => {
    l.id = l.id ? String(l.id) : String(Date.now() + '_' + idx);
    l.studentId = String(l.studentId || '');
    l.paid = l.paid === true || l.paid === 'true';
    l.status = l.status || 'planned';
  });
}

async function loadSchedule() {
  let loaded = false;

  if (db && state.key) {
    try {
      const { data, error } = await db.rpc('get_schedule', { p_access_token: state.key });
      if (!error && data && data.data) {
        state.students = data.data.students || [];
        state.lessons = data.data.lessons || [];
        loaded = true;
      }
    } catch (e) {
      console.warn('Supabase loading fallback to LocalStorage');
    }
  }

  if (!loaded) {
    const local = localStorage.getItem('schedule_' + state.key);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        state.students = parsed.students || [];
        state.lessons = parsed.lessons || [];
      } catch (e) { console.error(e); }
    }
  }
}

async function saveSchedule() {
  sanitizeState();
  const payload = { students: state.students, lessons: state.lessons };
  localStorage.setItem('schedule_' + state.key, JSON.stringify(payload));

  if (db && state.key) {
    try {
      await db.rpc('save_schedule', {
        p_access_token: state.key,
        p_data: payload
      });
    } catch (e) {
      console.warn('Saved to LocalStorage.');
    }
  }
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
    const emptyMsg = document.createElement('div');
    emptyMsg.style.cssText = 'color:#64748b; font-size:0.88rem; text-align:center; padding:12px;';
    emptyMsg.textContent = 'Список учнів порожній. Додайте першого учня вище.';
    elements.studentsList.appendChild(emptyMsg);
    return;
  }

  state.students.forEach(student => {
    const item = document.createElement('div');
    item.className = 'student-item';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = student.color || '#3b82f6';
    colorInput.style.cssText = 'width:34px; height:34px; border:none; padding:0; cursor:pointer; border-radius:4px; background:none;';
    colorInput.onchange = async (e) => {
      student.color = e.target.value;
      await saveSchedule();
      render();
    };

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = student.name || '';
    nameInput.style.cssText = 'flex:1; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; font-weight:600; font-size:0.9rem;';
    nameInput.onchange = async (e) => {
      const val = e.target.value.trim();
      if (val) {
        student.name = val;
        await saveSchedule();
        render();
      }
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger';
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Видалити';
    deleteBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (confirm(`Видалити учня "${student.name}" та всі його уроки?`)) {
        const studentIdStr = String(student.id);
        state.students = state.students.filter(s => String(s.id) !== studentIdStr);
        state.lessons = state.lessons.filter(l => String(l.studentId) !== studentIdStr);
        await saveSchedule();
        render();
      }
    };

    item.appendChild(colorInput);
    item.appendChild(nameInput);
    item.appendChild(deleteBtn);

    elements.studentsList.appendChild(item);
  });
}

function updateStudentSelectOptions() {
  elements.lessonStudentSelect.innerHTML = '';
  state.students.forEach(s => {
    const opt = document.createElement('option');
    opt.value = String(s.id);
    opt.textContent = s.name;
    elements.lessonStudentSelect.appendChild(opt);
  });
}

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
  elements.calendarGrid.style.gridTemplateColumns = '';

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

      const slotLessons = state.lessons.filter(l => {
        if (l.date !== dateISO) return false;
        const lHour = parseInt((l.time || '00:00').split(':')[0], 10);
        return lHour === h;
      });

      if (slotLessons.length > 0) {
        slotLessons.forEach(lesson => {
          const card = createLessonCard(lesson);
          slot.appendChild(card);
        });
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

function createLessonCard(lesson) {
  const student = state.students.find(s => String(s.id) === String(lesson.studentId));
  const card = document.createElement('div');
  card.className = 'lesson-card';
  card.style.backgroundColor = student ? (student.color || '#3b82f6') : '#64748b';
  card.draggable = true;

  const isPaid = lesson.paid === true || lesson.paid === 'true';
  const isCompleted = lesson.status === 'completed';

  const topRow = document.createElement('div');
  topRow.style.cssText = 'display:flex; justify-content:space-between; align-items:flex-start; gap:4px;';

  const titleSpan = document.createElement('span');
  titleSpan.style.cssText = 'font-weight:bold; font-size:0.83rem; line-height:1.2; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
  titleSpan.textContent = `${lesson.time || ''} ${student ? student.name : 'Учень'}`;

  const deleteBtn = document.createElement('span');
  deleteBtn.title = 'Видалити урок';
  deleteBtn.style.cssText = 'cursor:pointer; font-size:1.2rem; line-height:0.7; opacity:0.8; font-weight:bold; padding:2px;';
  deleteBtn.innerHTML = '&times;';
  deleteBtn.onclick = async (e) => {
    e.stopPropagation();
    if (confirm('Видалити цей урок?')) {
      state.lessons = state.lessons.filter(l => String(l.id) !== String(lesson.id));
      await saveSchedule();
      render();
    }
  };

  topRow.appendChild(titleSpan);
  topRow.appendChild(deleteBtn);

  const badgesRow = document.createElement('div');
  badgesRow.className = 'lesson-badges';

  const paidBadge = document.createElement('span');
  paidBadge.className = 'badge';
  paidBadge.style.backgroundColor = isPaid ? '#16a34a' : '#dc2626';
  paidBadge.textContent = isPaid ? 'Оплачено' : 'Не опл.';

  const statusBadge = document.createElement('span');
  statusBadge.className = 'badge';
  statusBadge.style.backgroundColor = isCompleted ? '#475569' : '#2563eb';
  statusBadge.textContent = isCompleted ? 'Відбувся' : 'Заплан.';

  badgesRow.appendChild(paidBadge);
  badgesRow.appendChild(statusBadge);

  card.appendChild(topRow);
  card.appendChild(badgesRow);

  card.onclick = () => openEditLessonModal(lesson.id);
  card.ondragstart = (e) => {
    e.dataTransfer.setData('text/plain', String(lesson.id));
  };

  return card;
}

function renderMonthView() {
  elements.calendarGrid.className = 'calendar-grid';
  elements.calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';

  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const daysNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  daysNames.forEach(name => {
    const h = document.createElement('div');
    h.className = 'day-header';
    h.textContent = name;
    elements.calendarGrid.appendChild(h);
  });

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const cell = document.createElement('div');
    cell.className = 'month-cell padding-cell';
    cell.innerHTML = `<div class="month-day-num muted">${prevMonthLastDay - i}</div>`;
    elements.calendarGrid.appendChild(cell);
  }

  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day);
    const dateISO = formatDateISO(d);
    const isCurrentToday = isToday(d);

    const cell = document.createElement('div');
    cell.className = `month-cell ${isCurrentToday ? 'today' : ''}`;

    const numDiv = document.createElement('div');
    numDiv.className = `month-day-num ${isCurrentToday ? 'today-num' : ''}`;
    numDiv.textContent = day;
    cell.appendChild(numDiv);

    const dayLessons = state.lessons.filter(l => l.date === dateISO);
    dayLessons.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    dayLessons.forEach(l => {
      const s = state.students.find(st => String(st.id) === String(l.studentId));
      const badge = document.createElement('div');
      badge.className = 'month-lesson-badge';
      badge.style.backgroundColor = s ? (s.color || '#3b82f6') : '#3b82f6';

      const isPaid = l.paid === true || l.paid === 'true';

      const textSpan = document.createElement('span');
      textSpan.style.cssText = 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
      textSpan.innerHTML = `<strong>${l.time || ''}</strong> ${s ? s.name : ''}`;

      const iconSpan = document.createElement('span');
      iconSpan.style.cssText = 'font-size:0.65rem; background:rgba(0,0,0,0.25); padding:1px 4px; border-radius:2px; flex-shrink:0;';
      iconSpan.textContent = isPaid ? '✓' : '✗';

      badge.appendChild(textSpan);
      badge.appendChild(iconSpan);

      badge.onclick = (e) => {
        e.stopPropagation();
        openEditLessonModal(l.id);
      };

      cell.appendChild(badge);
    });

    elements.calendarGrid.appendChild(cell);
  }

  const totalCells = startDayOfWeek + totalDays;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const cell = document.createElement('div');
    cell.className = 'month-cell padding-cell';
    cell.innerHTML = `<div class="month-day-num muted">${i}</div>`;
    elements.calendarGrid.appendChild(cell);
  }
}

async function moveLesson(lessonId, newDate, newTime) {
  const lesson = state.lessons.find(l => String(l.id) === String(lessonId));
  if (lesson) {
    lesson.date = newDate;
    lesson.time = newTime;
    await saveSchedule();
    render();
  }
}

function openEditLessonModal(lessonId) {
  const lesson = state.lessons.find(l => String(l.id) === String(lessonId));
  if (!lesson) return;

  state.editingLessonId = String(lessonId);
  elements.lessonModalTitle.textContent = 'Редагувати урок';

  updateStudentSelectOptions();
  elements.lessonStudentSelect.value = String(lesson.studentId);
  elements.lessonDateInput.value = lesson.date;

  const parts = (lesson.time || '18:00').split(':');
  elements.lessonHourSelect.value = String(parts[0]).padStart(2, '0');
  elements.lessonMinuteSelect.value = String(parts[1]).padStart(2, '0');

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
    if (!name) {
      alert("Будь ласка, введіть ім'я учня!");
      return;
    }

    state.students.push({ id: Date.now().toString(), name, color });
    elements.newStudentName.value = '';
    await saveSchedule();
    render();
  };

  elements.addLessonBtn.onclick = () => {
    if (state.students.length === 0) {
      alert('Спочатку додайте хоча б одного учня в меню "Учні"!');
      elements.studentsModal.classList.remove('hidden');
      return;
    }
    state.editingLessonId = null;
    elements.lessonModalTitle.textContent = 'Додати урок';
    updateStudentSelectOptions();
    elements.lessonDateInput.value = formatDateISO(state.currentDate);
    elements.lessonHourSelect.value = '18';
    elements.lessonMinuteSelect.value = '00';
    elements.lessonPaidSelect.value = 'false';
    elements.lessonStatusSelect.value = 'planned';
    elements.repeatGroup.style.display = 'block';
    elements.lessonModal.classList.remove('hidden');
  };

  elements.closeLessonModalBtn.onclick = () => elements.lessonModal.classList.add('hidden');

  elements.saveLessonBtn.onclick = async () => {
    const studentId = String(elements.lessonStudentSelect.value);
    const baseDateStr = elements.lessonDateInput.value;
    const hour = elements.lessonHourSelect.value;
    const minute = elements.lessonMinuteSelect.value;
    const paid = elements.lessonPaidSelect.value === 'true';
    const status = elements.lessonStatusSelect.value;

    if (!studentId || !baseDateStr) {
      alert('Заповніть усі поля!');
      return;
    }

    const time = `${hour}:${minute}`;

    if (state.editingLessonId) {
      const lesson = state.lessons.find(l => String(l.id) === String(state.editingLessonId));
      if (lesson) {
        lesson.studentId = studentId;
        lesson.date = baseDateStr;
        lesson.time = time;
        lesson.paid = paid;
        lesson.status = status;
      }
    } else {
      const repeatCount = parseInt(elements.lessonRepeatSelect.value, 10) || 1;
      const [y, m, d] = baseDateStr.split('-').map(Number);

      for (let i = 0; i < repeatCount; i++) {
        const targetDate = new Date(y, m - 1, d + (i * 7));
        state.lessons.push({
          id: `${Date.now()}_${i}`,
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
    if (state.view === 'day') {
      state.currentDate.setDate(state.currentDate.getDate() - 1);
    } else if (state.view === 'week') {
      state.currentDate.setDate(state.currentDate.getDate() - 7);
    } else if (state.view === 'month') {
      const y = state.currentDate.getFullYear();
      const m = state.currentDate.getMonth();
      state.currentDate = new Date(y, m - 1, 1);
    }
    render();
  };

  elements.nextBtn.onclick = () => {
    if (state.view === 'day') {
      state.currentDate.setDate(state.currentDate.getDate() + 1);
    } else if (state.view === 'week') {
      state.currentDate.setDate(state.currentDate.getDate() + 7);
    } else if (state.view === 'month') {
      const y = state.currentDate.getFullYear();
      const m = state.currentDate.getMonth();
      state.currentDate = new Date(y, m + 1, 1);
    }
    render();
  };
}
