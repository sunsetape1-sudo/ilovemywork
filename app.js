const STORAGE_KEY = "shift-calendar-v1";
const THEME_STORAGE_KEY = "shift-calendar-theme-v1";
const LEGACY_QUOTE_STORAGE_KEY = "shift-calendar-last-quote-v1";
const FORTUNE_STATE_KEY = "shift-calendar-fortune-v1";
const FORTUNE_TEST_PASSWORD = "456347";
const FORTUNE_CLICKS_TO_OPEN = 1;
const PREDICTION_DATA_URL = "./predictions.json";
const HOLIDAY_API_BASE = "https://date.nager.at/api/v3/PublicHolidays";
const COUNTRY_CODE = "RU";
const DEFAULT_CUSTOM_COLOR = "#7fa8ff";
const MAX_CUSTOM_PROCEDURES = 100;
const REPEAT_MODE_SINGLE = "single_month";
const REPEAT_MODE_CARRY = "carry_forward";
const REPEAT_MODE_BIRTHDAY = "birthday_yearly";
const LEGACY_MANICURE_PROCEDURE = {
  id: "legacy-manicure",
  name: "Маникюр",
  color: "#e493cb",
  repeatMode: REPEAT_MODE_SINGLE,
  anchorMonthKey: null,
};
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const DAY_NAMES = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const PREDICTION_FALLBACK = [
  "Сегодня случится что-то небольшое, но очень приятное.",
  "Сегодня удачное решение придёт спокойнее, чем Вы ожидали.",
  "Этот день принесёт маленький знак, что всё складывается верно.",
  "Сегодня одна деталь неожиданно улучшит настроение.",
  "К вечеру день покажется теплее и добрее, чем утром.",
  "Сегодня появится ощущение, что всё понемногу встаёт на место.",
  "Этот день приведёт к хорошему совпадению.",
  "Сегодня будет повод улыбнуться без лишней причины.",
  "Нужный ответ сегодня придёт вовремя.",
  "Обычный день сегодня окажется удачнее, чем кажется.",
];
const MONTH_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const ui = {
  holidayStatus: document.querySelector("#holidayStatus"),
  legendStrip: document.querySelector("#legendStrip"),
  monthLabel: document.querySelector("#monthLabel"),
  todayDateLabel: document.querySelector("#todayDateLabel"),
  fortuneLabel: document.querySelector("#fortuneLabel"),
  fortuneCookieButton: document.querySelector("#fortuneCookieButton"),
  fortuneCookieShape: document.querySelector("#fortuneCookieShape"),
  quoteText: document.querySelector("#quoteText"),
  brushPicker: document.querySelector("#brushPicker"),
  customBrushList: document.querySelector("#customBrushList"),
  customBrushEmpty: document.querySelector("#customBrushEmpty"),
  customProcedureName: document.querySelector("#customProcedureName"),
  customProcedureColor: document.querySelector("#customProcedureColor"),
  customProcedureRepeat: document.querySelector("#customProcedureRepeat"),
  customHint: document.querySelector("#customHint"),
  addCustomProcedureButton: document.querySelector("#addCustomProcedureButton"),
  deleteCustomProcedureButton: document.querySelector("#deleteCustomProcedureButton"),
  exportDataButton: document.querySelector("#exportDataButton"),
  importDataButton: document.querySelector("#importDataButton"),
  importDataInput: document.querySelector("#importDataInput"),
  refreshAppButton: document.querySelector("#refreshAppButton"),
  secretCookieButton: document.querySelector("#secretCookieButton"),
  calendarGrid: document.querySelector("#calendarGrid"),
  weekdayHeaders: document.querySelector("#weekdayHeaders"),
  workCount: document.querySelector("#workCount"),
  customCount: document.querySelector("#customCount"),
  holidayCount: document.querySelector("#holidayCount"),
  selectedDayTitle: document.querySelector("#selectedDayTitle"),
  selectedDayTags: document.querySelector("#selectedDayTags"),
  selectedDayCopy: document.querySelector("#selectedDayCopy"),
  noteInput: document.querySelector("#noteInput"),
  saveNoteButton: document.querySelector("#saveNoteButton"),
  clearNoteButton: document.querySelector("#clearNoteButton"),
  noteHistory: document.querySelector("#noteHistory"),
  noteHistorySubtitle: document.querySelector("#noteHistorySubtitle"),
  holidayList: document.querySelector("#holidayList"),
  holidayListSubtitle: document.querySelector("#holidayListSubtitle"),
  prevMonthButton: document.querySelector("#prevMonthButton"),
  nextMonthButton: document.querySelector("#nextMonthButton"),
  todayButton: document.querySelector("#todayButton"),
  themeToggleButton: document.querySelector("#themeToggleButton"),
  resetDataButton: document.querySelector("#resetDataButton"),
  themeColorMeta: document.querySelector("#themeColorMeta"),
};

const initialState = loadState();
const today = new Date();
let activeBrush = normalizeBrushId(initialState.lastBrush);
let viewDate = parseMonthKey(initialState.lastViewedMonth) || new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDateKey =
  initialState.selectedDateKey || formatDateKey(viewDate.getFullYear(), viewDate.getMonth(), 1);
const holidayCache = new Map(Object.entries(initialState.holidaysCache || {}));
let theme = loadTheme();
let currentQuote = "Подбираю предсказание дня...";
let quotePoolPromise = null;
let dailyFortuneState = loadFortuneState();
let holidayStatus = {
  state: "loading",
  message: "Загружаю праздники...",
};

applyTheme(theme);
renderQuote();
initializeQuote();
renderWeekdays();
bindEvents();
renderBrushPicker();
ensureMonthInView();
render();
loadHolidaysForYear(viewDate.getFullYear());
registerServiceWorker();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        entries: {},
        holidaysCache: {},
        customProcedures: [],
        customEvents: [],
        lastViewedMonth: null,
        lastBrush: "work",
        selectedDateKey: null,
      };
    }

    const parsed = JSON.parse(raw);
    let customProcedures = ensureLegacyManicureProcedure(
      sanitizeCustomProcedures(parsed.customProcedures || []),
      hasLegacyManicureEntries(parsed.entries || {})
    );
    let customEvents = sanitizeCustomEvents(
      parsed.customEvents || extractLegacyCustomEvents(parsed.entries || {}, customProcedures),
      customProcedures
    );
    ({ customProcedures, customEvents } = migrateCustomProcedureScopes(
      customProcedures,
      customEvents,
      parsed.lastViewedMonth || formatMonthKey(today)
    ));
    return {
      entries: sanitizeEntries(parsed.entries || {}, customProcedures),
      holidaysCache: parsed.holidaysCache || {},
      customProcedures,
      customEvents,
      lastViewedMonth: parsed.lastViewedMonth || null,
      lastBrush: parsed.lastBrush || "work",
      selectedDateKey: parsed.selectedDateKey || null,
    };
  } catch (error) {
    console.error("Не удалось прочитать сохранённые данные", error);
      return {
        entries: {},
        holidaysCache: {},
        customProcedures: [],
        customEvents: [],
        lastViewedMonth: null,
        lastBrush: "work",
        selectedDateKey: null,
      };
  }
}

