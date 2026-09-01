(() => {
  "use strict";

  const bridge = window.RoosterMonthBridge;
  const agendaBridge = window.RoosterAgendaBridge;
  if (!bridge || !agendaBridge) return;

  const TIME_ZONE = "Europe/Amsterdam";
  const REPO = "svanbergen99/Rooster";
  const FILE_MONTHS = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
  const nativeFetch = window.__roosterNativeFetch || window.fetch.bind(window);
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const extraCache = new Map();
  const knownMonths = new Set();
  const fileMeta = new Map();

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

  function currentYear() {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric" }).formatToParts(new Date());
    return Number(parts.find((part) => part.type === "year")?.value || new Date().getFullYear());
  }

  function monthKeyForIndex(index, year = currentYear()) {
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
    return periodMonth === monthKey || periodMonth === monthKey.slice(5, 7) || periodMonth === String(Number(monthKey.slice(5, 7)));
  }

  async function discoverMonths() {
    if (discoveryPromise) return discoveryPromise;
    discoveryPromise = (async () => {
      const state = originalGetState() || {};
      for (const key of state.availableMonths || []) knownMonths.add(key);
      const year = Number(String(state.coreMonthKey || state.currentMonthKey || "").slice(0, 4)) || currentYear();

      try {
        const response = await nativeFetch(`https://api.github.com/repos/${REPO}/git/trees/main?recursive=1`, {
          cache: "no-store",
          headers: { Accept: "application/vnd.github+json" }
        });
        if (response.ok) {
          const data = await response.json();
          const paths = new Set((data.tree || []).map((entry) => String(entry?.path || "")));
          FILE_MONTHS.forEach((monthName, index) => {
            const file = `Roosterindex_${monthName}.json`;
            if (paths.has(file)) knownMonths.add(monthKeyForIndex(index, year));
          });
        }
      } catch (_) {}

      window.dispatchEvent(new CustomEvent("rooster-months-updated", { detail: { discovered: true } }));
      return [...knownMonths].sort();
    })();
    return discoveryPromise;
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
    fileMeta.set(monthKey, { file, lastModified: response.headers.get("Last-Modified") || "" });

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
      window.dispatchEvent(new CustomEvent("rooster-months-updated", { detail: { monthKey, decrypted: true } }));
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

  function formatUpdateDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("nl-NL", {
      timeZone: TIME_ZONE,
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date).replace(",", "");
  }

  async function updateStamp(monthKey) {
    const stamp = document.getElementById("rosterUpdateStamp");
    if (!stamp) return;
    const file = fileForMonth(monthKey);
    stamp.textContent = "Update: laden…";
    let updatedAt = "";
    try {
      const response = await nativeFetch(`https://api.github.com/repos/${REPO}/commits?path=${encodeURIComponent(file)}&per_page=1`, {
        cache: "no-store",
        headers: { Accept: "application/vnd.github+json" }
      });
      if (response.ok) {
        const commits = await response.json();
        updatedAt = commits?.[0]?.commit?.committer?.date || commits?.[0]?.commit?.author?.date || "";
      }
    } catch (_) {}
    if (!updatedAt) updatedAt = fileMeta.get(monthKey)?.lastModified || "";
    const formatted = formatUpdateDate(updatedAt);
    stamp.textContent = formatted ? `Update: ${formatted}` : "Update: tijd onbekend";
  }

  function updatePeriod(index) {
    const period = document.querySelector("#rosterResult .period");
    if (!period || !index) return;
    const label = index?.period?.label && index.period.label !== "unknown" ? index.period.label : "";
    period.textContent = label ? `Periode: ${label}` : "";
    period.hidden = !label;
  }

  bridge.getState = function enhancedGetState() {
    const state = originalGetState() || {};
    const allMonths = new Set([...(state.availableMonths || []), ...knownMonths, ...extraCache.keys()]);
    return {
      ...state,
      activeMonthKey: externalActiveMonth || state.activeMonthKey,
      availableMonths: [...allMonths].sort()
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
    await discoverMonths();
    if (!knownMonths.has(monthKey) && !extraCache.has(monthKey) && !originalGetRoster(monthKey)) return false;

    const originalLoaded = originalGetRoster(monthKey);
    if (originalLoaded) {
      externalActiveMonth = "";
      return originalSwitchMonth(monthKey);
    }

    const index = await decryptMonth(monthKey);
    if (!index) {
      window.dispatchEvent(new CustomEvent("rooster-month-load-failed", { detail: { monthKey } }));
      return false;
    }

    externalActiveMonth = monthKey;
    updatePeriod(index);
    updateStamp(monthKey);
    window.dispatchEvent(new CustomEvent("rooster-month-changed", { detail: { monthKey, external: true } }));
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
    discoverMonths();
  });

  window.addEventListener("rooster-employee-selected", () => {
    externalActiveMonth = "";
  });

  window.addEventListener("rooster-relocked", () => {
    sessionId = "";
    sessionPassword = "";
    externalActiveMonth = "";
    extraCache.clear();
  });

  window.addEventListener("rooster-month-load-failed", (event) => {
    const monthKey = event.detail?.monthKey || "";
    if (!monthKey) return;
    const monthIndex = Number(monthKey.slice(5, 7)) - 1;
    const name = FILE_MONTHS[monthIndex]?.toLocaleLowerCase("nl-NL") || monthKey;
    const result = document.getElementById("rosterResult");
    const view = result?.querySelector(".personal-month-view");
    if (!view) return;
    let message = view.querySelector(".personal-month-load-error");
    if (!message) {
      message = document.createElement("div");
      message.className = "personal-month-load-error";
      view.prepend(message);
    }
    message.textContent = `Het rooster van ${name} kon niet worden ontsleuteld met de huidige inloggegevens.`;
  });

  for (const key of originalGetState()?.availableMonths || []) knownMonths.add(key);
  discoverMonths();
})();
