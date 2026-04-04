const STORAGE_KEY = "shift-calendar-v1";
const THEME_STORAGE_KEY = "shift-calendar-theme-v1";
const LEGACY_QUOTE_STORAGE_KEY = "shift-calendar-last-quote-v1";
const PREDICTION_DATA_URL = "./predictions.json";
const HOLIDAY_API_BASE = "https://date.nager.at/api/v3/PublicHolidays";
const COUNTRY_CODE = "RU";
const DEFAULT_CUSTOM_COLOR = "#7fa8ff";
const MAX_CUSTOM_PROCEDURES = 20;
const LEGACY_MANICURE_PROCEDURE = {
  id: "legacy-manicure",
  name: "Маникюр",
  color: "#e493cb",
};
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const DAY_NAMES = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const PREDICTION_FALLBACK = [
  "Сегодня случится что-то небольшое, но очень приятное.",
  "Сегодня удачное решение придёт спокойнее, чем ты ожидала.",
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
const MONTHLY_BLOOMS = [
  { name: "морозник", shape: "droop", petal: "#d9d0ea", accent: "#b9aad7", stem: "#c7bfdc" },
  { name: "подснежник", shape: "bell", petal: "#edf4ff", accent: "#cddcf7", stem: "#b9d0c0" },
  { name: "крокус", shape: "cup", petal: "#c8b3ec", accent: "#9f85d8", stem: "#a9c8ad" },
  { name: "тюльпан", shape: "tulip", petal: "#f1b5c6", accent: "#d789a2", stem: "#9fc3a3" },
  { name: "ландыш", shape: "cluster", petal: "#f8fbff", accent: "#d9e6d9", stem: "#a9c9aa" },
  { name: "ирис", shape: "iris", petal: "#bca9ef", accent: "#9270d0", stem: "#9fbfa6" },
  { name: "ромашка", shape: "daisy", petal: "#fffaf1", accent: "#f2c96b", stem: "#a8c89e" },
  { name: "подсолнух", shape: "sun", petal: "#f4cd62", accent: "#c18a2a", stem: "#a8c27c" },
  { name: "георгин", shape: "rosette", petal: "#e7a6bd", accent: "#c76c96", stem: "#a8bc9a" },
  { name: "хризантема", shape: "burst", petal: "#f2c28d", accent: "#cd8a43", stem: "#b1b58f" },
  { name: "астра", shape: "star", petal: "#caa7e5", accent: "#9a72c1", stem: "#b0b6a1" },
  { name: "камелия", shape: "camellia", petal: "#eab6c6", accent: "#cf7c98", stem: "#b7c0ad" },
];

const ui = {
  holidayStatus: document.querySelector("#holidayStatus"),
  legendStrip: document.querySelector("#legendStrip"),
  monthLabel: document.querySelector("#monthLabel"),
  todayDateLabel: document.querySelector("#todayDateLabel"),
  quoteText: document.querySelector("#quoteText"),
  brushPicker: document.querySelector("#brushPicker"),
  customBrushList: document.querySelector("#customBrushList"),
  customBrushEmpty: document.querySelector("#customBrushEmpty"),
  customProcedureName: document.querySelector("#customProcedureName"),
  customProcedureColor: document.querySelector("#customProcedureColor"),
  addCustomProcedureButton: document.querySelector("#addCustomProcedureButton"),
  deleteCustomProcedureButton: document.querySelector("#deleteCustomProcedureButton"),
  exportDataButton: document.querySelector("#exportDataButton"),
  importDataButton: document.querySelector("#importDataButton"),
  importDataInput: document.querySelector("#importDataInput"),
  refreshAppButton: document.querySelector("#refreshAppButton"),
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
        lastViewedMonth: null,
        lastBrush: "work",
        selectedDateKey: null,
      };
    }

    const parsed = JSON.parse(raw);
    const customProcedures = ensureLegacyManicureProcedure(
      sanitizeCustomProcedures(parsed.customProcedures || []),
      hasLegacyManicureEntries(parsed.entries || {})
    );
    return {
      entries: sanitizeEntries(parsed.entries || {}, customProcedures),
      holidaysCache: parsed.holidaysCache || {},
      customProcedures,
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

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }

    window.location.reload();
  });

  ui.refreshAppButton.addEventListener("click", async () => {
    await refreshApplicationPreservingData();
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
      delete currentEntry.manicure;
      delete currentEntry.customMarks;
      setEntry(dateKey, currentEntry);
    } else if (isCustomBrushId(activeBrush)) {
      const procedureId = activeBrush.replace("custom:", "");
      const currentMarks = new Set(Array.isArray(currentEntry.customMarks) ? currentEntry.customMarks : []);
      if (currentMarks.has(procedureId)) {
        currentMarks.delete(procedureId);
      } else {
        currentMarks.add(procedureId);
      }
      currentEntry.customMarks = [...currentMarks];
      setEntry(dateKey, currentEntry);
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

function renderTodayDate() {
  ui.todayDateLabel.textContent = formatTodayHeadline(today);
}

function renderLegend() {
  ui.legendStrip.innerHTML = "";

  const items = [
    { tone: "work", label: "Красный — смена" },
    { tone: "note", label: "Жёлтый — заметка" },
    { tone: "holiday", label: "Золотой ромб — праздник" },
    ...initialState.customProcedures.map((procedure) => ({
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
  ui.quoteText.textContent = currentQuote;
}

function renderMonthHeading() {
  const formatter = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });
  const monthText = formatter.format(viewDate);
  ui.monthLabel.textContent = monthText.charAt(0).toUpperCase() + monthText.slice(1);
  applyMonthlyBloomBackdrop(viewDate.getMonth());
}

function applyMonthlyBloomBackdrop(monthIndex) {
  const bloom = MONTHLY_BLOOMS[monthIndex] || MONTHLY_BLOOMS[today.getMonth()];
  const root = document.documentElement;
  root.style.setProperty("--month-flower-left", buildMonthlyBloomDataUrl(bloom, "left"));
  root.style.setProperty("--month-flower-right", buildMonthlyBloomDataUrl(bloom, "right"));
}

function buildMonthlyBloomDataUrl(bloom, side) {
  const width = 360;
  const height = 560;
  const groupStart = side === "right" ? `<g transform="translate(${width} 0) scale(-1 1)">` : "<g>";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="none">
      <g opacity="0.92">
        <circle cx="112" cy="172" r="112" fill="${withAlpha(bloom.petal, 0.13)}" />
        <circle cx="206" cy="318" r="132" fill="${withAlpha(bloom.accent, 0.08)}" />
      </g>
      ${groupStart}
        <g stroke="${withAlpha(bloom.stem, 0.62)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M92 528C98 456 124 408 170 352" />
          <path d="M152 544C156 470 198 404 250 320" />
          <path d="M118 438C136 434 150 422 160 404" />
          <path d="M180 396C204 394 222 382 232 364" />
        </g>
        <g fill="${withAlpha(bloom.stem, 0.18)}">
          <ellipse cx="132" cy="428" rx="22" ry="10" transform="rotate(-24 132 428)" />
          <ellipse cx="208" cy="384" rx="24" ry="10" transform="rotate(18 208 384)" />
        </g>
        ${buildFlowerShape(bloom, side)}
      </g>
    </svg>
  `;

  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}")`;
}

function buildFlowerShape(bloom, side) {
  const primaryX = side === "right" ? 198 : 172;
  const secondaryX = side === "right" ? 246 : 230;

  switch (bloom.shape) {
    case "bell":
      return `${buildBellCluster(primaryX, 336, bloom, 1)}${buildBellCluster(secondaryX, 300, bloom, 0.86)}`;
    case "cup":
      return `${buildCupFlower(primaryX, 336, bloom, 1)}${buildCupFlower(secondaryX, 298, bloom, 0.82)}`;
    case "tulip":
      return `${buildTulipFlower(primaryX, 336, bloom)}${buildTulipFlower(secondaryX, 294, bloom, 0.82)}`;
    case "cluster":
      return `${buildLilyCluster(primaryX, 332, bloom)}${buildLilyCluster(secondaryX, 294, bloom, 0.82)}`;
    case "iris":
      return `${buildIrisFlower(primaryX, 334, bloom)}${buildIrisFlower(secondaryX, 294, bloom, 0.82)}`;
    case "daisy":
      return `${buildRadialFlower(primaryX, 336, 38, 10, bloom, { center: 12, width: 7, length: 24 })}${buildRadialFlower(
        secondaryX,
        296,
        30,
        10,
        bloom,
        { center: 9, width: 6, length: 18 }
      )}`;
    case "sun":
      return `${buildRadialFlower(primaryX, 334, 42, 14, bloom, { center: 13, width: 8, length: 26 })}${buildRadialFlower(
        secondaryX,
        292,
        31,
        12,
        bloom,
        { center: 10, width: 7, length: 19 }
      )}`;
    case "rosette":
      return `${buildRosetteFlower(primaryX, 336, 40, bloom)}${buildRosetteFlower(secondaryX, 294, 30, bloom)}`;
    case "burst":
      return `${buildBurstFlower(primaryX, 334, 40, bloom)}${buildBurstFlower(secondaryX, 294, 30, bloom)}`;
    case "star":
      return `${buildRadialFlower(primaryX, 334, 38, 8, bloom, { center: 10, width: 5, length: 24 })}${buildRadialFlower(
        secondaryX,
        294,
        29,
        8,
        bloom,
        { center: 8, width: 4, length: 18 }
      )}`;
    case "camellia":
      return `${buildCamelliaFlower(primaryX, 334, 38, bloom)}${buildCamelliaFlower(secondaryX, 294, 29, bloom)}`;
    case "droop":
    default:
      return `${buildDroopFlower(primaryX, 334, bloom)}${buildDroopFlower(secondaryX, 294, bloom, 0.82)}`;
  }
}

function buildDroopFlower(x, y, bloom, scale = 1) {
  const petal = 15 * scale;
  return `
    <g transform="translate(${x} ${y}) rotate(-14)">
      <ellipse cx="0" cy="6" rx="${petal}" ry="${petal * 1.22}" fill="${withAlpha(bloom.petal, 0.34)}" stroke="${withAlpha(
    bloom.accent,
    0.56
  )}" stroke-width="1.4" />
      <ellipse cx="-11" cy="1" rx="${petal * 0.72}" ry="${petal}" fill="${withAlpha(bloom.petal, 0.26)}" />
      <ellipse cx="11" cy="1" rx="${petal * 0.72}" ry="${petal}" fill="${withAlpha(bloom.petal, 0.26)}" />
      <circle cx="0" cy="6" r="${4.5 * scale}" fill="${withAlpha(bloom.accent, 0.5)}" />
    </g>
  `;
}

function buildBellCluster(x, y, bloom, scale = 1) {
  const width = 15 * scale;
  const height = 20 * scale;
  return `
    <g stroke="${withAlpha(bloom.stem, 0.58)}" stroke-width="2.2" stroke-linecap="round">
      <path d="M${x} ${y - 38 * scale} C ${x - 6} ${y - 24 * scale}, ${x - 10} ${y - 16 * scale}, ${x - 14} ${y - 2 * scale}" />
      <path d="M${x} ${y - 38 * scale} C ${x + 4} ${y - 22 * scale}, ${x + 10} ${y - 18 * scale}, ${x + 14} ${y - 2 * scale}" />
    </g>
    <g fill="${withAlpha(bloom.petal, 0.34)}" stroke="${withAlpha(bloom.accent, 0.52)}" stroke-width="1.2">
      <path d="M${x - 14 * scale} ${y - 2 * scale} q ${width * 0.65} ${height * 0.2} ${width * 1.3} 0 q -1 ${height * 0.82} -${width * 0.65} ${height} q -${width * 0.65} -${height * 0.18} -${width * 0.65} -${height}z" />
      <path d="M${x + 2 * scale} ${y - 2 * scale} q ${width * 0.62} ${height * 0.2} ${width * 1.24} 0 q -1 ${height * 0.78} -${width * 0.62} ${height * 0.96} q -${width * 0.62} -${height * 0.18} -${width * 0.62} -${height * 0.96}z" />
    </g>
  `;
}

function buildCupFlower(x, y, bloom) {
  return `
    <g transform="translate(${x} ${y})">
      <path d="M-18 10 C -16 -18, 16 -18, 18 10 C 8 22, -8 22, -18 10Z" fill="${withAlpha(
        bloom.petal,
        0.3
      )}" stroke="${withAlpha(bloom.accent, 0.54)}" stroke-width="1.4" />
      <path d="M-12 8 C -8 -10, -2 -18, 2 2" stroke="${withAlpha(bloom.accent, 0.34)}" stroke-width="1.1" fill="none" />
      <path d="M12 8 C 8 -10, 2 -18, -2 2" stroke="${withAlpha(bloom.accent, 0.34)}" stroke-width="1.1" fill="none" />
      <circle cx="0" cy="7" r="4" fill="${withAlpha(bloom.accent, 0.44)}" />
    </g>
  `;
}

function buildTulipFlower(x, y, bloom, scale = 1) {
  return `
    <g transform="translate(${x} ${y}) scale(${scale})">
      <path d="M-20 10 C -18 -12, -10 -18, -3 -8 C 0 -22, 6 -22, 9 -8 C 16 -18, 24 -12, 20 10 C 8 20, -8 20, -20 10Z" fill="${withAlpha(
        bloom.petal,
        0.32
      )}" stroke="${withAlpha(bloom.accent, 0.56)}" stroke-width="1.4" />
    </g>
  `;
}

function buildLilyCluster(x, y, bloom, scale = 1) {
  const bells = [
    { dx: -12, dy: 0, r: -10 },
    { dx: 2, dy: -10, r: 4 },
    { dx: 16, dy: 2, r: 12 },
  ];
  return `
    <g stroke="${withAlpha(bloom.stem, 0.54)}" stroke-width="2.1" stroke-linecap="round">
      ${bells
        .map(
          ({ dx, dy }) =>
            `<path d="M${x} ${y - 26 * scale} C ${x + dx * 0.45} ${y - 18 * scale}, ${x + dx * 0.7} ${y - 10 * scale}, ${
              x + dx
            } ${y + dy - 2}" />`
        )
        .join("")}
    </g>
    ${bells
      .map(
        ({ dx, dy, r }) => `
          <g transform="translate(${x + dx} ${y + dy}) rotate(${r}) scale(${scale})">
            <path d="M-10 0 C -7 8, 7 8, 10 0 C 8 13, -8 13, -10 0Z" fill="${withAlpha(
              bloom.petal,
              0.32
            )}" stroke="${withAlpha(bloom.accent, 0.48)}" stroke-width="1.1" />
          </g>
        `
      )
      .join("")}
  `;
}

function buildIrisFlower(x, y, bloom, scale = 1) {
  return `
    <g transform="translate(${x} ${y}) scale(${scale})">
      <ellipse cx="0" cy="-8" rx="10" ry="18" fill="${withAlpha(bloom.petal, 0.26)}" transform="rotate(4)" />
      <ellipse cx="-14" cy="4" rx="9" ry="16" fill="${withAlpha(bloom.petal, 0.32)}" transform="rotate(-34 -14 4)" />
      <ellipse cx="14" cy="4" rx="9" ry="16" fill="${withAlpha(bloom.petal, 0.32)}" transform="rotate(34 14 4)" />
      <ellipse cx="0" cy="8" rx="8" ry="12" fill="${withAlpha(bloom.accent, 0.24)}" />
      <circle cx="0" cy="4" r="4.2" fill="${withAlpha(bloom.accent, 0.44)}" />
    </g>
  `;
}

function buildRadialFlower(x, y, radius, petals, bloom, options) {
  const { center, width, length } = options;
  const petalMarkup = Array.from({ length: petals }, (_, index) => {
    const angle = (360 / petals) * index;
    return `<ellipse cx="${x}" cy="${y - radius * 0.62}" rx="${width}" ry="${length}" fill="${withAlpha(
      bloom.petal,
      0.28
    )}" stroke="${withAlpha(bloom.accent, 0.38)}" stroke-width="0.8" transform="rotate(${angle} ${x} ${y})" />`;
  }).join("");

  return `<g>${petalMarkup}<circle cx="${x}" cy="${y}" r="${center}" fill="${withAlpha(
    bloom.accent,
    0.42
  )}" /></g>`;
}