function persistState() {
  const payload = {
    entries: initialState.entries,
    holidaysCache: Object.fromEntries(holidayCache.entries()),
    customProcedures: initialState.customProcedures,
    customEvents: initialState.customEvents,
    lastViewedMonth: formatMonthKey(viewDate),
    lastBrush: activeBrush,
    selectedDateKey,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function bindEvents() {
  ui.prevMonthButton.addEventListener("click", () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    selectedDateKey = formatDateKey(viewDate.getFullYear(), viewDate.getMonth(), 1);
    ensureMonthInView();
    render();
    loadHolidaysForYear(viewDate.getFullYear());
  });

  ui.nextMonthButton.addEventListener("click", () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    selectedDateKey = formatDateKey(viewDate.getFullYear(), viewDate.getMonth(), 1);
    ensureMonthInView();
    render();
    loadHolidaysForYear(viewDate.getFullYear());
  });

  ui.todayButton.addEventListener("click", () => {
    viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
    selectedDateKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
    ensureMonthInView();
    render();
    loadHolidaysForYear(viewDate.getFullYear());
  });

  ui.themeToggleButton.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    applyTheme(theme);
    persistTheme();
    render();
  });

  ui.resetDataButton.addEventListener("click", async () => {
    const confirmed = window.confirm("Очистить все локальные данные на этом устройстве? Смены, заметки, тема и кэш будут удалены.");
    if (!confirmed) {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(LEGACY_QUOTE_STORAGE_KEY);
    localStorage.removeItem(FORTUNE_STATE_KEY);

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }

    window.location.reload();
  });

  ui.refreshAppButton.addEventListener("click", async () => {
    await refreshApplicationPreservingData();
  });

  ui.fortuneCookieButton.addEventListener("click", () => {
    crackFortuneCookie();
  });

  ui.secretCookieButton.addEventListener("click", () => {
    openSecretFortuneReset();
  });

  ui.exportDataButton.addEventListener("click", () => {
    exportDataBackup();
  });

  ui.importDataButton.addEventListener("click", () => {
    ui.importDataInput.click();
  });

  ui.importDataInput.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }

    await importDataBackup(file);
    ui.importDataInput.value = "";
  });

  ui.brushPicker.addEventListener("click", (event) => {
    const button = event.target.closest("[data-brush]");
    if (!button) {
      return;
    }

    setActiveBrush(button.dataset.brush);
  });

  ui.customBrushList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-brush]");
    if (!button) {
      return;
    }

    setActiveBrush(button.dataset.brush);
  });

  ui.addCustomProcedureButton.addEventListener("click", () => {
    addOrUpdateCustomProcedure();
  });

  ui.deleteCustomProcedureButton.addEventListener("click", () => {
    deleteActiveCustomProcedure();
  });

  ui.customProcedureName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addOrUpdateCustomProcedure();
    }
  });

  ui.customProcedureName.addEventListener("input", () => {
    syncBirthdayRepeatMode();
  });

  ui.calendarGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-date]");
    if (!button) {
      return;
    }

    const dateKey = button.dataset.date;
    selectedDateKey = dateKey;
    const currentEntry = { ...(initialState.entries[dateKey] || {}) };

    if (activeBrush === "clear") {
      delete currentEntry.work;
      setEntry(dateKey, currentEntry);
      clearCustomMarksForDate(dateKey);
    } else if (isCustomBrushId(activeBrush)) {
      toggleCustomProcedureOnDate(dateKey, activeBrush.replace("custom:", ""));
    } else {
      currentEntry[activeBrush] = !currentEntry[activeBrush];
      setEntry(dateKey, currentEntry);
    }

    persistState();
    render();
  });

  ui.saveNoteButton.addEventListener("click", () => {
    const dateKey = selectedDateKey || formatDateKey(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const noteText = ui.noteInput.value.trim();
    const currentEntry = { ...(initialState.entries[dateKey] || {}) };

    if (noteText) {
      currentEntry.note = noteText;
      currentEntry.noteUpdatedAt = new Date().toISOString();
    } else {
      delete currentEntry.note;
      delete currentEntry.noteUpdatedAt;
    }

    setEntry(dateKey, currentEntry);
    persistState();
    render();
  });

  ui.clearNoteButton.addEventListener("click", () => {
    const dateKey = selectedDateKey || formatDateKey(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const currentEntry = { ...(initialState.entries[dateKey] || {}) };
    delete currentEntry.note;
    delete currentEntry.noteUpdatedAt;
    setEntry(dateKey, currentEntry);
    persistState();
    render();
  });

  ui.noteHistory.addEventListener("click", (event) => {
    const button = event.target.closest("[data-history-date]");
    if (!button) {
      return;
    }

    const dateKey = button.dataset.historyDate;
    selectedDateKey = dateKey;
    const [year, month] = dateKey.split("-").map(Number);
    viewDate = new Date(year, month - 1, 1);
    ensureMonthInView();
    render();
    loadHolidaysForYear(viewDate.getFullYear());
  });
}

function renderWeekdays() {
  ui.weekdayHeaders.innerHTML = "";

  WEEKDAYS.forEach((weekday, index) => {
    const item = document.createElement("div");
    item.className = "weekday";
    if (index >= 5) {
      item.classList.add("is-weekend");
    }
    item.textContent = weekday;
    ui.weekdayHeaders.append(item);
  });
}

function renderBrushPicker() {
  ui.brushPicker.querySelectorAll("[data-brush]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.brush === activeBrush);
  });
}

function render() {
  ensureActiveBrushAvailable();
  renderTodayDate();
  renderMonthHeading();
  renderLegend();
  renderBrushPicker();
  renderCustomBrushes();
  renderCustomProcedureFormState();
  renderCalendar();
  renderStats();
  renderSelectedDay();
  renderNoteHistory();
  renderHolidayList();
  renderHolidayStatus();
  renderThemeToggle();
  persistState();
}

function ensureActiveBrushAvailable() {
  if (!isCustomBrushId(activeBrush)) {
    return;
  }

  const procedure = getActiveCustomProcedure();
  if (!procedure || !isProcedureVisibleInMonth(procedure, formatMonthKey(viewDate))) {
    activeBrush = "work";
  }
}

function renderTodayDate() {
  ui.todayDateLabel.textContent = formatTodayHeadline(today);
}

function renderLegend() {
  ui.legendStrip.innerHTML = "";

  const items = [
    { tone: "work", label: "Красный — смена" },
    { tone: "note", label: "Жёлтый — заметка" },
    { tone: "holiday", label: "Золотая звезда — праздник" },
    ...getVisibleCustomProcedures().map((procedure) => ({
      tone: "custom",
      label: `${capitalizeColorName(procedure.color)} — ${procedure.name}`,
      color: procedure.color,
    })),
  ];

  items.forEach((item) => {
    const element = document.createElement("span");
    element.className = "legend-item";

    const dot = document.createElement("span");
    dot.className = `legend-dot ${item.tone}`.trim();
    if (item.tone === "custom" && item.color) {
      dot.style.setProperty("--legend-color", item.color);
    }

    const text = document.createElement("span");
    text.textContent = item.label;

    element.append(dot, text);
    ui.legendStrip.append(element);
  });
}

