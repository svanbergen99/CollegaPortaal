(() => {
  "use strict";

  const bridge = window.RoosterAgendaBridge;
  const rosterResult = document.getElementById("rosterResult");
  const searchCard = document.querySelector(".search-card");
  if (!bridge || !rosterResult || !searchCard) return;

  const weekdays = ["ma", "di", "wo", "do", "vr", "za", "zo"];
  const monthNames = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
  let resizeTimer = null;
  let renderTimer = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function formatTime(value) {
    if (!value) return "";
    const text = String(value).trim();
    const embedded = text.match(/(?:T|\s)(\d{1,2}):(\d{2})/);
    if (embedded) return `${embedded[1].padStart(2, "0")}:${embedded[2]}`;
    const plain = text.match(/^(\d{1,2}):(\d{2})$/);
    if (plain) return `${plain[1].padStart(2, "0")}:${plain[2]}`;
    return "";
  }

  function timeRange(start, end) {
    const from = formatTime(start);
    const to = formatTime(end);
    if (from && to) return `${from} – ${to}`;
    return from || to || "";
  }

  function safeColor(value) {
    const color = String(value || "").trim();
    return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color) ? color : "#dbe2ea";
  }

  function dominantMonth(schedules) {
    const counts = new Map();
    for (const schedule of schedules) {
      const key = String(schedule?.date || "").slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(key)) counts.set(key, (counts.get(key) || 0) + 1);
    }
    const winner = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
    return winner || localDateKey().slice(0, 7);
  }

  function monthModel(data) {
    const schedules = Array.isArray(data?.schedules) ? [...data.schedules] : [];
    schedules.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.start || "").localeCompare(String(b.start || "")));
    const monthKey = dominantMonth(schedules);
    const [yearText, monthText] = monthKey.split("-");
    const year = Number(yearText);
    const monthIndex = Number(monthText) - 1;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const mondayOffset = (new Date(year, monthIndex, 1, 12).getDay() + 6) % 7;
    const totalCells = mondayOffset + daysInMonth <= 35 ? 35 : 42;
    const byDate = new Map();

    for (const schedule of schedules) {
      const date = String(schedule?.date || "").slice(0, 10);
      if (!date.startsWith(`${monthKey}-`)) continue;
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date).push(schedule);
    }

    return { monthKey, year, monthIndex, daysInMonth, mondayOffset, totalCells, byDate };
  }

  function activityHtml(activity) {
    const name = activity?.name || activity?.type || "Activiteit";
    const range = timeRange(activity?.start, activity?.end);
    return `<div class="personal-month-activity" style="--activity-color:${safeColor(activity?.color)}"><span class="personal-month-activity-name">${escapeHtml(name)}</span>${range ? `<span class="personal-month-activity-time">${escapeHtml(range)}</span>` : ""}</div>`;
  }

  function scheduleHtml(schedule) {
    const range = timeRange(schedule?.start, schedule?.end);
    const activities = Array.isArray(schedule?.activities) ? schedule.activities : [];
    return `<div class="personal-month-shift">${range ? `<div class="personal-month-shift-time">${escapeHtml(range)}</div>` : ""}<div class="personal-month-activities">${activities.length ? activities.map(activityHtml).join("") : '<div class="personal-month-no-activities">Geen roosteronderdelen beschikbaar.</div>'}</div></div>`;
  }

  function buildMonthHtml(data) {
    const model = monthModel(data);
    const today = localDateKey();
    const cells = [];

    for (let index = 0; index < model.totalCells; index += 1) {
      const day = index - model.mondayOffset + 1;
      if (day < 1 || day > model.daysInMonth) {
        cells.push('<div class="personal-month-day outside-month" aria-hidden="true"></div>');
        continue;
      }

      const date = `${model.year}-${String(model.monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const schedules = model.byDate.get(date) || [];
      const state = date < today ? "past" : date === today ? "today" : "future";
      const workClass = schedules.length ? " has-work" : " no-work";
      cells.push(`<article class="personal-month-day ${state}${workClass}" data-date="${date}"><header class="personal-month-day-head"><span class="personal-month-day-number">${day}</span>${state === "today" ? '<span class="personal-month-today-badge">Vandaag</span>' : ""}</header><div class="personal-month-day-body">${schedules.length ? schedules.map(scheduleHtml).join("") : '<div class="personal-month-free">Geen dienst</div>'}</div></article>`);
    }

    return `<section class="personal-month-view" data-personal-month="${model.monthKey}"><div class="personal-month-title"><h3>${monthNames[model.monthIndex]} ${model.year}</h3><span>Volledig maandrooster</span></div><div class="personal-month-stage"><div class="personal-month-calendar"><div class="personal-month-weekdays">${weekdays.map((day) => `<div>${day}</div>`).join("")}</div><div class="personal-month-grid">${cells.join("")}</div></div></div></section>`;
  }

  function equalizeDayHeights() {
    const view = rosterResult.querySelector(".personal-month-view");
    if (!view) return;
    const cells = [...view.querySelectorAll(".personal-month-day")];
    if (!cells.length) return;

    view.style.removeProperty("--personal-month-day-height");
    cells.forEach((cell) => { cell.style.height = "auto"; });

    requestAnimationFrame(() => {
      let tallest = 160;
      cells.forEach((cell) => {
        tallest = Math.max(tallest, Math.ceil(cell.scrollHeight));
      });
      view.style.setProperty("--personal-month-day-height", `${tallest}px`);
      cells.forEach((cell) => { cell.style.height = ""; });
    });
  }

  function renderMonthView() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      const isEmployeeRoster = !rosterResult.hidden && Boolean(rosterResult.querySelector(".employee-head")) && !rosterResult.querySelector(".today-workers-head");
      if (!isEmployeeRoster) {
        searchCard.classList.remove("has-month-roster");
        return;
      }

      const data = bridge.getCalendarData();
      if (!data?.name || !Array.isArray(data.schedules)) return;
      const existing = rosterResult.querySelector(".personal-month-view");
      if (existing) {
        searchCard.classList.add("has-month-roster");
        equalizeDayHeights();
        return;
      }

      const scheduleList = rosterResult.querySelector(".schedule-list");
      if (!scheduleList) return;

      scheduleList.hidden = true;
      scheduleList.insertAdjacentHTML("afterend", buildMonthHtml(data));
      const oldToggle = rosterResult.querySelector('[data-action="toggle-full-roster"]');
      if (oldToggle) oldToggle.hidden = true;
      searchCard.classList.add("has-month-roster");
      equalizeDayHeights();
    }, 0);
  }

  const observer = new MutationObserver(renderMonthView);
  observer.observe(rosterResult, { childList: true, subtree: false, attributes: true, attributeFilter: ["hidden"] });
  renderMonthView();

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(equalizeDayHeights, 120);
  });
})();