function buildRosetteFlower(x, y, radius, bloom) {
  return `
    ${buildRadialFlower(x, y, radius, 14, bloom, { center: radius * 0.24, width: radius * 0.16, length: radius * 0.5 })}
    ${buildRadialFlower(x, y, radius * 0.74, 12, bloom, { center: radius * 0.16, width: radius * 0.12, length: radius * 0.36 })}
  `;
}

function buildBurstFlower(x, y, radius, bloom) {
  const petals = Array.from({ length: 18 }, (_, index) => {
    const angle = (360 / 18) * index;
    return `<path d="M${x} ${y} l ${radius * 0.08} ${-radius * 0.92} l ${radius * 0.08} ${radius * 0.92} z" fill="${withAlpha(
      bloom.petal,
      0.24
    )}" transform="rotate(${angle} ${x} ${y})" />`;
  }).join("");
  return `<g>${petals}<circle cx="${x}" cy="${y}" r="${radius * 0.22}" fill="${withAlpha(bloom.accent, 0.4)}" /></g>`;
}

function buildCamelliaFlower(x, y, radius, bloom) {
  return `
    ${buildRadialFlower(x, y, radius, 8, bloom, { center: radius * 0.22, width: radius * 0.2, length: radius * 0.44 })}
    ${buildRadialFlower(x, y, radius * 0.58, 6, bloom, { center: radius * 0.12, width: radius * 0.14, length: radius * 0.28 })}
  `;
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
    const customProcedures = getProceduresForEntry(entry);
    const primaryCustomProcedure = customProcedures.at(-1) || null;
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
  const customCount = Object.entries(initialState.entries)
    .filter(([dateKey]) => dateKey.startsWith(monthPrefix))
    .reduce((total, [, value]) => total + (Array.isArray(value.customMarks) ? value.customMarks.length : 0), 0);
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
  const customProcedures = getProceduresForEntry(entry);
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

  ui.selectedDayCopy.textContent = buildSelectedDayCopy(entry, customProcedures, holiday);

  ui.noteInput.value = entry.note || "";
  ui.clearNoteButton.disabled = !entry.note;
}