function renderQuote() {
  dailyFortuneState = ensureFortuneStateForToday(dailyFortuneState);
  ui.fortuneLabel.textContent = dailyFortuneState.revealed ? "предсказание дня" : "конверт дня";
  ui.quoteText.textContent = currentQuote;
  ui.quoteText.hidden = !dailyFortuneState.revealed;
  ui.fortuneCookieButton.hidden = false;
  ui.fortuneCookieButton.classList.remove("is-open");

  if (dailyFortuneState.revealed) {
    ui.fortuneCookieButton.classList.add("is-open");
    return;
  }
}

function renderMonthHeading() {
  const formatter = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });
  const monthText = formatter.format(viewDate);
  ui.monthLabel.textContent = monthText.charAt(0).toUpperCase() + monthText.slice(1);
}

function renderCalendar() {
  ui.calendarGrid.innerHTML = "";

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekdayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let index = 0; index < firstWeekdayOffset; index += 1) {
    const filler = document.createElement("div");
    filler.className = "day-empty";
    ui.calendarGrid.append(filler);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const button = document.createElement("button");
    const dayDate = new Date(year, month, day);
    const dateKey = formatDateKey(year, month, day);
    const entry = initialState.entries[dateKey] || {};
    const customProcedures = getProceduresForDate(dateKey);
    const primaryCustomProcedure = getPrimaryProcedure(customProcedures);
    const holiday = getHolidayByDate(dateKey);
    const isToday = dateKey === formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
    const isSelected = dateKey === selectedDateKey;
    const isWeekend = [0, 6].includes(dayDate.getDay());

    button.type = "button";
    button.className = "day-cell";
    button.dataset.date = dateKey;
    button.classList.toggle("is-work", Boolean(entry.work));
    button.classList.toggle("is-note", Boolean(entry.note));
    button.classList.toggle("is-weekend", isWeekend);
    button.classList.toggle("is-holiday", Boolean(holiday));
    button.classList.toggle("is-today", isToday);
    button.classList.toggle("is-selected", isSelected);
    button.classList.toggle("has-custom-mark", Boolean(primaryCustomProcedure));
    if (primaryCustomProcedure) {
      button.style.setProperty("--custom-day-color", primaryCustomProcedure.color);
      button.style.setProperty("--custom-day-text", getReadableTextColor(primaryCustomProcedure.color));
    } else {
      button.style.removeProperty("--custom-day-color");
      button.style.removeProperty("--custom-day-text");
    }
    button.setAttribute("aria-pressed", String(isSelected));
    button.setAttribute(
      "aria-label",
      buildDayAriaLabel({
        day,
        month,
        year,
        isWork: Boolean(entry.work),
        isNote: Boolean(entry.note),
        customProcedureNames: customProcedures.map((procedure) => procedure.name),
        holiday,
        isWeekend,
        isToday,
      })
    );

    const marker = document.createElement("span");
    marker.className = "day-marker";
    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = String(day);
    marker.append(number);
    button.append(marker);
    ui.calendarGrid.append(button);
  }
}

function renderStats() {
  const monthPrefix = formatMonthPrefix(viewDate.getFullYear(), viewDate.getMonth());
  const workCount = Object.entries(initialState.entries).filter(
    ([dateKey, value]) => dateKey.startsWith(monthPrefix) && value.work
  ).length;
  const customCount = getVisibleDateKeysForMonth().reduce((total, dateKey) => total + getProceduresForDate(dateKey).length, 0);
  const holidayCount = getCurrentMonthHolidays().length;

  ui.workCount.textContent = String(workCount);
  ui.customCount.textContent = String(customCount);
  ui.holidayCount.textContent = String(holidayCount);
}

function renderSelectedDay() {
  const fallbackKey = formatDateKey(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const dateKey = selectedDateKey || fallbackKey;
  const [year, monthNumber, dayNumber] = dateKey.split("-").map(Number);
  const month = monthNumber - 1;
  const currentDate = new Date(year, month, dayNumber);
  const entry = initialState.entries[dateKey] || {};
  const customProcedures = getProceduresForDate(dateKey);
  const holiday = getHolidayByDate(dateKey);
  const isToday = dateKey === formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  ui.selectedDayTitle.textContent = `${dayNumber} ${MONTH_GENITIVE[month]}, ${DAY_NAMES[currentDate.getDay()]}`;
  ui.selectedDayTags.innerHTML = "";

  const tags = [];
  if (entry.work) tags.push({ label: "Смена", tone: "work" });
  customProcedures.forEach((procedure) => {
    tags.push({ label: procedure.name, tone: "custom", color: procedure.color });
  });
  if (!entry.work && !customProcedures.length) tags.push({ label: "Без метки", tone: "" });
  if (entry.note) tags.push({ label: "Есть заметка", tone: "note" });
  if (holiday) tags.push({ label: "Праздник", tone: "holiday" });
  if (isToday) tags.push({ label: "Сегодня", tone: "today" });

  tags.forEach((tag) => {
    const element = document.createElement("span");
    element.className = `tag ${tag.tone}`.trim();
    element.textContent = tag.label;
    if (tag.tone === "custom" && tag.color) {
      element.style.setProperty("--tag-color", tag.color);
      element.style.setProperty("--tag-soft", withAlpha(tag.color, theme === "dark" ? 0.24 : 0.16));
      element.style.setProperty("--tag-line", withAlpha(tag.color, theme === "dark" ? 0.38 : 0.3));
    }
    ui.selectedDayTags.append(element);
  });

  const selectedDayCopy = buildSelectedDayCopy(entry, customProcedures, holiday);
  ui.selectedDayCopy.textContent = selectedDayCopy;
  ui.selectedDayCopy.hidden = !selectedDayCopy;

  ui.noteInput.value = entry.note || "";
  ui.clearNoteButton.disabled = !entry.note;
}

function renderCustomBrushes() {
  ui.customBrushList.innerHTML = "";
  const procedures = getVisibleCustomProcedures();
  ui.customBrushEmpty.hidden = Boolean(procedures.length);

  procedures.forEach((procedure) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "custom-brush-button";
    button.dataset.brush = `custom:${procedure.id}`;
    button.style.setProperty("--custom-color", procedure.color);
    button.style.setProperty("--custom-soft", withAlpha(procedure.color, theme === "dark" ? 0.24 : 0.16));
    button.style.setProperty("--custom-line", withAlpha(procedure.color, theme === "dark" ? 0.44 : 0.26));
    button.classList.toggle("is-active", button.dataset.brush === activeBrush);

    const swatch = document.createElement("span");
    swatch.className = "custom-brush-swatch";
    swatch.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "custom-brush-label";
    label.textContent = `${procedure.name} · ${getRepeatModeLabel(procedure.repeatMode)}`;

    button.append(swatch, label);
    ui.customBrushList.append(button);
  });
}

function renderNoteHistory() {
  const noteItems = Object.entries(initialState.entries)
    .filter(([, value]) => value.note)
    .sort((a, b) => {
      const aTime = a[1].noteUpdatedAt || "";
      const bTime = b[1].noteUpdatedAt || "";
      return bTime.localeCompare(aTime);
    });

  ui.noteHistory.innerHTML = "";

  if (!noteItems.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "holiday-empty";
    emptyState.textContent = "Пока нет сохранённых заметок.";
    ui.noteHistory.append(emptyState);
    ui.noteHistorySubtitle.textContent = "Откройте день, добавьте заметку и сохраните её.";
    return;
  }

  ui.noteHistorySubtitle.textContent = `Сохранено ${noteItems.length} ${pluralize(noteItems.length, ["заметка", "заметки", "заметок"])}.`;

  noteItems.forEach(([dateKey, value]) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "note-history-item";
    item.dataset.historyDate = dateKey;

    const title = document.createElement("span");
    title.className = "note-history-date";
    title.textContent = formatHumanDate(dateKey);

    const text = document.createElement("span");
    text.className = "note-history-text";
    text.textContent = value.note;

    item.append(title, text);
    ui.noteHistory.append(item);
  });
}

