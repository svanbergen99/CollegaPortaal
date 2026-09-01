(() => {
  "use strict";

  const rosterResult = document.getElementById("rosterResult");
  if (!rosterResult) return;

  const WFM_LEGEND = [
    ["Days off", "#95D594"],
    ["Time offs", "#4E9257"],
    ["Exceptions", "#F14950"],
    ["Breaks", "#D9D9D9"],
    ["Meals", "#6BE1FA"],
    ["Work", "#335CC9"],
    ["Activity sets", "#FFF533"],
    ["Marked times", "#FF9966"],
    ["Dagstart", "#A97CE3"],
    ["Afwezig Lang FD", "#AB585B"],
    ["_Systeemstoring", "#47F13A"],
    ["Verlof door Traffic", "#AFF7B9"],
    ["Bila", "#F185B5"],
    ["Verlof", "#4E9257"],
    ["Afwezig Lang", "#AB585B"],
    ["Verlof door Teammanager", "#B4CAB7"],
    ["Verlof Ouderschap", "#73E3AF"],
    ["Coaching FD", "#DF977D"],
    ["Coaching", "#DF977D"],
    ["E-Learning", "#DB9145"],
    ["KodW", "#B24981"],
    ["Verlof Bijzonder_u", "#37F63D"],
    ["Inleestijd", "#F185B5"],
    ["Overleg", "#F456BD"],
    ["Projecten", "#BAB8B8"],
    ["Afwezig Kort FD", "#CC8795"],
    ["OR KCD", "#33B9FC"],
    ["Onbekend", "#33B9FC"],
    ["Verlof Bijzonder", "#37F63D"],
    ["Verlof Zorg", "#73E3AF"],
    ["Opleiding", "#91B1DF"],
    ["KCD_Admin", "#413838"],
    ["Afwezig Kort", "#CC8795"],
    ["Begeleiding instroom", "#E9C185"],
    ["Begeleiding instroom FD", "#E9C185"],
    ["KCD_admin FD", "#413838"],
    ["Kalibratie", "#F185B5"],
    ["Projecten FD", "#BAB8B8"],
    ["Verlof Feestdag", "#5BCDBE"],
    ["Opleiding FD", "#91B1DF"],
    ["OR KCD FD", "#33B9FC"],
    ["Administratie", "#999898"],
    ["Verlof Calamiteit", "#60BE6D"],
    ["Verlof Zwangerschap", "#73E3AF"],
    ["Verlof Calamiteit_u", "#60BE6D"]
  ];

  let details = null;
  let syncTimer = null;

  function normalize(value) {
    return String(value || "").trim().toLocaleLowerCase("nl-NL");
  }

  function safeColor(value) {
    const color = String(value || "").trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : "";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function collectEntries() {
    const entries = new Map(WFM_LEGEND.map(([name, color]) => [normalize(name), { name, color }]));
    const monthBridge = window.RoosterMonthBridge;
    const months = monthBridge?.getState?.().availableMonths || [];
    for (const monthKey of months) {
      const roster = monthBridge?.getRoster?.(monthKey);
      for (const employee of roster?.employees || []) {
        for (const schedule of employee?.schedules || []) {
          for (const activity of schedule?.activities || []) {
            const name = String(activity?.name || activity?.type || "").trim();
            const color = safeColor(activity?.color);
            const key = normalize(name);
            if (!key || !color || !entries.has(key)) continue;
            entries.get(key).color = color;
          }
        }
      }
    }
    return entries;
  }

  function render() {
    if (!details?.isConnected) return;
    const grid = details.querySelector("[data-wfm-legend-grid]");
    if (!grid) return;
    grid.innerHTML = [...collectEntries().values()].map(({ name, color }) => `
      <div class="wfm-legend-item">
        <span class="wfm-legend-color" style="--legend-color:${color}" aria-hidden="true"></span>
        <span class="wfm-legend-name">${escapeHtml(name)}</span>
      </div>`).join("");
  }

  function createLegend() {
    const element = document.createElement("details");
    element.className = "wfm-legend";
    element.innerHTML = `<summary><span>Legenda</span><span class="wfm-legend-arrow" aria-hidden="true">⌄</span></summary><div class="wfm-legend-panel"><p class="wfm-legend-intro">Kleurenlegenda van WFM.</p><div class="wfm-legend-grid" data-wfm-legend-grid></div></div>`;
    element.addEventListener("toggle", () => {
      if (element.open) render();
    });
    return element;
  }

  function sync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      const personalMonth = rosterResult.querySelector(".personal-month-view");
      const isPersonalRoster = !rosterResult.hidden
        && Boolean(rosterResult.querySelector(".employee-head"))
        && Boolean(personalMonth)
        && !rosterResult.querySelector(".today-workers-head");

      if (!isPersonalRoster) {
        if (details?.isConnected) details.remove();
        details = null;
        return;
      }

      if (!details || !details.isConnected) details = createLegend();
      if (details.nextElementSibling !== personalMonth) personalMonth.before(details);
      if (details.open) render();
    }, 0);
  }

  const observer = new MutationObserver(sync);
  observer.observe(rosterResult, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });

  window.addEventListener("rooster-unlocked", sync);
  window.addEventListener("rooster-employee-selected", sync);
  window.addEventListener("rooster-month-changed", sync);
  window.addEventListener("rooster-months-updated", () => {
    sync();
    if (details?.open) render();
  });

  sync();
})();
