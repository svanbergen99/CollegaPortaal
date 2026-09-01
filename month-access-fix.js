(() => {
  "use strict";

  const bridge = window.RoosterMonthBridge;
  const agendaBridge = window.RoosterAgendaBridge;
  if (!bridge || !agendaBridge) return;

  const TIME_ZONE = "Europe/Amsterdam";
  const FILE_MONTHS = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
  const nativeFetch = window.__roosterNativeFetch || window.fetch.bind(window);
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const extraCache = new Map();
  const knownMonths = new Set();

  const originalGetState = bridge.getState.bind(bridge);
  const originalGetRoster = bridge.getRoster.bind(bridge);
  const originalGetEmployeeData = bridge.getEmployeeData.bind(bridge);
  const originalGetEmployeeSchedules = bridge.getEmployeeSchedules.bind(bridge);
  const originalSwitchMonth = bridge.switchMonth.bind(bridge);
  const originalGetCalendarData = agendaBridge.getCalendarData.bind(agendaBridge);

  let sessionId = "";
  let sessionPassword = "";
  let externalActiveMonth = "";
  let discoveryPromise = null;

  function currentAmsterdamParts() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit"
    }).formatToParts(new Date());
    const get = (type) => parts.find((part) => part.type === type)?.value || "";
    return { year: Number(get("year")), month: Number(get("month")) };
  }

  function currentAmsterdamYear() {
    return currentAmsterdamParts().year || new Date().getFullYear();
  }

  function rosterYear() {
    const state = originalGetState() || {};
    return Number(String(state.coreMonthKey || state.currentMonthKey || "").slice(0, 4)) || currentAmsterdamYear();
  }

  function monthKeyForIndex(index, year = rosterYear()) {
    return `${year}-${String(index + 1).padStart(2, "0")}`;
  }

  function fileForMonth(monthKey) {
    const month = Number(String(monthKey).slice(5, 7));
    if (!(month >= 1 && month <= 12)) return "";
    return `Roosterindex_${FILE_MONTHS[month - 1]}.json`;
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function nameSignature(value) {
    return String(value || "")
      .toLocaleLowerCase("nl-NL")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim().split(/\s+/).filter(Boolean).sort((a, b) => a.localeCompare(b, "nl")).join("|");
  }

  function getEmployee(index, name) {
    const signature = nameSignature(name);
    if (!signature || !index) return null;
    return (index.employees || []).find((employee) => nameSignature(employee.name) === signature) || null;
  }

  function mapSchedules(employee) {
    return Array.isArray(employee?.schedules) ? employee.schedules.map((schedule) => ({
      date: schedule.date,
      start: schedule.start,
      end: schedule.end,
      activities: Array.isArray(schedule.activities) ? schedule.activities.map((activity) => ({
        start: activity.start,
        end: activity.end,
        type: activity.type,
        name: activity.name,
        color: activity.color
      })) : []
    })) : [];
  }

  function indexContainsMonth(index, monthKey) {
    for (const employee of index?.employees || []) {
      for (const schedule of employee?.schedules || []) {
        if (String(schedule?.date || "").slice(0, 7) === monthKey) return true;
      }
    }
    const periodMonth = String(index?.period?.month || "");
    return periodMonth === monthKey
      || periodMonth === monthKey.slice(5, 7)
      || periodMonth === String(Number(monthKey.slice(5, 7)));
  }

  async function probeMonth(index, year) {
    const monthKey = monthKeyForIndex(index, year);
    const file = fileForMonth(monthKey);
    if (!file) return;

    try {
      const response = await nativeFetch(`${file}?probe=${Date.now()}-${index}`, {
        method: "HEAD",
        cache: "no-store"
      });
      if (response.ok) {
        knownMonths.add(monthKey);
        return;
      }
      if (response.status !== 405 && response.status !== 501) return;
    } catch (_) {}

    try {
      const response = await nativeFetch(`${file}?probe=${Date.now()}-${index}`, { cache: "no-store" });
      if (response.ok) {
        knownMonths.add(monthKey);
        try { await response.body?.cancel(); } catch (_) {}
      }
    } catch (_) {}
  }

  async function discoverMonths(force = false) {
    if (discoveryPromise && !force) return discoveryPromise;

    discoveryPromise = (async () => {
      const state = originalGetState() || {};
      for (const key of state.availableMonths || []) knownMonths.add(key);

      const year = rosterYear();
      await Promise.all(FILE_MONTHS.map((_, index) => probeMonth(index, year)));

      window.dispatchEvent(new CustomEvent("rooster-months-updated", {
        detail: { discovered: true, months: [...knownMonths].sort() }
      }));
      return [...knownMonths].sort();
    })();

    try {
      return await discoveryPromise;
    } finally {
      if (force) discoveryPromise = null;
    }
  }

  async function decryptMonth(monthKey) {
    if (extraCache.has(monthKey)) return extraCache.get(monthKey);
    const original = originalGetRoster(monthKey);
    if (original) return original;
    if (!sessionId || !sessionPassword || !window.crypto?.subtle) return null;

    const file = fileForMonth(monthKey);
    if (!file) return null;

    let response;
    try {
      response = await nativeFetch(`${file}?v=${Date.now()}`, { cache: "no-store" });
    } catch (_) {
      return null;
    }
    if (!response.ok) return null;

    knownMonths.add(monthKey);

    let secured;
    try {
      secured = await response.json();
    } catch (_) {
      return null;
    }

    if (secured?.kind !== "roosterhulp-encrypted-index" || secured?.encrypted !== true || !secured.crypto || !secured.payload) return null;

    try {
      const secret = encoder.encode(`${sessionId}\u0000${sessionPassword}`);
      const keyMaterial = await crypto.subtle.importKey("raw", secret, "PBKDF2", false, ["deriveKey"]);
      const key = await crypto.subtle.deriveKey({
        name: "PBKDF2",
        hash: secured.crypto.hash || "SHA-256",
        salt: base64ToBytes(secured.crypto.salt),
        iterations: Number(secured.crypto.iterations) || 250000
      }, keyMaterial, {
        name: "AES-GCM",
        length: Number(secured.crypto.keyLength) || 256
      }, false, ["decrypt"]);

      const plaintext = await crypto.subtle.decrypt({
        name: "AES-GCM",
        iv: base64ToBytes(secured.crypto.iv)
      }, key, base64ToBytes(secured.payload));

      const parsed = JSON.parse(decoder.decode(plaintext));
      if (parsed?.kind !== "roosterhulp-index" || !Array.isArray(parsed.employees)) return null;
      if (!indexContainsMonth(parsed, monthKey)) return null;

      extraCache.set(monthKey, parsed);
      window.dispatchEvent(new CustomEvent("rooster-months-updated", {
        detail: { monthKey, decrypted: true }
      }));
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function selectedEmployeeName() {
    return document.querySelector("#rosterResult .employee-name")?.textContent?.trim()
      || document.getElementById("employeeName")?.value?.trim()
      || "";
  }

  function updatePeriod(index) {
    const period = document.querySelector("#rosterResult .period");
    if (!period || !index) return;
    const label = index?.period?.label && index.period.label !== "unknown" ? index.period.label : "";
    period.textContent = label ? `Periode: ${label}` : "";
    period.hidden = !label;
  }

  function showLoadError(monthKey) {
    const result = document.getElementById("rosterResult");
    const view = result?.querySelector(".personal-month-view");
    if (!view) return;

    const monthIndex = Number(monthKey.slice(5, 7)) - 1;
    const name = FILE_MONTHS[monthIndex]?.toLocaleLowerCase("nl-NL") || monthKey;
    let message = view.querySelector(".personal-month-load-error");
    if (!message) {
      message = document.createElement("div");
      message.className = "personal-month-load-error";
      view.prepend(message);
    }
    message.textContent = `Het rooster van ${name} kon niet worden geopend. Controleer of het maandbestand bestaat en met dezelfde ID en hetzelfde wachtwoord is beveiligd.`;
  }

  bridge.getState = function enhancedGetState() {
    const state = originalGetState() || {};
    const months = new Set([...(state.availableMonths || []), ...knownMonths, ...extraCache.keys()]);
    const year = rosterYear();
    const current = currentAmsterdamParts();
    const ceilingMonth = current.year === year ? current.month : 12;

    for (let index = 0; index < ceilingMonth; index += 1) {
      months.add(monthKeyForIndex(index, year));
    }

    return {
      ...state,
      activeMonthKey: externalActiveMonth || state.activeMonthKey,
      availableMonths: [...months].sort()
    };
  };

  bridge.getRoster = function enhancedGetRoster(monthKey) {
    return extraCache.get(monthKey) || originalGetRoster(monthKey);
  };

  bridge.getEmployeeData = function enhancedGetEmployeeData(name, monthKey) {
    const target = monthKey || externalActiveMonth || originalGetState()?.activeMonthKey;
    const index = extraCache.get(target);
    if (!index) return originalGetEmployeeData(name, monthKey);
    const employee = getEmployee(index, name);
    return employee ? { monthKey: target, index, employee } : null;
  };

  bridge.getEmployeeSchedules = function enhancedGetEmployeeSchedules(name) {
    const combined = [...(originalGetEmployeeSchedules(name) || [])];
    for (const [monthKey, index] of extraCache.entries()) {
      const employee = getEmployee(index, name);
      if (!employee) continue;
      for (const schedule of employee.schedules || []) {
        combined.push({ monthKey, date: schedule.date, start: schedule.start, end: schedule.end });
      }
    }

    const seen = new Set();
    return combined
      .filter((schedule) => {
        const key = `${schedule.monthKey || ""}|${schedule.date || ""}|${schedule.start || ""}|${schedule.end || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.start || "").localeCompare(String(b.start || "")));
  };

  bridge.switchMonth = async function enhancedSwitchMonth(monthKey) {
    const originalLoaded = originalGetRoster(monthKey);
    if (originalLoaded) {
      externalActiveMonth = "";
      return originalSwitchMonth(monthKey);
    }

    const index = await decryptMonth(monthKey);
    if (!index) {
      showLoadError(monthKey);
      return false;
    }

    externalActiveMonth = monthKey;
    updatePeriod(index);
    window.dispatchEvent(new CustomEvent("rooster-month-changed", {
      detail: { monthKey, external: true }
    }));
    return true;
  };

  agendaBridge.getCalendarData = function enhancedCalendarData() {
    const base = originalGetCalendarData() || {};
    if (!externalActiveMonth) return base;

    const index = extraCache.get(externalActiveMonth) || originalGetRoster(externalActiveMonth);
    if (!index) return { ...base, monthKey: externalActiveMonth, schedules: [] };

    const name = selectedEmployeeName() || base.name || "";
    const employee = getEmployee(index, name);
    const periodLabel = index?.period?.label && index.period.label !== "unknown" ? index.period.label : "";
    return {
      ...base,
      name: employee?.name || name,
      monthKey: externalActiveMonth,
      periodLabel,
      appointmentName: index?.display?.appointmentName || base.appointmentName || "Werkrooster",
      schedules: employee ? mapSchedules(employee) : []
    };
  };

  document.addEventListener("submit", (event) => {
    if (event.target !== document.getElementById("unlockForm")) return;
    sessionId = document.getElementById("rosterId")?.value?.trim() || "";
    sessionPassword = document.getElementById("rosterPassword")?.value || "";
  }, true);

  window.addEventListener("rooster-unlocked", () => {
    discoverMonths(true);
  });

  window.addEventListener("rooster-employee-selected", () => {
    externalActiveMonth = "";
  });

  for (const key of originalGetState()?.availableMonths || []) knownMonths.add(key);
  discoverMonths(true);
})();