function renderHolidayList() {
  const holidays = getCurrentMonthHolidays();
  ui.holidayList.innerHTML = "";

  if (holidayStatus.state === "loading" && !holidays.length) {
    const loadingState = document.createElement("div");
    loadingState.className = "holiday-empty";
    loadingState.textContent = "Загружаю праздники для этого месяца...";
    ui.holidayList.append(loadingState);
    ui.holidayListSubtitle.textContent = "Список появится автоматически, как только придут данные.";
    return;
  }

  if (!holidays.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "holiday-empty";
    emptyState.textContent = "В этом месяце официальных праздников не найдено.";
    ui.holidayList.append(emptyState);
    ui.holidayListSubtitle.textContent = "Список загружается автоматически из открытого бесплатного API.";
    return;
  }

  ui.holidayListSubtitle.textContent = `Найдено ${holidays.length} ${pluralize(holidays.length, ["праздник", "праздника", "праздников"])}.`;

  holidays.forEach((holiday) => {
    const card = document.createElement("article");
    card.className = "holiday-item";

    const date = document.createElement("span");
    date.className = "holiday-date";
    date.textContent = formatHumanDate(holiday.date);

    const name = document.createElement("span");
    name.className = "holiday-name";
    name.textContent = holiday.localName || holiday.name;

    card.append(date, name);
    ui.holidayList.append(card);
  });
}

function renderHolidayStatus() {
  ui.holidayStatus.textContent = holidayStatus.message;
  ui.holidayStatus.classList.remove("is-success", "is-warning");

  if (holidayStatus.state === "success") {
    ui.holidayStatus.classList.add("is-success");
  }

  if (holidayStatus.state === "warning") {
    ui.holidayStatus.classList.add("is-warning");
  }
}

