(() => {
  "use strict";

  const TIME_ZONE = "Europe/Amsterdam";
  const REFRESH_MS = 15000;
  const encoder = new TextEncoder();

  const SCHEDULES = Object.freeze({
    "2026-09-02": Object.freeze([
      Object.freeze({ start: "08:00", end: "13:00", nameHash: "859a8d31cd6d661faf1821d2fc40b91dc64ef678f1e24d6a2c4b58778d8b213f" }),
      Object.freeze({ start: "13:00", end: "18:00", nameHash: "ff96b4f89912b19a443e551f25c1928d129547a0dab7f0ccc009af430443686d" })
    ])
  });

  const app = document.getElementById("app");
  const searchCard = document.querySelector(".search-card");
  if (!app || !searchCard) return;

  const nameCache = new Map();
  let refreshTimer = null;
  let resolving = false;

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
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return NaN;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function nameSignature(value) {
    return String(value || "")
      .toLocaleLowerCase("nl-NL")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "nl"))
      .join("|");
  }

  async function hashName(value) {
    const signature = nameSignature(value);
    if (!signature) return "";
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(signature));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function availableMonthKeys() {
    const state = window.RoosterMonthBridge?.getState?.() || {};
    return [...new Set([
      state.activeMonthKey,
      state.currentMonthKey,
      state.coreMonthKey,
      ...(state.availableMonths || [])
    ].filter((value) => /^\d{4}-\d{2}$/.test(String(value || ""))))];
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

  async function resolveNames(schedule, attempt = 0) {
    if (resolving) return;
    const needed = new Set(schedule.map((item) => item.nameHash).filter((hash) => hash && !nameCache.has(hash)));
    if (!needed.size) return;

    resolving = true;
    try {
      for (const monthKey of availableMonthKeys()) {
        const roster = window.RoosterMonthBridge?.getRoster?.(monthKey);
        for (const employee of roster?.employees || []) {
          const name = String(employee?.name || "").trim();
          if (!name) continue;
          const hash = await hashName(name);
          if (needed.has(hash)) {
            nameCache.set(hash, name);
            needed.delete(hash);
            if (!needed.size) break;
          }
        }
        if (!needed.size) break;
      }
    } finally {
      resolving = false;
    }

    render();
    if (needed.size && attempt < 20) {
      window.setTimeout(() => resolveNames(schedule, attempt + 1), 150);
    }
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
      const name = nameCache.get(item.nameHash) || "Naam laden…";
      return `
        <span class="traffic-shift${isCurrent ? " is-current" : ""}">
          ${isCurrent ? '<span class="traffic-now">Nu</span>' : ""}
          <span class="traffic-time">${escapeHtml(item.start)}–${escapeHtml(item.end)}</span>
          <strong>${escapeHtml(name)}</strong>
        </span>`;
    }).join("");

    bar.innerHTML = `
      <span class="traffic-today-title">🚨 Traffic (${escapeHtml(dateLabel)})</span>
      <span class="traffic-today-shifts">${shifts}</span>`;
    bar.hidden = false;

    if (schedule.some((item) => !nameCache.has(item.nameHash))) resolveNames(schedule);
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