function renderCustomBrushes() {
  ui.customBrushList.innerHTML = "";
  const procedures = initialState.customProcedures;
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
    label.textContent = procedure.name;

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
    ui.noteHistorySubtitle.textContent = "Открой день, напиши заметку и сохрани её.";
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
  const validCustomIds = new Set(customProcedures.map((procedure) => procedure.id));
  const legacyManicureId = getLegacyManicureProcedureId(customProcedures);
  return Object.fromEntries(
    Object.entries(entries)
      .map(([dateKey, value]) => {
        const normalized = sanitizeEntryValue(value, validCustomIds, legacyManicureId);
        return normalized ? [dateKey, normalized] : null;
      })
      .filter(Boolean)
  );
}

function sanitizeEntryValue(value, validCustomIds, legacyManicureId = null) {
  if (value === "work") {
    return { work: true };
  }

  if (value === "nails" || value === "manicure") {
    return legacyManicureId ? { customMarks: [legacyManicureId] } : null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const normalized = {};

  if (value.work) {
    normalized.work = true;
  }

  const customMarks = new Set(Array.isArray(value.customMarks) ? value.customMarks.filter((item) => validCustomIds.has(item)) : []);
  if (legacyManicureId && (value.nails || value.manicure)) {
    customMarks.add(legacyManicureId);
  }

  if (customMarks.size) {
    normalized.customMarks = [...customMarks];
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
  const seenNames = new Set();

  return procedures
    .map((procedure, index) => {
      if (!procedure || typeof procedure !== "object") {
        return null;
      }

      const name = normalizeProcedureName(procedure.name);
      if (!name) {
        return null;
      }

      const normalizedNameKey = normalizeProcedureKey(name);
      const id =
        typeof procedure.id === "string" && procedure.id.trim()
          ? procedure.id.trim()
          : createStableProcedureId(name, index);
      const color = normalizeHexColor(procedure.color);

      if (seenIds.has(id) || seenNames.has(normalizedNameKey)) {
        return null;
      }

      seenIds.add(id);
      seenNames.add(normalizedNameKey);

      return {
        id,
        name,
        color,
      };
    })
    .filter(Boolean);
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
  const existing = initialState.customProcedures.find(
    (procedure) => normalizeProcedureKey(procedure.name) === normalizeProcedureKey(name)
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
  };
  initialState.customProcedures.push(procedure);
  activeBrush = `custom:${procedure.id}`;

  ui.customProcedureName.value = "";
  ui.customProcedureColor.value = DEFAULT_CUSTOM_COLOR;
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

  Object.entries(initialState.entries).forEach(([dateKey, entry]) => {
    if (!Array.isArray(entry.customMarks) || !entry.customMarks.includes(activeProcedure.id)) {
      return;
    }

    const nextEntry = { ...entry, customMarks: entry.customMarks.filter((mark) => mark !== activeProcedure.id) };
    setEntry(dateKey, nextEntry);
  });

  activeBrush = "work";
  ui.customProcedureName.value = "";
  ui.customProcedureColor.value = DEFAULT_CUSTOM_COLOR;
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

function getValidCustomProcedureIds() {
  return new Set(initialState.customProcedures.map((procedure) => procedure.id));
}

function setEntry(dateKey, entry) {
  const normalized = sanitizeEntryValue(entry, getValidCustomProcedureIds(), getLegacyManicureProcedureId());
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
  ui.customBrushEmpty.textContent = initialState.customProcedures.length
    ? ""
    : "Пока нет своих меток.";
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

    const customProcedures = ensureLegacyManicureProcedure(
      sanitizeCustomProcedures(payload.state.customProcedures || []),
      hasLegacyManicureEntries(payload.state.entries || {})
    );

    const restoredState = {
      entries: sanitizeEntries(payload.state.entries || {}, customProcedures),
      holidaysCache: payload.state.holidaysCache || {},
      customProcedures,
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
    window.alert("Не удалось загрузить файл. Проверь, что это JSON-резервная копия приложения.");
  }
}

function getProceduresForEntry(entry) {
  if (!entry || !Array.isArray(entry.customMarks)) {
    return [];
  }

  return entry.customMarks.map((procedureId) => getProcedureById(procedureId)).filter(Boolean);
}

function buildSelectedDayCopy(entry, customProcedures, holiday) {
  const parts = [];
  const marks = [];

  if (entry.work) {
    marks.push("смена");
  }

  if (customProcedures.length) {
    marks.push(...customProcedures.map((procedure) => procedure.name));
  }

  if (marks.length) {
    parts.push(`Отметки на день: ${marks.join(", ")}.`);
  } else {
    parts.push("Этот день без отметок.");
  }

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