async function loadHolidaysForYear(year) {
  const cacheKey = `${COUNTRY_CODE}:${year}`;

  if (holidayCache.has(cacheKey)) {
    holidayStatus = {
      state: "success",
      message: `Праздники на ${year} год уже загружены и доступны даже без интернета.`,
    };
    render();
    return;
  }

  holidayStatus = {
    state: "loading",
    message: `Загружаю официальные праздники на ${year} год...`,
  };
  renderHolidayStatus();

  try {
    const response = await fetch(`${HOLIDAY_API_BASE}/${year}/${COUNTRY_CODE}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const holidays = await response.json();
    holidayCache.set(cacheKey, holidays);
    holidayStatus = {
      state: "success",
      message: `Праздники на ${year} год успешно загружены.`,
    };
  } catch (error) {
    console.error("Не удалось загрузить праздники", error);
    holidayStatus = {
      state: "warning",
      message: holidayCache.size
        ? "Интернет недоступен. Показываю ранее сохранённые праздники."
        : "Не удалось загрузить праздники. Календарь и отметки всё равно продолжают работать.",
    };
  }

  render();
}

function getHolidayByDate(dateKey) {
  const cacheKey = `${COUNTRY_CODE}:${viewDate.getFullYear()}`;
  const yearHolidays = holidayCache.get(cacheKey) || [];
  return yearHolidays.find((holiday) => holiday.date === dateKey);
}

function getCurrentMonthHolidays() {
  const cacheKey = `${COUNTRY_CODE}:${viewDate.getFullYear()}`;
  const monthPrefix = formatMonthPrefix(viewDate.getFullYear(), viewDate.getMonth());
  const yearHolidays = holidayCache.get(cacheKey) || [];
  return yearHolidays.filter((holiday) => holiday.date.startsWith(monthPrefix));
}

function buildDayAriaLabel({
  day,
  month,
  year,
  isWork,
  isNote,
  customProcedureNames = [],
  holiday,
  isWeekend,
  isToday,
}) {
  const parts = [`${day} ${MONTH_GENITIVE[month]} ${year} года`];

  if (isWork) {
    parts.push("смена");
  }

  if (customProcedureNames.length) {
    parts.push(`метки: ${customProcedureNames.join(", ")}`);
  }

  if (!isWork && !customProcedureNames.length) {
    parts.push(isWeekend ? "день без смены, выходной день недели" : "день без смены");
  }

  if (isNote) {
    parts.push("есть заметка");
  }

  if (holiday) {
    parts.push(`официальный праздник ${holiday.localName || holiday.name}`);
  }

  if (isToday) {
    parts.push("сегодня");
  }

  return parts.join(", ");
}

function sanitizeEntries(entries, customProcedures = []) {
  return Object.fromEntries(
    Object.entries(entries)
      .map(([dateKey, value]) => {
        const normalized = sanitizeEntryValue(value);
        return normalized ? [dateKey, normalized] : null;
      })
      .filter(Boolean)
  );
}

function sanitizeEntryValue(value) {
  if (value === "work") {
    return { work: true };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const normalized = {};

  if (value.work) {
    normalized.work = true;
  }

  if (typeof value.note === "string" && value.note.trim()) {
    normalized.note = value.note.trim();
  }

  if (normalized.note && typeof value.noteUpdatedAt === "string") {
    normalized.noteUpdatedAt = value.noteUpdatedAt;
  }

  return Object.keys(normalized).length ? normalized : null;
}

function sanitizeCustomProcedures(procedures) {
  if (!Array.isArray(procedures)) {
    return [];
  }

  const seenIds = new Set();

  return procedures
    .map((procedure, index) => {
      if (!procedure || typeof procedure !== "object") {
        return null;
      }

      const name = normalizeProcedureName(procedure.name);
      if (!name) {
        return null;
      }

      const id =
        typeof procedure.id === "string" && procedure.id.trim()
          ? procedure.id.trim()
          : createStableProcedureId(name, index);
      const color = normalizeHexColor(procedure.color);
      const repeatMode = normalizeRepeatMode(procedure.repeatMode, name);
      const anchorMonthKey = normalizeMonthKey(procedure.anchorMonthKey);

      if (seenIds.has(id)) {
        return null;
      }

      seenIds.add(id);

      return {
        id,
        name,
        color,
        repeatMode,
        anchorMonthKey,
      };
    })
    .filter(Boolean);
}

function sanitizeCustomEvents(events, customProcedures = []) {
  if (!Array.isArray(events)) {
    return [];
  }

  const validProcedureIds = new Set(customProcedures.map((procedure) => procedure.id));
  const seenIds = new Set();

  const procedureById = new Map(customProcedures.map((procedure) => [procedure.id, procedure]));

  return events
    .map((event, index) => {
      if (!event || typeof event !== "object") {
        return null;
      }

      const procedureId = typeof event.procedureId === "string" ? event.procedureId.trim() : "";
      if (!validProcedureIds.has(procedureId)) {
        return null;
      }

      const startDateKey = normalizeDateKey(event.startDateKey);
      if (!startDateKey) {
        return null;
      }

      const id =
        typeof event.id === "string" && event.id.trim()
          ? event.id.trim()
          : createStableProcedureId(`${procedureId}-${startDateKey}`, index);
      if (seenIds.has(id)) {
        return null;
      }
      seenIds.add(id);

      return {
        id,
        procedureId,
        startDateKey,
        repeatMode: normalizeEventRepeatMode(event.repeatMode, procedureById.get(procedureId)?.name || ""),
        deletedOccurrences: sanitizeDeletedOccurrences(event.deletedOccurrences),
      };
    })
    .filter(Boolean);
}

function migrateCustomProcedureScopes(customProcedures, customEvents, fallbackMonthKey) {
  const normalizedFallbackMonth = normalizeMonthKey(fallbackMonthKey) || formatMonthKey(today);
  const migratedProcedures = [];
  const migratedEvents = customEvents.map((event) => ({ ...event, deletedOccurrences: [...event.deletedOccurrences] }));
  const reassignedProcedureIds = new Map();

  customProcedures.forEach((procedure, procedureIndex) => {
    const procedureEvents = migratedEvents.filter((event) => event.procedureId === procedure.id);
    const existingAnchorMonth = normalizeMonthKey(procedure.anchorMonthKey);

    if (existingAnchorMonth) {
      migratedProcedures.push({ ...procedure, anchorMonthKey: existingAnchorMonth });
      return;
    }

    const monthKeys = [...new Set(procedureEvents.map((event) => normalizeMonthKey(event.startDateKey?.slice(0, 7))).filter(Boolean))].sort();

    if (!monthKeys.length) {
      migratedProcedures.push({
        ...procedure,
        anchorMonthKey: normalizedFallbackMonth,
      });
      return;
    }

    const primaryMonthKey = monthKeys[0];
    migratedProcedures.push({
      ...procedure,
      anchorMonthKey: primaryMonthKey,
    });
    reassignedProcedureIds.set(`${procedure.id}:${primaryMonthKey}`, procedure.id);

    monthKeys.slice(1).forEach((monthKey, monthIndex) => {
      const nextProcedureId = createStableProcedureId(`${procedure.id}-${monthKey}`, procedureIndex + monthIndex + 1);
      migratedProcedures.push({
        ...procedure,
        id: nextProcedureId,
        anchorMonthKey: monthKey,
      });
      reassignedProcedureIds.set(`${procedure.id}:${monthKey}`, nextProcedureId);
    });
  });

  migratedEvents.forEach((event) => {
    const occurrenceMonthKey = normalizeMonthKey(event.startDateKey?.slice(0, 7));
    const nextProcedureId = reassignedProcedureIds.get(`${event.procedureId}:${occurrenceMonthKey}`);
    if (nextProcedureId) {
      event.procedureId = nextProcedureId;
    }
  });

  return {
    customProcedures: sanitizeCustomProcedures(migratedProcedures),
    customEvents: sanitizeCustomEvents(migratedEvents, migratedProcedures),
  };
}

function sanitizeDeletedOccurrences(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map(normalizeDateKey).filter(Boolean))];
}

function extractLegacyCustomEvents(entries, customProcedures = []) {
  const validCustomIds = new Set(customProcedures.map((procedure) => procedure.id));
  const legacyManicureId = getLegacyManicureProcedureId(customProcedures);
  const events = [];

  Object.entries(entries || {}).forEach(([dateKey, value]) => {
    const normalizedDateKey = normalizeDateKey(dateKey);
    if (!normalizedDateKey || !value || typeof value !== "object") {
      return;
    }

    const marks = new Set(Array.isArray(value.customMarks) ? value.customMarks.filter((item) => validCustomIds.has(item)) : []);
    if (legacyManicureId && (value.nails || value.manicure)) {
      marks.add(legacyManicureId);
    }

    marks.forEach((procedureId, index) => {
      events.push({
        id: createStableProcedureId(`${procedureId}-${normalizedDateKey}`, index),
        procedureId,
        startDateKey: normalizedDateKey,
        repeatMode: REPEAT_MODE_SINGLE,
        deletedOccurrences: [],
      });
    });
  });

  return events;
}

function hasLegacyManicureEntries(entries) {
  return Object.values(entries).some((value) => {
    if (value === "nails" || value === "manicure") {
      return true;
    }

    return Boolean(value && typeof value === "object" && (value.nails || value.manicure));
  });
}

function ensureLegacyManicureProcedure(procedures, shouldAdd) {
  if (!shouldAdd) {
    return procedures;
  }

  const existing = procedures.find(
    (procedure) =>
      procedure.id === LEGACY_MANICURE_PROCEDURE.id ||
      normalizeProcedureKey(procedure.name) === normalizeProcedureKey(LEGACY_MANICURE_PROCEDURE.name)
  );

  if (existing) {
    if (!existing.color) {
      existing.color = LEGACY_MANICURE_PROCEDURE.color;
    }
    return procedures;
  }

  return [LEGACY_MANICURE_PROCEDURE, ...procedures];
}

function normalizeBrushId(brushId) {
  if (brushId === "nails" || brushId === "manicure") {
    const legacyProcedure = getLegacyManicureProcedure();
    return legacyProcedure ? `custom:${legacyProcedure.id}` : "work";
  }

  if (["work", "clear"].includes(brushId)) {
    return brushId;
  }

  if (isCustomBrushId(brushId)) {
    const procedureId = brushId.replace("custom:", "");
    if (getProcedureById(procedureId)) {
      return brushId;
    }
  }

  return "work";
}

function isCustomBrushId(value) {
  return typeof value === "string" && value.startsWith("custom:");
}

function setActiveBrush(brushId) {
  activeBrush = normalizeBrushId(brushId);
  renderBrushPicker();
  renderCustomBrushes();
  renderCustomProcedureFormState();
  persistState();
}

function addOrUpdateCustomProcedure() {
  const name = normalizeProcedureName(ui.customProcedureName.value);
  if (!name) {
    ui.customProcedureName.focus();
    return;
  }

  const color = normalizeHexColor(ui.customProcedureColor.value);
  const repeatMode = normalizeRepeatMode(ui.customProcedureRepeat.value, name);
  const anchorMonthKey = formatMonthKey(viewDate);
  const existing = initialState.customProcedures.find(
    (procedure) =>
      normalizeProcedureKey(procedure.name) === normalizeProcedureKey(name) &&
      normalizeMonthKey(procedure.anchorMonthKey) === anchorMonthKey &&
      normalizeRepeatMode(procedure.repeatMode, procedure.name) === repeatMode
  );

  if (existing) {
    activeBrush = `custom:${existing.id}`;
    ui.customProcedureName.value = "";
    ui.customProcedureColor.value = DEFAULT_CUSTOM_COLOR;
    persistState();
    render();
    return;
  }

  if (initialState.customProcedures.length >= MAX_CUSTOM_PROCEDURES) {
    window.alert(`Можно сохранить до ${MAX_CUSTOM_PROCEDURES} своих меток.`);
    return;
  }

  const procedure = {
    id: createProcedureId(),
    name,
    color,
    repeatMode,
    anchorMonthKey,
  };
  initialState.customProcedures.push(procedure);
  activeBrush = `custom:${procedure.id}`;

  ui.customProcedureName.value = "";
  ui.customProcedureColor.value = DEFAULT_CUSTOM_COLOR;
  ui.customProcedureRepeat.value = REPEAT_MODE_SINGLE;
  maybeNotifyBirthdayRule(procedure);
  persistState();
  render();
}

function deleteActiveCustomProcedure() {
  const activeProcedure = getActiveCustomProcedure();
  if (!activeProcedure) {
    return;
  }

  const confirmed = window.confirm(
    `Удалить метку «${activeProcedure.name}» и убрать её отметки из календаря?`
  );

  if (!confirmed) {
    return;
  }

  initialState.customProcedures = initialState.customProcedures.filter(
    (procedure) => procedure.id !== activeProcedure.id
  );

  initialState.customEvents = initialState.customEvents.filter((event) => event.procedureId !== activeProcedure.id);

  activeBrush = "work";
  ui.customProcedureName.value = "";
  ui.customProcedureColor.value = DEFAULT_CUSTOM_COLOR;
  ui.customProcedureRepeat.value = REPEAT_MODE_SINGLE;
  persistState();
  render();
}

function createProcedureId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `proc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createStableProcedureId(name, index) {
  return `proc-${hashString(`${name}-${index}`)}`;
}

function hashString(value) {
  let hash = 0;

  for (const char of value) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

function normalizeProcedureName(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizeProcedureKey(value) {
  return normalizeProcedureName(value).toLocaleLowerCase("ru-RU");
}

function normalizeHexColor(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : DEFAULT_CUSTOM_COLOR;
}

function getReadableTextColor(color) {
  const normalized = normalizeHexColor(color);
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  const brightness = red * 0.299 + green * 0.587 + blue * 0.114;
  return brightness > 176 ? "#1f1a2f" : "#ffffff";
}

function setEntry(dateKey, entry) {
  const normalized = sanitizeEntryValue(entry);
  if (normalized) {
    initialState.entries[dateKey] = normalized;
  } else {
    delete initialState.entries[dateKey];
  }
}

function getProcedureById(procedureId) {
  return initialState.customProcedures.find((procedure) => procedure.id === procedureId) || null;
}

function getLegacyManicureProcedureId(customProcedures = initialState.customProcedures) {
  const procedure = customProcedures.find(
    (item) =>
      item.id === LEGACY_MANICURE_PROCEDURE.id ||
      normalizeProcedureKey(item.name) === normalizeProcedureKey(LEGACY_MANICURE_PROCEDURE.name)
  );
  return procedure ? procedure.id : null;
}

function getLegacyManicureProcedure() {
  const legacyId = getLegacyManicureProcedureId();
  return legacyId ? getProcedureById(legacyId) : null;
}

function getActiveCustomProcedure() {
  return isCustomBrushId(activeBrush) ? getProcedureById(activeBrush.replace("custom:", "")) : null;
}

function getVisibleCustomProcedures() {
  const currentMonthKey = formatMonthKey(viewDate);
  return initialState.customProcedures.filter((procedure) => isProcedureVisibleInMonth(procedure, currentMonthKey));
}

function isProcedureVisibleInMonth(procedure, monthKey) {
  const anchorMonthKey = normalizeMonthKey(procedure.anchorMonthKey) || monthKey;
  if (procedure.repeatMode === REPEAT_MODE_CARRY) {
    return monthKey >= anchorMonthKey;
  }

  if (procedure.repeatMode === REPEAT_MODE_BIRTHDAY) {
    return monthKey.slice(5, 7) === anchorMonthKey.slice(5, 7);
  }

  return monthKey === anchorMonthKey;
}

function getRepeatModeLabel(repeatMode) {
  if (repeatMode === REPEAT_MODE_CARRY) {
    return "в следующих месяцах";
  }

  if (repeatMode === REPEAT_MODE_BIRTHDAY) {
    return "раз в год";
  }

  return "только месяц";
}

function normalizeRepeatMode(value, name = "") {
  if (isBirthdayProcedureName(name)) {
    return REPEAT_MODE_BIRTHDAY;
  }

  return [REPEAT_MODE_SINGLE, REPEAT_MODE_CARRY, REPEAT_MODE_BIRTHDAY].includes(value) ? value : REPEAT_MODE_SINGLE;
}

function normalizeEventRepeatMode(value, name = "") {
  return normalizeRepeatMode(value, name) === REPEAT_MODE_BIRTHDAY ? REPEAT_MODE_BIRTHDAY : REPEAT_MODE_SINGLE;
}

function normalizeMonthKey(value) {
  return /^\d{4}-\d{2}$/.test(String(value || "").trim()) ? String(value).trim() : null;
}

function normalizeDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim()) ? String(value).trim() : null;
}

function isBirthdayProcedureName(name) {
  return /^ДР\b/i.test(normalizeProcedureName(name));
}

function syncBirthdayRepeatMode() {
  if (isBirthdayProcedureName(ui.customProcedureName.value)) {
    ui.customProcedureRepeat.value = REPEAT_MODE_BIRTHDAY;
  }
}

function maybeNotifyBirthdayRule(procedure) {
  if (procedure.repeatMode === REPEAT_MODE_BIRTHDAY) {
    window.alert("Метка с префиксом «ДР» будет повторяться каждый год в этом месяце.");
  }
}

function getProceduresForDate(dateKey) {
  return getCustomEventInstancesForDate(dateKey)
    .map(({ procedure }) => procedure)
    .filter(Boolean);
}

function getPrimaryProcedure(procedures) {
  return procedures[0] || null;
}

function getCustomEventInstancesForDate(dateKey) {
  return initialState.customEvents
    .map((event) => {
      const occurrenceDateKey = getEventOccurrenceDateKey(event, dateKey);
      if (!occurrenceDateKey || occurrenceDateKey !== dateKey) {
        return null;
      }

      const procedure = getProcedureById(event.procedureId);
      if (!procedure) {
        return null;
      }

      return { event, procedure };
    })
    .filter(Boolean);
}

function getEventOccurrenceDateKey(event, targetDateKey) {
  if (!event || !event.startDateKey) {
    return null;
  }

  if (event.deletedOccurrences.includes(targetDateKey)) {
    return null;
  }

  return getEventOccurrenceDateKeyIgnoringExceptions(event, targetDateKey);
}

function getEventOccurrenceDateKeyIgnoringExceptions(event, targetDateKey) {
  if (!event || !event.startDateKey) {
    return null;
  }

  if (event.repeatMode === REPEAT_MODE_SINGLE) {
    return event.startDateKey === targetDateKey ? targetDateKey : null;
  }

  const targetDate = parseDateKey(targetDateKey);
  const startDate = parseDateKey(event.startDateKey);
  if (!targetDate || !startDate) {
    return null;
  }

  if (event.repeatMode === REPEAT_MODE_BIRTHDAY) {
    if (targetDate.getMonth() !== startDate.getMonth()) {
      return null;
    }
    const occurrence = getClampedDateKey(targetDate.getFullYear(), targetDate.getMonth(), startDate.getDate());
    return occurrence === targetDateKey ? occurrence : null;
  }

  return null;
}

function getClampedDateKey(year, monthIndex, desiredDay) {
  const maxDay = new Date(year, monthIndex + 1, 0).getDate();
  return formatDateKey(year, monthIndex, Math.min(desiredDay, maxDay));
}

function parseDateKey(dateKey) {
  const normalized = normalizeDateKey(dateKey);
  if (!normalized) {
    return null;
  }
  const [year, month, day] = normalized.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function createCustomEvent(procedureId, dateKey, repeatMode) {
  return {
    id: createProcedureId(),
    procedureId,
    startDateKey: dateKey,
    repeatMode: normalizeEventRepeatMode(repeatMode),
    deletedOccurrences: [],
  };
}

function clearCustomMarksForDate(dateKey) {
  const instances = getCustomEventInstancesForDate(dateKey);
  if (!instances.length) {
    return;
  }

  instances.forEach(({ event }) => {
    if (event.repeatMode === REPEAT_MODE_SINGLE) {
      initialState.customEvents = initialState.customEvents.filter((item) => item.id !== event.id);
      return;
    }

    if (!event.deletedOccurrences.includes(dateKey)) {
      event.deletedOccurrences = [...event.deletedOccurrences, dateKey];
    }
  });
}

function toggleCustomProcedureOnDate(dateKey, procedureId) {
  const procedure = getProcedureById(procedureId);
  if (!procedure) {
    return;
  }

  const existingInstance = getCustomEventInstancesForDate(dateKey).find(({ procedure: item }) => item.id === procedureId);
  if (existingInstance) {
    removeCustomEventInstance(existingInstance.event, dateKey);
    return;
  }

  const suppressedInstance = initialState.customEvents.find(
    (event) =>
      event.procedureId === procedureId &&
      event.deletedOccurrences.includes(dateKey) &&
      getEventOccurrenceDateKeyIgnoringExceptions(event, dateKey) === dateKey
  );

  if (suppressedInstance) {
    suppressedInstance.deletedOccurrences = suppressedInstance.deletedOccurrences.filter((item) => item !== dateKey);
    return;
  }

  initialState.customEvents.push(createCustomEvent(procedureId, dateKey, procedure.repeatMode));
}

function removeCustomEventInstance(event, dateKey) {
  if (event.repeatMode === REPEAT_MODE_SINGLE) {
    initialState.customEvents = initialState.customEvents.filter((item) => item.id !== event.id);
    return;
  }

  const choice = window.prompt(
    "Удалить метку:\n1 — только на этой дате\n2 — удалить серию во всех месяцах\n0 — отмена",
    "1"
  );

  if (choice === "2") {
    initialState.customEvents = initialState.customEvents.filter((item) => item.id !== event.id);
    return;
  }

  if (choice === "1") {
    if (!event.deletedOccurrences.includes(dateKey)) {
      event.deletedOccurrences = [...event.deletedOccurrences, dateKey];
    }
  }
}

function getVisibleDateKeysForMonth() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => formatDateKey(year, month, index + 1));
}

function renderCustomProcedureFormState() {
  const activeProcedure = getActiveCustomProcedure();
  if (!ui.customProcedureName.value.trim()) {
    ui.customProcedureColor.value = DEFAULT_CUSTOM_COLOR;
  }

  ui.addCustomProcedureButton.textContent = "Добавить метку";
  ui.addCustomProcedureButton.disabled = initialState.customProcedures.length >= MAX_CUSTOM_PROCEDURES;
  ui.addCustomProcedureButton.title =
    initialState.customProcedures.length >= MAX_CUSTOM_PROCEDURES
      ? `Достигнут предел: ${MAX_CUSTOM_PROCEDURES} меток`
      : "";
  ui.customBrushEmpty.textContent = getVisibleCustomProcedures().length
    ? ""
    : "Пока нет своих меток.";
  ui.customHint.textContent =
    `Открыт ${formatMonthKey(viewDate)}. Переносимые метки остаются в следующих месяцах, но дни в них нужно выбирать заново. «ДР» повторяются раз в год.`;
  ui.deleteCustomProcedureButton.textContent = activeProcedure
    ? `Удалить метку «${activeProcedure.name}»`
    : "Удалить выбранную метку";
  ui.deleteCustomProcedureButton.hidden = !activeProcedure;
}

async function refreshApplicationPreservingData() {
  ui.refreshAppButton.disabled = true;
  ui.refreshAppButton.textContent = "Обновляю...";

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.update()));
    }

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.error("Не удалось полностью обновить приложение", error);
  }

  window.location.reload();
}

