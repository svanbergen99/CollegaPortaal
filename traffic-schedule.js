(() => {
  "use strict";

  const TIME_ZONE = "Europe/Amsterdam";
  const REFRESH_MS = 15000;

  const SCHEDULES = Object.freeze({
    "2026-09-02": Object.freeze([
      Object.freeze({ start: "08:00", end: "13:00", name: "Marjan van Staalduinen" }),
      Object.freeze({ start: "13:00", end: "18:00", name: "Hendrik Steenhouwer" })
    ]),
    "2026-09-03": Object.freeze([
      Object.freeze({ start: "00:00", end: "12:00", label: "tot 12:00", name: "Hendrik Steenhouwer" }),
      Object.freeze({ start: "12:00", end: "15:00", name: "Ewoud Oord" }),
      Object.freeze({ start: "15:00", end: "sluit", label: "15:00–sluit", name: "Maaike Overweg" })
    ])
  });

  const app = document.getElementById("app");
  const searchCard = document.querySelector(".search-card");
  if (!app || !searchCard) return;

  let refreshTimer = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function amsterdamNow(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date);
    const get = (type) => parts.find((part) => part.type === type)?.value || "";
    const hour = Number(get("hour"));
    const minute = Number(get("minute"));
    return {
      dateKey: `${get("year")}-${get("month")}-${get("day")}`,
      minutes: (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0)
    };
  }

  function formatDate(dateKey) {
    const date = new Date(`${dateKey}T12:00:00Z`);
    return new Intl.DateTimeFormat("nl-NL", {
      timeZone: TIME_ZONE,
      weekday: "long",
      day: "numeric",
      month: "long"
    }).format(date);
  }

  function timeToMinutes(value) {
    const text = String(value || "").trim().toLocaleLowerCase("nl-NL");
    if (text === "sluit") return 24 * 60;
    const match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return NaN;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function ensureBar() {
    let bar = document.getElementById("trafficTodayBar");
    if (bar) return bar;

    bar = document.createElement("div");
    bar.id = "trafficTodayBar";
    bar.className = "traffic-today-bar";

    const salaryBar = document.getElementById("nextSalaryPaymentBar");
    if (salaryBar) {
      salaryBar.before(bar);
    } else {
      const titleRow = searchCard.querySelector(".roster-title-row");
      const title = searchCard.querySelector(":scope > h1");
      (titleRow || title || searchCard.firstElementChild)?.before(bar);
    }
    return bar;
  }

  function render() {
    if (app.hidden) return;
    const bar = ensureBar();
    const now = amsterdamNow();
    const schedule = SCHEDULES[now.dateKey] || [];
    const dateLabel = formatDate(now.dateKey);

    if (!schedule.length) {
      bar.innerHTML = `
        <span class="traffic-today-title">🚨 Traffic (${escapeHtml(dateLabel)})</span>
        <strong class="traffic-not-updated">Nog niet bijgewerkt</strong>`;
      bar.hidden = false;
      return;
    }

    const shifts = schedule.map((item) => {
      const start = timeToMinutes(item.start);
      const end = timeToMinutes(item.end);
      const isCurrent = Number.isFinite(start) && Number.isFinite(end) && now.minutes >= start && now.minutes < end;
      const timeLabel = item.label || `${item.start}–${item.end}`;
      return `
        <span class="traffic-shift${isCurrent ? " is-current" : ""}">
          ${isCurrent ? '<span class="traffic-now">Nu</span>' : ""}
          <span class="traffic-time">${escapeHtml(timeLabel)}</span>
          <strong>${escapeHtml(item.name)}</strong>
        </span>`;
    }).join("");

    bar.innerHTML = `
      <span class="traffic-today-title">🚨 Traffic (${escapeHtml(dateLabel)})</span>
      <span class="traffic-today-shifts">${shifts}</span>`;
    bar.hidden = false;
  }

  function start() {
    render();
    if (refreshTimer !== null) return;
    refreshTimer = window.setInterval(render, REFRESH_MS);
  }

  window.addEventListener("rooster-unlocked", start);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !app.hidden) render();
  });
  if (!app.hidden) start();
})();