function exportDataBackup() {
  const payload = {
    app: "I LOVE MY WORK",
    version: 1,
    exportedAt: new Date().toISOString(),
    storageKey: STORAGE_KEY,
    themeKey: THEME_STORAGE_KEY,
    state: {
      entries: initialState.entries,
      holidaysCache: Object.fromEntries(holidayCache.entries()),
      customProcedures: initialState.customProcedures,
      customEvents: initialState.customEvents,
      lastViewedMonth: formatMonthKey(viewDate),
      lastBrush: activeBrush,
      selectedDateKey,
    },
    theme,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `i-love-my-work-backup-${dateStamp}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importDataBackup(file) {
  try {
    const text = await file.text();
    const payload = JSON.parse(text);

    if (!payload || typeof payload !== "object" || !payload.state || typeof payload.state !== "object") {
      throw new Error("Некорректный файл");
    }

    const confirmed = window.confirm(
      "Загрузить этот файл и заменить текущие локальные данные на этом устройстве?"
    );

    if (!confirmed) {
      return;
    }

    let customProcedures = ensureLegacyManicureProcedure(
      sanitizeCustomProcedures(payload.state.customProcedures || []),
      hasLegacyManicureEntries(payload.state.entries || {})
    );
    let customEvents = sanitizeCustomEvents(
      payload.state.customEvents || extractLegacyCustomEvents(payload.state.entries || {}, customProcedures),
      customProcedures
    );
    ({ customProcedures, customEvents } = migrateCustomProcedureScopes(
      customProcedures,
      customEvents,
      payload.state.lastViewedMonth || formatMonthKey(today)
    ));

    const restoredState = {
      entries: sanitizeEntries(payload.state.entries || {}, customProcedures),
      holidaysCache: payload.state.holidaysCache || {},
      customProcedures,
      customEvents,
      lastViewedMonth: payload.state.lastViewedMonth || null,
      lastBrush: payload.state.lastBrush || "work",
      selectedDateKey: payload.state.selectedDateKey || null,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(restoredState));

    if (payload.theme === "light" || payload.theme === "dark") {
      localStorage.setItem(THEME_STORAGE_KEY, payload.theme);
    }

    window.location.reload();
  } catch (error) {
    console.error("Не удалось загрузить резервную копию", error);
    window.alert("Не удалось загрузить файл. Проверьте, что это JSON-резервная копия приложения.");
  }
}

function buildSelectedDayCopy(entry, customProcedures, holiday) {
  const parts = [];

  if (entry.note) {
    parts.push("Есть сохранённая заметка.");
  }

  if (holiday) {
    parts.push(`Официальный праздник: ${holiday.localName || holiday.name}.`);
  }

  return parts.join(" ");
}

function withAlpha(color, alpha) {
  const hex = normalizeHexColor(color).replace("#", "");
  const channels = [0, 2, 4].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  return `rgba(${channels.join(", ")}, ${alpha})`;
}

function capitalizeColorName(color) {
  const name = getColorName(color);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getColorName(color) {
  const hex = normalizeHexColor(color).replace("#", "");
  const [r, g, b] = [0, 2, 4].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  const { h, s, l } = rgbToHsl(r, g, b);

  if (s < 0.1) {
    if (l > 0.88) return "белый";
    if (l < 0.24) return "чёрный";
    return "серый";
  }

  if (h < 15 || h >= 345) return "красный";
  if (h < 40) return "оранжевый";
  if (h < 58) return "золотой";
  if (h < 70) return "жёлтый";
  if (h < 150) return "зелёный";
  if (h < 185) return "бирюзовый";
  if (h < 220) return "голубой";
  if (h < 255) return "синий";
  if (h < 290) return "фиолетовый";
  if (h < 335) return l > 0.68 ? "розовый" : "малиновый";
  return "розовый";
}

function rgbToHsl(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case red:
        hue = (green - blue) / delta + (green < blue ? 6 : 0);
        break;
      case green:
        hue = (blue - red) / delta + 2;
        break;
      default:
        hue = (red - green) / delta + 4;
        break;
    }

    hue *= 60;
  }

  return { h: hue, s: saturation, l: lightness };
}

function loadTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function persistTheme() {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function applyTheme(nextTheme) {
  document.documentElement.dataset.theme = nextTheme;
  if (ui.themeColorMeta) {
    ui.themeColorMeta.setAttribute("content", nextTheme === "dark" ? "#1a1724" : "#e7e0fb");
  }
}

function renderThemeToggle() {
  ui.themeToggleButton.textContent = theme === "dark" ? "Светлый режим" : "Тёмный режим";
}

function loadFortuneState() {
  try {
    const raw = localStorage.getItem(FORTUNE_STATE_KEY);
    if (!raw) {
      return createDefaultFortuneState();
    }

    const parsed = JSON.parse(raw);
    return ensureFortuneStateForToday({
      dateKey: normalizeDateKey(parsed.dateKey) || formatDateKey(today.getFullYear(), today.getMonth(), today.getDate()),
      cracks: Math.max(0, Math.min(FORTUNE_CLICKS_TO_OPEN, Number.parseInt(parsed.cracks, 10) || 0)),
      revealed: Boolean(parsed.revealed),
    });
  } catch (error) {
    console.error("Не удалось прочитать состояние письма дня", error);
    return createDefaultFortuneState();
  }
}

function createDefaultFortuneState() {
  return {
    dateKey: formatDateKey(today.getFullYear(), today.getMonth(), today.getDate()),
    cracks: 0,
    revealed: false,
  };
}

function ensureFortuneStateForToday(state) {
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  if (!state || state.dateKey !== todayKey) {
    const nextState = createDefaultFortuneState();
    persistFortuneState(nextState);
    return nextState;
  }

  return {
    dateKey: todayKey,
    cracks: Math.max(0, Math.min(FORTUNE_CLICKS_TO_OPEN, Number.parseInt(state.cracks, 10) || 0)),
    revealed: Boolean(state.revealed),
  };
}

function persistFortuneState(state = dailyFortuneState) {
  localStorage.setItem(FORTUNE_STATE_KEY, JSON.stringify(state));
}

function crackFortuneCookie() {
  dailyFortuneState = ensureFortuneStateForToday(dailyFortuneState);
  if (dailyFortuneState.revealed) {
    return;
  }

  const nextCracks = Math.min(FORTUNE_CLICKS_TO_OPEN, (dailyFortuneState.cracks || 0) + 1);
  dailyFortuneState = {
    ...dailyFortuneState,
    cracks: nextCracks,
    revealed: nextCracks >= FORTUNE_CLICKS_TO_OPEN,
  };
  persistFortuneState();
  renderQuote();
}

function openSecretFortuneReset() {
  const password = window.prompt("Введите пароль, чтобы снова показать конверт дня.");
  if (password === null) {
    return;
  }

  if (password !== FORTUNE_TEST_PASSWORD) {
    window.alert("Неверный пароль.");
    return;
  }

  dailyFortuneState = createDefaultFortuneState();
  persistFortuneState();
  renderQuote();
  window.alert("Конверт дня снова закрыт. Теперь можно проверить открытие.");
}

async function initializeQuote() {
  try {
    const quotes = await loadQuotePool();
    currentQuote = getPredictionForDate(quotes, today);
  } catch (error) {
    console.error("Не удалось подготовить предсказание дня", error);
    currentQuote = getPredictionForDate(PREDICTION_FALLBACK, today);
  }

  renderQuote();
}

async function loadQuotePool() {
  if (!quotePoolPromise) {
    quotePoolPromise = fetch(PREDICTION_DATA_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
      })
      .then((payload) => sanitizeQuotePool(payload));
  }

  return quotePoolPromise;
}

function sanitizeQuotePool(payload) {
  const quotes = Array.isArray(payload) ? payload.map(normalizeQuote).filter(Boolean) : [];
  const uniqueQuotes = [...new Set(quotes)];
  return uniqueQuotes.length ? uniqueQuotes : PREDICTION_FALLBACK;
}

function normalizeQuote(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function getPredictionForDate(pool, date) {
  const quotes = sanitizeQuotePool(pool);
  if (!quotes.length) {
    return "";
  }

  const dayOfYear = getDayOfYear(date);
  const year = date.getFullYear();
  const orderedIndices = shuffleIndicesWithSeed(quotes.length, `${year}-predictions`);
  const nextIndex = orderedIndices[(dayOfYear - 1) % orderedIndices.length] ?? 0;
  return quotes[nextIndex];
}

function shuffleIndicesWithSeed(length, seedSource) {
  const indices = Array.from({ length }, (_, index) => index);
  let seed = Math.abs(hashString(seedSource)) || 1;

  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let index = indices.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [indices[index], indices[randomIndex]] = [indices[randomIndex], indices[index]];
  }

  return indices;
}

function getDayOfYear(date) {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date - startOfYear;
  return Math.floor(diff / 86400000);
}

function ensureMonthInView() {
  const [year, month] = selectedDateKey.split("-").map(Number);
  if (year !== viewDate.getFullYear() || month - 1 !== viewDate.getMonth()) {
    selectedDateKey = formatDateKey(viewDate.getFullYear(), viewDate.getMonth(), 1);
  }
}

function parseMonthKey(value) {
  if (!value) {
    return null;
  }

  const [year, month] = value.split("-").map(Number);
  if (!year || !month) {
    return null;
  }

  return new Date(year, month - 1, 1);
}

function formatMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthPrefix(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function formatDateKey(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatHumanDate(dateKey) {
  const [year, monthNumber, dayNumber] = dateKey.split("-").map(Number);
  const date = new Date(year, monthNumber - 1, dayNumber);
  return `${dayNumber} ${MONTH_GENITIVE[date.getMonth()]} (${DAY_NAMES[date.getDay()]})`;
}

function formatTodayHeadline(date) {
  const dayName = DAY_NAMES[date.getDay()];
  return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${date.getDate()} ${MONTH_GENITIVE[date.getMonth()]} ${date.getFullYear()}`;
}

function pluralize(number, forms) {
  const mod10 = number % 10;
  const mod100 = number % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return forms[0];
  }

  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return forms[1];
  }

  return forms[2];
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Не удалось зарегистрировать service worker", error);
    });
  });
}
